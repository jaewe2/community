from django.urls import path, include
from rest_framework.routers import DefaultRouter

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
    UserProfileView,
    PaymentMethodViewSet,
    OfferingViewSet,
    OrderViewSet,
    CreatePaymentIntent,
    CreateStripeSession,  # ✅ Added this for unified checkout
)

router = DefaultRouter()
router.register(r'postings', CommunityPostingViewSet, basename='postings')
router.register(r'categories', CategoryViewSet, basename='categories')
router.register(r'favorites', FavoriteViewSet, basename='favorites')
router.register(r'tags', TagViewSet, basename='tags')
router.register(r'listing-tags', ListingTagViewSet, basename='listing-tags')
router.register(r'messages', MessageViewSet, basename='messages')
router.register(r'payment-methods', PaymentMethodViewSet, basename='payment-methods')
router.register(r'offerings', OfferingViewSet, basename='offerings')
router.register(r'orders', OrderViewSet, basename='orders')

urlpatterns = [
    path('', include(router.urls)),
    path('hello/', HelloWorldView.as_view(), name='hello'),
    path('verify-token/', VerifyFirebaseToken.as_view(), name='verify-token'),
    path('postings/<int:id>/', PostingDetailView.as_view(), name='posting-detail'),
    path('user/profile/', UserProfileView.as_view(), name='user-profile'),

    # ✅ Stripe API endpoints
    path('create-payment-intent/', CreatePaymentIntent.as_view(), name='create-payment-intent'),
    path('create-stripe-session/', CreateStripeSession.as_view(), name='create-stripe-session'),
]

# WebSocket routes
from api.messaging_urls import websocket_urlpatterns
urlpatterns += websocket_urlpatterns
