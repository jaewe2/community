from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    CommunityPosting,
    Category,
    PostingImage,
    Favorite,
    Tag,
    ListingTag,
    Message,
    PaymentMethod,
    Offering,
    Order,
)

User = get_user_model()

# 📂 Category Serializer
class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = "__all__"

# 🖼️ Posting Image Serializer
class PostingImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PostingImage
        fields = ["id", "image"]

# 🔖 Tag Serializer
class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ["id", "name"]

# 🔗 ListingTag Serializer
class ListingTagSerializer(serializers.ModelSerializer):
    tag = TagSerializer(read_only=True)

    class Meta:
        model = ListingTag
        fields = ["id", "tag"]

# 💳 PaymentMethod Serializer
class PaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMethod
        fields = ["id", "name", "icon"]

# 🎁 Offering Serializer
class OfferingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Offering
        fields = ["id", "name", "description", "extra_cost"]

# 📦 CommunityPosting Serializer
class CommunityPostingSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source="user.email")
    user_id = serializers.ReadOnlyField(source="user.id")
    category = serializers.PrimaryKeyRelatedField(queryset=Category.objects.all())
    category_name = serializers.CharField(source="category.name", read_only=True)
    images = PostingImageSerializer(many=True, read_only=True)
    tags = ListingTagSerializer(many=True, read_only=True)
    favorited_by = serializers.PrimaryKeyRelatedField(many=True, read_only=True)

    payment_methods = PaymentMethodSerializer(many=True, read_only=True)
    payment_methods_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        write_only=True,
        queryset=PaymentMethod.objects.all(),
        source="payment_methods"
    )

    offerings = OfferingSerializer(many=True, read_only=True)
    offerings_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        write_only=True,
        queryset=Offering.objects.all(),
        source="offerings"
    )

    class Meta:
        model = CommunityPosting
        fields = [
            "id",
            "user",
            "user_id",
            "title",
            "description",
            "category",
            "category_name",
            "price",
            "location",
            "created_at",
            "images",
            "tags",
            "favorited_by",
            "payment_methods",
            "payment_methods_ids",
            "offerings",
            "offerings_ids",
        ]

# ❤️ Favorite Serializer
class FavoriteSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source="user.email")
    listing = serializers.PrimaryKeyRelatedField(queryset=CommunityPosting.objects.all())
    listing_title = serializers.CharField(source="listing.title", read_only=True)
    listing_images = PostingImageSerializer(source="listing.images", many=True, read_only=True)

    class Meta:
        model = Favorite
        fields = ["id", "user", "listing", "listing_title", "listing_images", "created_at"]

# 💬 Full Message Serializer
class MessageSerializer(serializers.ModelSerializer):
    sender = serializers.ReadOnlyField(source="sender.email")
    recipient = serializers.ReadOnlyField(source="recipient.email")
    listing = serializers.PrimaryKeyRelatedField(queryset=CommunityPosting.objects.all())
    listing_title = serializers.CharField(source="listing.title", read_only=True)
    parent_message = serializers.PrimaryKeyRelatedField(
        queryset=Message.objects.all(), required=False, allow_null=True
    )
    read = serializers.BooleanField()

    class Meta:
        model = Message
        fields = [
            "id",
            "listing",
            "listing_title",
            "sender",
            "recipient",
            "content",
            "created_at",
            "parent_message",
            "read",
        ]

# ✉️ Simplified Message Create Serializer
class MessageCreateSerializer(serializers.ModelSerializer):
    sender = serializers.ReadOnlyField(source="sender.email")
    recipient = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    listing = serializers.PrimaryKeyRelatedField(queryset=CommunityPosting.objects.all())
    content = serializers.CharField()

    class Meta:
        model = Message
        fields = ["id", "sender", "recipient", "listing", "content"]

# 🔐 User Profile Serializer
class UserProfileSerializer(serializers.ModelSerializer):
    profile_picture = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "username",
            "first_name",
            "last_name",
            "profile_picture",
            "company_name",
            "display_as_company",
            "phone_number",
            "is_buyer",
            "is_seller",
            "is_admin",
        ]
        read_only_fields = ["email", "username", "is_buyer", "is_seller", "is_admin"]

# 🧾 Order Serializer (📦 with listing/payment display + shipping)
class OrderSerializer(serializers.ModelSerializer):
    buyer = serializers.ReadOnlyField(source="buyer.id")
    listing = serializers.PrimaryKeyRelatedField(queryset=CommunityPosting.objects.all())
    listing_title = serializers.CharField(source="listing.title", read_only=True)

    payment_method = serializers.PrimaryKeyRelatedField(queryset=PaymentMethod.objects.all())
    payment_method_name = serializers.CharField(source="payment_method.name", read_only=True)
    payment_method_icon = serializers.CharField(source="payment_method.icon", read_only=True)

    offerings = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Offering.objects.all(), required=False
    )
    total_price = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    address_details = serializers.JSONField(required=False)

    class Meta:
        model = Order
        fields = [
            "id",
            "buyer",
            "listing",
            "listing_title",
            "payment_method",
            "payment_method_name",
            "payment_method_icon",
            "offerings",
            "total_price",
            "status",
            "created_at",
            "paid_at",
            "address_details",
        ]
        read_only_fields = ["status", "created_at", "paid_at"]

    def validate(self, data):
        listing_price = data["listing"].price or 0
        offerings_total = sum([o.extra_cost for o in data.get("offerings", [])])
        data["total_price"] = listing_price + offerings_total
        return data

    def create(self, validated_data):
        offerings = validated_data.pop("offerings", [])
        order = Order.objects.create(**validated_data)
        order.offerings.set(offerings)
        return order
