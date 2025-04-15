from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings


# 🔐 Custom User Model
class CommunityUser(AbstractUser):
    is_buyer = models.BooleanField(default=True)
    is_seller = models.BooleanField(default=True)  # ✅ Default set to True
    is_admin = models.BooleanField(default=False)
    profile_picture = models.ImageField(upload_to="profile_pictures/", null=True, blank=True)  # ✅ Added

    def __str__(self):
        return self.email or self.username


# 📂 Category
class Category(models.Model):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name


# 📦 Community Posting
class CommunityPosting(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="postings")
    title = models.CharField(max_length=255)
    description = models.TextField()
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    location = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


# 🖼️ Posting Images
class PostingImage(models.Model):
    posting = models.ForeignKey(CommunityPosting, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="posting_images/")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Image for {self.posting.title}"


# ❤️ Favorites
class Favorite(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="favorites")
    listing = models.ForeignKey(CommunityPosting, on_delete=models.CASCADE, related_name="favorited_by")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "listing")

    def __str__(self):
        return f"{self.user.email} ♥ {self.listing.title}"


# 🔖 Tags
class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.name


# 🔗 Listing-Tag Relationship
class ListingTag(models.Model):
    listing = models.ForeignKey(CommunityPosting, on_delete=models.CASCADE, related_name='tags')
    tag = models.ForeignKey(Tag, on_delete=models.CASCADE)

    class Meta:
        unique_together = ('listing', 'tag')

    def __str__(self):
        return f"{self.listing.title} - {self.tag.name}"


# 💬 Messages
class Message(models.Model):
    listing = models.ForeignKey(CommunityPosting, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_messages')
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='received_messages')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    parent_message = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='replies')
    read = models.BooleanField(default=False)

    def __str__(self):
        return f"Message from {self.sender.email} to {self.recipient.email} on {self.listing.title} - {self.created_at}"

    class Meta:
        ordering = ['created_at']
