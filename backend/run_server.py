#!/usr/bin/env python
"""
Simple Django development server runner
Run with: python run_server.py
"""
import os
import sys
import django
from django.conf import settings
from django.core.management import call_command

if __name__ == "__main__":
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'settings')
    
    # Load settings
    from settings import *
    
    if not settings.configured:
        settings.configure(
            DEBUG=DEBUG,
            SECRET_KEY=SECRET_KEY,
            INSTALLED_APPS=INSTALLED_APPS,
            MIDDLEWARE=MIDDLEWARE,
            ALLOWED_HOSTS=ALLOWED_HOSTS,
            DATABASES=DATABASES,
            REST_FRAMEWORK=REST_FRAMEWORK,
            SIMPLE_JWT=SIMPLE_JWT,
            CORS_ALLOWED_ORIGINS=CORS_ALLOWED_ORIGINS,
            ROOT_URLCONF='urls',
            TEMPLATES=TEMPLATES,
            AUTH_PASSWORD_VALIDATORS=AUTH_PASSWORD_VALIDATORS,
            LANGUAGE_CODE=LANGUAGE_CODE,
            TIME_ZONE=TIME_ZONE,
            USE_I18N=USE_I18N,
            USE_TZ=USE_TZ,
            EMAIL_BACKEND=EMAIL_BACKEND,
            EMAIL_HOST=EMAIL_HOST,
            EMAIL_PORT=EMAIL_PORT,
            EMAIL_USE_TLS=EMAIL_USE_TLS,
            EMAIL_HOST_USER=EMAIL_HOST_USER,
            EMAIL_HOST_PASSWORD=EMAIL_HOST_PASSWORD,
            ML_API_URL=ML_API_URL,
            ML_API_KEY=ML_API_KEY,
        )
    
    django.setup()
    
    print("Starting Smart Bank Analytics Backend Server...")
    print("Server running on http://localhost:8000")
    print("API endpoints:")
    print("  POST   /auth/register/ - Register new user")
    print("  POST   /auth/login/ - Login user")
    print("  GET    /auth/profile/ - Get user profile")
    print("  POST   /transactions/create/ - Create transaction")
    print("  GET    /transactions/ - Get user transactions")
    print("  GET    /alerts/ - Get user alerts")
    print("  GET    /analytics/dashboard/ - Get dashboard stats")
    print("  GET    /analytics/data/ - Get analytics data")
    print("\nPress Ctrl+C to stop the server")
    
    # Use Gunicorn or simple WSGI server
    try:
        # Try using gunicorn for production-like environment
        from gunicorn.app.wsgiapp import run
        sys.argv = ['gunicorn', '--bind', '0.0.0.0:8000', 'wsgi:application']
        run()
    except ImportError:
        # Fallback to Django's development server
        call_command('runserver', '0.0.0.0:8000')
