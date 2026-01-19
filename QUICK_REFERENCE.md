# Quick Reference Card

Copy-paste configurations for your specific setup.

---

## Your Setup

- **Frontend:** http://localhost:3000
- **Email:** Gmail (with 2FA app password)
- **Database:** MySQL local

---

## .env File Template for You

Save this as `/backend/.env`:

```env
# DATABASE
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD_HERE
DB_NAME=mental_health_chatbot

# JWT
JWT_SECRET=change_this_to_something_secure_min_32_characters
JWT_REFRESH_SECRET=also_change_this_to_something_different_min_32_characters
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
JWT_REFERRAL_EXPIRY=7d

# SERVER
PORT=5000
NODE_ENV=development

# FRONTEND
FRONTEND_URL=http://localhost:3000

# EMAIL (Gmail)
EMAIL_SERVICE=gmail
EMAIL_USER=YOUR_GMAIL_ADDRESS@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx
EMAIL_FROM_NAME=Mental Health Chatbot
EMAIL_FROM_ADDRESS=noreply@mentalhealth.com

# LOGGING
LOG_LEVEL=debug
LOG_FILE=logs/app.log
```

---

## 3-Minute Setup Checklist

### 1. MySQL (1 minute)
```bash
# Already installed?
mysql --version

# Not installed? Get it from: https://dev.mysql.com/downloads/mysql/
# macOS: brew install mysql && brew services start mysql
# Linux: sudo apt-get install mysql-server && sudo systemctl start mysql

# Create database
mysql -u root -p
# Then: CREATE DATABASE mental_health_chatbot;
# Then: EXIT;

# Import schema
mysql -u root -p mental_health_chatbot < database/schema.sql
```

### 2. Gmail Setup (1 minute)
- Go to: https://myaccount.google.com/security
- Enable 2-Step Verification
- Go to App passwords
- Select "Mail" and "Windows Computer"
- Copy the 16-character password (with spaces!)

### 3. Create .env (1 minute)
```bash
# In /backend folder, create .env with template above
# Replace:
# - YOUR_MYSQL_PASSWORD_HERE → your password
# - YOUR_GMAIL_ADDRESS@gmail.com → your email
# - xxxx xxxx xxxx xxxx → your 16-char app password
```

---

## Start Command

```bash
cd /backend
npm install
npm run dev
```

Backend runs at: **http://localhost:5000**

---

## Test API Calls

### Register Patient
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name":"John Patient",
    "email":"patient@test.com",
    "password":"password123",
    "role":"patient"
  }'
```

### Register Therapist
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Dr Therapist",
    "email":"therapist@test.com",
    "password":"password123",
    "role":"therapist"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"patient@test.com",
    "password":"password123"
  }'
```

Copy the `token` from response for next commands.

### Create Chat Session
```bash
curl -X POST http://localhost:5000/api/chat/sessions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer PASTE_TOKEN_HERE" \
  -d '{
    "topic":"anxiety",
    "language":"en"
  }'
```

### Send Message
```bash
curl -X POST http://localhost:5000/api/chat/sessions/1/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer PASTE_TOKEN_HERE" \
  -d '{
    "message":"I am feeling stressed"
  }'
```

### Create Referral (triggers email!)
```bash
curl -X POST http://localhost:5000/api/referrals/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer PATIENT_TOKEN_HERE" \
  -d '{
    "therapist_email":"therapist@test.com",
    "reason":"I need professional help with anxiety"
  }'
```

**Check your Gmail inbox!** Therapist gets email with access link.

---

## File Structure

```
/backend/
├── .env                      ← CREATE THIS (use template above)
├── .env.example             ← DON'T EDIT, reference only
├── server.js                ← Main entry point
├── package.json             ← Dependencies
├── database/
│   └── schema.sql          ← MySQL tables
├── config/
│   ├── database.js         ← DB connection
│   ├── email.js            ← Email setup
│   └── logger.js           ← Logging
├── middleware/
│   ├── auth.js             ← Auth logic
│   ├── errorHandler.js     ← Error handling
│   └── validation.js       ← Data validation
├── services/
│   ├── authService.js      ← Login/register
│   ├── chatService.js      ← Chat messages
│   ├── referralService.js  ← Therapist referrals
│   └── userService.js      ← User management
├── routes/
│   ├── auth.js             ← /api/auth/*
│   ├── chat.js             ← /api/chat/*
│   ├── referrals.js        ← /api/referrals/*
│   ├── users.js            ← /api/users/*
│   ├── therapist.js        ← /api/therapist/*
│   ├── admin.js            ← /api/admin/*
│   └── resources.js        ← /api/resources/*
├── logs/
│   └── app.log             ← Auto-created
├── API_ENDPOINTS.md        ← All API docs
├── README.md               ← Complete guide
├── START_HERE.md           ← Navigation
├── QUICKSTART.md           ← 5-min setup
├── SETUP_COMPLETE.md       ← Full setup guide
├── SETUP_MYSQL.md          ← Database guide
├── SETUP_EMAIL.md          ← Email guide
├── ENV_CONFIGURATION_SUMMARY.md ← Env details
└── QUICK_REFERENCE.md      ← THIS FILE
```

---

## Environment Variables Quick Lookup

| Name | Value | Get From |
|------|-------|----------|
| DB_HOST | localhost | MySQL default |
| DB_USER | root | MySQL default |
| DB_PASSWORD | ??? | Your MySQL setup |
| DB_NAME | mental_health_chatbot | Created in Step 1 |
| JWT_SECRET | secure_random_string | Generate yourself |
| FRONTEND_URL | http://localhost:3000 | Your frontend |
| EMAIL_USER | your_email@gmail.com | Your Gmail |
| EMAIL_PASSWORD | xxxx xxxx xxxx xxxx | Gmail app passwords |

---

## Common Commands

```bash
# Start development server
npm run dev

# Start production server
npm start

# Check if database connected
mysql -u root -p

# Check if port is in use
lsof -i :5000

# View logs
tail -f logs/app.log

# Stop server
Ctrl + C

# Reinstall dependencies
rm -rf node_modules && npm install
```

---

## What Each Service Does

| Service | Purpose |
|---------|---------|
| **authService** | User login, registration, JWT tokens |
| **chatService** | Store messages, sentiment analysis |
| **referralService** | Generate access tokens, send emails |
| **userService** | User profiles, preferences |

---

## API Endpoints Cheat Sheet

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | /api/auth/register | Create new user |
| POST | /api/auth/login | User login |
| POST | /api/auth/refresh | Refresh token |
| POST | /api/chat/sessions | Start chat |
| POST | /api/chat/sessions/{id}/messages | Send message |
| GET | /api/chat/sessions | List chats |
| POST | /api/referrals/create | Create referral |
| POST | /api/referrals/access | Access patient data |
| GET | /api/therapist/patients | View assigned |
| GET | /api/resources | Get resources |

**Full list:** See `API_ENDPOINTS.md`

---

## Therapist Referral Flow

```
1. Patient clicks "Request Therapist"
   ↓
2. POST /api/referrals/create
   ↓
3. Backend generates JWT access_token (7-day expiry)
   ↓
4. Email sent to therapist:
   From: Mental Health Chatbot
   To: therapist@email.com
   Link: http://localhost:3000/therapist/referral?access_token=JWT_TOKEN
   ↓
5. Therapist clicks email link
   ↓
6. Frontend sends: POST /api/referrals/access?access_token=JWT_TOKEN
   ↓
7. Response includes:
   - Complete patient profile
   - All chat sessions
   - Complete message history
   - Referral details
   ↓
8. Therapist has full access to patient data
```

---

## Troubleshooting Quick Fixes

### "Cannot find module"
```bash
npm install
```

### "Port 5000 in use"
```bash
# Find and kill process
lsof -i :5000 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

### "MySQL error: Access denied"
Check DB_USER and DB_PASSWORD in .env

### "Email not sending"
- Gmail: Did you use 16-char app password?
- Check EMAIL_USER and EMAIL_PASSWORD are correct
- Run test from `SETUP_EMAIL.md`

### "CORS error in frontend"
Update FRONTEND_URL in .env to match your frontend

---

## Production Deployment Steps

1. Update NODE_ENV to "production"
2. Use strong JWT secrets (min 32 chars)
3. Use SendGrid instead of Gmail
4. Update FRONTEND_URL to production domain
5. Use MySQL in production (RDS, cloud host, etc)
6. Set DB_PASSWORD to strong password
7. Enable HTTPS
8. Use reverse proxy (nginx) for port 80/443
9. Set up SSL certificates
10. Monitor logs and backups

---

## Documentation Files

- **START_HERE.md** - Choose your path
- **QUICKSTART.md** - Copy-paste setup
- **README.md** - Everything in detail
- **SETUP_COMPLETE.md** - Step-by-step
- **API_ENDPOINTS.md** - All API calls
- **SETUP_MYSQL.md** - Database details
- **SETUP_EMAIL.md** - Email details
- **ENV_CONFIGURATION_SUMMARY.md** - Variable reference
- **QUICK_REFERENCE.md** - THIS FILE

---

## Your Next Step

1. **Create** `/backend/.env` file
2. **Copy** template from top of this file
3. **Fill in** your MySQL password and Gmail app password
4. **Run** `npm install`
5. **Start** `npm run dev`
6. **Test** with curl commands above

---

**🚀 You're ready! Start your backend now!**

Questions? See the documentation files listed above.
