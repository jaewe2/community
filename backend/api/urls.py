from django.urls import path, include
from .views import (
    HelloWorldView,
    VerifyFirebaseToken,
    CommunityPostingViewSet,
    CategoryViewSet,
    PostingDetailView,
    FavoriteViewSet,
    TagViewSet,
    ListingTagViewSet,
    MessageViewSet,
    UserProfileView,  # Add the UserProfileView import
)

# This router is for REST API
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'postings', CommunityPostingViewSet, basename='postings')
router.register(r'categories', CategoryViewSet, basename='categories')
router.register(r'favorites', FavoriteViewSet, basename='favorites')
router.register(r'tags', TagViewSet, basename='tags')
router.register(r'listing-tags', ListingTagViewSet, basename='listing-tags')
router.register(r'messages', MessageViewSet, basename='messages')

urlpatterns = [
    path('', include(router.urls)),
    path('hello/', HelloWorldView.as_view(), name='hello'),
    path('verify-token/', VerifyFirebaseToken.as_view(), name='verify-token'),
    path('postings/<int:id>/', PostingDetailView.as_view(), name='posting-detail'),
    
    # Add the user profile path here
    path('user/profile/', UserProfileView.as_view(), name='user-profile'),  # New path for user profile
]

# Include WebSocket routing from messaging_urls
from api.messaging_urls import websocket_urlpatterns  # Import WebSocket URL patterns
urlpatterns += websocket_urlpatterns  # Append WebSocket routes to URL patterns

