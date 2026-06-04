"""
Fraud detection: weighted heuristic model with optional external ML API fallback.
"""
import math
from datetime import datetime

import requests
from decouple import config

ML_API_URL = config('ML_API_URL', default='http://localhost:5000')
ML_API_KEY = config('ML_API_KEY', default='')

SUSPICIOUS_CATEGORIES = {
    'cryptocurrency', 'wire_transfer', 'cash_advance', 'gambling',
    'money_transfer', 'international_wire', 'transfer',
}
HIGH_RISK_CATEGORIES = {'gambling', 'cryptocurrency', 'wire_transfer', 'money_transfer'}


def check_fraud(features):
    try:
        if ML_API_URL and ML_API_URL not in ('', 'http://localhost:5000', 'disabled'):
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {ML_API_KEY}',
            }
            response = requests.post(
                f'{ML_API_URL}/predict',
                json=features,
                headers=headers,
                timeout=5,
            )
            if response.status_code == 200:
                return response.json()
    except Exception as e:
        print(f'[ML] External API error: {e}')

    return _enhanced_fraud_detection(features)


def _sigmoid(x):
    return 1 / (1 + math.exp(-x))


def _enhanced_fraud_detection(features):
    """Multi-signal scoring mapped to 0–1 via sigmoid for smoother thresholds."""
    amount = float(features.get('amount', 0))
    category = (features.get('merchant_category') or '').lower().replace(' ', '_')
    location = features.get('location') or {}
    frequency = int(features.get('frequency', 1))
    transfer_type = (features.get('transfer_type') or 'IMPS').upper()
    hour = datetime.utcnow().hour
    ifsc_mismatch = bool(features.get('ifsc_mismatch', False))
    holder_mismatch = bool(features.get('holder_name_mismatch', False))
    amount_zscore = float(features.get('amount_zscore', 0))

    score_raw = 0.0
    risk_factors = []

    # Amount bands (log-scaled)
    if amount >= 50000:
        score_raw += 1.2
        risk_factors.append('Very high transfer amount')
    elif amount >= 20000:
        score_raw += 0.85
        risk_factors.append('High transfer amount')
    elif amount >= 10000:
        score_raw += 0.55
        risk_factors.append('Elevated transfer amount')
    elif amount >= 5000:
        score_raw += 0.3

    # Category risk
    if category in HIGH_RISK_CATEGORIES:
        score_raw += 0.9
        risk_factors.append(f'High-risk category: {category}')
    elif category in SUSPICIOUS_CATEGORIES:
        score_raw += 0.45
        risk_factors.append(f'Sensitive category: {category}')

    # Velocity
    if frequency >= 10:
        score_raw += 1.0
        risk_factors.append('Very high transaction velocity (24h)')
    elif frequency >= 6:
        score_raw += 0.7
        risk_factors.append('High transaction velocity (24h)')
    elif frequency >= 4:
        score_raw += 0.4
        risk_factors.append('Elevated transaction velocity')

    # Geography
    country = (location.get('country') or 'in').lower()
    if country not in ('in', 'india', 'us', 'united states', ''):
        score_raw += 0.5
        risk_factors.append(f'Cross-border indicator: {country}')

    # Transfer rail
    if transfer_type == 'RTGS' and amount < 200000:
        score_raw += 0.25
        risk_factors.append('RTGS used below typical threshold')
    if transfer_type == 'NEFT' and amount > 500000:
        score_raw += 0.2

    # Odd hours (UTC night)
    if hour < 5 or hour >= 22:
        score_raw += 0.35
        risk_factors.append('Transaction at unusual hour')

    # Banking identity mismatch
    if ifsc_mismatch:
        score_raw += 0.95
        risk_factors.append('IFSC does not match beneficiary bank records')
    if holder_mismatch:
        score_raw += 0.5
        risk_factors.append('Account holder name differs from registered profile')

    # Deviation from user average
    if amount_zscore >= 3:
        score_raw += 0.8
        risk_factors.append('Amount far above your usual pattern')
    elif amount_zscore >= 2:
        score_raw += 0.45
        risk_factors.append('Amount above your usual pattern')

    fraud_score = round(_sigmoid(score_raw - 1.2), 3)

    if fraud_score > 0.65:
        risk_level = 'high'
    elif fraud_score > 0.4:
        risk_level = 'medium'
    else:
        risk_level = 'low'

    return {
        'fraud_score': fraud_score,
        'risk_level': risk_level,
        'reason': '; '.join(risk_factors) if risk_factors else 'No significant risk indicators',
        'confidence': min(0.95, 0.7 + len(risk_factors) * 0.04),
        'rules_triggered': len(risk_factors),
    }


def get_feature_importance():
    return {
        'features': [
            {'name': 'amount', 'importance': 0.28},
            {'name': 'merchant_category', 'importance': 0.18},
            {'name': 'frequency', 'importance': 0.16},
            {'name': 'ifsc_mismatch', 'importance': 0.14},
            {'name': 'location', 'importance': 0.12},
            {'name': 'amount_zscore', 'importance': 0.07},
            {'name': 'time_of_day', 'importance': 0.05},
        ]
    }


def retrain_model(training_data):
    return {'message': 'Using enhanced heuristic model; external retrain not configured'}
