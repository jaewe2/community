# mybackend/asgi.py

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.urls import re_path
from api import consumers  # Import your consumers module

# Set the default Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mybackend.settings')

# ASGI application
application = ProtocolTypeRouter({
    "http": get_asgi_application(),  # Handles HTTP connections
    "websocket": AuthMiddlewareStack(
        URLRouter([
            re_path(r"^ws/messages/(?P<listing_id>\w+)/$", consumers.MessageConsumer.as_asgi()),  # Handle WebSocket connection for messaging
        ])
    ),
})

