import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.urls import re_path
from api import consumers  # make sure NotificationConsumer lives here too

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mybackend.settings')

application = ProtocolTypeRouter({
    # HTTP is unchanged
    "http": get_asgi_application(),

    # WebSocket: both chats and notifications
    "websocket": AuthMiddlewareStack(
        URLRouter([
            # your existing chat consumer
            re_path(
                r"^ws/messages/(?P<listing_id>\w+)/$",
                consumers.MessageConsumer.as_asgi()
            ),

            # new notifications consumer
            re_path(
                r"^ws/notifications/$",
                consumers.NotificationConsumer.as_asgi()
            ),
        ])
    ),
})
