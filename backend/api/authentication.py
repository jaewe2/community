# api/authentication.py

from rest_framework.authentication import BaseAuthentication
from rest_framework import exceptions
from firebase_admin import auth as firebase_auth
from django.contrib.auth import get_user_model

User = get_user_model()

class FirebaseAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get("Authorization")

        if not auth_header or not auth_header.startswith("Bearer "):
            return None

        id_token = auth_header.split(" ")[1]

        try:
            decoded_token = firebase_auth.verify_id_token(id_token)
            email = decoded_token.get("email")
            if not email:
                raise exceptions.AuthenticationFailed("Email not found in token")

            user, created = User.objects.get_or_create(email=email)
            return (user, None)

        except Exception as e:
            raise exceptions.AuthenticationFailed(f"Invalid Firebase token: {e}")

