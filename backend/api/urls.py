# backend/api/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    HelloWorldView,
    VerifyFirebaseToken,
    CommunityPostingViewSet,
    CategoryViewSet,
    PostingDetailView,
    FavoriteViewSet,
    TagViewSet,         # ✅ NEW
    ListingTagViewSet,  # ✅ NEW
    MessageViewSet,     # ✅ NEW
)

router = DefaultRouter()
router.register(r'postings', CommunityPostingViewSet, basename='postings')
router.register(r'categories', CategoryViewSet, basename='categories')
router.register(r'favorites', FavoriteViewSet, basename='favorites')         # ✅ FAVORITES
router.register(r'tags', TagViewSet, basename='tags')                        # ✅ TAGS
router.register(r'listing-tags', ListingTagViewSet, basename='listing-tags')# ✅ LISTING-TAGS
router.register(r'messages', MessageViewSet, basename='messages')           # ✅ MESSAGES

urlpatterns = [
    path('', include(router.urls)),
    path('hello/', HelloWorldView.as_view(), name='hello'),
    path('verify-token/', VerifyFirebaseToken.as_view(), name='verify-token'),
    path('postings/<int:id>/', PostingDetailView.as_view(), name='posting-detail'),
]

