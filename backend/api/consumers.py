# api/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from .models import Message, CommunityPosting
from django.contrib.auth import get_user_model

User = get_user_model()

class MessageConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.listing_id = self.scope['url_route']['kwargs']['listing_id']
        self.room_group_name = f"message_{self.listing_id}"

        # Join the room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Leave the room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # Receive message from WebSocket
    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message_content = text_data_json['message']
        user = self.scope['user']

        # Save the message to the database
        listing = await database_sync_to_async(CommunityPosting.objects.get)(id=self.listing_id)
        message = Message(
            sender=user,
            listing=listing,
            content=message_content
        )
        message.save()

        # Send message to room group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': message_content,
                'sender': user.email,
            }
        )

    # Receive message from room group
    async def chat_message(self, event):
        message = event['message']
        sender = event['sender']

        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'message': message,
            'sender': sender,
        }))
