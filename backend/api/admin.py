from django.contrib import admin
from django.contrib.auth import get_user_model
from .models import (
    CommunityUser,
    Category,
    PaymentMethod,
    Offering,
    CommunityPosting,
    PostingImage,
    Favorite,
    Tag,
    ListingTag,
    Message,
    Order,  # ✅ NEW
)

User = get_user_model()


@admin.register(User)
class CommunityUserAdmin(admin.ModelAdmin):
    list_display = ("id", "username", "email", "is_buyer", "is_seller", "is_admin")
    list_filter = ("is_buyer", "is_seller", "is_admin")
    search_fields = ("username", "email")


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("id", "name")
    search_fields = ("name",)


@admin.register(PaymentMethod)
class PaymentMethodAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "icon")
    search_fields = ("name",)


@admin.register(Offering)
class OfferingAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "extra_cost")
    search_fields = ("name",)


@admin.register(CommunityPosting)
class CommunityPostingAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "user", "category", "price", "location", "created_at")
    list_filter = ("category", "location", "payment_methods", "offerings")
    search_fields = ("title", "description", "location")
    filter_horizontal = ("payment_methods", "offerings")


@admin.register(PostingImage)
class PostingImageAdmin(admin.ModelAdmin):
    list_display = ("id", "posting", "uploaded_at")
    list_filter = ("uploaded_at",)
    search_fields = ("posting__title",)


@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "listing", "created_at")
    list_filter = ("created_at",)
    search_fields = ("user__email", "listing__title")


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ("id", "name")
    search_fields = ("name",)


@admin.register(ListingTag)
class ListingTagAdmin(admin.ModelAdmin):
    list_display = ("id", "listing", "tag")
    search_fields = ("listing__title", "tag__name")


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("id", "listing", "sender", "recipient", "created_at", "read")
    list_filter = ("created_at", "read")
    search_fields = ("sender__email", "recipient__email", "listing__title", "content")


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "buyer", "listing", "payment_method", "total_price", "status", "created_at")
    list_filter = ("status", "created_at", "payment_method")
    search_fields = ("buyer__email", "listing__title", "payment_method__name")
    readonly_fields = ("total_price", "created_at", "paid_at", "address_details")
