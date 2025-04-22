from datetime import date

import stripe
from django.conf import settings
from django.core.mail import send_mail
from django.db.models import Q, Count, F, DateField
from django.db.models.functions import TruncMonth, Cast
from django.contrib.auth import get_user_model

from firebase_admin import auth as firebase_auth
import api.firebase_admin_setup

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.generics import RetrieveAPIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    CommunityPosting, Category, PostingImage, Favorite,
    Tag, ListingTag, Message, PaymentMethod, Offering, Order
)
from .serializers import (
    CommunityPostingSerializer,
    CategorySerializer,
    FavoriteSerializer,
    TagSerializer,
    ListingTagSerializer,
    MessageSerializer,
    MessageCreateSerializer,
    UserProfileSerializer,
    PaymentMethodSerializer,
    OfferingSerializer,
    OrderSerializer,
    OverviewSerializer,
    MonthCountSerializer,
    CategoryValueSerializer,
)

User = get_user_model()
stripe.api_key = settings.STRIPE_SECRET_KEY


class HelloWorldView(APIView):
    def get(self, request):
        return Response({"message": "Hello from Django!"})


class VerifyFirebaseToken(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        id_token = request.data.get("token")
        if not id_token:
            return Response({"error": "Token missing"}, status=400)
        try:
            decoded = firebase_auth.verify_id_token(id_token)
            return Response({"uid": decoded["uid"], "email": decoded.get("email")})
        except Exception as e:
            return Response({"error": str(e)}, status=401)


class PostingDetailView(RetrieveAPIView):
    queryset = CommunityPosting.objects.all()
    serializer_class = CommunityPostingSerializer
    permission_classes = [AllowAny]
    lookup_field = "id"


class CommunityPostingViewSet(viewsets.ModelViewSet):
    serializer_class = CommunityPostingSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        qs = CommunityPosting.objects.all().order_by("-created_at")
        if self.action == "list" and self.request.user.is_authenticated:
            if self.request.query_params.get("mine") in ["true", "1", "yes"]:
                qs = qs.filter(user=self.request.user)
        return qs

    @action(detail=False, methods=["get"], url_path="my-ads", permission_classes=[IsAuthenticated])
    def my_ads(self, request):
        qs = CommunityPosting.objects.filter(user=request.user).order_by("-created_at")
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
        for image in self.request.FILES.getlist("images"):
            PostingImage.objects.create(posting=posting, image=image)
        deleted_ids = self.request.data.getlist("deleted_images")
        try:
            deleted_ids = [int(i) for i in deleted_ids if str(i).isdigit()]
            if deleted_ids:
                PostingImage.objects.filter(posting=posting, id__in=deleted_ids).delete()
        except Exception:
            pass

    def destroy(self, request, *args, **kwargs):
        posting = self.get_object()
        if posting.user != request.user:
            return Response(
                {"error": "You can only delete your own listings."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]


class PaymentMethodViewSet(viewsets.ModelViewSet):
    queryset = PaymentMethod.objects.all()
    serializer_class = PaymentMethodSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class OfferingViewSet(viewsets.ModelViewSet):
    queryset = Offering.objects.all()
    serializer_class = OfferingSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class FavoriteViewSet(viewsets.ModelViewSet):
    serializer_class = FavoriteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Favorite.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class TagViewSet(viewsets.ModelViewSet):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [AllowAny]


class ListingTagViewSet(viewsets.ModelViewSet):
    queryset = ListingTag.objects.all()
    serializer_class = ListingTagSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class MessageViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Message.objects.filter(Q(sender=user) | Q(recipient=user)).order_by("-created_at")

    def get_serializer_class(self):
        return MessageCreateSerializer if self.action == "create" else MessageSerializer

    def perform_create(self, serializer):
        serializer.save(sender=self.request.user)

    @action(detail=False, methods=["get"], url_path="inbox")
    def inbox(self, request):
        msgs = Message.objects.filter(Q(sender=request.user) | Q(recipient=request.user)).order_by("-created_at")
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
                status=400
            )

        try:
            listing = CommunityPosting.objects.get(id=listing_id)
            recipient = User.objects.get(id=recipient_id)
        except (CommunityPosting.DoesNotExist, User.DoesNotExist):
            return Response({"error": "Invalid listing or recipient."}, status=400)

        if listing.user == sender:
            return Response({"error": "Cannot message your own listing."}, status=403)

        msg = Message.objects.create(
            sender=sender,
            recipient=recipient,
            content=content,
            listing=listing
        )
        return Response(MessageSerializer(msg).data, status=201)

    @action(detail=True, methods=["post"], url_path="reply")
    def reply(self, request, pk=None):
        orig = self.get_object()
        content = request.data.get("content")
        if not content:
            return Response({"error": "Content required."}, status=400)
        reply = Message.objects.create(
            listing=orig.listing,
            sender=request.user,
            recipient=orig.sender,
            content=content
        )
        return Response(MessageSerializer(reply).data, status=201)


class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        try:
            id_token = request.META.get("HTTP_AUTHORIZATION", "").split()[-1]
            decoded = firebase_auth.verify_id_token(id_token)
            email = decoded.get("email")
            user, _ = User.objects.get_or_create(
                email=email,
                defaults={
                    "username": email.split("@")[0],
                    "is_active": True
                }
            )
        except Exception:
            return Response({"error": "Invalid token."}, status=401)

        return Response(UserProfileSerializer(user).data)

    def put(self, request):
        serializer = UserProfileSerializer(request.user, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    def patch(self, request):
        serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)


class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(buyer=self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        order = serializer.save(buyer=self.request.user)
        if order.buyer.email:
            try:
                addr = order.address_details or {}
                message = (
                    f"Hi {addr.get('first_name', '')} {addr.get('last_name', '')},\n\n"
                    f"Thanks for your purchase on Toro Marketplace!\n\n"
                    f"📦 Listing: {order.listing.title}\n"
                    f"💳 Payment: {order.payment_method.name}\n"
                    f"💰 Total: ${order.total_price}\n"
                    f"📍 Status: {order.status}\n"
                    f"🕒 Placed: {order.created_at.strftime('%Y-%m-%d %H:%M')}\n\n"
                    f"📬 Shipping Address:\n"
                    f"{addr.get('street', '')}\n"
                    f"{addr.get('city', '')}, {addr.get('state', '')} {addr.get('zip', '')}\n"
                    f"{addr.get('country', '')}\n"
                    f"✉️ Email: {addr.get('email', '')}\n"
                    f"📞 Phone: {addr.get('phone', '')}\n\n"
                    f"You can view your receipt or manage your order in your dashboard.\n\n"
                    f"Toro Marketplace 🐂"
                )
                send_mail(
                    subject=f"✅ Order Confirmation – Order #{order.id}",
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[order.buyer.email],
                    fail_silently=True,
                )
            except Exception as e:
                print(f"[!] Email sending failed: {e}")


class CreatePaymentIntent(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            amount = float(request.data.get("amount", 0))
            if amount <= 0:
                return Response({"error": "Invalid amount"}, status=400)

            intent = stripe.PaymentIntent.create(
                amount=int(amount * 100),
                currency="usd",
                automatic_payment_methods={"enabled": True},
            )
            return Response({"client_secret": intent.client_secret})
        except Exception as e:
            return Response({"error": str(e)}, status=500)


class CreateStripeSession(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            listing_id = request.data.get("listing_id")
            listing = CommunityPosting.objects.get(id=listing_id)

            session = stripe.checkout.Session.create(
                mode="payment",
                payment_method_types=["card"],
                line_items=[{
                    "price_data": {
                        "currency": "usd",
                        "unit_amount": int(listing.price * 100),
                        "product_data": {
                            "name": listing.title,
                            "description": listing.description,
                        },
                    },
                    "quantity": 1,
                }],
                billing_address_collection="required",
                success_url="http://localhost:3000/order-confirmation/success?session_id={CHECKOUT_SESSION_ID}",
                cancel_url="http://localhost:3000/checkout/cancel",
            )

            return Response({"sessionId": session.id})
        except CommunityPosting.DoesNotExist:
            return Response({"error": "Listing not found"}, status=404)
        except Exception as e:
            return Response({"error": str(e)}, status=500)


# ─── Analytics: user‑scoped endpoints ────────────────────────────────────────

class UserOverviewView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        today = date.today()

        total_posts = CommunityPosting.objects.filter(user=user).count()
        posts_this_month = CommunityPosting.objects.filter(
            user=user,
            created_at__year=today.year,
            created_at__month=today.month,
        ).count()

        total_sales = Order.objects.filter(buyer=user).count()
        sales_this_month = Order.objects.filter(
            buyer=user,
            created_at__year=today.year,
            created_at__month=today.month,
        ).count()

        payload = {
            "postsThisMonth": posts_this_month,
            "totalPosts": total_posts,
            "salesThisMonth": sales_this_month,
            "totalSales": total_sales,
        }
        serializer = OverviewSerializer(payload)
        return Response(serializer.data)


class UserPostsByMonthView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        start = request.query_params.get("start")
        end   = request.query_params.get("end")

        qs = CommunityPosting.objects.filter(user=request.user)
        if start:
            qs = qs.filter(created_at__date__gte=start)
        if end:
            qs = qs.filter(created_at__date__lte=end)

        qs = (
            qs
            .annotate(month_dt=TruncMonth("created_at"))
            .annotate(month=Cast("month_dt", output_field=DateField()))
            .values("month")
            .annotate(count=Count("id"))
            .order_by("month")
        )
        serializer = MonthCountSerializer(qs, many=True)
        return Response(serializer.data)


class UserSalesByMonthView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        start = request.query_params.get("start")
        end   = request.query_params.get("end")

        qs = Order.objects.filter(buyer=request.user)
        if start:
            qs = qs.filter(created_at__date__gte=start)
        if end:
            qs = qs.filter(created_at__date__lte=end)

        qs = (
            qs
            .annotate(month_dt=TruncMonth("created_at"))
            .annotate(month=Cast("month_dt", output_field=DateField()))
            .values("month")
            .annotate(count=Count("id"))
            .order_by("month")
        )
        serializer = MonthCountSerializer(qs, many=True)
        return Response(serializer.data)


class UserSalesByCategoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        start = request.query_params.get("start")
        end   = request.query_params.get("end")

        qs = Order.objects.filter(buyer=request.user)
        if start:
            qs = qs.filter(created_at__date__gte=start)
        if end:
            qs = qs.filter(created_at__date__lte=end)

        qs = (
            qs
            .values(category=F("listing__category__name"))
            .annotate(value=Count("id"))
            .order_by("-value")
        )
        serializer = CategoryValueSerializer(qs, many=True)
        return Response(serializer.data)
