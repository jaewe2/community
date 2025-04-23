# api/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model

from .models import Message, CommunityPosting

User = get_user_model()

class MessageConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope["user"]
        if not user or not user.is_authenticated:
            # Reject the connection
            await self.close()
            return

        self.listing_id = self.scope["url_route"]["kwargs"]["listing_id"]
        self.listing_group = f"message_{self.listing_id}"
        self.user_group = f"user_{user.id}"

        # Join the listing chat room
        await self.channel_layer.group_add(self.listing_group, self.channel_name)
        # Join the user's personal notification channel
        await self.channel_layer.group_add(self.user_group, self.channel_name)

        await self.accept()

    async def disconnect(self, close_code):
        # Leave both groups
        await self.channel_layer.group_discard(self.listing_group, self.channel_name)
        await self.channel_layer.group_discard(self.user_group, self.channel_name)

    async def receive(self, text_data):
        """
        Called when a message is received over the WebSocket.
        Expects JSON: { "message": "...your text..." }
        """
        data = json.loads(text_data)
        content = data.get("message", "").strip()
        sender = self.scope["user"]

        if not content:
            # ignore or you could send back an error
            return

        # Save to DB without blocking
        listing = await database_sync_to_async(CommunityPosting.objects.get)(id=self.listing_id)
        message = await database_sync_to_async(Message.objects.create)(
            sender=sender,
            recipient=listing.user if listing.user != sender else None,
            listing=listing,
            content=content
        )

        payload = {
            "type": "chat_message",
            "message": content,
            "sender": sender.email,
            "listing_id": self.listing_id,
            "timestamp": message.created_at.isoformat(),
        }

        # Broadcast to everyone listening on this listing
        await self.channel_layer.group_send(self.listing_group, payload)

        # Also notify the listing owner directly (if they're not the sender)
        if listing.user and listing.user != sender:
            await self.channel_layer.group_send(f"user_{listing.user.id}", payload)

    async def chat_message(self, event):
        """
        Handler for messages sent to any of our groups.
        Just forwards them back down the WebSocket.
        """
        await self.send(text_data=json.dumps({
            "message": event["message"],
            "sender":  event["sender"],
            "listing_id": event["listing_id"],
            "timestamp": event["timestamp"],
        }))
