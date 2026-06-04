"""SmartBank virtual branch: IFSC and bank metadata."""
import hashlib
import re

SMARTBANK_NAME = 'SmartBank India'
SMARTBANK_BRANCH = 'SmartBank Digital Branch'
IFSC_PATTERN = re.compile(r'^[A-Z]{4}0[A-Z0-9]{6}$')


def generate_ifsc(account_number: str) -> str:
    """
    Derive a unique 11-char IFSC for a SmartBank account (SMRT0 + 6 chars).
    Deterministic per account number so it stays stable.
    """
    seed = account_number.strip().upper().encode()
    digest = hashlib.sha256(seed).hexdigest().upper()
    suffix = ''.join(c for c in digest if c.isalnum())[:6]
    return f'SMRT0{suffix}'


def validate_ifsc(ifsc: str) -> bool:
    return bool(IFSC_PATTERN.match((ifsc or '').strip().upper()))


def banking_profile_for_user(user: dict) -> dict:
    account = user.get('account_number', '')
    return {
        'bank_name': user.get('bank_name') or SMARTBANK_NAME,
        'ifsc_code': user.get('ifsc_code') or (generate_ifsc(account) if account else ''),
        'branch_name': user.get('branch_name') or SMARTBANK_BRANCH,
        'account_holder_name': user.get('full_name', ''),
    }
