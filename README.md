# Mental Health Support Chatbot - Backend

A production-ready Node.js + Express backend for a mental health support chatbot system serving Ethiopia with bilingual support (English & Amharic).

## 🎯 Features

✅ **Authentication & Authorization**
- JWT-based authentication
- Role-Based Access Control (Patient, Therapist, Admin)
- Secure password hashing with bcrypt
- Token refresh mechanism

✅ **Chat System**
- Real-time chat sessions
- Language detection (English/Amharic)
- Sentiment analysis
- Distress keyword detection
- Session escalation logic
- Chat history management

✅ **Referral System** ⭐ (Key Feature)
- Patients refer to therapists
- Therapist email notifications with access links
- Unique JWT access tokens (7-day validity)
- Therapist gets full access to:
  - Patient profile
  - All chat sessions
  - Complete conversation history
  - Referral details

✅ **Therapist Dashboard**
- View assigned patients
- Access patient reports
- Review conversation logs
- Manage referrals
- Track sentiment trends

✅ **Admin Dashboard**
- User management
- System analytics
- Sentiment trend analysis
- Usage statistics
- Audit logging
- Referral tracking

✅ **Mental Health Resources**
- Bilingual content management
- Category-based organization
- Public access APIs
- Admin-controlled publishing

✅ **Security & Privacy**
- GDPR-style compliance
- Audit logging
- Consent tracking
- Data anonymization support
- Input validation & sanitization

---

## 🛠️ Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MySQL
- **Authentication:** JWT (JSON Web Tokens)
- **Password Hashing:** bcrypt
- **Logging:** Winston
- **Email:** Nodemailer
- **Config:** dotenv

---

## 📋 Prerequisites

- Node.js v16+
- MySQL 8.0+
- npm or yarn
- Email service (Gmail, SendGrid, etc.)

---

## 🚀 Installation

### 1. Clone and Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install
```

### 2. Database Setup

```bash
# Create .env file
cp .env.example .env

# Edit .env with your database credentials
nano .env  # or use your preferred editor
```

**Database Configuration in .env:**
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=mental_health_chatbot
```

### 3. Initialize Database

```bash
# Login to MySQL
mysql -u root -p

# Run schema file
mysql -u root -p < database/schema.sql
```

Or import via MySQL client:
```sql
USE mental_health_chatbot;
SOURCE database/schema.sql;
```

### 4. Configure Environment Variables

Edit `.env` file with your settings:

```env
# DATABASE
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=mental_health_chatbot

# JWT
JWT_SECRET=your_super_secret_key_change_this_in_production
JWT_REFRESH_SECRET=your_refresh_secret_key
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# SERVER
PORT=5000
NODE_ENV=development

# EMAIL (for sending therapist notifications)
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password  # Use app-specific password for Gmail
EMAIL_FROM=noreply@mentalhealth.com

# FRONTEND
FRONTEND_URL=http://localhost:3000

# OPTIONAL
NLP_SERVICE_URL=http://localhost:8000
REDIS_URL=redis://localhost:6379
LOG_LEVEL=debug
```

### 5. Start Server

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm start
```

Expected output:
```
🚀 Server running on port 5000
Environment: development
```

### 6. Test Health Check

```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:35:00Z",
  "database": "connected"
}
```

---

## 📁 Project Structure

```
backend/
├── config/
│   ├── database.js       # MySQL connection pool
│   ├── logger.js         # Winston logging configuration
│   └── email.js          # Nodemailer setup & email templates
│
├── middleware/
│   ├── auth.js           # JWT verification & RBAC
│   ├── errorHandler.js   # Global error handling
│   └── validation.js     # Input validation utilities
│
├── services/
│   ├── authService.js      # Authentication logic
│   ├── userService.js      # User management
│   ├── chatService.js      # Chat & NLP processing
│   └── referralService.js  # Referral & access token logic
│
├── routes/
│   ├── auth.js         # Authentication endpoints
│   ├── users.js        # User management endpoints
│   ├── chat.js         # Chat endpoints
│   ├── referrals.js    # Referral endpoints (KEY FILE)
│   ├── therapist.js    # Therapist dashboard
│   ├── admin.js        # Admin endpoints
│   └── resources.js    # Mental health resources
│
├── database/
│   └── schema.sql      # Complete MySQL schema
│
├── logs/               # Log files (created automatically)
│
├── server.js           # Express app initialization
├── package.json        # Dependencies
├── .env.example        # Environment template
├── API_ENDPOINTS.md    # API documentation
└── README.md          # This file
```

---

## 🔑 Key API Endpoints

### Authentication
```
POST   /api/auth/register      - Register new user
POST   /api/auth/login         - Login & get tokens
GET    /api/auth/me            - Get current user (protected)
```

### Chat
```
POST   /api/chat/session/create    - Create chat session
POST   /api/chat/message           - Send message
GET    /api/chat/history/:id       - Get chat history
POST   /api/chat/escalate/:id      - Escalate session
```

### Referrals (Core Feature)
```
POST   /api/referrals/create       - Patient creates referral
GET    /api/referrals/therapist    - Therapist gets referrals
POST   /api/referrals/access       - Therapist accesses patient data with token
GET    /api/referrals/patient/:id  - Get patient data by referral
```

### Therapist
```
GET    /api/therapist/dashboard        - Therapist dashboard
GET    /api/therapist/patients         - List assigned patients
GET    /api/therapist/patient/:id/report    - Patient report
GET    /api/therapist/patient/:id/conversations - Chat history
```

### Admin
```
GET    /api/admin/dashboard       - System overview
GET    /api/admin/users           - User management
GET    /api/admin/analytics/*     - Analytics endpoints
POST   /api/admin/assign-therapist - Assign therapist to patient
```

### Resources
```
GET    /api/resources             - Get resources
GET    /api/resources/categories  - Get categories
POST   /api/resources             - Create resource (admin)
```

See [API_ENDPOINTS.md](./API_ENDPOINTS.md) for complete documentation.

---

## 🔐 Security Features

### Authentication
- JWT tokens with expiration
- Refresh token mechanism
- bcrypt password hashing (12 rounds)
- Token blacklist support

### Authorization
- Role-based access control (RBAC)
- Row-level security for patient data
- Therapist can only access assigned patients
- Admin audit logging

### Data Protection
- Input sanitization & validation
- SQL injection prevention (parameterized queries)
- CORS configuration
- Rate limiting ready
- Sensitive field encryption support

### Privacy
- Audit logging of admin actions
- Consent tracking
- Data anonymization support
- GDPR-style compliance

---

## 🔗 Referral Workflow (Important)

### What Happens When Patient Refers to Therapist:

1. **Patient initiates referral:**
   ```
   POST /api/referrals/create
   {
     "therapistId": 2,
     "reason": "Need professional help",
     "urgency": "high"
   }
   ```

2. **System creates referral with unique access token:**
   - JWT token generated (valid 7 days)
   - Token contains: patientId, therapistId, type='referral_access'
   - Stored in database

3. **Email sent to therapist:**
   - Subject: "New Patient Referral: [Patient Name]"
   - Contains: Access button with full URL including token
   - Example: `https://frontend.com/therapist/referral?access_token=JWT_TOKEN&referral_id=1`

4. **Therapist clicks email link:**
   - Frontend extracts `access_token` from URL
   - Sends to: `POST /api/referrals/access?access_token=TOKEN`

5. **Therapist gets full access:**
   ```json
   {
     "patient": {
       "id": 1,
       "name": "John Doe",
       "email": "john@example.com",
       ...
     },
     "chatSessions": [...],
     "messages": [
       {
         "id": 1,
         "message_text": "I'm feeling depressed...",
         "sentiment_score": -0.7,
         "created_at": "..."
       }
     ],
     "referralDetails": {...}
   }
   ```

### Access Token Features:
- ✅ Time-limited (7 days)
- ✅ One-time use recommended (after first access)
- ✅ Therapist ID bound (only assigned therapist can use)
- ✅ Patient ID bound (specific patient data only)
- ✅ Email verification (access logged)

---

## 📊 Database Schema

### Main Tables:

**users** - User accounts with roles
**roles** - Patient, Therapist, Admin
**chat_sessions** - Conversation sessions
**chat_messages** - Individual messages with sentiment/emotion
**referrals** - Patient → Therapist referrals with access tokens
**therapist_specializations** - Therapist profile details
**therapist_assignments** - Admin-assigned therapists to patients
**mental_health_resources** - Bilingual educational content
**audit_logs** - System action tracking
**consent_logs** - GDPR consent tracking

Full schema: [database/schema.sql](./database/schema.sql)

---

## 🧪 Testing Endpoints

### 1. Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "TestPass123",
    "firstName": "Test",
    "lastName": "User",
    "role": "patient"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123"
  }'
```

### 3. Get Profile (with token)
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer <your_access_token>"
```

### 4. Create Chat Session
```bash
curl -X POST http://localhost:5000/api/chat/session/create \
  -H "Authorization: Bearer <your_access_token>" \
  -H "Content-Type: application/json" \
  -d '{"language": "en"}'
```

---

## 📝 Logging

Logs are created in `logs/` directory:
- `logs/combined.log` - All logs
- `logs/error.log` - Errors only

Log format includes timestamp, level, message, and context.

---

## 🚨 Error Handling

All endpoints return consistent error format:
```json
{
  "error": "Error message",
  "details": "Additional context"
}
```

Error codes:
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 409: Conflict
- 500: Internal Server Error

---

## 🔄 Environment Variables

Create `.env` file from `.env.example`:

```bash
cp .env.example .env
```

**Required variables:**
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `PORT`

**Optional but recommended:**
- `EMAIL_*` - For therapist notifications
- `FRONTEND_URL` - For CORS and email links
- `LOG_LEVEL` - debug, info, warn, error

---

## 📈 Performance Optimizations

- Connection pooling (10 connections)
- Database indexes on frequently queried fields
- JWT token caching
- Query optimization with JOINs

---

## 🐛 Troubleshooting

### Database Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```
- Check MySQL is running: `mysql -u root -p`
- Verify .env credentials
- Ensure database exists: `CREATE DATABASE mental_health_chatbot;`

### JWT Secret Error
- Ensure `JWT_SECRET` is set in .env
- Change secret before production deployment

### Email Not Sending
- Check EMAIL_* variables in .env
- For Gmail: Use app-specific password
- For other providers: Verify SMTP credentials
- Test: `npm test` (when test file is added)

---

## 🚀 Production Deployment

### Before Deploying:

1. **Security:**
   ```bash
   # Change all secrets
   JWT_SECRET=<generate_new_secure_key>
   JWT_REFRESH_SECRET=<generate_new_secure_key>
   ```

2. **Database:**
   - Use external managed database (AWS RDS, Google Cloud SQL)
   - Enable SSL/TLS connections
   - Use strong passwords

3. **Environment:**
   ```env
   NODE_ENV=production
   PORT=5000
   ```

4. **Logging:**
   - Send logs to external service (Sentry, DataDog)
   - Set appropriate LOG_LEVEL

5. **Email:**
   - Use production email service
   - Configure SPF/DKIM records
   - Test email delivery

### Deployment Platforms:
- Vercel (with serverless functions)
- Heroku
- AWS Lambda
- Google Cloud Run
- DigitalOcean
- Azure App Service

---

## 📚 Related Files

- [API_ENDPOINTS.md](./API_ENDPOINTS.md) - Complete API documentation
- [database/schema.sql](./database/schema.sql) - Database schema
- [.env.example](./.env.example) - Environment template

---

## 📝 Notes

- Frontend exists separately - this is backend-only
- All data is stored in MySQL, not in-memory
- Bilingual support for en/am languages
- Real-world production-ready code
- Complete RBAC implementation
- Full audit trail for compliance

---

## 📧 Support

For issues or questions:
1. Check API_ENDPOINTS.md
2. Review error logs in logs/ directory
3. Verify .env configuration
4. Check database schema matches

---

## 📄 License

MIT

---

**Built with ❤️ for mental health support in Ethiopia**
