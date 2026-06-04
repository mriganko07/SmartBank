"""Fixed deposits, loans, and banking products."""
from datetime import datetime, timedelta
from bson import ObjectId
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from models import FixedDeposit, Loan, User
from utils_auth import get_user_from_token
from datetime_utils import format_utc_iso

FD_TENURES = (6, 12, 24, 36, 60)
FD_RATES = {6: 6.5, 12: 7.0, 24: 7.25, 36: 7.5, 60: 7.75}
LOAN_PURPOSES = ('personal', 'home', 'vehicle', 'education', 'business')
LOAN_RATE_BY_PURPOSE = {
    'personal': 12.5,
    'home': 9.5,
    'vehicle': 10.5,
    'education': 11.0,
    'business': 13.0,
}


def _emi(principal, annual_rate, months):
    if months <= 0:
        return 0.0
    r = annual_rate / 12 / 100
    if r == 0:
        return principal / months
    return principal * r * (1 + r) ** months / ((1 + r) ** months - 1)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def fixed_deposits(request):
    user_id = get_user_from_token(request)
    if request.method == 'GET':
        items = FixedDeposit.find_by_user(user_id)
        return Response({'data': [_serialize_fd(d) for d in items]})

    principal = float(request.data.get('principal', 0))
    tenure = int(request.data.get('tenure_months', 12))
    if principal < 1000:
        return Response({'error': 'Minimum FD amount is ₹1,000'}, status=400)
    if tenure not in FD_TENURES:
        return Response({'error': f'Tenure must be one of {FD_TENURES} months'}, status=400)

    rate = FD_RATES[tenure]
    fd_id = FixedDeposit.create(user_id, principal, rate, tenure)
    doc = FixedDeposit.find_by_id(fd_id)
    return Response({'message': 'Fixed deposit opened', 'data': _serialize_fd(doc)}, status=201)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def break_fixed_deposit(request, fd_id):
    user_id = get_user_from_token(request)
    doc = FixedDeposit.find_by_id(fd_id)
    if not doc or str(doc['user_id']) != user_id:
        return Response({'error': 'FD not found'}, status=404)
    if doc.get('status') != 'active':
        return Response({'error': 'FD is not active'}, status=400)
    FixedDeposit.break_early(fd_id)
    doc = FixedDeposit.find_by_id(fd_id)
    return Response({'message': 'FD broken (premature closure)', 'data': _serialize_fd(doc)})


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def loans(request):
    user_id = get_user_from_token(request)
    if request.method == 'GET':
        items = Loan.find_by_user(user_id)
        return Response({'data': [_serialize_loan(l) for l in items]})

    principal = float(request.data.get('principal', 0))
    tenure = int(request.data.get('tenure_months', 12))
    purpose = request.data.get('purpose', 'personal')
    if principal < 5000:
        return Response({'error': 'Minimum loan amount is ₹5,000'}, status=400)
    if tenure < 6 or tenure > 360:
        return Response({'error': 'Tenure must be between 6 and 360 months'}, status=400)
    if purpose not in LOAN_PURPOSES:
        return Response({'error': 'Invalid loan purpose'}, status=400)

    rate = LOAN_RATE_BY_PURPOSE[purpose]
    emi = round(_emi(principal, rate, tenure), 2)
    loan_id = Loan.create(user_id, principal, rate, tenure, purpose, emi)
    doc = Loan.find_by_id(loan_id)
    return Response({'message': 'Loan application approved', 'data': _serialize_loan(doc)}, status=201)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def pay_loan_emi(request, loan_id):
    user_id = get_user_from_token(request)
    amount = float(request.data.get('amount', 0))
    doc = Loan.find_by_id(loan_id)
    if not doc or str(doc['user_id']) != user_id:
        return Response({'error': 'Loan not found'}, status=404)
    if doc.get('status') != 'active':
        return Response({'error': 'Loan is not active'}, status=400)
    if amount <= 0:
        return Response({'error': 'Invalid payment amount'}, status=400)

    result = Loan.pay_emi(loan_id, amount)
    if not result:
        return Response({'error': 'Payment failed'}, status=400)
    doc = Loan.find_by_id(loan_id)
    return Response({'message': 'EMI recorded', 'data': _serialize_loan(doc)})


def _serialize_fd(doc):
    if not doc:
        return {}
    return {
        'id': str(doc['_id']),
        'principal': doc['principal'],
        'interest_rate': doc['interest_rate'],
        'tenure_months': doc['tenure_months'],
        'maturity_amount': doc['maturity_amount'],
        'status': doc['status'],
        'start_date': format_utc_iso(doc['start_date']),
        'maturity_date': format_utc_iso(doc['maturity_date']),
        'created_at': format_utc_iso(doc['created_at']),
    }


def _serialize_loan(doc):
    if not doc:
        return {}
    return {
        'id': str(doc['_id']),
        'principal': doc['principal'],
        'interest_rate': doc['interest_rate'],
        'tenure_months': doc['tenure_months'],
        'emi_amount': doc['emi_amount'],
        'outstanding_balance': doc['outstanding_balance'],
        'purpose': doc['purpose'],
        'status': doc['status'],
        'next_emi_date': format_utc_iso(doc['next_emi_date']),
        'created_at': format_utc_iso(doc['created_at']),
    }
