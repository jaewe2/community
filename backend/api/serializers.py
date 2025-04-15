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
)

User = get_user_model()

# Category Serializer
class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'


# Posting Image Serializer
class PostingImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PostingImage
        fields = ['id', 'image']


# Tag Serializer
class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'name']


# ListingTag Serializer
class ListingTagSerializer(serializers.ModelSerializer):
    tag = TagSerializer(read_only=True)

    class Meta:
        model = ListingTag
        fields = ['id', 'tag']


# CommunityPosting Serializer
class CommunityPostingSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source='user.email')
    user_id = serializers.ReadOnlyField(source='user.id')  # ✅ Added for frontend message posting
    category = serializers.PrimaryKeyRelatedField(queryset=Category.objects.all())
    category_name = serializers.CharField(source='category.name', read_only=True)
    images = PostingImageSerializer(many=True, read_only=True)
    tags = ListingTagSerializer(source='listingtag_set', many=True, read_only=True)
    favorited_by = serializers.PrimaryKeyRelatedField(many=True, read_only=True)

    class Meta:
        model = CommunityPosting
        fields = '__all__'


# Favorite Serializer
class FavoriteSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source='user.email')
    listing = serializers.PrimaryKeyRelatedField(queryset=CommunityPosting.objects.all())
    listing_title = serializers.CharField(source='listing.title', read_only=True)
    listing_images = PostingImageSerializer(source='listing.images', many=True, read_only=True)

    class Meta:
        model = Favorite
        fields = ['id', 'user', 'listing', 'listing_title', 'listing_images', 'created_at']


# Full Message Serializer (for GET responses)
class MessageSerializer(serializers.ModelSerializer):
    sender = serializers.ReadOnlyField(source='sender.email')
    recipient = serializers.ReadOnlyField(source='recipient.email')
    listing = serializers.PrimaryKeyRelatedField(queryset=CommunityPosting.objects.all())
    listing_title = serializers.CharField(source='listing.title', read_only=True)
    parent_message = serializers.PrimaryKeyRelatedField(queryset=Message.objects.all(), required=False, allow_null=True)
    read = serializers.BooleanField()

    class Meta:
        model = Message
        fields = ['id', 'listing', 'listing_title', 'sender', 'recipient', 'content', 'created_at', 'parent_message', 'read']


# Simplified Message Create Serializer (for POST only)
class MessageCreateSerializer(serializers.ModelSerializer):
    sender = serializers.ReadOnlyField(source='sender.email')
    recipient = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    listing = serializers.PrimaryKeyRelatedField(queryset=CommunityPosting.objects.all())
    content = serializers.CharField()

    class Meta:
        model = Message
        fields = ['id', 'sender', 'recipient', 'listing', 'content']

