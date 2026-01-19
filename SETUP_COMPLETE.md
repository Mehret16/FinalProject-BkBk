# Complete Setup Guide - Ready to Run!

Follow these steps to get your Mental Health Chatbot backend running with all environment variables configured.

---

## ✅ What We're Setting Up

- Database: MySQL
- Email Service: Gmail or SendGrid
- Backend: Node.js + Express
- Frontend: http://localhost:3000

---

## Step 1: MySQL Database Setup (5 minutes)

### 1a. Install MySQL

**Windows:** Download from https://dev.mysql.com/downloads/mysql/
**macOS:** `brew install mysql && brew services start mysql`
**Linux:** `sudo apt-get install mysql-server && sudo systemctl start mysql`

### 1b. Create Database

```bash
# Open MySQL
mysql -u root -p

# Run these commands:
CREATE DATABASE mental_health_chatbot;
EXIT;
```

### 1c. Import Schema

```bash
# From the /backend folder:
mysql -u root -p mental_health_chatbot < database/schema.sql
```

✅ **Database ready!**

---

## Step 2: Email Service Setup (5 minutes)

### Choose Your Option:

#### Option A: Gmail (Easiest for Development)
1. Go to https://myaccount.google.com/security
2. Enable "2-Step Verification"
3. Go to "App passwords" and generate one
4. Copy the 16-character password
5. Skip to "Step 3: Create .env File" below

#### Option B: SendGrid (Better for Production)
1. Sign up at https://sendgrid.com/
2. Create API key (Settings → API Keys → Create)
3. Copy your API key (starts with SG.)
4. Skip to "Step 3: Create .env File" below

✅ **Email service ready!**

---

## Step 3: Create .env File

In the `/backend` folder, create a file named `.env` with these contents:

### Gmail Version:
```env
# ============================================================
# DATABASE CONFIGURATION
# ============================================================
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=mental_health_chatbot

# ============================================================
# JWT CONFIGURATION
# ============================================================
JWT_SECRET=mental_health_chatbot_super_secret_key_2024
JWT_REFRESH_SECRET=mental_health_refresh_token_secret_2024
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
JWT_REFERRAL_EXPIRY=7d

# ============================================================
# SERVER CONFIGURATION
# ============================================================
PORT=5000
NODE_ENV=development

# ============================================================
# FRONTEND URL (for CORS)
# ============================================================
FRONTEND_URL=http://localhost:3000

# ============================================================
# EMAIL CONFIGURATION (Gmail)
# ============================================================
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx
EMAIL_FROM_NAME=Mental Health Chatbot
EMAIL_FROM_ADDRESS=noreply@mentalhealth.com

# ============================================================
# LOGGING
# ============================================================
LOG_LEVEL=debug
LOG_FILE=logs/app.log
```

### SendGrid Version:
```env
# ============================================================
# DATABASE CONFIGURATION
# ============================================================
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=mental_health_chatbot

# ============================================================
# JWT CONFIGURATION
# ============================================================
JWT_SECRET=mental_health_chatbot_super_secret_key_2024
JWT_REFRESH_SECRET=mental_health_refresh_token_secret_2024
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
JWT_REFERRAL_EXPIRY=7d

# ============================================================
# SERVER CONFIGURATION
# ============================================================
PORT=5000
NODE_ENV=development

# ============================================================
# FRONTEND URL (for CORS)
# ============================================================
FRONTEND_URL=http://localhost:3000

# ============================================================
# EMAIL CONFIGURATION (SendGrid)
# ============================================================
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=SG.xxxxxx_your_api_key_xxxxxx
EMAIL_FROM_NAME=Mental Health Chatbot
EMAIL_FROM_ADDRESS=noreply@yourdomain.com

# ============================================================
# LOGGING
# ============================================================
LOG_LEVEL=debug
LOG_FILE=logs/app.log
```

**Replace values:**
- `your_mysql_password` - Your MySQL root password
- `your_email@gmail.com` - Your Gmail address
- `xxxx xxxx xxxx xxxx` - Your 16-char Gmail app password (with spaces)
- Or `SG.xxxxx` - Your SendGrid API key
- `http://localhost:3000` - Your frontend URL

✅ **.env file created!**

---

## Step 4: Install Dependencies

```bash
# Navigate to backend folder
cd /backend

# Install all dependencies
npm install
```

This installs:
- express (web framework)
- mysql2 (database driver)
- nodemailer (email)
- jsonwebtoken (authentication)
- bcryptjs (password hashing)
- cors (cross-origin requests)
- dotenv (environment variables)
- winston (logging)

✅ **Dependencies installed!**

---

## Step 5: Verify Everything

### Check MySQL Connection
```bash
node -e "
const mysql = require('mysql2/promise');
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'your_password',
  database: 'mental_health_chatbot'
});

pool.getConnection().then(conn => {
  console.log('✅ Database connected!');
  conn.release();
  process.exit(0);
}).catch(err => {
  console.log('❌ Database error:', err.message);
  process.exit(1);
});
"
```

### Check Email Configuration
```bash
npm run verify-email
```

✅ **Verification complete!**

---

## Step 6: Start the Backend

```bash
# Start development server
npm run dev

# You should see:
# ✅ Database connected
# 🚀 Server running on http://localhost:5000
```

✅ **Backend is running!**

---

## Step 7: Test the API

### Test with Postman or cURL

#### 1. Register a Patient
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "secure_password_123",
    "role": "patient"
  }'
```

**Response:**
```json
{
  "message": "User registered successfully",
  "user": { "id": 1, "email": "john@example.com" },
  "token": "eyJhbGc..."
}
```

#### 2. Register a Therapist
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dr. Smith",
    "email": "therapist@example.com",
    "password": "secure_password_123",
    "role": "therapist"
  }'
```

#### 3. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "secure_password_123"
  }'
```

**Response:**
```json
{
  "message": "Login successful",
  "user": { "id": 1 },
  "token": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

#### 4. Create Chat Session
```bash
curl -X POST http://localhost:5000/api/chat/sessions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "topic": "anxiety",
    "language": "en"
  }'
```

#### 5. Send Message
```bash
curl -X POST http://localhost:5000/api/chat/sessions/1/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "message": "I am feeling stressed"
  }'
```

✅ **API is working!**

---

## Step 8: Test Therapist Referral Feature

### Create Referral (as patient)
```bash
curl -X POST http://localhost:5000/api/referrals/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer PATIENT_TOKEN" \
  -d '{
    "therapist_email": "therapist@example.com",
    "reason": "Anxiety management"
  }'
```

**What happens:**
1. Backend generates JWT access token
2. **Email is sent to therapist** with access link
3. Therapist receives: `https://localhost:3000/therapist/referral?access_token=JWT_TOKEN`

### Therapist Accesses Patient Data
When therapist clicks the link, the frontend sends:
```bash
curl -X POST http://localhost:5000/api/referrals/access \
  -H "Content-Type: application/json" \
  -d '{
    "access_token": "JWT_TOKEN_FROM_EMAIL"
  }'
```

**Response includes:**
```json
{
  "patient": { "name", "email", "profile" },
  "chatSessions": [ ... ],
  "messages": [ ... ],
  "referralDetails": { ... }
}
```

✅ **Therapist feature working!**

---

## Step 9: Connect Frontend

In your Next.js frontend `.env.local`, add:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

Then update API calls:
```javascript
// Before
const response = await fetch('http://localhost:5000/api/auth/login', ...)

// Already works if using:
const API_URL = process.env.NEXT_PUBLIC_API_URL;
const response = await fetch(`${API_URL}/api/auth/login`, ...)
```

✅ **Frontend ready to connect!**

---

## 📊 Environment Variables Summary

| Variable | Value | Purpose |
|----------|-------|---------|
| `DB_HOST` | localhost | MySQL server address |
| `DB_USER` | root | MySQL username |
| `DB_PASSWORD` | your_password | MySQL password |
| `DB_NAME` | mental_health_chatbot | Database name |
| `JWT_SECRET` | super_secret_key | Token signing key |
| `PORT` | 5000 | Backend port |
| `FRONTEND_URL` | http://localhost:3000 | Frontend address |
| `EMAIL_SERVICE` | gmail or sendgrid | Email provider |
| `EMAIL_USER` | your_email@gmail.com | Gmail address |
| `EMAIL_PASSWORD` | xxxx xxxx xxxx xxxx | Gmail app password |
| `SENDGRID_API_KEY` | SG.xxxxx | SendGrid API key |

---

## 🐛 Troubleshooting

### Backend Won't Start
```bash
# Check if port 5000 is in use
lsof -i :5000  # macOS/Linux
netstat -ano | findstr :5000  # Windows

# Kill the process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

### Database Connection Error
```bash
# Check MySQL is running
mysql -u root -p

# Verify credentials in .env
```

### Email Not Sending
- Gmail: Check app password has spaces (xxxx xxxx xxxx xxxx)
- SendGrid: Verify API key starts with SG.
- Check FRONTEND_URL is correct

### CORS Errors
- Verify FRONTEND_URL in .env matches your frontend
- Check API calls use correct domain

---

## 📚 File Locations

| File | Purpose |
|------|---------|
| `/backend/.env` | Environment variables (create this!) |
| `/backend/server.js` | Backend entry point |
| `/backend/database/schema.sql` | Database tables |
| `/backend/routes/` | API endpoints |
| `/backend/services/` | Business logic |
| `/backend/middleware/` | Authentication, validation |

---

## 🎯 What's Running

When you run `npm run dev`:

✅ Express server on `http://localhost:5000`
✅ Connected to MySQL `mental_health_chatbot`
✅ Email service ready (Gmail or SendGrid)
✅ API endpoints available
✅ Therapist referral system active
✅ Authentication & authorization working
✅ Logging to console + `logs/app.log`

---

## 📖 Available Documentation

- `START_HERE.md` - Quick navigation
- `QUICKSTART.md` - 5-minute setup
- `README.md` - Complete guide
- `API_ENDPOINTS.md` - All API endpoints
- `SETUP_MYSQL.md` - Database details
- `SETUP_EMAIL.md` - Email details
- `PROJECT_SUMMARY.md` - Feature overview

---

## ✅ Checklist

- [ ] MySQL installed and running
- [ ] Database created
- [ ] Schema imported
- [ ] Gmail/SendGrid set up
- [ ] `.env` file created with correct values
- [ ] Dependencies installed (`npm install`)
- [ ] Backend started (`npm run dev`)
- [ ] Test API endpoints
- [ ] Frontend connected to backend
- [ ] Ready to deploy!

---

## 🚀 Next Steps

1. **Local Testing**
   - Test all API endpoints
   - Test therapist referral feature
   - Verify emails are sending

2. **Frontend Integration**
   - Connect frontend to backend
   - Test authentication flow
   - Test chat functionality

3. **Production Deployment**
   - See `README.md` for deployment guides
   - Use SendGrid for emails in production
   - Set strong JWT secrets
   - Enable HTTPS

---

## 🎊 You're All Set!

Your Mental Health Chatbot backend is ready to go! 

**Start the server:**
```bash
cd /backend
npm run dev
```

**See your backend running at:** `http://localhost:5000`

**Monitor logs:** Check `logs/app.log`

---

## Support & Documentation

- API Reference: `/backend/API_ENDPOINTS.md`
- Database Schema: `/backend/database/schema.sql`
- Email Config: `/backend/config/email.js`
- Auth Config: `/backend/config/database.js`

---

**Questions?** Check the relevant documentation file or review the inline code comments!

🎉 **Ready to build something amazing!**
