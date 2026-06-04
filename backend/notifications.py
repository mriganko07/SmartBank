"""
Email and SMS notification service for alerts
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from decouple import config
import requests
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Email Configuration
EMAIL_BACKEND = config('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')

# SMS Configuration
SMS_PROVIDER = config('SMS_PROVIDER', default='twilio')
SMS_API_KEY = config('SMS_API_KEY', default='')
TWILIO_ACCOUNT_SID = config('TWILIO_ACCOUNT_SID', default='')
TWILIO_AUTH_TOKEN = config('TWILIO_AUTH_TOKEN', default='')
TWILIO_PHONE = config('TWILIO_PHONE', default='+1234567890')


def send_email_alert(
    to_email: str,
    subject: str,
    alert_type: str,
    transaction_data: dict,
    fraud_score: float,
) -> bool:
    """
    Send email alert for fraudulent transaction
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        alert_type: 'fraud', 'suspicious', or 'warning'
        transaction_data: Transaction details
        fraud_score: Fraud score (0-1)
    
    Returns:
        bool: True if email sent successfully
    """
    try:
        if not EMAIL_HOST_USER:
            logger.warning(f"[v0] Email not configured. Skipping email to {to_email}")
            return False

        # Create email content
        html_content = _get_email_template(
            alert_type=alert_type,
            transaction_data=transaction_data,
            fraud_score=fraud_score,
        )

        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = EMAIL_HOST_USER
        msg['To'] = to_email

        # Attach HTML
        msg.attach(MIMEText(html_content, 'html'))

        # Send email
        with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT) as server:
            if EMAIL_USE_TLS:
                server.starttls()
            server.login(EMAIL_HOST_USER, EMAIL_HOST_PASSWORD)
            server.send_message(msg)

        logger.info(f"[v0] Email sent to {to_email}")
        return True

    except Exception as e:
        logger.error(f"[v0] Failed to send email: {str(e)}")
        return False


def send_sms_alert(
    phone_number: str,
    alert_type: str,
    transaction_data: dict,
    fraud_score: float,
) -> bool:
    """
    Send SMS alert for fraudulent transaction
    
    Args:
        phone_number: Recipient phone number
        alert_type: 'fraud', 'suspicious', or 'warning'
        transaction_data: Transaction details
        fraud_score: Fraud score (0-1)
    
    Returns:
        bool: True if SMS sent successfully
    """
    try:
        if not phone_number or not SMS_API_KEY:
            logger.warning(f"[v0] SMS not configured or no phone number")
            return False

        message = _get_sms_message(
            alert_type=alert_type,
            transaction_data=transaction_data,
            fraud_score=fraud_score,
        )

        if SMS_PROVIDER.lower() == 'twilio':
            return _send_twilio_sms(phone_number, message)
        else:
            logger.warning(f"[v0] Unknown SMS provider: {SMS_PROVIDER}")
            return False

    except Exception as e:
        logger.error(f"[v0] Failed to send SMS: {str(e)}")
        return False


def _send_twilio_sms(phone_number: str, message: str) -> bool:
    """Send SMS using Twilio"""
    try:
        import twilio.rest
        
        client = twilio.rest.Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        sms = client.messages.create(
            body=message,
            from_=TWILIO_PHONE,
            to=phone_number
        )
        
        logger.info(f"[v0] SMS sent to {phone_number}. SID: {sms.sid}")
        return True
    except ImportError:
        logger.warning("[v0] Twilio library not installed. Cannot send SMS.")
        return False
    except Exception as e:
        logger.error(f"[v0] Twilio SMS failed: {str(e)}")
        return False


def _get_email_template(alert_type: str, transaction_data: dict, fraud_score: float) -> str:
    """Get HTML email template"""
    
    risk_level = "High" if fraud_score > 0.7 else "Medium" if fraud_score > 0.4 else "Low"
    risk_color = "#dc2626" if fraud_score > 0.7 else "#f59e0b" if fraud_score > 0.4 else "#10b981"
    
    return f"""
    <html>
        <head>
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1f2937; }}
                .container {{ max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 20px; border-radius: 8px; }}
                .header {{ background: linear-gradient(to right, #3b82f6, #1e40af); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }}
                .content {{ background: white; padding: 20px; }}
                .alert-box {{ background: {risk_color}20; border-left: 4px solid {risk_color}; padding: 15px; margin: 15px 0; border-radius: 4px; }}
                .risk-badge {{ background: {risk_color}; color: white; padding: 8px 12px; border-radius: 4px; display: inline-block; font-weight: bold; }}
                .transaction-detail {{ background: #f3f4f6; padding: 10px; margin: 5px 0; border-radius: 4px; border-left: 3px solid #3b82f6; }}
                .footer {{ color: #6b7280; font-size: 12px; margin-top: 20px; text-align: center; }}
                .button {{ background: #3b82f6; color: white; padding: 10px 20px; border-radius: 4px; text-decoration: none; display: inline-block; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>SmartBank Fraud Alert</h1>
                </div>
                <div class="content">
                    <h2>Transaction Alert</h2>
                    
                    <div class="alert-box">
                        <strong>Risk Level:</strong> <span class="risk-badge">{risk_level} ({fraud_score*100:.1f}%)</span>
                    </div>
                    
                    <p>We detected a potentially fraudulent transaction on your account:</p>
                    
                    <div class="transaction-detail">
                        <strong>Amount:</strong> ${transaction_data.get('amount', 0):.2f}
                    </div>
                    <div class="transaction-detail">
                        <strong>Description:</strong> {transaction_data.get('description', 'N/A')}
                    </div>
                    <div class="transaction-detail">
                        <strong>Category:</strong> {transaction_data.get('merchant_category', 'N/A')}
                    </div>
                    <div class="transaction-detail">
                        <strong>Recipient:</strong> {transaction_data.get('recipient_account', 'N/A')}
                    </div>
                    
                    <p style="margin-top: 20px;">
                        If you recognize this transaction, you can ignore this alert. If you don't recognize it, 
                        <strong>please log in to your account immediately and review your transactions</strong>.
                    </p>
                    
                    <p style="text-align: center; margin-top: 20px;">
                        <a href="https://smartbank.example.com/dashboard" class="button">Review Transactions</a>
                    </p>
                    
                    <div class="footer">
                        <p>This is an automated security alert from SmartBank. Please do not reply to this email.</p>
                        <p>SmartBank Fraud Detection System</p>
                    </div>
                </div>
            </div>
        </body>
    </html>
    """


def _get_sms_message(alert_type: str, transaction_data: dict, fraud_score: float) -> str:
    """Get SMS message content"""
    
    amount = transaction_data.get('amount', 0)
    description = transaction_data.get('description', 'Transaction')
    risk_level = "HIGH" if fraud_score > 0.7 else "MEDIUM" if fraud_score > 0.4 else "LOW"
    
    return (
        f"SmartBank Alert: {risk_level} risk transaction detected. "
        f"${amount:.2f} for {description}. "
        f"Risk: {fraud_score*100:.0f}%. "
        f"Verify at smartbank.com or call support."
    )


def send_otp_sms(phone_number: str, otp_code: str) -> bool:
    """Send login OTP via Twilio SMS."""
    if not phone_number:
        logger.warning("[v0] No phone number for OTP")
        return False
    message = f"SmartBank: Your verification code is {otp_code}. Valid for 5 minutes."
    return _send_twilio_sms(phone_number, message)


def send_fraud_alert(
    user_email: Optional[str],
    user_phone: Optional[str],
    full_name: str,
    transaction_data: dict,
    fraud_score: float,
    channels: Optional[dict] = None,
) -> dict:
    """
    Send both email and SMS alerts for fraudulent transaction
    
    Returns:
        dict: Status of email and SMS sends
    """
    
    alert_type = "fraud" if fraud_score > 0.7 else "suspicious" if fraud_score > 0.4 else "warning"
    subject = f"SmartBank Alert: {alert_type.upper()} Transaction Detected"
    
    ch = channels or {'in_app': True, 'email': True, 'sms': True}

    result = {
        'email_sent': False,
        'sms_sent': False,
        'alert_type': alert_type,
    }
    
    # Send email
    if user_email and ch.get('email', True):
        result['email_sent'] = send_email_alert(
            to_email=user_email,
            subject=subject,
            alert_type=alert_type,
            transaction_data=transaction_data,
            fraud_score=fraud_score,
        )
    
    # Send SMS
    if user_phone and ch.get('sms', True):
        result['sms_sent'] = send_sms_alert(
            phone_number=user_phone,
            alert_type=alert_type,
            transaction_data=transaction_data,
            fraud_score=fraud_score,
        )
    
    logger.info(f"[v0] Fraud alert sent for {full_name}: email={result['email_sent']}, sms={result['sms_sent']}")
    
    return result
