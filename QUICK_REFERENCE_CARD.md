# QUICK REFERENCE CARD
## Mental Health Backend - Essential Information

---

## WHAT YOU HAVE

✅ Node.js + Express Backend
✅ Google Gemini AI Integration  
✅ MySQL Database (12 tables)
✅ JWT Authentication
✅ Therapist Referral System
✅ Crisis Detection
✅ Email Notifications
✅ Bilingual Support (EN + AM)
✅ Admin Dashboard
✅ Complete Documentation

---

## 5-MINUTE SETUP

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with:
#   - MySQL password
#   - Gmail address & app password
#   - Gemini API key
npm run dev
```

**Server runs at:** http://localhost:5000

---

## ENVIRONMENT VARIABLES

**Critical (Must Have):**
```
DB_PASSWORD=your_mysql_password
GEMINI_API_KEY=your_gemini_key
EMAIL_PASSWORD=your_gmail_app_password
JWT_SECRET=random_32_character_string
```

**Frontend:**
```
FRONTEND_URL=http://localhost:3000
```

---

## HOW TO GET EACH VALUE

| Value | Where to Get | Time |
|-------|-------------|------|
| MySQL Password | When you set up MySQL | 1 min |
| Gmail App Password | https://myaccount.google.com/apppasswords | 2 min |
| Gemini API Key | https://aistudio.google.com/app/apikeys | 2 min |
| JWT Secret | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | 1 min |

---

## CORE API ENDPOINTS

### Authentication
```
POST /api/auth/register     - Register user
POST /api/auth/login        - Login user
POST /api/auth/logout       - Logout
POST /api/auth/refresh      - Refresh token
```

### Chat
```
POST /api/chat/session              - Create session
POST /api/chat/message              - Send message (gets AI response)
GET  /api/chat/history/:sessionId   - Get chat history
GET  /api/chat/sessions             - Get user's sessions
POST /api/chat/close/:sessionId     - Close session
GET  /api/chat/crisis-analysis/:id  - Risk analysis
GET  /api/chat/analytics/:id        - Session analytics
```

### Referrals
```
POST /api/referrals/create          - Create referral
GET  /api/referrals/access          - Therapist accesses patient
GET  /api/referrals/list            - List referrals
```

### Users
```
GET  /api/users/profile             - Get user profile
PUT  /api/users/profile             - Update profile
```

### Therapist
```
GET /api/therapist/dashboard        - Therapist dashboard
GET /api/therapist/patient/:id      - Get patient details
```

### Admin
```
GET /api/admin/stats                - System statistics
GET /api/admin/users                - List all users
```

---

## AUTHENTICATION

All endpoints (except auth endpoints) require:

```
Header: Authorization: Bearer <accessToken>
```

Get token from login response:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "..."
}
```

---

## KEY FEATURES

### Therapist Referral Flow
```
1. Patient: POST /api/referrals/create
2. Email sent to therapist
3. Therapist clicks email link
4. GET /api/referrals/access?access_token=JWT
5. Therapist sees ALL patient data
```

### Crisis Detection
```
High-risk keywords trigger:
- Sentiment analysis
- Risk classification (LOW/MEDIUM/HIGH)
- Auto-escalation to therapist
- Crisis alert notification
```

### Gemini AI Integration
```
User message → Gemini processes → Response + Risk analysis → DB saved
Languages: English + Amharic (auto-detected)
Risk levels: LOW, MEDIUM, HIGH
```

---

## FILE LOCATIONS

**Backend Code:**
```
/backend/
├── server.js                    # Entry point
├── .env.example                # Configuration template
├── package.json                # Dependencies
├── config/                     # Configuration
├── middleware/                 # Middleware
├── services/                   # Business logic
├── routes/                     # API endpoints
└── database/schema.sql         # Database schema
```

**Documentation:**
```
/backend/
├── FULL_DOCUMENTATION.md       # THIS FILE (2000+ lines)
├── START_HERE.md              # Quick start
├── QUICKSTART.md              # 5-min setup
├── GEMINI_AI_SETUP.md         # Gemini guide
├── API_ENDPOINTS.md           # All endpoints
└── ... (other guides)
```

---

## DATABASE TABLES (12 total)

1. `users` - All users
2. `user_profiles` - User details
3. `chat_sessions` - Chat conversations
4. `chat_messages` - Individual messages
5. `sentiment_analysis` - Message analysis
6. `referrals` - Therapist referrals
7. `therapist_details` - Therapist info
8. `session_analytics` - Session statistics
9. `resources` - Mental health content
10. `audit_logs` - Activity logs
11. `notifications` - User notifications
12. `crisis_alerts` - High-risk alerts

---

## COMMON COMMANDS

```bash
# Start development server
npm run dev

# Start production server
npm start

# View logs
tail -f logs/app.log

# Test database connection
mysql -u root -p mental_health_chatbot

# Import schema
mysql -u root -p mental_health_chatbot < database/schema.sql

# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## USER ROLES

| Role | Capabilities |
|------|-------------|
| **Patient** | Chat, create referrals, view profile |
| **Therapist** | View patients, analyze chat, respond to referrals |
| **Admin** | Full system access, user management, analytics |

---

## RESPONSE FORMAT

**Success:**
```json
{
  "message": "Operation successful",
  "data": { ... }
}
```

**Error:**
```json
{
  "error": "Error description",
  "statusCode": 400
}
```

---

## TESTING

### With curl
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass"}'
```

### With Postman
1. Import endpoints from API_ENDPOINTS.md
2. Set baseUrl = http://localhost:5000
3. Test each endpoint

---

## TROUBLESHOOTING

| Problem | Solution |
|---------|----------|
| Cannot connect to DB | Check MySQL running, password in .env |
| JWT error | Check JWT_SECRET in .env |
| Gemini error | Verify API key at aistudio.google.com |
| Email not sending | Check Gmail password, 2FA enabled |
| CORS error | Check FRONTEND_URL in .env |

---

## DOCUMENTATION FILES

**Start Here:**
- `FULL_DOCUMENTATION.md` - Complete reference (THIS FILE)
- `START_HERE.md` - 5-minute overview
- `QUICKSTART.md` - Copy-paste setup

**Then Read:**
- `API_ENDPOINTS.md` - All 50+ endpoints with examples
- `GEMINI_AI_SETUP.md` - AI configuration
- `SETUP_EMAIL.md` - Email setup guide
- `SETUP_MYSQL.md` - Database setup

---

## DEPLOYMENT

**Quick Deployment:**
```bash
# 1. Set NODE_ENV=production in .env
# 2. Use production database
# 3. Use strong secrets
# 4. Enable HTTPS
# 5. Deploy to Heroku/AWS/Railway

# Example with PM2:
npm install -g pm2
pm2 start server.js
pm2 startup
pm2 save
```

---

## SUPPORT

If stuck:
1. Check logs: `tail -f logs/app.log`
2. Read FULL_DOCUMENTATION.md
3. Search TROUBLESHOOTING section
4. Check API_ENDPOINTS.md for endpoint details

---

**You have everything you need to run a production-ready mental health backend!** 🚀
