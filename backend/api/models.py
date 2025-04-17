from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings
from django.utils.crypto import get_random_string

# 🔐 Custom User Model
class CommunityUser(AbstractUser):
    is_buyer = models.BooleanField(default=True)
    is_seller = models.BooleanField(default=True)
    is_admin = models.BooleanField(default=False)
    profile_picture = models.ImageField(upload_to="profile_pictures/", null=True, blank=True)

    company_name = models.CharField(max_length=255, blank=True, null=True)
    display_as_company = models.BooleanField(default=False)
    phone_number = models.CharField(max_length=20, blank=True, null=True)

    def save(self, *args, **kwargs):
        if not self.username:
            self.username = f"user_{get_random_string(8)}"
        super().save(*args, **kwargs)

    def __str__(self):
        return self.email or self.username


# 📂 Category
class Category(models.Model):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name


# 💳 Payment Method
class PaymentMethod(models.Model):
    name = models.CharField(max_length=50, unique=True)
    icon = models.URLField(blank=True, null=True)

    def __str__(self):
        return self.name


# 🎁 Offering / Add‑on
class Offering(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    extra_cost = models.DecimalField(max_digits=8, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.name} (+${self.extra_cost})"


# 📦 Community Posting
class CommunityPosting(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="postings")
    title = models.CharField(max_length=255)
    description = models.TextField()
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    location = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    payment_methods = models.ManyToManyField(
        PaymentMethod,
        blank=True,
        related_name="postings",
        help_text="Which payment options you accept"
    )
    offerings = models.ManyToManyField(
        Offering,
        blank=True,
        related_name="postings",
        help_text="Any add‑ons or extras for this listing"
    )

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
    listing = models.ForeignKey(CommunityPosting, on_delete=models.CASCADE, related_name="tags")
    tag = models.ForeignKey(Tag, on_delete=models.CASCADE)

    class Meta:
        unique_together = ("listing", "tag")

    def __str__(self):
        return f"{self.listing.title} - {self.tag.name}"


# 💬 Messages
class Message(models.Model):
    listing = models.ForeignKey(CommunityPosting, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_messages")
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="received_messages",
        null=True,
        blank=True,
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    parent_message = models.ForeignKey("self", null=True, blank=True, on_delete=models.CASCADE, related_name="replies")
    read = models.BooleanField(default=False)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        rec_email = self.recipient.email if self.recipient else "N/A"
        return f"Message from {self.sender.email} to {rec_email} on {self.listing.title}"


# 🧾 Order
class Order(models.Model):
    STATUS_PENDING = "PENDING"
    STATUS_PAID = "PAID"
    STATUS_CANCELED = "CANCELED"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_PAID, "Paid"),
        (STATUS_CANCELED, "Canceled"),
    ]

    buyer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="orders")
    listing = models.ForeignKey(CommunityPosting, on_delete=models.CASCADE, related_name="orders")
    payment_method = models.ForeignKey(PaymentMethod, on_delete=models.SET_NULL, null=True, related_name="orders")
    offerings = models.ManyToManyField(
        Offering,
        blank=True,
        related_name="orders",
        help_text="Selected add‑ons for this order"
    )
    total_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Sum of listing price + any selected offering costs"
    )
    address_details = models.JSONField(
        blank=True,
        null=True,
        help_text="Buyer name, email, phone, and mailing address"
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Order #{self.id} by {self.buyer.username} ({self.status})"
