# api/views.py

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

from django.contrib.auth import get_user_model
from .models import (
    CommunityPosting, Category, PostingImage, Favorite, Tag, ListingTag, Message
)
from .serializers import (
    CommunityPostingSerializer, CategorySerializer, FavoriteSerializer,
    TagSerializer, ListingTagSerializer, MessageSerializer, MessageCreateSerializer,
    UserProfileSerializer
)

User = get_user_model()

# 🔓 Public HelloWorld
class HelloWorldView(APIView):
    def get(self, request):
        return Response({"message": "Hello from Django!"})


# 🔐 Firebase Token Verification
class VerifyFirebaseToken(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        id_token = request.data.get("token")
        if not id_token:
            return Response({"error": "Token missing"}, status=400)
        try:
            decoded = firebase_auth.verify_id_token(id_token)
            return Response({
                "uid": decoded["uid"],
                "email": decoded.get("email"),
            })
        except Exception as e:
            return Response({"error": str(e)}, status=401)


# 📄 Individual Listing Detail
class PostingDetailView(RetrieveAPIView):
    queryset = CommunityPosting.objects.all()
    serializer_class = CommunityPostingSerializer
    permission_classes = [AllowAny]
    lookup_field = 'id'


# 📦 Postings CRUD + "my ads" support
class CommunityPostingViewSet(viewsets.ModelViewSet):
    serializer_class = CommunityPostingSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        qs = CommunityPosting.objects.all().order_by('-created_at')
        # if listing the root endpoint, allow '?mine=true' to filter
        if self.action == 'list' and self.request.user.is_authenticated:
            if self.request.query_params.get('mine') in ['true', '1', 'yes']:
                qs = qs.filter(user=self.request.user)
        return qs

    @action(detail=False, methods=['get'], url_path='my-ads', permission_classes=[IsAuthenticated])
    def my_ads(self, request):
        """
        GET /api/postings/my-ads/
        Returns only the postings owned by the authenticated user.
        """
        qs = CommunityPosting.objects.filter(user=request.user).order_by('-created_at')
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    def perform_create(self, serializer):
        posting = serializer.save(user=self.request.user)
        for image in self.request.FILES.getlist("images"):
            PostingImage.objects.create(posting=posting, image=image)

    def perform_update(self, serializer):
        posting = serializer.save()
        # handle new uploads
        for image in self.request.FILES.getlist("images"):
            PostingImage.objects.create(posting=posting, image=image)
        # handle deletions
        deleted_ids = self.request.data.getlist("deleted_images")
        try:
            deleted_ids = [int(i) for i in deleted_ids if str(i).isdigit()]
            if deleted_ids:
                PostingImage.objects.filter(posting=posting, id__in=deleted_ids).delete()
        except Exception as e:
            print("Error parsing deleted_images:", e)

    def destroy(self, request, *args, **kwargs):
        posting = self.get_object()
        if posting.user != request.user:
            return Response(
                {"error": "You can only delete your own listings."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)


# 📚 Categories CRUD
class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]


# ❤️ Favorites CRUD scoped to user
class FavoriteViewSet(viewsets.ModelViewSet):
    serializer_class = FavoriteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Favorite.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# 🔖 Tags CRUD
class TagViewSet(viewsets.ModelViewSet):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [AllowAny]


# 🔗 Listing-Tag Relation
class ListingTagViewSet(viewsets.ModelViewSet):
    queryset = ListingTag.objects.all()
    serializer_class = ListingTagSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


# 💬 Messages CRUD
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
        msgs = Message.objects.filter(Q(sender=user) | Q(recipient=user)).order_by('-created_at')
        serializer = self.get_serializer(msgs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["post"], url_path="send")
    def send_message(self, request):
        sender = request.user
        recipient_id = request.data.get("recipient_id")
        content = request.data.get("content")
        listing_id = request.data.get("listing_id")

        if not (recipient_id and content and listing_id):
            return Response(
                {"error": "recipient_id, content & listing_id are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            listing = CommunityPosting.objects.get(id=listing_id)
            recipient = User.objects.get(id=recipient_id)
        except (CommunityPosting.DoesNotExist, User.DoesNotExist):
            return Response({"error": "Invalid listing or recipient."}, status=status.HTTP_400_BAD_REQUEST)

        if listing.user == sender:
            return Response({"error": "Cannot message your own listing."}, status=status.HTTP_403_FORBIDDEN)

        msg = Message.objects.create(
            sender=sender,
            recipient=recipient,
            content=content,
            listing=listing
        )
        return Response(MessageSerializer(msg).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="reply")
    def reply(self, request, pk=None):
        orig = self.get_object()
        content = request.data.get("content")
        if not content:
            return Response({"error": "Content required."}, status=status.HTTP_400_BAD_REQUEST)
        reply = Message.objects.create(
            listing=orig.listing,
            sender=request.user,
            recipient=orig.sender,
            content=content
        )
        return Response(MessageSerializer(reply).data, status=status.HTTP_201_CREATED)


# 👤 User Profile (Account Settings)
class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        user = request.user
        # Ensure Firebase token -> Django user
        try:
            id_token = request.META.get("HTTP_AUTHORIZATION", "").split(" ")[-1]
            decoded = firebase_auth.verify_id_token(id_token)
            email = decoded.get("email")
            user, _ = User.objects.get_or_create(
                email=email,
                defaults={"username": email.split("@")[0], "is_active": True}
            )
        except Exception as e:
            return Response({"error": "Invalid token."}, status=status.HTTP_401_UNAUTHORIZED)

        serializer = UserProfileSerializer(user)
        return Response(serializer.data)

    def put(self, request):
        serializer = UserProfileSerializer(request.user, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request):
        serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
