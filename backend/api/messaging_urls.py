# api/messaging_urls.py

from django.urls import re_path
from . import consumers  # Make sure the consumers are correctly imported

# WebSocket URL patterns for messaging
websocket_urlpatterns = [
    re_path(r"^ws/messages/(?P<listing_id>\w+)/$", consumers.MessageConsumer.as_asgi()),
]


