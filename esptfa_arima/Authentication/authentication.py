from rest_framework_simplejwt.authentication import JWTAuthentication
from django.conf import settings

class CookieJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        header = self.get_header(request)
        raw_token = None
        
        if header:
            raw_token = self.get_raw_token(header)
            # If the header is explicitly "null" or "undefined" (common frontend bug), ignore it
            if raw_token in [b'null', b'undefined', 'null', 'undefined']:
                raw_token = None
            
        if raw_token is None:
            # Check cookie if header is missing or invalid
            raw_token = request.COOKIES.get(settings.SIMPLE_JWT.get('AUTH_COOKIE', 'access'))
            
        if raw_token is None:
            return None

        try:
            validated_token = self.get_validated_token(raw_token)
            return self.get_user(validated_token), validated_token
        except Exception:
            # If token in header/cookie is invalid, fallback to checking cookie if we haven't already
            # or just return None to allow other authenticators or fail with 401
            return None
