
# community_api/views.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import viewsets, permissions, status
from rest_framework.generics import RetrieveAPIView
from rest_framework.permissions import AllowAny
from rest_framework.parsers import MultiPartParser, FormParser

# Firebase Admin
from firebase_admin import auth as firebase_auth
import api.firebase_admin_setup  # Ensures Firebase Admin gets initialized

# Models & Serializers
from .models import (
    CommunityPosting, Category, PostingImage, Favorite, Tag, ListingTag, Message
)
from .serializers import (
    CommunityPostingSerializer, CategorySerializer, FavoriteSerializer,
    TagSerializer, ListingTagSerializer, MessageSerializer
)

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
            decoded_token = firebase_auth.verify_id_token(id_token)
            uid = decoded_token["uid"]
            email = decoded_token.get("email")
            return Response({"uid": uid, "email": email})
        except Exception as e:
            return Response({"error": str(e)}, status=401)


# 📄 Individual Listing Detail
class PostingDetailView(RetrieveAPIView):
    queryset = CommunityPosting.objects.all()
    serializer_class = CommunityPostingSerializer
    permission_classes = [AllowAny]
    lookup_field = 'id'


# 📦 Postings CRUD with file upload support
class CommunityPostingViewSet(viewsets.ModelViewSet):
    queryset = CommunityPosting.objects.all()
    serializer_class = CommunityPostingSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    parser_classes = [MultiPartParser, FormParser]

    def perform_create(self, serializer):
        posting = serializer.save(user=self.request.user)
        images = self.request.FILES.getlist("images")
        for image in images:
            PostingImage.objects.create(posting=posting, image=image)


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


# 💬 Messages CRUD scoped to sender
class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Message.objects.filter(sender=self.request.user)

    def perform_create(self, serializer):
        serializer.save(sender=self.request.user)
