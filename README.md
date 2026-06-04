# SmartBank Fraud Detection System

A comprehensive banking application with real-time fraud detection, analytics dashboards, and multi-channel alerts powered by machine learning.

## Quick Links

- 📖 **[Setup Guide](./SETUP_GUIDE.md)** - Complete installation and configuration
- 📋 **[Project Summary](./PROJECT_SUMMARY.md)** - Full project documentation
- 🔧 **[Backend Docs](./backend/README.md)** - Django API documentation

## Features

✨ **User Management**
- Secure registration and login
- JWT-based authentication
- User profiles with contact info

💳 **Transaction Processing**
- Create and track transactions
- Real-time fraud scoring
- Transaction history with analytics

🚨 **Fraud Detection**
- Machine learning-based scoring
- Intelligent risk assessment
- Multi-factor fraud analysis
- Risk categorization (Low/Medium/High)

📧 **Alerts & Notifications**
- In-app notifications
- Email alerts with HTML formatting
- SMS alerts via Twilio
- Alert management dashboard

📊 **Analytics & Insights**
- Real-time transaction trends
- Fraud rate visualization
- Amount analysis charts
- Admin monitoring panel
- 30-day historical data

🔒 **Security**
- Password hashing
- JWT token authentication
- CORS protection
- Input validation

## Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **shadcn/ui** - Component library
- **Recharts** - Data visualization
- **Tailwind CSS** - Styling
- **TypeScript** - Type safety

### Backend
- **Django 4.2** - Web framework
- **Django REST Framework** - API development
- **PyMongo** - MongoDB driver
- **JWT** - Authentication
- **Twilio** - SMS service

### Database
- **MongoDB** - Document database
- **MongoDB Atlas** - Cloud hosting (optional)

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- MongoDB (local or Atlas)

### 1. Frontend Setup

```bash
npm install
npm run dev
```

Frontend runs at: http://localhost:3000

### 2. Backend Setup

```bash
cd backend
pip install -r requirements.txt

# Create .env file with configuration
cp .env.example .env

# Run server
python run_server.py
```

Backend runs at: http://localhost:8000

### 3. Access Application

- **Login:** http://localhost:3000/login
- **Dashboard:** http://localhost:3000/dashboard
- **Analytics:** http://localhost:3000/analytics
- **Admin Panel:** http://localhost:3000/admin

## Demo Credentials

```
Email: demo@smartbank.com
Password: demo123456
```

## Project Structure

```
├── app/                    # Next.js pages and layouts
├── components/             # React components
├── lib/                    # Utilities and hooks
├── backend/               # Django REST API
│   ├── models.py         # MongoDB models
│   ├── views.py          # API endpoints
│   ├── serializers.py    # Data serialization
│   └── notifications.py  # Email/SMS service
├── SETUP_GUIDE.md         # Detailed setup instructions
├── PROJECT_SUMMARY.md     # Full documentation
└── README.md             # This file
```

## API Endpoints

### Authentication
- `POST /auth/register/` - Register user
- `POST /auth/login/` - Login user
- `GET /auth/profile/` - Get user profile

### Transactions
- `POST /transactions/create/` - Create transaction
- `GET /transactions/` - List transactions
- `GET /transactions/<id>/` - Get transaction details

### Alerts
- `GET /alerts/` - List alerts
- `POST /alerts/<id>/read/` - Mark alert as read

### Analytics
- `GET /analytics/dashboard/` - Dashboard stats
- `GET /analytics/data/` - Historical data

## Fraud Detection

The system uses intelligent scoring:

1. **Amount Analysis** - Large transactions trigger higher risk
2. **Merchant Categories** - High-risk categories (crypto, wire transfer)
3. **Frequency Analysis** - Multiple transactions in short time
4. **Location Validation** - International transactions

Risk Levels:
- 🟢 **Low (0.0-0.4)** - Approved
- 🟡 **Medium (0.4-0.7)** - Review needed
- 🔴 **High (0.7-1.0)** - Flagged for investigation

## Configuration

### Environment Variables

**Frontend (.env.local)**
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Backend (.env)**
```
MONGODB_URI=mongodb://localhost:27017/bank_fraud_db
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
```

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for complete configuration.

## Pages

| Page | URL | Purpose |
|------|-----|---------|
| Login | `/login` | User authentication |
| Register | `/register` | Create new account |
| Dashboard | `/dashboard` | Main overview & statistics |
| Transactions | `/transactions` | Transaction history |
| Alerts | `/alerts` | Fraud notifications |
| Analytics | `/analytics` | Charts & trends |
| Admin | `/admin` | System monitoring |

## Deployment

### Frontend (Vercel)
```bash
git push
# Auto-deploys on push
```

### Backend (Railway/Render)
```bash
# Set NEXT_PUBLIC_API_URL in environment
# Deploy with requirements.txt
gunicorn --bind 0.0.0.0:8000 wsgi:application
```

## Support

- 📖 See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed setup
- 📋 See [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) for full documentation
- 🔧 See [backend/README.md](./backend/README.md) for API details

## Troubleshooting

**MongoDB Connection Error**
- Ensure MongoDB is running: `mongod`
- Check MONGODB_URI in .env

**CORS Error**
- Verify CORS_ALLOWED_ORIGINS in Django settings
- Frontend URL must match allowed origins

**Email Not Sending**
- Use Gmail App Password (not regular password)
- Enable 2FA on Google account

**SMS Not Working**
- Verify Twilio credentials
- Check phone number format

## License

Open source - modify and deploy freely.

## Next Steps

1. Read [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed setup
2. Configure MongoDB connection
3. Setup email (Gmail) and SMS (Twilio)
4. Start frontend and backend
5. Create test transactions
6. Monitor fraud detection

---

Built with ❤️ using Next.js, Django, and MongoDB
