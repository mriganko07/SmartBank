from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from models import User, Transaction, FraudLog, Alert, Analytics, Beneficiary
from serializers import (
    UserRegistrationSerializer, UserLoginSerializer, TransactionSerializer,
    CreateTransactionSerializer, AlertSerializer, AnalyticsSerializer
)
from ml_service import check_fraud
from notifications import send_fraud_alert, send_otp_sms
import jwt
from decouple import config
from datetime import datetime, timedelta
from bson import ObjectId
from utils_auth import generate_otp, get_user_from_token
from datetime_utils import format_utc_iso


SECRET_KEY = config('SECRET_KEY', default='your-secret-key-change-in-production')


def _resolve_sender_account(tx, sender_user=None):
    if tx.get('sender_account'):
        return tx['sender_account']
    if sender_user:
        return User.ensure_account_number(sender_user)
    sender = User.find_by_id(str(tx['user_id']))
    return User.ensure_account_number(sender) if sender else 'Unknown'


def _build_transaction_feed(user_id):
    """Merge outgoing and incoming transfers with counterparty labels."""
    user = User.find_by_id(user_id)
    if not user:
        return []
    user_account = User.ensure_account_number(user)

    outgoing = Transaction.find_by_user(user_id, limit=100)
    incoming = Transaction.find_incoming_by_account(user_account, exclude_user_id=user_id, limit=100)

    feed = []

    for tx in outgoing:
        recipient = User.find_by_account_number(tx.get('recipient_account', ''))
        sender_account = _resolve_sender_account(tx, user)
        feed.append({
            **tx,
            'id': str(tx['_id']),
            'direction': 'outgoing',
            'user_account': user_account,
            'sender_account': sender_account,
            'recipient_account': tx.get('recipient_account', ''),
            'counterparty_account': tx.get('recipient_account', ''),
            'counterparty_name': recipient.get('full_name', 'Unknown') if recipient else 'Unknown',
            'recipient_account_holder': tx.get('recipient_account_holder', ''),
            'recipient_ifsc': tx.get('recipient_ifsc', ''),
            'recipient_bank_name': tx.get('recipient_bank_name', ''),
            'transfer_type': tx.get('transfer_type', 'IMPS'),
            'created_at': format_utc_iso(tx['created_at']),
            'updated_at': format_utc_iso(tx['updated_at']),
        })

    for tx in incoming:
        sender = User.find_by_id(str(tx['user_id']))
        sender_account = _resolve_sender_account(tx, sender)
        feed.append({
            **tx,
            'id': str(tx['_id']),
            'direction': 'incoming',
            'user_account': user_account,
            'sender_account': sender_account,
            'recipient_account': user_account,
            'counterparty_account': sender_account,
            'counterparty_name': sender.get('full_name', 'Unknown') if sender else 'Unknown',
            'recipient_account_holder': tx.get('recipient_account_holder', ''),
            'recipient_ifsc': tx.get('recipient_ifsc', ''),
            'recipient_bank_name': tx.get('recipient_bank_name', ''),
            'transfer_type': tx.get('transfer_type', 'IMPS'),
            'created_at': format_utc_iso(tx['created_at']),
            'updated_at': format_utc_iso(tx['updated_at']),
        })

    feed.sort(key=lambda x: x['created_at'], reverse=True)
    return feed


# ============== Authentication Views ==============

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """Register a new user"""
    serializer = UserRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response({
            'message': 'User registered successfully',
            'data': serializer.data
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """Validate credentials and send OTP (JWT issued after verify-otp)."""
    serializer = UserLoginSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data
        user_id = str(user['_id'])
        otp_code = generate_otp()
        expires = datetime.utcnow() + timedelta(minutes=5)
        User.set_otp(user_id, otp_code, expires)
        if user.get('phone'):
            send_otp_sms(user['phone'], otp_code)
        payload = {
            'message': 'OTP sent to your registered phone number',
            'user_id': user_id,
        }
        if config('DEBUG', default=True, cast=bool) and not user.get('phone'):
            payload['dev_otp'] = otp_code
        return Response(payload, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_profile(request):
    """Get current user profile"""
    user_id = get_user_from_token(request)
    if not user_id:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)
    
    user = User.find_by_id(user_id)
    if not user:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    account_number = User.ensure_account_number(user)
    user = User.find_by_id(user_id)
    banking = User.ensure_banking_details(user)

    return Response({
        'id': str(user['_id']),
        'email': user['email'],
        'full_name': user['full_name'],
        'phone': user.get('phone', ''),
        'account_number': account_number,
        'ifsc_code': banking.get('ifsc_code', user.get('ifsc_code', '')),
        'bank_name': banking.get('bank_name', user.get('bank_name', '')),
        'branch_name': banking.get('branch_name', user.get('branch_name', '')),
        'account_type': user.get('account_type', 'customer'),
        'created_at': format_utc_iso(user.get('created_at')),
    })


# ============== Transaction Views ==============

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_transaction(request):
    """Create a new transaction"""
    user_id = get_user_from_token(request)
    if not user_id:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)
    
    serializer = CreateTransactionSerializer(
        data=request.data,
        context={'sender_id': user_id},
    )
    if serializer.is_valid():
        user_data = User.find_by_id(user_id)
        sender_account = User.ensure_account_number(user_data) if user_data else None
        transaction_id = Transaction.create(
            user_id=user_id,
            amount=serializer.validated_data['amount'],
            recipient_account=serializer.validated_data['recipient_account'],
            description=serializer.validated_data['description'],
            merchant_category=serializer.validated_data['merchant_category'],
            location_data=serializer.validated_data.get('location_data', {}),
            sender_account=sender_account,
            recipient_account_holder=serializer.validated_data['recipient_account_holder'],
            recipient_ifsc=serializer.validated_data['recipient_ifsc'],
            recipient_bank_name=serializer.validated_data['recipient_bank_name'],
            transfer_type=serializer.validated_data.get('transfer_type', 'IMPS'),
        )

        if serializer.validated_data.get('save_beneficiary'):
            existing = Beneficiary.find_by_account(
                user_id, serializer.validated_data['recipient_account']
            )
            if not existing:
                Beneficiary.create(
                    user_id=user_id,
                    account_holder_name=serializer.validated_data['recipient_account_holder'],
                    account_number=serializer.validated_data['recipient_account'],
                    ifsc_code=serializer.validated_data['recipient_ifsc'],
                    bank_name=serializer.validated_data['recipient_bank_name'],
                )
        
        transaction = Transaction.find_by_id(transaction_id)
        prefs = User.get_alert_prefs(user_data) if user_data else {}

        recipient_user = User.find_by_account_number(
            serializer.validated_data['recipient_account']
        )
        recipient_banking = User.ensure_banking_details(recipient_user) if recipient_user else {}
        sent_ifsc = serializer.validated_data['recipient_ifsc']
        sent_holder = serializer.validated_data['recipient_account_holder'].strip().lower()
        reg_ifsc = recipient_banking.get('ifsc_code', '')
        reg_holder = (recipient_user.get('full_name', '') if recipient_user else '').strip().lower()

        recent_amounts = [
            t['amount'] for t in Transaction.find_by_user(user_id, limit=30)
        ]
        avg_amt = sum(recent_amounts) / len(recent_amounts) if recent_amounts else transaction['amount']
        std_amt = (
            (sum((a - avg_amt) ** 2 for a in recent_amounts) / len(recent_amounts)) ** 0.5
            if len(recent_amounts) > 1 else max(avg_amt, 1)
        )
        amount_zscore = abs(transaction['amount'] - avg_amt) / max(std_amt, 1)

        ml_features = {
            'amount': transaction['amount'],
            'merchant_category': transaction['merchant_category'],
            'location': transaction.get('location_data', {}),
            'transfer_type': serializer.validated_data.get('transfer_type', 'IMPS'),
            'ifsc_mismatch': bool(reg_ifsc and sent_ifsc.upper() != reg_ifsc.upper()),
            'holder_name_mismatch': bool(reg_holder and sent_holder != reg_holder),
            'amount_zscore': amount_zscore,
        }
        if prefs.get('notify_frequency', True):
            ml_features['frequency'] = Transaction.count_recent_by_user(user_id, hours=24)
        else:
            ml_features['frequency'] = 1
        if not prefs.get('notify_international', True):
            ml_features['location'] = {**ml_features.get('location', {}), 'country': 'us'}
        if not prefs.get('notify_high_risk_category', True):
            safe = ['Grocery', 'Restaurant', 'Utilities', 'Healthcare', 'Shopping', 'Other']
            if ml_features['merchant_category'] not in safe:
                ml_features['merchant_category'] = 'Other'

        fraud_result = check_fraud(ml_features)
        threshold = prefs.get('amount_threshold', 5000)
        amount = transaction['amount']
        if amount >= threshold and fraud_result['fraud_score'] < 0.4:
            fraud_result['fraud_score'] = max(fraud_result['fraud_score'], 0.45)
            fraud_result['reason'] = (fraud_result.get('reason', '') + f'; Above alert threshold ${threshold}').strip('; ')

        is_flagged = fraud_result['fraud_score'] > 0.5
        Transaction.update_fraud_score(transaction_id, fraud_result['fraud_score'], is_flagged)

        FraudLog.create(
            transaction_id=transaction_id,
            user_id=user_id,
            fraud_score=fraud_result['fraud_score'],
            flagged_reason=fraud_result.get('reason', ''),
            ml_features=ml_features,
        )

        channels = prefs.get('channels', {})
        if is_flagged:
            if channels.get('in_app', True):
                Alert.create(
                    user_id=user_id,
                    alert_type='fraud',
                    title='Suspicious Transaction Detected',
                    message=f"A transaction of ${transaction['amount']} has been flagged for review.",
                    transaction_id=transaction_id,
                )
            if user_data:
                send_fraud_alert(
                    user_email=user_data.get('email'),
                    user_phone=user_data.get('phone'),
                    full_name=user_data.get('full_name', 'User'),
                    transaction_data={
                        'amount': transaction['amount'],
                        'description': transaction['description'],
                        'merchant_category': transaction['merchant_category'],
                        'recipient_account': transaction['recipient_account'],
                    },
                    fraud_score=fraud_result['fraud_score'],
                    channels=channels,
                )

        if recipient_user:
            sender_name = user_data.get('full_name', 'Someone') if user_data else 'Someone'
            Alert.create(
                str(recipient_user['_id']),
                'info',
                'Money received',
                f"You received ${transaction['amount']:.2f} from {sender_name} "
                f"(account {sender_account}).",
                transaction_id=transaction_id,
            )

        if user_data:
            limits = User.get_spending_limit(user_data)
            now = datetime.utcnow()
            week_start = now - timedelta(days=now.weekday())
            month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            for label, start, key in [('weekly', week_start, 'weekly'), ('monthly', month_start, 'monthly')]:
                limit = limits.get(key)
                if not limit:
                    continue
                spent = Transaction.sum_amount_in_period(user_id, start)
                pct = (spent / limit) * 100 if limit else 0
                if pct >= 100:
                    Alert.create(user_id, 'warning', f'{label.title()} limit reached',
                                 f'Spent ${spent:.2f} of ${limit:.2f} {label} limit.')
                elif pct >= 80:
                    Alert.create(user_id, 'warning', f'{label.title()} limit warning',
                                 f'Used {pct:.0f}% of {label} limit (${spent:.2f}/${limit:.2f}).')
        
        return Response({
            'message': 'Transaction created successfully',
            'transaction_id': transaction_id,
            'fraud_score': fraud_result['fraud_score'],
            'is_flagged': is_flagged
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_transactions(request):
    """Get sent and received transaction history for the user"""
    user_id = get_user_from_token(request)
    if not user_id:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

    feed = _build_transaction_feed(user_id)
    for item in feed:
        item.pop('_id', None)

    serializer = TransactionSerializer(feed, many=True)
    return Response({
        'count': len(feed),
        'data': serializer.data
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_transaction_detail(request, transaction_id):
    """Get specific transaction details"""
    user_id = get_user_from_token(request)
    if not user_id:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)
    
    user = User.find_by_id(user_id)
    user_account = User.ensure_account_number(user) if user else ''
    transaction = Transaction.find_by_id(transaction_id)
    if not transaction:
        return Response({'error': 'Transaction not found'}, status=status.HTTP_404_NOT_FOUND)

    is_sender = str(transaction['user_id']) == user_id
    is_recipient = transaction.get('recipient_account') == user_account
    if not is_sender and not is_recipient:
        return Response({'error': 'Transaction not found'}, status=status.HTTP_404_NOT_FOUND)

    feed = _build_transaction_feed(user_id)
    match = next((t for t in feed if t['id'] == transaction_id), None)
    if not match:
        return Response({'error': 'Transaction not found'}, status=status.HTTP_404_NOT_FOUND)
    match.pop('_id', None)
    serializer = TransactionSerializer(match)
    return Response(serializer.data)


# ============== Alert Views ==============

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_alerts(request):
    """Get user's alerts"""
    user_id = get_user_from_token(request)
    if not user_id:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)
    
    unread_only = request.query_params.get('unread_only', 'false').lower() == 'true'
    alerts = Alert.find_by_user(user_id, unread_only=unread_only)
    
    serialized = []
    for alert in alerts:
        serialized.append({
            'id': str(alert['_id']),
            'alert_type': alert.get('alert_type', 'info'),
            'title': alert.get('title', ''),
            'message': alert.get('message', ''),
            'is_read': bool(alert.get('is_read', False)),
            'created_at': format_utc_iso(alert['created_at']),
            'transaction_id': str(alert['transaction_id']) if alert.get('transaction_id') else None,
        })
    
    serializer = AlertSerializer(serialized, many=True)
    return Response({
        'count': len(alerts),
        'data': serializer.data
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_alert_as_read(request, alert_id):
    """Mark alert as read"""
    user_id = get_user_from_token(request)
    if not user_id:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)
    
    if not Alert.mark_as_read(alert_id, user_id):
        return Response({'error': 'Alert not found'}, status=status.HTTP_404_NOT_FOUND)
    return Response({'message': 'Alert marked as read', 'id': alert_id, 'is_read': True})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_all_alerts_read(request):
    """Mark all alerts as read for the current user"""
    user_id = get_user_from_token(request)
    if not user_id:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)
    count = Alert.mark_all_read(user_id)
    return Response({'message': f'{count} alert(s) marked as read', 'count': count})


# ============== Analytics Views ==============

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_dashboard_stats(request):
    """Get dashboard statistics"""
    user_id = get_user_from_token(request)
    if not user_id:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)
    
    transactions = Transaction.find_by_user(user_id)
    alerts = Alert.find_by_user(user_id)
    
    total_transactions = len(transactions)
    flagged_transactions = len([t for t in transactions if t.get('is_flagged', False)])
    total_amount = sum([t['amount'] for t in transactions])
    flagged_amount = sum([t['amount'] for t in transactions if t.get('is_flagged', False)])
    
    avg_fraud_score = sum([t.get('fraud_score', 0) for t in transactions]) / total_transactions if total_transactions > 0 else 0
    unread_alerts = len([a for a in alerts if not a.get('is_read', False)])
    
    return Response({
        'total_transactions': total_transactions,
        'flagged_transactions': flagged_transactions,
        'total_amount': total_amount,
        'flagged_amount': flagged_amount,
        'average_fraud_score': avg_fraud_score,
        'unread_alerts': unread_alerts,
        'fraud_rate': (flagged_transactions / total_transactions * 100) if total_transactions > 0 else 0
    })


def _build_user_analytics_daily(user_id, days=30):
    """Aggregate per-user transaction stats by day for charts."""
    now = datetime.utcnow()
    start = (now - timedelta(days=days - 1)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    txs = Transaction.find_by_user_date_range(user_id, start, now)
    by_date = {}

    for tx in txs:
        day_key = tx['created_at'].strftime('%Y-%m-%d')
        if day_key not in by_date:
            by_date[day_key] = {
                'total_transactions': 0,
                'fraudulent_transactions': 0,
                'total_amount': 0.0,
                'flagged_amount': 0.0,
            }
        bucket = by_date[day_key]
        bucket['total_transactions'] += 1
        bucket['total_amount'] += tx['amount']
        if tx.get('is_flagged'):
            bucket['fraudulent_transactions'] += 1
            bucket['flagged_amount'] += tx['amount']

    result = []
    for i in range(days):
        day = (start + timedelta(days=i)).strftime('%Y-%m-%d')
        stats = by_date.get(day, {
            'total_transactions': 0,
            'fraudulent_transactions': 0,
            'total_amount': 0.0,
            'flagged_amount': 0.0,
        })
        total = stats['total_transactions']
        fraud = stats['fraudulent_transactions']
        result.append({
            'date': day,
            'total_transactions': total,
            'fraudulent_transactions': fraud,
            'total_amount': round(stats['total_amount'], 2),
            'flagged_amount': round(stats['flagged_amount'], 2),
            'fraud_rate': round((fraud / total * 100), 2) if total > 0 else 0.0,
        })
    return result


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_analytics_data(request):
    """Get analytics summaries for the current user"""
    user_id = get_user_from_token(request)
    if not user_id:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

    days = int(request.query_params.get('days', 30))
    analytics = _build_user_analytics_daily(user_id, days)

    serializer = AnalyticsSerializer(analytics, many=True)
    total_tx = sum(d['total_transactions'] for d in analytics)
    total_flagged = sum(d['fraudulent_transactions'] for d in analytics)
    total_amount = sum(d['total_amount'] for d in analytics)
    return Response({
        'count': len(analytics),
        'summary': {
            'total_transactions': total_tx,
            'flagged_transactions': total_flagged,
            'total_amount': round(total_amount, 2),
            'fraud_rate': round((total_flagged / total_tx * 100), 2) if total_tx > 0 else 0.0,
        },
        'data': serializer.data,
    })
