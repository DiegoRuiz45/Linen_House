from google.auth.transport import requests
from google.oauth2 import id_token

from app.core.config import settings


class GoogleClient:

    @staticmethod
    def verify_token(
        credential: str,
    ) -> dict:

        payload = id_token.verify_oauth2_token(
            credential,
            requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )

        return payload