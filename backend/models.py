from pymongo import MongoClient
from datetime import datetime, timedelta
from bson import ObjectId
from decouple import config
import hashlib
import secrets
import uuid

from utils_auth import DEFAULT_ALERT_PREFS, DEFAULT_SPENDING_LIMIT
from banking_utils import SMARTBANK_NAME, SMARTBANK_BRANCH, generate_ifsc, banking_profile_for_user

MONGODB_URI = config('MONGODB_URI', default='mongodb://localhost:27017/bank_fraud_db')
client = MongoClient(MONGODB_URI)
db = client['bank_fraud_db']

class User:
    """User model for MongoDB"""
    collection = db['users']

    @staticmethod
    def generate_account_number():
        """Generate a unique SmartBank account number (SB + 10 digits)."""
        while True:
            account_number = f"SB{secrets.randbelow(10**10):010d}"
            if not User.collection.find_one({'account_number': account_number}):
                return account_number

    @staticmethod
    def ensure_account_number(user):
        """Assign an account number to legacy users who do not have one."""
        if user.get('account_number'):
            User.ensure_banking_details(user)
            return user['account_number']
        account_number = User.generate_account_number()
        ifsc_code = generate_ifsc(account_number)
        User.collection.update_one(
            {'_id': user['_id']},
            {'$set': {
                'account_number': account_number,
                'bank_name': SMARTBANK_NAME,
                'ifsc_code': ifsc_code,
                'branch_name': SMARTBANK_BRANCH,
                'updated_at': datetime.utcnow(),
            }},
        )
        return account_number

    @staticmethod
    def ensure_banking_details(user):
        """Backfill IFSC and bank name for users created before banking fields."""
        if user.get('ifsc_code') and user.get('bank_name'):
            return banking_profile_for_user(user)
        account_number = user.get('account_number') or User.ensure_account_number(user)
        ifsc_code = generate_ifsc(account_number)
        User.collection.update_one(
            {'_id': user['_id']},
            {'$set': {
                'bank_name': SMARTBANK_NAME,
                'ifsc_code': ifsc_code,
                'branch_name': SMARTBANK_BRANCH,
                'updated_at': datetime.utcnow(),
            }},
        )
        return {
            'bank_name': SMARTBANK_NAME,
            'ifsc_code': ifsc_code,
            'branch_name': SMARTBANK_BRANCH,
            'account_holder_name': user.get('full_name', ''),
        }
    
    @staticmethod
    def create(email, password, full_name, phone=None):
        """Create a new user. Returns (user_id, account_number, ifsc_code)."""
        hashed_password = hashlib.sha256(password.encode()).hexdigest()
        account_number = User.generate_account_number()
        ifsc_code = generate_ifsc(account_number)
        user = {
            'email': email,
            'password': hashed_password,
            'full_name': full_name,
            'phone': phone,
            'account_number': account_number,
            'bank_name': SMARTBANK_NAME,
            'ifsc_code': ifsc_code,
            'branch_name': SMARTBANK_BRANCH,
            'account_type': 'customer',
            'is_active': True,
            'spending_limit': dict(DEFAULT_SPENDING_LIMIT),
            'alert_prefs': dict(DEFAULT_ALERT_PREFS),
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        }
        result = User.collection.insert_one(user)
        return str(result.inserted_id), account_number, ifsc_code
    
    @staticmethod
    def find_by_email(email):
        """Find user by email"""
        return User.collection.find_one({'email': email})

    @staticmethod
    def find_by_account_number(account_number):
        """Find user by bank account number."""
        if not account_number:
            return None
        normalized = account_number.strip().upper()
        return User.collection.find_one({'account_number': normalized})
    
    @staticmethod
    def find_by_id(user_id):
        """Find user by ID"""
        return User.collection.find_one({'_id': ObjectId(user_id)})
    
    @staticmethod
    def verify_password(stored_password, provided_password):
        """Verify password"""
        return stored_password == hashlib.sha256(provided_password.encode()).hexdigest()

    @staticmethod
    def get_alert_prefs(user):
        prefs = user.get('alert_prefs') or {}
        merged = {**DEFAULT_ALERT_PREFS, **prefs}
        merged['channels'] = {
            **DEFAULT_ALERT_PREFS['channels'],
            **(prefs.get('channels') or {}),
        }
        return merged

    @staticmethod
    def get_spending_limit(user):
        return user.get('spending_limit') or dict(DEFAULT_SPENDING_LIMIT)

    @staticmethod
    def set_otp(user_id, otp_code, expires_at):
        User.collection.update_one(
            {'_id': ObjectId(user_id)},
            {'$set': {
                'otp_code': otp_code,
                'otp_expires_at': expires_at,
                'updated_at': datetime.utcnow(),
            }},
        )

    @staticmethod
    def clear_otp(user_id):
        User.collection.update_one(
            {'_id': ObjectId(user_id)},
            {'$unset': {'otp_code': '', 'otp_expires_at': ''}},
        )


class Session:
    collection = db['sessions']

    @staticmethod
    def create(user_id, device_name, browser, os_name, ip_address, location_city='Unknown'):
        session_id = str(uuid.uuid4())
        doc = {
            'session_id': session_id,
            'user_id': ObjectId(user_id),
            'device_name': device_name,
            'browser': browser,
            'os': os_name,
            'ip_address': ip_address,
            'location_city': location_city,
            'last_active': datetime.utcnow(),
            'created_at': datetime.utcnow(),
            'is_active': True,
        }
        Session.collection.insert_one(doc)
        return session_id

    @staticmethod
    def find_by_user(user_id):
        return list(
            Session.collection.find({
                'user_id': ObjectId(user_id),
                'is_active': True,
            }).sort('last_active', -1)
        )

    @staticmethod
    def update_heartbeat(session_id):
        Session.collection.update_one(
            {'session_id': session_id, 'is_active': True},
            {'$set': {'last_active': datetime.utcnow()}},
        )

    @staticmethod
    def deactivate(session_id):
        Session.collection.update_one(
            {'session_id': session_id},
            {'$set': {'is_active': False}},
        )

    @staticmethod
    def deactivate_all_except(user_id, current_session_id):
        Session.collection.update_many(
            {
                'user_id': ObjectId(user_id),
                'session_id': {'$ne': current_session_id},
                'is_active': True,
            },
            {'$set': {'is_active': False}},
        )


class SessionBlacklist:
    collection = db['session_blacklist']

    @staticmethod
    def add(session_id):
        SessionBlacklist.collection.update_one(
            {'session_id': session_id},
            {'$set': {'session_id': session_id, 'blacklisted_at': datetime.utcnow()}},
            upsert=True,
        )

    @staticmethod
    def is_blacklisted(session_id):
        return SessionBlacklist.collection.find_one({'session_id': session_id}) is not None


class Dispute:
    collection = db['disputes']
    REASONS = ('unauthorized', 'duplicate', 'wrong_amount', 'other')
    STATUSES = ('open', 'under_review', 'resolved')

    @staticmethod
    def create(transaction_id, user_id, reason, description):
        dispute = {
            'transaction_id': ObjectId(transaction_id),
            'user_id': ObjectId(user_id),
            'reason': reason,
            'description': description,
            'status': 'open',
            'created_at': datetime.utcnow(),
        }
        result = Dispute.collection.insert_one(dispute)
        return str(result.inserted_id)

    @staticmethod
    def find_by_user(user_id):
        return list(
            Dispute.collection.find({'user_id': ObjectId(user_id)}).sort('created_at', -1)
        )

    @staticmethod
    def find_by_id(dispute_id):
        return Dispute.collection.find_one({'_id': ObjectId(dispute_id)})

    @staticmethod
    def find_open_for_transaction(transaction_id, user_id):
        return Dispute.collection.find_one({
            'transaction_id': ObjectId(transaction_id),
            'user_id': ObjectId(user_id),
            'status': {'$in': ['open', 'under_review']},
        })

    @staticmethod
    def update_status(dispute_id, status):
        Dispute.collection.update_one(
            {'_id': ObjectId(dispute_id)},
            {'$set': {'status': status}},
        )


class Transaction:
    """Transaction model for MongoDB"""
    collection = db['transactions']
    
    @staticmethod
    def create(
        user_id,
        amount,
        recipient_account,
        description,
        merchant_category,
        location_data,
        sender_account=None,
        recipient_account_holder=None,
        recipient_ifsc=None,
        recipient_bank_name=None,
        transfer_type='IMPS',
    ):
        """Create a new transaction"""
        transaction = {
            'user_id': ObjectId(user_id),
            'amount': amount,
            'recipient_account': recipient_account,
            'sender_account': sender_account,
            'recipient_account_holder': recipient_account_holder or '',
            'recipient_ifsc': (recipient_ifsc or '').upper(),
            'recipient_bank_name': recipient_bank_name or '',
            'transfer_type': transfer_type or 'IMPS',
            'description': description,
            'merchant_category': merchant_category,
            'location_data': location_data,
            'status': 'pending',
            'fraud_score': 0.0,
            'is_flagged': False,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        }
        result = Transaction.collection.insert_one(transaction)
        return str(result.inserted_id)
    
    @staticmethod
    def find_by_user(user_id, limit=50):
        """Find transactions sent by user (outgoing)"""
        user_oid = ObjectId(user_id) if isinstance(user_id, str) else user_id
        return list(Transaction.collection.find({'user_id': user_oid}).sort('created_at', -1).limit(limit))

    @staticmethod
    def find_incoming_by_account(account_number, exclude_user_id=None, limit=50):
        """Find transfers received on this account number"""
        query = {'recipient_account': account_number.strip().upper()}
        if exclude_user_id:
            query['user_id'] = {'$ne': ObjectId(exclude_user_id)}
        return list(Transaction.collection.find(query).sort('created_at', -1).limit(limit))

    @staticmethod
    def find_by_user_date_range(user_id, start_date, end_date):
        user_oid = ObjectId(user_id) if isinstance(user_id, str) else user_id
        query = {'user_id': user_oid}
        if start_date or end_date:
            date_filter = {}
            if start_date:
                date_filter['$gte'] = start_date
            if end_date:
                end_dt = end_date + timedelta(days=1)
                date_filter['$lt'] = end_dt
            query['created_at'] = date_filter
        return list(Transaction.collection.find(query).sort('created_at', -1))

    @staticmethod
    def sum_amount_in_period(user_id, period_start):
        user_oid = ObjectId(user_id) if isinstance(user_id, str) else user_id
        pipeline = [
            {'$match': {'user_id': user_oid, 'created_at': {'$gte': period_start}}},
            {'$group': {'_id': None, 'total': {'$sum': '$amount'}}},
        ]
        result = list(Transaction.collection.aggregate(pipeline))
        return result[0]['total'] if result else 0.0

    @staticmethod
    def count_recent_by_user(user_id, hours=24):
        user_oid = ObjectId(user_id) if isinstance(user_id, str) else user_id
        since = datetime.utcnow() - timedelta(hours=hours)
        return Transaction.collection.count_documents({
            'user_id': user_oid,
            'created_at': {'$gte': since},
        })
    
    @staticmethod
    def find_by_id(transaction_id):
        """Find transaction by ID"""
        return Transaction.collection.find_one({'_id': ObjectId(transaction_id)})
    
    @staticmethod
    def update_fraud_score(transaction_id, fraud_score, is_flagged=False):
        """Update fraud score and flag status"""
        Transaction.collection.update_one(
            {'_id': ObjectId(transaction_id)},
            {'$set': {
                'fraud_score': fraud_score,
                'is_flagged': is_flagged,
                'updated_at': datetime.utcnow()
            }}
        )


class FraudLog:
    """Fraud detection log model"""
    collection = db['fraud_logs']
    
    @staticmethod
    def create(transaction_id, user_id, fraud_score, flagged_reason, ml_features):
        """Create fraud log entry"""
        log = {
            'transaction_id': ObjectId(transaction_id),
            'user_id': ObjectId(user_id),
            'fraud_score': fraud_score,
            'flagged_reason': flagged_reason,
            'ml_features': ml_features,
            'created_at': datetime.utcnow(),
        }
        result = FraudLog.collection.insert_one(log)
        return str(result.inserted_id)
    
    @staticmethod
    def find_by_user(user_id):
        """Find fraud logs by user"""
        user_oid = ObjectId(user_id) if isinstance(user_id, str) else user_id
        return list(FraudLog.collection.find({'user_id': user_oid}).sort('created_at', -1))


class Alert:
    """Alert model for user notifications"""
    collection = db['alerts']
    
    @staticmethod
    def create(user_id, alert_type, title, message, transaction_id=None, is_read=False):
        """Create alert"""
        alert = {
            'user_id': ObjectId(user_id),
            'alert_type': alert_type,  # 'fraud', 'suspicious', 'warning'
            'title': title,
            'message': message,
            'transaction_id': ObjectId(transaction_id) if transaction_id else None,
            'is_read': is_read,
            'created_at': datetime.utcnow(),
        }
        result = Alert.collection.insert_one(alert)
        return str(result.inserted_id)
    
    @staticmethod
    def find_by_user(user_id, unread_only=False):
        """Find alerts by user"""
        user_oid = ObjectId(user_id) if isinstance(user_id, str) else user_id
        query = {'user_id': user_oid}
        if unread_only:
            query['is_read'] = False
        return list(Alert.collection.find(query).sort('created_at', -1))
    
    @staticmethod
    def mark_as_read(alert_id, user_id):
        """Mark alert as read for the owning user."""
        result = Alert.collection.update_one(
            {'_id': ObjectId(alert_id), 'user_id': ObjectId(user_id)},
            {'$set': {'is_read': True, 'read_at': datetime.utcnow()}},
        )
        return result.modified_count > 0

    @staticmethod
    def mark_all_read(user_id):
        result = Alert.collection.update_many(
            {'user_id': ObjectId(user_id), 'is_read': {'$ne': True}},
            {'$set': {'is_read': True, 'read_at': datetime.utcnow()}},
        )
        return result.modified_count


class Beneficiary:
    """Saved payee for bank transfers"""
    collection = db['beneficiaries']

    @staticmethod
    def create(user_id, account_holder_name, account_number, ifsc_code, bank_name, nickname=None):
        doc = {
            'user_id': ObjectId(user_id),
            'account_holder_name': account_holder_name.strip(),
            'account_number': account_number.strip().upper(),
            'ifsc_code': ifsc_code.strip().upper(),
            'bank_name': bank_name.strip(),
            'nickname': (nickname or account_holder_name).strip(),
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        }
        result = Beneficiary.collection.insert_one(doc)
        return str(result.inserted_id)

    @staticmethod
    def find_by_user(user_id):
        return list(
            Beneficiary.collection.find({'user_id': ObjectId(user_id)}).sort('nickname', 1)
        )

    @staticmethod
    def find_by_id(beneficiary_id):
        return Beneficiary.collection.find_one({'_id': ObjectId(beneficiary_id)})

    @staticmethod
    def find_by_account(user_id, account_number):
        return Beneficiary.collection.find_one({
            'user_id': ObjectId(user_id),
            'account_number': account_number.strip().upper(),
        })

    @staticmethod
    def delete(beneficiary_id, user_id):
        result = Beneficiary.collection.delete_one({
            '_id': ObjectId(beneficiary_id),
            'user_id': ObjectId(user_id),
        })
        return result.deleted_count > 0


class FixedDeposit:
    collection = db['fixed_deposits']

    @staticmethod
    def _maturity_amount(principal, rate, months):
        return round(principal * (1 + (rate / 100) * (months / 12)), 2)

    @staticmethod
    def create(user_id, principal, interest_rate, tenure_months):
        start = datetime.utcnow()
        maturity = start + timedelta(days=tenure_months * 30)
        maturity_amt = FixedDeposit._maturity_amount(principal, interest_rate, tenure_months)
        doc = {
            'user_id': ObjectId(user_id),
            'principal': principal,
            'interest_rate': interest_rate,
            'tenure_months': tenure_months,
            'maturity_amount': maturity_amt,
            'status': 'active',
            'start_date': start,
            'maturity_date': maturity,
            'created_at': start,
            'updated_at': start,
        }
        result = FixedDeposit.collection.insert_one(doc)
        return str(result.inserted_id)

    @staticmethod
    def find_by_user(user_id):
        return list(
            FixedDeposit.collection.find({'user_id': ObjectId(user_id)}).sort('created_at', -1)
        )

    @staticmethod
    def find_by_id(fd_id):
        return FixedDeposit.collection.find_one({'_id': ObjectId(fd_id)})

    @staticmethod
    def break_early(fd_id):
        FixedDeposit.collection.update_one(
            {'_id': ObjectId(fd_id)},
            {'$set': {'status': 'broken', 'updated_at': datetime.utcnow()}},
        )


class Loan:
    collection = db['loans']

    @staticmethod
    def create(user_id, principal, interest_rate, tenure_months, purpose, emi_amount):
        start = datetime.utcnow()
        next_emi = start + timedelta(days=30)
        doc = {
            'user_id': ObjectId(user_id),
            'principal': principal,
            'interest_rate': interest_rate,
            'tenure_months': tenure_months,
            'emi_amount': emi_amount,
            'outstanding_balance': principal,
            'purpose': purpose,
            'status': 'active',
            'next_emi_date': next_emi,
            'created_at': start,
            'updated_at': start,
        }
        result = Loan.collection.insert_one(doc)
        return str(result.inserted_id)

    @staticmethod
    def find_by_user(user_id):
        return list(
            Loan.collection.find({'user_id': ObjectId(user_id)}).sort('created_at', -1)
        )

    @staticmethod
    def find_by_id(loan_id):
        return Loan.collection.find_one({'_id': ObjectId(loan_id)})

    @staticmethod
    def pay_emi(loan_id, amount):
        doc = Loan.find_by_id(loan_id)
        if not doc or doc.get('status') != 'active':
            return False
        new_balance = max(0.0, doc['outstanding_balance'] - amount)
        status = 'closed' if new_balance <= 0 else 'active'
        Loan.collection.update_one(
            {'_id': ObjectId(loan_id)},
            {'$set': {
                'outstanding_balance': round(new_balance, 2),
                'status': status,
                'next_emi_date': datetime.utcnow() + timedelta(days=30),
                'updated_at': datetime.utcnow(),
            }},
        )
        return True


class Analytics:
    """Analytics data model"""
    collection = db['analytics']
    
    @staticmethod
    def create_daily_summary(date, total_transactions, fraudulent_transactions, total_amount, flagged_amount):
        """Create daily analytics summary"""
        summary = {
            'date': date,
            'total_transactions': total_transactions,
            'fraudulent_transactions': fraudulent_transactions,
            'total_amount': total_amount,
            'flagged_amount': flagged_amount,
            'fraud_rate': (fraudulent_transactions / total_transactions * 100) if total_transactions > 0 else 0,
            'created_at': datetime.utcnow(),
        }
        Analytics.collection.insert_one(summary)
    
    @staticmethod
    def get_daily_summaries(days=30):
        """Get daily summaries for last N days"""
        return list(Analytics.collection.find().sort('date', -1).limit(days))
