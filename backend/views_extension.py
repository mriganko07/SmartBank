"""Extended API views for SmartBank features (imported into urls via views)."""
import csv
import io
from datetime import datetime, timedelta

from bson import ObjectId
from django.http import HttpResponse
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from models import User, Transaction, FraudLog, Alert, Session, SessionBlacklist, Dispute, Beneficiary
from serializers import BeneficiarySerializer, CreateBeneficiarySerializer
from ml_service import check_fraud
from notifications import send_fraud_alert, send_otp_sms
from utils_auth import (
    generate_otp,
    parse_user_agent,
    get_client_ip,
    build_login_response,
    DEFAULT_ALERT_PREFS,
)

from utils_auth import get_user_from_token, get_session_id_from_request
from datetime_utils import format_utc_iso


def _create_session_for_request(request, user_id):
    ua = parse_user_agent(request.META.get('HTTP_USER_AGENT', ''))
    return Session.create(
        user_id=user_id,
        device_name=ua['device_name'],
        browser=ua['browser'],
        os_name=ua['os'],
        ip_address=get_client_ip(request),
        location_city='Unknown',
    )


def _fraud_with_prefs(features, prefs, user_id):
    """Run fraud check respecting user alert preferences."""
    if not prefs.get('notify_frequency', True):
        features = {**features, 'frequency': 1}
    else:
        features['frequency'] = Transaction.count_recent_by_user(user_id, hours=24)

    if not prefs.get('notify_international', True):
        loc = features.get('location') or {}
        features = {**features, 'location': {**loc, 'country': 'us'}}

    if not prefs.get('notify_high_risk_category', True):
        cat = features.get('merchant_category', '')
        safe = ['Grocery', 'Restaurant', 'Utilities', 'Healthcare', 'Shopping', 'Other']
        if cat not in safe:
            features = {**features, 'merchant_category': 'Other'}

    return check_fraud(features)


def _check_spending_alerts(user_id, user):
    limits = User.get_spending_limit(user)
    now = datetime.utcnow()
    week_start = now - timedelta(days=now.weekday())
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    for period, start, key in [
        ('weekly', week_start, 'weekly'),
        ('monthly', month_start, 'monthly'),
    ]:
        limit = limits.get(key)
        if not limit:
            continue
        spent = Transaction.sum_amount_in_period(user_id, start)
        pct = (spent / limit) * 100 if limit else 0
        if pct >= 100:
            Alert.create(
                user_id,
                'warning',
                f'{period.title()} spending limit reached',
                f'You have spent ${spent:.2f} of your ${limit:.2f} {period} limit.',
            )
        elif pct >= 80:
            Alert.create(
                user_id,
                'warning',
                f'{period.title()} spending limit warning',
                f'You have used {pct:.0f}% of your {period} spending limit (${spent:.2f} / ${limit:.2f}).',
            )


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_otp(request):
    user_id = request.data.get('user_id')
    otp_code = request.data.get('otp_code', '').strip()
    if not user_id or not otp_code:
        return Response({'error': 'user_id and otp_code are required'}, status=400)

    user = User.find_by_id(user_id)
    if not user:
        return Response({'error': 'User not found'}, status=404)

    stored = user.get('otp_code')
    expires = user.get('otp_expires_at')
    if not stored or stored != otp_code:
        return Response({'error': 'Invalid verification code'}, status=400)
    if not expires or datetime.utcnow() > expires:
        return Response({'error': 'Verification code expired'}, status=400)

    User.clear_otp(user_id)
    account_number = User.ensure_account_number(user)
    session_id = _create_session_for_request(request, user_id)
    return Response(build_login_response(user, account_number, session_id))


@api_view(['POST'])
@permission_classes([AllowAny])
def resend_otp(request):
    user_id = request.data.get('user_id')
    if not user_id:
        return Response({'error': 'user_id is required'}, status=400)
    user = User.find_by_id(user_id)
    if not user:
        return Response({'error': 'User not found'}, status=404)

    otp_code = generate_otp()
    expires = datetime.utcnow() + timedelta(minutes=5)
    User.set_otp(user_id, otp_code, expires)
    if user.get('phone'):
        send_otp_sms(user['phone'], otp_code)
    return Response({'message': 'OTP resent successfully'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_sessions(request):
    user_id = get_user_from_token(request)
    current_sid = get_session_id_from_request(request)
    sessions = Session.find_by_user(user_id)
    data = []
    for s in sessions:
        data.append({
            'session_id': s['session_id'],
            'device_name': s.get('device_name', 'Unknown'),
            'browser': s.get('browser', 'Unknown'),
            'os': s.get('os', 'Unknown'),
            'ip_address': s.get('ip_address', ''),
            'location_city': s.get('location_city', 'Unknown'),
            'last_active': format_utc_iso(s['last_active']),
            'created_at': format_utc_iso(s['created_at']),
            'is_current': s['session_id'] == current_sid,
        })
    return Response({'data': data})


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def revoke_session(request, session_id):
    user_id = get_user_from_token(request)
    SessionBlacklist.add(session_id)
    Session.deactivate(session_id)
    return Response({'message': 'Session logged out'})


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def revoke_all_sessions(request):
    user_id = get_user_from_token(request)
    current_sid = get_session_id_from_request(request)
    sessions = Session.find_by_user(user_id)
    for s in sessions:
        if s['session_id'] != current_sid:
            SessionBlacklist.add(s['session_id'])
    Session.deactivate_all_except(user_id, current_sid or '')
    return Response({'message': 'All other sessions logged out'})


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def session_heartbeat(request):
    session_id = get_session_id_from_request(request)
    if session_id:
        Session.update_heartbeat(session_id)
    return Response({'message': 'ok'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_dispute(request):
    user_id = get_user_from_token(request)
    transaction_id = request.data.get('transaction_id')
    reason = request.data.get('reason')
    description = request.data.get('description', '').strip()

    if reason not in Dispute.REASONS:
        return Response({'error': 'Invalid reason'}, status=400)
    if len(description) < 20:
        return Response({'error': 'Description must be at least 20 characters'}, status=400)

    if not transaction_id:
        return Response({'error': 'transaction_id is required'}, status=400)

    tx = Transaction.find_by_id(transaction_id)
    if not tx:
        return Response({'error': 'Transaction not found'}, status=404)

    user = User.find_by_id(user_id)
    user_account = User.ensure_account_number(user) if user else ''
    is_sender = str(tx['user_id']) == user_id
    is_recipient = tx.get('recipient_account') == user_account
    if not is_sender and not is_recipient:
        return Response({'error': 'You can only dispute your own transactions'}, status=403)
    if not is_sender:
        return Response({
            'error': 'Only the sender can file a dispute on this transfer. Contact support for received payments.',
        }, status=400)

    existing = Dispute.find_open_for_transaction(transaction_id, user_id)
    if existing:
        return Response({
            'error': 'An open dispute already exists for this transaction',
            'dispute_id': str(existing['_id']),
        }, status=400)

    dispute_id = Dispute.create(transaction_id, user_id, reason, description)
    return Response({
        'message': 'Dispute created',
        'dispute_id': dispute_id,
        'status': 'open',
    }, status=201)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_disputes(request):
    user_id = get_user_from_token(request)
    disputes = Dispute.find_by_user(user_id)
    data = []
    for d in disputes:
        data.append({
            'id': str(d['_id']),
            'transaction_id': str(d['transaction_id']),
            'reason': d['reason'],
            'description': d['description'],
            'status': d['status'],
            'created_at': format_utc_iso(d['created_at']),
        })
    return Response({'data': data})


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_dispute_status(request, dispute_id):
    user_id = get_user_from_token(request)
    user = User.find_by_id(user_id)
    if not user or user.get('account_type') != 'admin':
        return Response({'error': 'Admin only'}, status=403)
    new_status = request.data.get('status')
    if new_status not in Dispute.STATUSES:
        return Response({'error': 'Invalid status'}, status=400)
    Dispute.update_status(dispute_id, new_status)
    return Response({'message': 'Status updated', 'status': new_status})


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_spending_limits(request):
    user_id = get_user_from_token(request)
    user = User.find_by_id(user_id)
    limits = User.get_spending_limit(user)
    weekly = request.data.get('weekly')
    monthly = request.data.get('monthly')
    if weekly is not None:
        limits['weekly'] = float(weekly) if weekly != '' else None
    if monthly is not None:
        limits['monthly'] = float(monthly) if monthly != '' else None
    User.collection.update_one(
        {'_id': ObjectId(user_id)},
        {'$set': {'spending_limit': limits, 'updated_at': datetime.utcnow()}},
    )
    return Response({'message': 'Limits updated', 'spending_limit': limits})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def spending_summary(request):
    user_id = get_user_from_token(request)
    user = User.find_by_id(user_id)
    limits = User.get_spending_limit(user)
    now = datetime.utcnow()
    week_start = now - timedelta(days=now.weekday())
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    week_spent = Transaction.sum_amount_in_period(user_id, week_start)
    month_spent = Transaction.sum_amount_in_period(user_id, month_start)

    def block(limit_val, spent):
        if not limit_val:
            return {'limit': None, 'spent': spent, 'percent': 0}
        pct = min((spent / limit_val) * 100, 100) if limit_val else 0
        return {'limit': limit_val, 'spent': spent, 'percent': round(pct, 1)}

    return Response({
        'weekly': block(limits.get('weekly'), week_spent),
        'monthly': block(limits.get('monthly'), month_spent),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_alert_preferences(request):
    user_id = get_user_from_token(request)
    user = User.find_by_id(user_id)
    return Response(User.get_alert_prefs(user))


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_alert_preferences(request):
    user_id = get_user_from_token(request)
    user = User.find_by_id(user_id)
    prefs = User.get_alert_prefs(user)
    for key in ('amount_threshold', 'notify_international', 'notify_high_risk_category', 'notify_frequency'):
        if key in request.data:
            prefs[key] = request.data[key]
    if 'channels' in request.data and isinstance(request.data['channels'], dict):
        prefs['channels'] = {**prefs['channels'], **request.data['channels']}
    User.collection.update_one(
        {'_id': ObjectId(user_id)},
        {'$set': {'alert_prefs': prefs, 'updated_at': datetime.utcnow()}},
    )
    return Response(prefs)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def category_analytics(request):
    user_id = get_user_from_token(request)
    period = request.query_params.get('period', 'monthly')
    now = datetime.utcnow()
    if period == 'weekly':
        start = now - timedelta(days=now.weekday())
        prev_start = start - timedelta(days=7)
        prev_end = start
    else:
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        prev_start = (start - timedelta(days=1)).replace(day=1)
        prev_end = start

    txs = Transaction.find_by_user_date_range(user_id, start, None)
    prev_txs = Transaction.find_by_user_date_range(user_id, prev_start, prev_end)

    totals = {}
    prev_totals = {}
    for tx in txs:
        cat = tx.get('merchant_category', 'Other')
        totals[cat] = totals.get(cat, 0) + tx['amount']
    for tx in prev_txs:
        cat = tx.get('merchant_category', 'Other')
        prev_totals[cat] = prev_totals.get(cat, 0) + tx['amount']

    grand = sum(totals.values()) or 1
    categories = sorted(totals.keys(), key=lambda c: totals[c], reverse=True)
    data = []
    for cat in categories:
        amt = totals[cat]
        prev_amt = prev_totals.get(cat, 0)
        change = ((amt - prev_amt) / prev_amt * 100) if prev_amt else (100 if amt else 0)
        data.append({
            'category': cat,
            'total_amount': round(amt, 2),
            'count': sum(1 for t in txs if t.get('merchant_category') == cat),
            'percent_of_total': round(amt / grand * 100, 1),
            'prev_period_amount': round(prev_amt, 2),
            'change_percent': round(change, 1),
        })
    return Response({'period': period, 'data': data})


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def beneficiaries(request):
    user_id = get_user_from_token(request)
    if request.method == 'GET':
        items = Beneficiary.find_by_user(user_id)
        for item in items:
            item['id'] = str(item['_id'])
            del item['_id']
            item['created_at'] = format_utc_iso(item['created_at'])
        serializer = BeneficiarySerializer(items, many=True)
        return Response({'count': len(items), 'data': serializer.data})

    serializer = CreateBeneficiarySerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    account = serializer.validated_data['account_number']
    recipient = User.find_by_account_number(account)
    if not recipient:
        return Response(
            {'account_number': ['SmartBank account number not found']},
            status=400,
        )
    if str(recipient['_id']) == str(user_id):
        return Response(
            {'account_number': ['You cannot add your own account as a beneficiary']},
            status=400,
        )

    existing = Beneficiary.find_by_account(user_id, account)
    if existing:
        return Response({'error': 'Beneficiary already saved for this account'}, status=400)

    bid = Beneficiary.create(
        user_id=user_id,
        account_holder_name=serializer.validated_data['account_holder_name'],
        account_number=account,
        ifsc_code=serializer.validated_data['ifsc_code'],
        bank_name=serializer.validated_data['bank_name'],
        nickname=serializer.validated_data.get('nickname') or '',
    )
    return Response({'message': 'Beneficiary saved', 'id': bid}, status=201)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_beneficiary(request, beneficiary_id):
    user_id = get_user_from_token(request)
    if not Beneficiary.delete(beneficiary_id, user_id):
        return Response({'error': 'Beneficiary not found'}, status=404)
    return Response({'message': 'Beneficiary removed'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def lookup_beneficiary(request):
    """Prefill transfer form from saved beneficiary or registered user name."""
    user_id = get_user_from_token(request)
    account = (request.query_params.get('account_number') or '').strip().upper()
    if not account:
        return Response({'error': 'account_number is required'}, status=400)

    saved = Beneficiary.find_by_account(user_id, account)
    if saved:
        return Response({
            'source': 'beneficiary',
            'account_holder_name': saved['account_holder_name'],
            'ifsc_code': saved['ifsc_code'],
            'bank_name': saved['bank_name'],
            'account_number': saved['account_number'],
        })

    user = User.find_by_account_number(account)
    if not user:
        return Response({'found': False, 'error': 'Account not found'}, status=404)

    if str(user['_id']) == str(user_id):
        return Response({'error': 'Cannot transfer to your own account'}, status=400)

    banking = User.ensure_banking_details(user)
    return Response({
        'source': 'registered_user',
        'account_holder_name': user.get('full_name', ''),
        'account_number': account,
        'ifsc_code': banking.get('ifsc_code', user.get('ifsc_code', '')),
        'bank_name': banking.get('bank_name', user.get('bank_name', '')),
        'branch_name': banking.get('branch_name', user.get('branch_name', '')),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_transactions(request):
    user_id = get_user_from_token(request)
    fmt = request.query_params.get('format', 'csv')
    start_s = request.query_params.get('start_date')
    end_s = request.query_params.get('end_date')

    start_date = datetime.fromisoformat(start_s) if start_s else datetime.utcnow() - timedelta(days=30)
    end_date = datetime.fromisoformat(end_s) if end_s else datetime.utcnow()

    from views import _build_transaction_feed

    user = User.find_by_id(user_id)
    feed = _build_transaction_feed(user_id)
    end_bound = end_date + timedelta(days=1)

    def risk_label(score, flagged):
        if flagged or score > 0.7:
            return 'High'
        if score > 0.4:
            return 'Medium'
        return 'Low'

    rows = []
    for tx in feed:
        raw_created = tx['created_at']
        if raw_created.endswith('Z'):
            created = datetime.fromisoformat(raw_created.replace('Z', '+00:00'))
        else:
            created = datetime.fromisoformat(raw_created + '+00:00')
        created = created.replace(tzinfo=None)
        if created < start_date or created >= end_bound:
            continue
        loc = tx.get('location_data') or {}
        loc_str = loc.get('country', 'N/A')
        is_in = tx.get('direction') == 'incoming'
        rows.append({
            'Date': created.strftime('%Y-%m-%d %H:%M'),
            'Direction': 'Received' if is_in else 'Sent',
            'Your Account': tx.get('user_account', ''),
            'Counterparty': tx.get('counterparty_name', ''),
            'Counterparty Account': tx.get('counterparty_account', ''),
            'Account Holder': tx.get('recipient_account_holder', ''),
            'Bank': tx.get('recipient_bank_name', ''),
            'IFSC': tx.get('recipient_ifsc', ''),
            'Transfer Type': tx.get('transfer_type', 'IMPS'),
            'Category': tx.get('merchant_category', ''),
            'Amount': tx.get('amount', 0),
            'Location': loc_str,
            'Risk Level': risk_label(tx.get('fraud_score', 0), tx.get('is_flagged', False)) if not is_in else 'N/A',
            'Fraud Score': f"{tx.get('fraud_score', 0) * 100:.1f}%" if not is_in else 'N/A',
            'Status': tx.get('status', ''),
        })

    fname = f"transactions_{start_date.date()}_{end_date.date()}"

    if fmt == 'pdf':
        try:
            from reportlab.lib import colors
            from reportlab.lib.pagesizes import letter
            from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
            from reportlab.lib.styles import getSampleStyleSheet
        except ImportError:
            return Response({'error': 'reportlab not installed'}, status=500)

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        styles = getSampleStyleSheet()
        elements = [
            Paragraph('<b>SmartBank</b> — Transaction Export', styles['Title']),
            Paragraph(f"Account holder: {user.get('full_name', '')}", styles['Normal']),
            Paragraph(f"Range: {start_date.date()} to {end_date.date()}", styles['Normal']),
            Spacer(1, 12),
        ]
        table_data = [[
            'Date', 'Direction', 'Your Account', 'Counterparty', 'Counterparty Account',
            'Holder', 'Bank', 'IFSC', 'Type', 'Category', 'Amount', 'Location', 'Risk', 'Score', 'Status',
        ]]
        for r in rows:
            table_data.append([
                r['Date'], r['Direction'], r['Your Account'], r['Counterparty'],
                r['Counterparty Account'], r['Account Holder'], r['Bank'], r['IFSC'],
                r['Transfer Type'], r['Category'], f"${r['Amount']:.2f}",
                r['Location'], r['Risk Level'], r['Fraud Score'], r['Status'],
            ])
        table = Table(table_data, repeatRows=1)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ]))
        elements.append(table)
        doc.build(elements)
        buffer.seek(0)
        response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{fname}.pdf"'
        return response

    output = io.StringIO()
    default_fields = [
        'Date', 'Direction', 'Your Account', 'Counterparty', 'Counterparty Account',
        'Account Holder', 'Bank', 'IFSC', 'Transfer Type',
        'Category', 'Amount', 'Location', 'Risk Level', 'Fraud Score', 'Status',
    ]
    writer = csv.DictWriter(output, fieldnames=list(rows[0].keys()) if rows else default_fields)
    writer.writeheader()
    writer.writerows(rows)
    response = HttpResponse(output.getvalue(), content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="{fname}.csv"'
    return response
