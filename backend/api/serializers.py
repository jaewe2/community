# community_api/serializers.py

from rest_framework import serializers
from .models import (
    CommunityPosting,
    Category,
    PostingImage,
    Favorite,
    Tag,
    ListingTag,
    Message,
)


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'


class PostingImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PostingImage
        fields = ['id', 'image']


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'name']


class ListingTagSerializer(serializers.ModelSerializer):
    tag = TagSerializer(read_only=True)

    class Meta:
        model = ListingTag
        fields = ['id', 'tag']


class CommunityPostingSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source='user.email')
    category = serializers.PrimaryKeyRelatedField(queryset=Category.objects.all())
    category_name = serializers.CharField(source='category.name', read_only=True)
    images = PostingImageSerializer(many=True, read_only=True)
    tags = ListingTagSerializer(source='listingtag_set', many=True, read_only=True)
    favorited_by = serializers.PrimaryKeyRelatedField(many=True, read_only=True)

    class Meta:
        model = CommunityPosting
        fields = '__all__'


class FavoriteSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source='user.email')
    listing = serializers.PrimaryKeyRelatedField(queryset=CommunityPosting.objects.all())
    listing_title = serializers.CharField(source='listing.title', read_only=True)
    listing_images = PostingImageSerializer(source='listing.images', many=True, read_only=True)

    class Meta:
        model = Favorite
        fields = ['id', 'user', 'listing', 'listing_title', 'listing_images', 'created_at']


class MessageSerializer(serializers.ModelSerializer):
    sender = serializers.ReadOnlyField(source='sender.email')
    listing = serializers.PrimaryKeyRelatedField(queryset=CommunityPosting.objects.all())
    listing_title = serializers.CharField(source='listing.title', read_only=True)  # ✅ Added

    class Meta:
        model = Message
        fields = ['id', 'listing', 'listing_title', 'sender', 'content', 'created_at']
