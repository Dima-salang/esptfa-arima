import logging
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.conf import settings

logger = logging.getLogger(__name__)


class CookieJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        header = self.get_header(request)
        raw_token = None

        if header:
            raw_token = self.get_raw_token(header)
            # If the header is explicitly "null" or "undefined" (common frontend bug), ignore it
            if raw_token in [b"null", b"undefined", "null", "undefined"]:
                logger.debug("JWT header token is 'null' or 'undefined', ignoring.")
                raw_token = None
            else:
                logger.debug("JWT token found in Authorization header.")

        if raw_token is None:
            # Check cookie if header is missing or invalid
            raw_token = request.COOKIES.get(
                settings.SIMPLE_JWT.get("AUTH_COOKIE", "access")
            )
            if raw_token:
                logger.debug("JWT token found in cookie.")

        if raw_token is None:
            return None

        try:
            validated_token = self.get_validated_token(raw_token)
            user = self.get_user(validated_token)
            logger.debug(f"Successfully authenticated user {user.username} via JWT.")
            return user, validated_token
        except Exception as e:
            # If token in header/cookie is invalid, fallback to checking cookie if we haven't already
            # or just return None to allow other authenticators or fail with 401
            logger.error(f"JWT authentication failed: {str(e)}")
            return None
