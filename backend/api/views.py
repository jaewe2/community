from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import viewsets, permissions, status
from rest_framework.generics import RetrieveAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.decorators import action
from django.db.models import Q
import json
from firebase_admin import auth as firebase_auth
import api.firebase_admin_setup

from .models import (
    CommunityPosting, Category, PostingImage, Favorite, Tag, ListingTag, Message
)
from .serializers import (
    CommunityPostingSerializer, CategorySerializer, FavoriteSerializer,
    TagSerializer, ListingTagSerializer, MessageSerializer, MessageCreateSerializer,
    UserProfileSerializer
)

from django.contrib.auth import get_user_model
User = get_user_model()

# Hello world
class HelloWorldView(APIView):
    def get(self, request):
        return Response({"message": "Hello from Django!"})


# Firebase Token Verification
class VerifyFirebaseToken(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        id_token = request.data.get("token")
        if not id_token:
            return Response({"error": "Token missing"}, status=400)
        try:
            decoded_token = firebase_auth.verify_id_token(id_token)
            return Response({
                "uid": decoded_token["uid"],
                "email": decoded_token.get("email"),
            })
        except Exception as e:
            return Response({"error": str(e)}, status=401)


# Single Listing Detail
class PostingDetailView(RetrieveAPIView):
    queryset = CommunityPosting.objects.all()
    serializer_class = CommunityPostingSerializer
    permission_classes = [AllowAny]
    lookup_field = 'id'


# Listing CRUD + File Upload
class CommunityPostingViewSet(viewsets.ModelViewSet):
    queryset = CommunityPosting.objects.all()
    serializer_class = CommunityPostingSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    parser_classes = [MultiPartParser, FormParser]

    def perform_create(self, serializer):
        posting = serializer.save(user=self.request.user)
        for image in self.request.FILES.getlist("images"):
            PostingImage.objects.create(posting=posting, image=image)

    def perform_update(self, serializer):
        posting = serializer.save()
        images = self.request.FILES.getlist("images")
        deleted_ids = self.request.data.getlist("deleted_images")

        try:
            deleted_ids = [int(i) for i in deleted_ids if str(i).isdigit()]
            if deleted_ids:
                PostingImage.objects.filter(posting=posting, id__in=deleted_ids).delete()
        except Exception as e:
            print("Error converting deleted_images to ints:", e)

        for image in images:
            PostingImage.objects.create(posting=posting, image=image)

    def destroy(self, request, *args, **kwargs):
        posting = self.get_object()
        if posting.user != request.user:
            return Response({"error": "You can only delete your own listings."}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)


# Category CRUD
class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]


# Favorites CRUD
class FavoriteViewSet(viewsets.ModelViewSet):
    serializer_class = FavoriteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Favorite.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# Tag CRUD
class TagViewSet(viewsets.ModelViewSet):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [AllowAny]


# Listing Tags
class ListingTagViewSet(viewsets.ModelViewSet):
    queryset = ListingTag.objects.all()
    serializer_class = ListingTagSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


# Message CRUD
class MessageViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Message.objects.filter(Q(sender=user) | Q(recipient=user)).order_by('-created_at')

    def get_serializer_class(self):
        return MessageCreateSerializer if self.action == 'create' else MessageSerializer

    def perform_create(self, serializer):
        serializer.save(sender=self.request.user)

    @action(detail=False, methods=["get"], url_path="inbox")
    def inbox(self, request):
        user = request.user
        messages = Message.objects.filter(Q(sender=user) | Q(recipient=user)).order_by('-created_at')
        serializer = self.get_serializer(messages, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["post"], url_path="send")
    def send_message(self, request):
        sender = request.user
        recipient_id = request.data.get("recipient_id")
        content = request.data.get("content")
        listing_id = request.data.get("listing_id")

        if not recipient_id or not content or not listing_id:
            return Response({"error": "Recipient, content, and listing_id are required."}, status=400)

        try:
            recipient = User.objects.get(id=recipient_id)
            listing = CommunityPosting.objects.get(id=listing_id)
        except (User.DoesNotExist, CommunityPosting.DoesNotExist):
            return Response({"error": "Invalid recipient or listing."}, status=400)

        if listing.user == sender:
            return Response({"error": "You cannot message your own listing."}, status=403)

        message = Message.objects.create(
            sender=sender,
            recipient=recipient,
            content=content,
            listing=listing
        )
        return Response(MessageSerializer(message).data, status=201)

    @action(detail=True, methods=["post"], url_path="reply")
    def reply(self, request, pk=None):
        original_message = self.get_object()
        content = request.data.get("content")
        if not content:
            return Response({"error": "Content is required."}, status=status.HTTP_400_BAD_REQUEST)
        new_message = Message.objects.create(
            listing=original_message.listing,
            sender=request.user,
            recipient=original_message.sender,
            content=content
        )
        serializer = MessageSerializer(new_message)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# Authenticated User Profile
class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        user = request.user
        if not user:
            return Response({"error": "User not authenticated"}, status=401)
        try:
            id_token = request.META.get("HTTP_AUTHORIZATION", "").split(" ")[-1]
            decoded = firebase_auth.verify_id_token(id_token)
            firebase_email = decoded.get("email")
            user, _ = User.objects.get_or_create(
                email=firebase_email,
                defaults={"username": firebase_email.split("@")[0], "is_active": True}
            )
        except Exception as e:
            print("Failed to verify or create user:", e)
            return Response({"error": "Token verification failed"}, status=401)
        serializer = UserProfileSerializer(user)
        return Response(serializer.data)

    def put(self, request):
        user = request.user
        serializer = UserProfileSerializer(user, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request):
        user = request.user
        serializer = UserProfileSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
