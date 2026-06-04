# Smart Bank Analytics & Fraud Detection Backend

Django REST API backend for the Smart Bank Analytics & Fraud Detection System.

## Setup Instructions

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env` with your actual values:
- MongoDB connection string
- Email credentials (for alerts)
- SMS API credentials (for alerts)
- ML API endpoint and key
- Secret key for JWT

### 3. MongoDB Setup

Make sure MongoDB is running locally or update `MONGODB_URI` in `.env` with your MongoDB Atlas connection string:

```bash
# Local MongoDB
MONGODB_URI=mongodb://localhost:27017/bank_fraud_db

# MongoDB Atlas (cloud)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/bank_fraud_db
```

### 4. Run the Server

```bash
python run_server.py
```

The server will start on `http://localhost:8000`

## API Endpoints

### Authentication
- `POST /auth/register/` - Register new user
- `POST /auth/login/` - Login and get JWT token
- `GET /auth/profile/` - Get current user profile (requires auth)

### Transactions
- `POST /transactions/create/` - Create new transaction (requires auth)
- `GET /transactions/` - Get user's transaction history (requires auth)
- `GET /transactions/<id>/` - Get transaction details (requires auth)

### Alerts
- `GET /alerts/` - Get user's alerts (requires auth)
- `POST /alerts/<id>/read/` - Mark alert as read (requires auth)

### Analytics
- `GET /analytics/dashboard/` - Get dashboard statistics (requires auth)
- `GET /analytics/data/` - Get analytics summaries (requires auth)

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. 

1. Call `/auth/login/` to get an access token
2. Include the token in request headers: `Authorization: Bearer <token>`

## Fraud Detection

The system integrates with an external ML API for fraud detection. If the ML API is not available, it uses local heuristics:

### Local Fraud Detection Rules
- **High-value transactions**: > $10,000 (0.3 score) or > $5,000 (0.15 score)
- **Suspicious merchants**: Crypto, wire transfers, cash advances, gambling
- **High frequency**: > 5 transactions (0.2 score)
- **International**: Non-US locations (0.15 score)

Fraud score ranges from 0 to 1:
- 0.0-0.4: Low risk
- 0.4-0.7: Medium risk
- 0.7-1.0: High risk

## Database Collections

### users
```javascript
{
  _id: ObjectId,
  email: string,
  password: string (hashed),
  full_name: string,
  phone: string,
  account_type: string, // 'customer' or 'admin'
  is_active: boolean,
  created_at: datetime,
  updated_at: datetime
}
```

### transactions
```javascript
{
  _id: ObjectId,
  user_id: ObjectId,
  amount: float,
  recipient_account: string,
  description: string,
  merchant_category: string,
  location_data: object,
  status: string, // 'pending', 'completed', 'flagged'
  fraud_score: float (0-1),
  is_flagged: boolean,
  created_at: datetime,
  updated_at: datetime
}
```

### fraud_logs
```javascript
{
  _id: ObjectId,
  transaction_id: ObjectId,
  user_id: ObjectId,
  fraud_score: float,
  flagged_reason: string,
  ml_features: object,
  created_at: datetime
}
```

### alerts
```javascript
{
  _id: ObjectId,
  user_id: ObjectId,
  alert_type: string, // 'fraud', 'suspicious', 'warning'
  title: string,
  message: string,
  transaction_id: ObjectId,
  is_read: boolean,
  created_at: datetime
}
```

### analytics
```javascript
{
  _id: ObjectId,
  date: date,
  total_transactions: int,
  fraudulent_transactions: int,
  total_amount: float,
  flagged_amount: float,
  fraud_rate: float,
  created_at: datetime
}
```

## Configuration

### Email Alerts
Configure in `.env`:
```
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
```

### SMS Alerts
Configure in `.env`:
```
SMS_PROVIDER=twilio
SMS_API_KEY=your-twilio-api-key
```

### ML API Integration
Configure in `.env`:
```
ML_API_URL=http://localhost:5000
ML_API_KEY=your-api-key
```

## Deployment

For production deployment:

1. Set `DEBUG=False` in `.env`
2. Use a production WSGI server (Gunicorn, uWSGI)
3. Set up proper database backups
4. Configure email and SMS services
5. Set secure secret keys and API keys
6. Use HTTPS

Example with Gunicorn:
```bash
gunicorn --bind 0.0.0.0:8000 wsgi:application
```

## Development Notes

- The backend uses MongoDB for data storage
- JWT tokens expire after 1 hour (configurable in settings.py)
- Fraud detection uses ML API integration with fallback heuristics
- All sensitive operations (transactions, alerts) are protected by JWT authentication
- CORS is configured for Next.js frontend on localhost:3000
