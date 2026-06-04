# SmartBank Fraud Detection System - Complete Setup Guide

This is a comprehensive banking application with real-time fraud detection using machine learning, analytics dashboards, and multi-channel alerts.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                        │
│  - Login/Register pages                                      │
│  - Customer dashboard with transaction history              │
│  - Real-time analytics with Recharts                        │
│  - Admin fraud monitoring panel                             │
│  - Alerts & notifications management                        │
└────────────────┬────────────────────────────────────────────┘
                 │ REST API (JWT Auth)
┌────────────────▼────────────────────────────────────────────┐
│               Backend (Django REST API)                      │
│  - User authentication & authorization                       │
│  - Transaction processing & storage                         │
│  - ML fraud detection integration                           │
│  - Email/SMS alert system                                   │
│  - Analytics & reporting                                    │
└────────────────┬────────────────────────────────────────────┘
                 │
    ┌────────────┼────────────┬─────────────┐
    │            │            │             │
┌───▼──┐ ┌──────▼──┐ ┌──────▼──┐ ┌───────▼─┐
│ MongoDB │ │ML API│ │Email│ │SMS │
│        │ │      │ │     │ │    │
└────────┘ └──────┘ └─────┘ └────┘
```

## Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- **MongoDB** (local or MongoDB Atlas cloud)
- **Git**

## Step 1: Frontend Setup (Next.js)

### Install Dependencies

```bash
cd /vercel/share/v0-project
npm install
# or
pnpm install
```

### Environment Variables

Create a `.env.local` file in the root:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Run Development Server

```bash
npm run dev
# Frontend will be available at http://localhost:3000
```

## Step 2: Backend Setup (Django)

### Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### Configure Environment Variables

Create a `.env` file in the `backend/` directory:

```bash
# Django Settings
DEBUG=True
SECRET_KEY=your-super-secret-key-change-in-production
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/bank_fraud_db
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/bank_fraud_db?retryWrites=true&w=majority

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Email Configuration (Gmail example)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password  # Use App Password, not regular password

# SMS Configuration (Twilio)
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE=+1234567890  # Your Twilio phone number

# ML API Configuration
ML_API_URL=http://localhost:5000  # Optional, uses local heuristics if not provided
ML_API_KEY=your-ml-api-key
```

### Setup MongoDB

**Option A: Local MongoDB**

```bash
# Install MongoDB Community Edition
# https://docs.mongodb.com/manual/installation/

# Start MongoDB
mongod

# Create database and collections
mongo
> use bank_fraud_db
> db.createCollection("users")
> db.createCollection("transactions")
> db.createCollection("fraud_logs")
> db.createCollection("alerts")
> db.createCollection("analytics")
```

**Option B: MongoDB Atlas (Cloud)**

1. Create a free account at https://www.mongodb.com/cloud/atlas
2. Create a new cluster
3. Get your connection string: `mongodb+srv://username:password@cluster.mongodb.net/bank_fraud_db`
4. Update `MONGODB_URI` in `.env`

### Run Django Server

```bash
cd backend
python run_server.py
# Backend will be available at http://localhost:8000
```

## Step 3: Email Setup (Gmail)

1. Enable 2-factor authentication on your Google account
2. Create an App Password:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and "Windows Computer"
   - Copy the generated password
   - Use this as `EMAIL_HOST_PASSWORD` in `.env`

## Step 4: SMS Setup (Twilio)

1. Create a Twilio account at https://www.twilio.com/console
2. Install Twilio SDK:
   ```bash
   pip install twilio
   ```
3. Get your credentials from the console:
   - Account SID
   - Auth Token
   - Phone number
4. Add to `.env`

## Step 5: Test the Application

### Demo Credentials

After running both servers, you can test with:

**Email:** `demo@smartbank.com`
**Password:** `demo123456`

Or create a new account by registering on the signup page.

### Test Fraud Detection

1. Create a transaction with:
   - Amount > $10,000 (triggers high-risk alert)
   - Category like "cryptocurrency" or "wire_transfer"
   - Multiple transactions in short time

2. Check:
   - Dashboard for fraud score
   - Alerts page for notifications
   - Admin panel for fraud monitoring

## API Endpoints

### Authentication
- `POST /auth/register/` - Create new account
- `POST /auth/login/` - Get JWT token
- `GET /auth/profile/` - Get current user

### Transactions
- `POST /transactions/create/` - Create transaction with fraud check
- `GET /transactions/` - Get user's transaction history
- `GET /transactions/<id>/` - Get transaction details

### Alerts
- `GET /alerts/` - Get user's alerts
- `POST /alerts/<id>/read/` - Mark alert as read

### Analytics
- `GET /analytics/dashboard/` - Dashboard statistics
- `GET /analytics/data/?days=30` - Historical analytics

## Frontend Pages

- `/` - Root redirect (auth-based)
- `/login` - Login page
- `/register` - Registration page
- `/dashboard` - Main customer dashboard
- `/transactions` - Full transaction history
- `/alerts` - Alerts & notifications
- `/analytics` - Real-time analytics with charts
- `/admin` - Admin fraud monitoring panel

## Fraud Detection Features

### Local Heuristics (Default)
The system uses intelligent fraud scoring based on:

1. **Amount Threshold**
   - > $10,000: +0.30 score
   - > $5,000: +0.15 score

2. **Merchant Categories**
   - High-risk: crypto, wire transfer, cash advance, gambling (+0.25)

3. **Transaction Frequency**
   - > 5 in short period: +0.20
   - > 3 in short period: +0.10

4. **Location Analysis**
   - International transactions: +0.15

### ML API Integration
To integrate an external ML service:

1. Replace `ML_API_URL` with your ML service endpoint
2. Ensure it accepts POST requests with transaction features
3. Should return: `{fraud_score: float, reason: string}`

## Alert System

### Email Alerts
- Triggered when fraud_score > 0.4
- Contains transaction details and risk assessment
- HTML formatted with action links

### SMS Alerts
- Sent to user's phone number
- Concise summary with risk level
- Includes link to review on mobile

### In-App Alerts
- Real-time notifications in dashboard
- Categorized by risk level
- Mark as read functionality

## Deployment

### Vercel (Frontend)
```bash
git push
# Automatically deploys on push
# Set NEXT_PUBLIC_API_URL environment variable in Vercel dashboard
```

### Backend Deployment Options

**Option 1: Heroku**
```bash
pip install gunicorn
git push heroku main
```

**Option 2: Railway / Render**
```bash
# Follow platform-specific deployment guides
gunicorn --bind 0.0.0.0:8000 wsgi:application
```

**Option 3: Docker**
```dockerfile
FROM python:3.10
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "wsgi:application"]
```

## Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  email: string,
  password: string (hashed),
  full_name: string,
  phone: string,
  account_type: string, // 'customer' or 'admin'
  is_active: boolean,
  created_at: timestamp,
  updated_at: timestamp
}
```

### Transactions Collection
```javascript
{
  _id: ObjectId,
  user_id: ObjectId,
  amount: float,
  recipient_account: string,
  description: string,
  merchant_category: string,
  location_data: object,
  status: string,
  fraud_score: float,
  is_flagged: boolean,
  created_at: timestamp,
  updated_at: timestamp
}
```

### Fraud Logs Collection
```javascript
{
  _id: ObjectId,
  transaction_id: ObjectId,
  user_id: ObjectId,
  fraud_score: float,
  flagged_reason: string,
  ml_features: object,
  created_at: timestamp
}
```

### Alerts Collection
```javascript
{
  _id: ObjectId,
  user_id: ObjectId,
  alert_type: string, // 'fraud', 'suspicious', 'warning'
  title: string,
  message: string,
  transaction_id: ObjectId,
  is_read: boolean,
  created_at: timestamp
}
```

## Troubleshooting

### MongoDB Connection Error
```
Error: connect ECONNREFUSED
```
**Solution:** Ensure MongoDB is running or check MONGODB_URI in .env

### CORS Error
```
Access to XMLHttpRequest blocked by CORS policy
```
**Solution:** Update CORS_ALLOWED_ORIGINS in Django settings.py

### Email Not Sending
```
SMTPAuthenticationError
```
**Solution:** Use Gmail App Password, not regular password. Enable 2FA.

### SMS Not Working
```
TwilioRestException
```
**Solution:** Verify Twilio credentials and phone number format

## Performance Optimization

1. **Database Indexing**
   ```javascript
   db.transactions.createIndex({ user_id: 1, created_at: -1 })
   db.fraud_logs.createIndex({ user_id: 1 })
   ```

2. **API Caching**
   - Implement Redis for frequently accessed data
   - Cache analytics data for 1 hour

3. **ML Model Caching**
   - Cache fraud model predictions
   - Batch process large transaction volumes

## Security Best Practices

1. **Passwords**
   - Minimum 8 characters
   - SHA256 hashing with salt

2. **JWT Tokens**
   - 1-hour expiration
   - Refresh tokens with 7-day expiration

3. **Database**
   - Enable MongoDB authentication
   - Use connection string encryption
   - Regular backups

4. **API**
   - HTTPS only in production
   - Rate limiting
   - Input validation

## Support & Resources

- **Django Docs:** https://docs.djangoproject.com/
- **MongoDB Docs:** https://docs.mongodb.com/
- **Next.js Docs:** https://nextjs.org/docs
- **Recharts:** https://recharts.org/
- **Twilio:** https://www.twilio.com/docs

## License

This project is open-source. Feel free to modify and deploy for your needs.
