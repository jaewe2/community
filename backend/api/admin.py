# community_api/admin.py

from django.contrib import admin
from .models import Category, CommunityPosting

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("id", "name")

@admin.register(CommunityPosting)
class CommunityPostingAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "user", "category", "price", "location", "created_at")
    list_filter = ("category", "location")
    search_fields = ("title", "description", "location")

