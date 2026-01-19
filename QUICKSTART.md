# Quick Start Guide

Get the Mental Health Chatbot backend running in 5 minutes.

## ⚡ Quick Setup

### Step 1: Install Dependencies
```bash
cd backend
npm install
```

### Step 2: Setup Database

**Option A: MySQL Command Line**
```bash
mysql -u root -p
> CREATE DATABASE mental_health_chatbot;
> exit

mysql -u root -p mental_health_chatbot < database/schema.sql
```

**Option B: MySQL Client GUI**
1. Create database: `mental_health_chatbot`
2. Open `database/schema.sql` and execute it

### Step 3: Configure Environment
```bash
cp .env.example .env
```

Edit `.env`:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=mental_health_chatbot
JWT_SECRET=change_this_to_something_secure
PORT=5000
NODE_ENV=development
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
```

### Step 4: Start Server
```bash
npm run dev
```

You should see:
```
🚀 Server running on port 5000
Environment: development
```

### Step 5: Test It Works
```bash
curl http://localhost:5000/health
```

Expected output:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:35:00Z",
  "database": "connected"
}
```

## ✅ You're Done!

Backend is running. Now test the key features:

---

## 🧪 Quick API Tests

### 1. Register Patient
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "patient1",
    "email": "patient@example.com",
    "password": "Patient123!",
    "firstName": "John",
    "lastName": "Doe",
    "role": "patient"
  }'
```

Save the `id` (e.g., 1)

### 2. Register Therapist
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "therapist1",
    "email": "therapist@example.com",
    "password": "Therapist123!",
    "firstName": "Dr.",
    "lastName": "Smith",
    "role": "therapist"
  }'
```

Save the `id` (e.g., 2)

### 3. Login Patient
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@example.com",
    "password": "Patient123!"
  }'
```

Save the `accessToken` (you'll need this for next steps)

### 4. Create Chat Session
```bash
# Replace TOKEN with your accessToken
curl -X POST http://localhost:5000/api/chat/session/create \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"language": "en"}'
```

Save the `sessionId` (e.g., 1)

### 5. Send Chat Message
```bash
curl -X POST http://localhost:5000/api/chat/message \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": 1,
    "messageText": "I am feeling depressed and anxious",
    "language": "en"
  }'
```

### 6. Create Referral (Patient → Therapist)
```bash
# Patient (ID 1) refers to Therapist (ID 2)
curl -X POST http://localhost:5000/api/referrals/create \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "therapistId": 2,
    "reason": "Need professional mental health support",
    "urgency": "high"
  }'
```

**What happens:**
1. ✅ Referral created in database
2. ✅ Access token generated (valid 7 days)
3. ✅ Email sent to therapist@example.com with access link
4. ✅ Check your email for the link!

Save the `accessToken` from response

### 7. Therapist Accesses Patient Data

**Option A: Using access token from email**
```bash
# Replace ACCESS_TOKEN with token from email
curl -X POST "http://localhost:5000/api/referrals/access?access_token=ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

**Option B: Using token in header**
```bash
curl -X POST http://localhost:5000/api/referrals/access \
  -H "X-Referral-Token: ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

Response includes:
```json
{
  "patient": {
    "id": 1,
    "name": "John Doe",
    "email": "patient@example.com"
  },
  "chatSessions": [...],
  "messages": [
    {
      "message_text": "I am feeling depressed and anxious",
      "sentiment_score": -0.7,
      "emotion_label": "sad"
    }
  ]
}
```

### 8. Therapist Views Dashboard
```bash
# Login therapist first to get token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "therapist@example.com",
    "password": "Therapist123!"
  }'

# Get therapist dashboard
curl -X GET http://localhost:5000/api/therapist/dashboard \
  -H "Authorization: Bearer THERAPIST_TOKEN"
```

---

## 🔗 Key Referral Flow

```
Patient creates referral
         ↓
System generates access token (JWT, valid 7 days)
         ↓
Email sent to therapist with access link
         ↓
Therapist clicks email link (contains access_token)
         ↓
Therapist gets FULL access to:
  - Patient profile
  - All chat sessions
  - Complete message history
  - Sentiment analysis
```

**Email contains:** 
```
https://frontend.com/therapist/referral?access_token=JWT_TOKEN&referral_id=1
```

---

## 📚 Full Documentation

- **API Docs:** [API_ENDPOINTS.md](./API_ENDPOINTS.md)
- **Setup Guide:** [README.md](./README.md)
- **Database:** [database/schema.sql](./database/schema.sql)

---

## 🚀 Next Steps

1. **Connect Frontend:** Update frontend to use `http://localhost:5000/api`
2. **Configure Email:** Update .env with real email service
3. **Add Admin:** Register admin user for admin dashboard
4. **Set JWT Secret:** Change `JWT_SECRET` in .env before production

---

## 🆘 Common Issues

### Port 5000 already in use
```bash
# Find process using port 5000
lsof -i :5000

# Kill it (replace PID)
kill -9 PID

# Or use different port in .env
PORT=5001
```

### Database connection error
```bash
# Verify MySQL is running
mysql -u root -p

# Check .env credentials match
# Format: mysql -u DB_USER -p -h DB_HOST
```

### Email not working
- For Gmail: Use [app-specific password](https://support.google.com/accounts/answer/185833)
- Check EMAIL_* variables in .env
- In development, emails may go to spam

### Token errors
- Make sure to include `Bearer ` before token in Authorization header
- Copy entire token, no quotes
- Token expires in 15 minutes

---

## 📞 Testing Tools

### Postman
1. Import `API_ENDPOINTS.md` endpoints
2. Set `{{token}}` variable after login
3. Use `{{patient_id}}` and `{{therapist_id}}` for IDs

### cURL
Use examples above in terminal

### VS Code
Install **REST Client** extension, create `.rest` file

---

## ✨ That's It!

Your backend is ready. Start building the frontend integration now!

For more details, see [README.md](./README.md) and [API_ENDPOINTS.md](./API_ENDPOINTS.md).
