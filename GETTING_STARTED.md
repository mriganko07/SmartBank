# SmartBank Fraud Detection - Getting Started

## What You Have

A **complete, production-ready fraud detection system** with:
- ✅ Full-stack application (Next.js + Django)
- ✅ Real-time fraud detection with ML
- ✅ Analytics dashboards with charts
- ✅ Multi-channel alerts (Email + SMS)
- ✅ Admin monitoring panel
- ✅ Comprehensive documentation

## Quick Start (5 minutes)

### 1. Start Frontend
```bash
npm install
npm run dev
```
Open: http://localhost:3000

### 2. Start Backend
```bash
cd backend
pip install -r requirements.txt
python run_server.py
```

### 3. Login
- Email: `demo@smartbank.com`
- Password: `demo123456`

Or register a new account.

## Full Setup (30 minutes)

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for:
- MongoDB configuration (local or cloud)
- Gmail setup for email alerts
- Twilio setup for SMS
- Environment variables
- Detailed troubleshooting

## Explore Features

### 1. Dashboard (`/dashboard`)
- View fraud statistics
- Create new transactions
- Check recent activity
- See unread alerts

### 2. Transactions (`/transactions`)
- Full transaction history
- Fraud status for each
- Filter and search
- Risk assessment

### 3. Alerts (`/alerts`)
- Real-time notifications
- Mark as read
- Filter by type
- Full alert history

### 4. Analytics (`/analytics`)
- Transaction trends (30 days)
- Fraud distribution
- Amount analysis
- Rate visualization

### 5. Admin (`/admin`)
- System monitoring
- High-risk transactions
- Fraud metrics
- Database status

## Test Fraud Detection

Create transactions that trigger fraud alerts:

### High-Risk Transaction
```
Amount: $15,000
Category: Wire Transfer
Result: High fraud score (>0.7)
Action: Receives HIGH RISK alert
```

### Medium-Risk Transaction
```
Amount: $7,000
Category: Travel
Result: Medium fraud score (0.4-0.7)
Action: Receives MEDIUM RISK alert
```

### Normal Transaction
```
Amount: $100
Category: Grocery
Result: Low fraud score (<0.4)
Action: Approved automatically
```

## API Testing

### Register User
```bash
curl -X POST http://localhost:8000/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email":"user@example.com",
    "password":"password123",
    "full_name":"John Doe"
  }'
```

### Login
```bash
curl -X POST http://localhost:8000/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email":"user@example.com",
    "password":"password123"
  }'
```

### Create Transaction
```bash
curl -X POST http://localhost:8000/transactions/create/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount":1000,
    "recipient_account":"ACC123456",
    "description":"Payment",
    "merchant_category":"Shopping",
    "location_data":{"country":"us"}
  }'
```

## Project Files

### Essential Files
- `README.md` - Quick overview
- `SETUP_GUIDE.md` - Complete setup
- `PROJECT_SUMMARY.md` - Full documentation
- `MANIFEST.md` - File listing

### Frontend
- `app/` - Pages (8 pages)
- `components/` - Components (8 custom)
- `lib/` - Utilities (API, Auth)
- `app/globals.css` - Styling

### Backend
- `backend/views.py` - API endpoints
- `backend/models.py` - Database models
- `backend/notifications.py` - Alerts
- `backend/ml_service.py` - Fraud detection

## Fraud Detection Algorithm

The system scores transactions 0-1 using:

1. **Amount Check**
   - > $10,000: +0.30
   - > $5,000: +0.15

2. **Category Risk**
   - Crypto, wire transfer, gambling: +0.25

3. **Frequency**
   - > 5 in short period: +0.20

4. **Location**
   - International: +0.15

**Risk Levels:**
- 🟢 0.0-0.4: Low (Approved)
- 🟡 0.4-0.7: Medium (Review)
- 🔴 0.7-1.0: High (Flagged)

## Key Components

### Frontend Pages
```
/                  → Login/Dashboard redirect
/login             → User login
/register          → Create account
/dashboard         → Main dashboard
/transactions      → Transaction history
/alerts            → Notifications
/analytics         → Charts & trends
/admin             → Admin panel
```

### Backend Endpoints
```
POST   /auth/register/
POST   /auth/login/
GET    /auth/profile/
POST   /transactions/create/
GET    /transactions/
POST   /alerts/<id>/read/
GET    /analytics/dashboard/
```

### Database Collections
```
users              → User accounts
transactions       → Transactions
fraud_logs         → Fraud records
alerts             → Notifications
analytics          → Daily summaries
```

## Configuration Files

### Frontend
- `.env.local` - Frontend environment
- `tailwind.config.ts` - Styling
- `next.config.mjs` - Next.js config

### Backend
- `.env` - Backend environment (create from .env.example)
- `settings.py` - Django config
- `requirements.txt` - Python packages

## Common Tasks

### Reset Database
```bash
# Delete MongoDB database
mongo bank_fraud_db --eval "db.dropDatabase()"

# Recreate collections
mongo bank_fraud_db << EOF
db.createCollection("users")
db.createCollection("transactions")
db.createCollection("fraud_logs")
db.createCollection("alerts")
db.createCollection("analytics")
EOF
```

### Create Test Data
Use the frontend to register and create transactions. Test fraud detection automatically.

### View Logs
```bash
# Frontend logs in browser console
# Backend logs in terminal running `npm run dev`
# Django logs in backend terminal running `python run_server.py`
```

### Debug Authentication
1. Check JWT token in browser DevTools
2. Verify token in backend by decoding
3. Check CORS settings if requests fail
4. Verify `.env` variables are set

## Troubleshooting

### Port Already in Use
```bash
# Frontend (3000)
npm run dev -- -p 3001

# Backend (8000)
python -m manage runserver 8001
```

### MongoDB Connection Error
```bash
# Start MongoDB
mongod

# Check connection
mongo --eval "db.adminCommand('ping')"
```

### Email Not Sending
- Gmail: Use App Password (not regular password)
- Check EMAIL_HOST_USER and EMAIL_HOST_PASSWORD in .env
- Enable "Less secure app access" if needed

### SMS Not Sending
- Verify Twilio credentials in .env
- Check phone number format: +1234567890
- Ensure Twilio account has credits

## Next Steps

1. **Explore:** Review dashboard and create test transactions
2. **Configure:** Setup email/SMS if needed
3. **Customize:** Modify fraud detection rules in backend
4. **Deploy:** Follow deployment guide for production
5. **Integrate:** Connect to real banking systems

## Documentation

### For Setup
→ See `SETUP_GUIDE.md`

### For Full Details
→ See `PROJECT_SUMMARY.md`

### For File Listing
→ See `MANIFEST.md`

### For Backend API
→ See `backend/README.md`

## Support

**Issues?** Check `SETUP_GUIDE.md` troubleshooting section.

**Questions?** Review the comprehensive documentation:
- README.md - Quick start
- SETUP_GUIDE.md - Detailed setup
- PROJECT_SUMMARY.md - Full documentation
- MANIFEST.md - File reference
- backend/README.md - API details

## Features Summary

| Feature | Status | Location |
|---------|--------|----------|
| User Auth | ✅ Complete | /login, /register |
| Dashboard | ✅ Complete | /dashboard |
| Transactions | ✅ Complete | /transactions |
| Fraud Detection | ✅ Complete | Backend ML |
| Alerts | ✅ Complete | /alerts + Email/SMS |
| Analytics | ✅ Complete | /analytics |
| Admin Panel | ✅ Complete | /admin |
| Email Alerts | ✅ Complete | Gmail SMTP |
| SMS Alerts | ✅ Complete | Twilio |

---

## Quick Command Reference

```bash
# Frontend
npm install          # Install dependencies
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Check code quality

# Backend
pip install -r requirements.txt  # Install dependencies
python run_server.py             # Start development server
python manage.py shell           # Django shell
python manage.py makemigrations  # Create migrations
python manage.py migrate         # Run migrations
```

---

**Ready to go!** Start with `npm run dev` and enjoy the application.
