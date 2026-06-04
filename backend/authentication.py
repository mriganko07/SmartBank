import jwt
from decouple import config
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from models import SessionBlacklist

SECRET_KEY = config('SECRET_KEY', default='your-secret-key-change-in-production')


class MongoUser:
    """Minimal user object for DRF IsAuthenticated checks."""

    is_authenticated = True
    is_anonymous = False

    def __init__(self, user_id, email=None, full_name=None, session_id=None, account_number=None):
        self.id = user_id
        self.user_id = user_id
        self.email = email
        self.full_name = full_name
        self.session_id = session_id
        self.account_number = account_number


class MongoJWTAuthentication(BaseAuthentication):
    """Validate access tokens issued by the custom login view."""

    keyword = 'Bearer'

    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth_header.startswith(f'{self.keyword} '):
            return None

        token = auth_header[len(self.keyword) + 1 :].strip()
        if not token:
            return None

        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        except jwt.PyJWTError as exc:
            raise AuthenticationFailed('Invalid or expired token') from exc

        user_id = payload.get('user_id')
        if not user_id:
            raise AuthenticationFailed('Invalid token payload')

        session_id = payload.get('session_id')
        if session_id and SessionBlacklist.is_blacklisted(session_id):
            raise AuthenticationFailed('Session has been revoked')

        return (
            MongoUser(
                user_id=str(user_id),
                email=payload.get('email'),
                full_name=payload.get('full_name'),
                session_id=session_id,
                account_number=payload.get('account_number'),
            ),
            token,
        )
