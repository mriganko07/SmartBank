"""Auth helpers: OTP, sessions, JWT, User-Agent parsing."""
import re
import secrets
import uuid
from datetime import datetime, timedelta

import jwt
from decouple import config

SECRET_KEY = config('SECRET_KEY', default='your-secret-key-change-in-production')

DEFAULT_ALERT_PREFS = {
    'amount_threshold': 5000,
    'notify_international': True,
    'notify_high_risk_category': True,
    'notify_frequency': True,
    'channels': {'in_app': True, 'email': True, 'sms': True},
}

DEFAULT_SPENDING_LIMIT = {'weekly': None, 'monthly': None}


def generate_otp():
    return f"{secrets.randbelow(1000000):06d}"


def parse_user_agent(ua_string):
    ua = ua_string or ''
    browser = 'Unknown Browser'
    os_name = 'Unknown OS'
    device_name = 'Desktop'

    if re.search(r'Mobile|Android|iPhone|iPad', ua, re.I):
        device_name = 'Mobile'
    if 'iPad' in ua or 'Tablet' in ua:
        device_name = 'Tablet'
    if 'Windows' in ua:
        os_name = 'Windows'
    elif 'Mac OS' in ua or 'Macintosh' in ua:
        os_name = 'macOS'
    elif 'Android' in ua:
        os_name = 'Android'
    elif 'iPhone' in ua or 'iPad' in ua:
        os_name = 'iOS'
    elif 'Linux' in ua:
        os_name = 'Linux'

    if 'Edg/' in ua:
        browser = 'Edge'
    elif 'Chrome/' in ua and 'Chromium' not in ua:
        browser = 'Chrome'
    elif 'Firefox/' in ua:
        browser = 'Firefox'
    elif 'Safari/' in ua and 'Chrome' not in ua:
        browser = 'Safari'

    return {
        'device_name': device_name,
        'browser': browser,
        'os': os_name,
    }


def get_client_ip(request):
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', 'Unknown')


def build_jwt_payload(user, session_id, account_number):
    return {
        'user_id': str(user['_id']),
        'email': user['email'],
        'full_name': user['full_name'],
        'account_number': account_number,
        'session_id': session_id,
    }


def encode_jwt(payload):
    token = jwt.encode(payload, SECRET_KEY, algorithm='HS256')
    if isinstance(token, bytes):
        token = token.decode('utf-8')
    return token


def decode_jwt(token):
    return jwt.decode(token, SECRET_KEY, algorithms=['HS256'])


def get_user_from_token(request, secret_key=SECRET_KEY):
    """Extract user id from authenticated request or Bearer token."""
    user = getattr(request, 'user', None)
    if user and getattr(user, 'user_id', None):
        return user.user_id
    try:
        token = request.META.get('HTTP_AUTHORIZATION', '').replace('Bearer ', '')
        payload = jwt.decode(token, secret_key, algorithms=['HS256'])
        return payload.get('user_id')
    except Exception:
        return None


def get_session_id_from_request(request, secret_key=SECRET_KEY):
    user = getattr(request, 'user', None)
    if user and getattr(user, 'session_id', None):
        return user.session_id
    try:
        token = request.META.get('HTTP_AUTHORIZATION', '').replace('Bearer ', '')
        payload = jwt.decode(token, secret_key, algorithms=['HS256'])
        return payload.get('session_id')
    except Exception:
        return None


def build_login_response(user, account_number, session_id):
    from models import User as UserModel
    fresh = UserModel.find_by_id(str(user['_id'])) or user
    banking = UserModel.ensure_banking_details(fresh)
    payload = build_jwt_payload(fresh, session_id, account_number)
    token = encode_jwt(payload)
    return {
        'message': 'Login successful',
        'access_token': token,
        'user': {
            'id': str(fresh['_id']),
            'email': fresh['email'],
            'full_name': fresh['full_name'],
            'account_number': account_number,
            'ifsc_code': banking.get('ifsc_code', fresh.get('ifsc_code', '')),
            'bank_name': banking.get('bank_name', fresh.get('bank_name', '')),
            'branch_name': banking.get('branch_name', fresh.get('branch_name', '')),
            'account_type': fresh.get('account_type', 'customer'),
        },
    }
