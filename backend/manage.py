#!/usr/bin/env python
import os
import sys
import django
from django.conf import settings
from django.core.management import execute_from_command_line

if __name__ == "__main__":
    # Configure Django settings
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'settings')
    
    if not settings.configured:
        from settings import *
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
        )
        django.setup()
    
    execute_from_command_line(sys.argv)
