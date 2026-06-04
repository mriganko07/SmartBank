from django.urls import path
from views import (
    register, login, get_user_profile,
    create_transaction, get_user_transactions, get_transaction_detail,
    get_user_alerts, mark_alert_as_read, mark_all_alerts_read,
    get_dashboard_stats, get_analytics_data,
)
from views_extension import (
    verify_otp, resend_otp,
    list_sessions, revoke_session, revoke_all_sessions, session_heartbeat,
    create_dispute, list_disputes, update_dispute_status,
    update_spending_limits, spending_summary,
    get_alert_preferences, update_alert_preferences,
    category_analytics, export_transactions,
    beneficiaries, delete_beneficiary, lookup_beneficiary,
)
from views_banking import fixed_deposits, break_fixed_deposit, loans, pay_loan_emi

urlpatterns = [
    # Authentication
    path('auth/register/', register, name='register'),
    path('auth/login/', login, name='login'),
    path('auth/verify-otp/', verify_otp, name='verify_otp'),
    path('auth/resend-otp/', resend_otp, name='resend_otp'),
    path('auth/profile/', get_user_profile, name='get_user_profile'),
    path('auth/profile/limits/', update_spending_limits, name='update_spending_limits'),
    path('auth/alert-preferences/', get_alert_preferences, name='alert_preferences'),
    path('auth/sessions/', list_sessions, name='list_sessions'),
    path('auth/sessions/heartbeat/', session_heartbeat, name='session_heartbeat'),
    path('auth/sessions/all/', revoke_all_sessions, name='revoke_all_sessions'),
    path('auth/sessions/<str:session_id>/', revoke_session, name='revoke_session'),

    # Transactions
    path('transactions/', get_user_transactions, name='get_user_transactions'),
    path('transactions/create/', create_transaction, name='create_transaction'),
    path('transactions/export/', export_transactions, name='export_transactions'),
    path('transactions/<str:transaction_id>/', get_transaction_detail, name='get_transaction_detail'),

    # Beneficiaries (saved payees)
    path('beneficiaries/', beneficiaries, name='beneficiaries'),
    path('beneficiaries/lookup/', lookup_beneficiary, name='lookup_beneficiary'),
    path('beneficiaries/<str:beneficiary_id>/', delete_beneficiary, name='delete_beneficiary'),

    # Alerts
    path('alerts/', get_user_alerts, name='get_user_alerts'),
    path('alerts/read-all/', mark_all_alerts_read, name='mark_all_alerts_read'),
    path('alerts/<str:alert_id>/read/', mark_alert_as_read, name='mark_alert_as_read'),

    # Disputes
    path('disputes/', list_disputes, name='list_disputes'),
    path('disputes/create/', create_dispute, name='create_dispute'),
    path('disputes/<str:dispute_id>/status/', update_dispute_status, name='update_dispute_status'),

    # Analytics
    path('analytics/dashboard/', get_dashboard_stats, name='get_dashboard_stats'),
    path('analytics/data/', get_analytics_data, name='get_analytics_data'),
    path('analytics/spending-summary/', spending_summary, name='spending_summary'),
    path('analytics/categories/', category_analytics, name='category_analytics'),

    # Banking products (FD, Loans)
    path('banking/fd/', fixed_deposits, name='fixed_deposits'),
    path('banking/fd/<str:fd_id>/break/', break_fixed_deposit, name='break_fixed_deposit'),
    path('banking/loans/', loans, name='loans'),
    path('banking/loans/<str:loan_id>/pay/', pay_loan_emi, name='pay_loan_emi'),
]
