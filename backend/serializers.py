import re

from rest_framework import serializers
from models import User, Transaction, FraudLog, Alert
from bson import ObjectId

ACCOUNT_NUMBER_PATTERN = re.compile(r'^SB\d{10}$')
IFSC_PATTERN = re.compile(r'^[A-Z]{4}0[A-Z0-9]{6}$')
TRANSFER_TYPES = ('IMPS', 'NEFT', 'RTGS')


class UserRegistrationSerializer(serializers.Serializer):
    """Serializer for user registration"""
    user_id = serializers.CharField(read_only=True)
    account_number = serializers.CharField(read_only=True)
    ifsc_code = serializers.CharField(read_only=True)
    bank_name = serializers.CharField(read_only=True)
    branch_name = serializers.CharField(read_only=True)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    full_name = serializers.CharField(max_length=255)
    phone = serializers.CharField(required=False, allow_blank=True)
    
    def validate_email(self, value):
        existing_user = User.find_by_email(value)
        if existing_user:
            raise serializers.ValidationError("Email already registered")
        return value
    
    def create(self, validated_data):
        user_id, account_number, ifsc_code = User.create(
            email=validated_data['email'],
            password=validated_data['password'],
            full_name=validated_data['full_name'],
            phone=validated_data.get('phone', ''),
        )
        return {
            'user_id': user_id,
            'account_number': account_number,
            'ifsc_code': ifsc_code,
            'bank_name': 'SmartBank India',
            'branch_name': 'SmartBank Digital Branch',
            'email': validated_data['email'],
            'full_name': validated_data['full_name'],
            'phone': validated_data.get('phone', ''),
        }


class UserLoginSerializer(serializers.Serializer):
    """Serializer for user login"""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        user = User.find_by_email(data['email'])
        if not user:
            raise serializers.ValidationError("Invalid email or password")
        
        if not User.verify_password(user['password'], data['password']):
            raise serializers.ValidationError("Invalid email or password")
        
        if not user.get('is_active', True):
            raise serializers.ValidationError("User account is inactive")
        
        return user


class TransactionSerializer(serializers.Serializer):
    """Serializer for transactions"""
    id = serializers.SerializerMethodField()
    direction = serializers.CharField(required=False)
    user_account = serializers.CharField(required=False)
    sender_account = serializers.CharField(required=False)
    recipient_account = serializers.CharField()
    counterparty_account = serializers.CharField(required=False)
    counterparty_name = serializers.CharField(required=False)
    recipient_account_holder = serializers.CharField(required=False)
    recipient_ifsc = serializers.CharField(required=False)
    recipient_bank_name = serializers.CharField(required=False)
    transfer_type = serializers.CharField(required=False)
    amount = serializers.FloatField()
    description = serializers.CharField()
    merchant_category = serializers.CharField()
    location_data = serializers.DictField(required=False)
    fraud_score = serializers.FloatField(read_only=True)
    is_flagged = serializers.BooleanField(read_only=True)
    status = serializers.CharField()
    created_at = serializers.DateTimeField(read_only=True)
    
    def get_id(self, obj):
        return str(obj.get('_id', obj.get('id', '')))


class CreateTransactionSerializer(serializers.Serializer):
    """Serializer for creating transactions"""
    amount = serializers.FloatField(min_value=0.01)
    recipient_account = serializers.CharField(min_length=12, max_length=12)
    recipient_account_holder = serializers.CharField(min_length=2, max_length=120)
    recipient_ifsc = serializers.CharField(min_length=11, max_length=11)
    recipient_bank_name = serializers.CharField(min_length=2, max_length=120)
    transfer_type = serializers.ChoiceField(choices=TRANSFER_TYPES, default='IMPS')
    description = serializers.CharField(max_length=255)
    merchant_category = serializers.CharField()
    location_data = serializers.DictField(required=False)
    save_beneficiary = serializers.BooleanField(required=False, default=False)

    def validate_recipient_ifsc(self, value):
        normalized = value.strip().upper()
        if not IFSC_PATTERN.match(normalized):
            raise serializers.ValidationError(
                "Enter a valid IFSC code (e.g. HDFC0001234 — 4 letters, 0, then 6 characters)"
            )
        return normalized

    def validate_recipient_account(self, value):
        normalized = value.strip().upper()
        if not ACCOUNT_NUMBER_PATTERN.match(normalized):
            raise serializers.ValidationError(
                "Enter a valid account number (format: SB followed by 10 digits, e.g. SB1234567890)"
            )

        recipient = User.find_by_account_number(normalized)
        if not recipient:
            raise serializers.ValidationError("Recipient account number not found")

        sender_id = self.context.get('sender_id')
        if sender_id and str(recipient['_id']) == str(sender_id):
            raise serializers.ValidationError("You cannot send money to your own account")

        return normalized
    
    def validate_amount(self, value):
        if value > 1000000:
            raise serializers.ValidationError("Amount exceeds maximum limit")
        return value

    def validate(self, data):
        recipient = User.find_by_account_number(data['recipient_account'])
        if recipient:
            banking = User.ensure_banking_details(recipient)
            reg_ifsc = banking.get('ifsc_code', '').upper()
            if reg_ifsc and data['recipient_ifsc'].upper() != reg_ifsc:
                raise serializers.ValidationError({
                    'recipient_ifsc': (
                        f'IFSC must match beneficiary records ({reg_ifsc}). '
                        'Use account lookup to auto-fill.'
                    ),
                })
            reg_name = recipient.get('full_name', '').strip().lower()
            sent_name = data['recipient_account_holder'].strip().lower()
            if reg_name and sent_name != reg_name:
                raise serializers.ValidationError({
                    'recipient_account_holder': (
                        'Account holder name must match beneficiary bank records'
                    ),
                })
        return data


class FraudLogSerializer(serializers.Serializer):
    """Serializer for fraud logs"""
    id = serializers.SerializerMethodField()
    transaction_id = serializers.SerializerMethodField()
    fraud_score = serializers.FloatField()
    flagged_reason = serializers.CharField()
    ml_features = serializers.DictField()
    created_at = serializers.DateTimeField()
    
    def get_id(self, obj):
        return str(obj.get('_id', ''))
    
    def get_transaction_id(self, obj):
        return str(obj.get('transaction_id', ''))


class AlertSerializer(serializers.Serializer):
    """Serializer for alerts"""
    id = serializers.CharField()
    alert_type = serializers.CharField()
    title = serializers.CharField()
    message = serializers.CharField()
    is_read = serializers.BooleanField(default=False)
    created_at = serializers.CharField()
    transaction_id = serializers.CharField(required=False, allow_null=True)


class BeneficiarySerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    nickname = serializers.CharField()
    account_holder_name = serializers.CharField()
    account_number = serializers.CharField()
    ifsc_code = serializers.CharField()
    bank_name = serializers.CharField()
    created_at = serializers.DateTimeField()

    def get_id(self, obj):
        return str(obj.get('_id', ''))


class CreateBeneficiarySerializer(serializers.Serializer):
    account_holder_name = serializers.CharField(min_length=2, max_length=120)
    account_number = serializers.CharField(min_length=12, max_length=12)
    ifsc_code = serializers.CharField(min_length=11, max_length=11)
    bank_name = serializers.CharField(min_length=2, max_length=120)
    nickname = serializers.CharField(required=False, allow_blank=True, max_length=80)

    def validate_account_number(self, value):
        normalized = value.strip().upper()
        if not ACCOUNT_NUMBER_PATTERN.match(normalized):
            raise serializers.ValidationError(
                "Enter a valid SmartBank account number (SB + 10 digits)"
            )
        return normalized

    def validate_ifsc_code(self, value):
        normalized = value.strip().upper()
        if not IFSC_PATTERN.match(normalized):
            raise serializers.ValidationError("Enter a valid IFSC code")
        return normalized


class AnalyticsSerializer(serializers.Serializer):
    """Serializer for analytics data"""
    date = serializers.CharField()
    total_transactions = serializers.IntegerField()
    fraudulent_transactions = serializers.IntegerField()
    total_amount = serializers.FloatField()
    flagged_amount = serializers.FloatField()
    fraud_rate = serializers.FloatField()
