# Environment Configuration Summary

Quick reference for all environment variables and where they come from.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                       Frontend (Next.js)                        │
│                    http://localhost:3000                        │
└────────────────────────────┬────────────────────────────────────┘
                             │ API Calls
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                  Backend (Node.js + Express)                    │
│                    http://localhost:5000                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Routes: /api/auth, /api/chat, /api/referrals, etc      │  │
│  │ Middleware: Authentication, Validation, Error Handler   │  │
│  │ Services: Business Logic                                │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────┬──────────────────────┬────────────────────┘
                     │                      │
        ┌────────────▼──────────┐  ┌───────▼──────────┐
        │   MySQL Database      │  │  Email Service   │
        │  localhost:3306       │  │  Gmail/SendGrid  │
        │  mental_health_db     │  │                  │
        └───────────────────────┘  └──────────────────┘
```

---

## Complete Environment Configuration

### DATABASE SECTION
```env
# ============================================================
# DATABASE CONFIGURATION
# ============================================================
DB_HOST=localhost                    # Where: MySQL server location
DB_PORT=3306                         # Where: MySQL default port
DB_USER=root                         # Where: MySQL username
DB_PASSWORD=your_mysql_password      # Where: From Step 1 (MySQL setup)
DB_NAME=mental_health_chatbot        # Where: Created in Step 1
```

**Setup Location:** `SETUP_MYSQL.md`
**Configuration Time:** 5 minutes
**Status:** ✅ Create database & import schema

---

### JWT AUTHENTICATION SECTION
```env
# ============================================================
# JWT CONFIGURATION (For user authentication)
# ============================================================
JWT_SECRET=mental_health_chatbot_super_secret_key_2024
# What: Secret key for signing login tokens
# How: Use a secure random string (min 32 characters)
# Keep: SECRET! Never share or commit to git

JWT_REFRESH_SECRET=mental_health_refresh_token_secret_2024
# What: Secret key for refresh token signing
# How: Different from JWT_SECRET
# Keep: SECRET!

JWT_EXPIRY=15m
# What: How long login token lasts
# Format: "15m" = 15 minutes, "7d" = 7 days

JWT_REFRESH_EXPIRY=7d
# What: How long refresh token lasts
# Use: To refresh expired login token

JWT_REFERRAL_EXPIRY=7d
# What: How long therapist access token lasts
# Use: For email links sent to therapists
```

**Configuration Time:** 2 minutes
**Generated At:** First server start

---

### SERVER SECTION
```env
# ============================================================
# SERVER CONFIGURATION
# ============================================================
PORT=5000
# What: Port where backend listens
# Where: http://localhost:5000
# Change: For production, use port 80/443 with reverse proxy

NODE_ENV=development
# What: Environment type
# Options: "development" (logging, errors), "production" (optimized)
# Keep: "development" during setup

SERVER_HOST=localhost
# What: Server hostname
# Where: Usually localhost for development
```

**Configuration Time:** 1 minute
**Default:** Already set in .env.example

---

### FRONTEND SECTION
```env
# ============================================================
# FRONTEND CONFIGURATION (For CORS & links)
# ============================================================
FRONTEND_URL=http://localhost:3000
# What: Your frontend base URL
# Used: CORS headers, email links, redirects
# Change: To match your frontend location
# Examples:
#   - Development: http://localhost:3000
#   - Production: https://your-app.com
#   - Without path: https://your-app.com
#   - With path: https://your-app.com/app

FRONTEND_HOST=localhost
# What: Just the hostname part
# Format: localhost or your-app.com (no http://)

FRONTEND_PORT=3000
# What: Frontend port (if not default)
# Default: 3000 for Next.js
```

**Configuration Time:** 1 minute (copy from question response)
**Your Value:** `http://localhost:3000`

---

### EMAIL SECTION (GMAIL)
```env
# ============================================================
# EMAIL CONFIGURATION - GMAIL
# ============================================================
EMAIL_SERVICE=gmail
# What: Which service to use
# Options: "gmail" or "sendgrid"

EMAIL_USER=your_email@gmail.com
# What: Your Gmail address
# Where: Account to send emails from
# Get: Your Gmail address

EMAIL_PASSWORD=xxxx xxxx xxxx xxxx
# What: Gmail app-specific password (NOT your regular password!)
# How: https://myaccount.google.com/apppasswords
# Format: 16 characters with spaces (xxxx xxxx xxxx xxxx)
# Keep: SECRET! Only for this app

EMAIL_FROM_NAME=Mental Health Chatbot
# What: Display name in emails
# Format: What recipients see as "from" name
# Example: "From: Mental Health Chatbot <email@address.com>"

EMAIL_FROM_ADDRESS=noreply@mentalhealth.com
# What: Email address shown in "from"
# Can be: Any address (doesn't have to be real)
# Format: email@domain.com
```

**Setup Location:** `SETUP_EMAIL.md` (Gmail section)
**Configuration Time:** 5 minutes
**Setup Steps:**
1. Enable 2-Step Verification on Gmail
2. Create App Password
3. Copy 16-character password
4. Paste into EMAIL_PASSWORD

---

### EMAIL SECTION (SENDGRID - ALTERNATIVE)
```env
# ============================================================
# EMAIL CONFIGURATION - SENDGRID
# ============================================================
EMAIL_SERVICE=sendgrid
# What: Which service to use
# Set to: "sendgrid" instead of "gmail"

SENDGRID_API_KEY=SG.xxxxxx_your_api_key_xxxxxx
# What: SendGrid API key
# Where: https://app.sendgrid.com/settings/api_keys
# Format: Starts with "SG."
# Keep: SECRET!

# Note: Gmail EMAIL_USER and EMAIL_PASSWORD not needed with SendGrid

EMAIL_FROM_NAME=Mental Health Chatbot
# Same as Gmail version

EMAIL_FROM_ADDRESS=noreply@yourdomain.com
# What: Sender email (must be verified in SendGrid)
# Where: https://app.sendgrid.com/sender_verification
# Important: Must match verified sender!
```

**Setup Location:** `SETUP_EMAIL.md` (SendGrid section)
**Configuration Time:** 10 minutes
**Setup Steps:**
1. Create SendGrid account
2. Create API key
3. Verify sender email
4. Copy API key
5. Paste into SENDGRID_API_KEY

---

### LOGGING SECTION
```env
# ============================================================
# LOGGING CONFIGURATION
# ============================================================
LOG_LEVEL=debug
# What: Verbosity of logs
# Options: "error", "warn", "info", "debug", "silly"
# Use: "debug" for development, "warn" for production

LOG_FILE=logs/app.log
# What: Where to save log file
# Path: Relative to /backend folder
# Creates: logs/app.log with timestamp entries
```

**Configuration Time:** 1 minute
**Default:** Already set in .env.example

---

### OPTIONAL SERVICES
```env
# ============================================================
# OPTIONAL: NLP SERVICE (for sentiment analysis)
# ============================================================
NLP_SERVICE_URL=http://localhost:8000
# What: URL of sentiment analysis service
# Used: To analyze message sentiment
# Optional: Set up later if needed

NLP_SERVICE_TIMEOUT=5000
# What: Request timeout in milliseconds
# Default: 5000ms (5 seconds)

# ============================================================
# OPTIONAL: REDIS CONFIGURATION (for caching)
# ============================================================
REDIS_URL=redis://localhost:6379
# What: Redis connection URL
# Optional: For session caching
# Skip: For now, can add later

REDIS_PASSWORD=
# What: Redis password (if needed)
```

**Configuration Time:** 0 minutes (optional, can skip)

---

## Step-by-Step Setup Process

### 1. Database Setup (5 minutes)
```bash
# 1. Install MySQL
# 2. Create database: CREATE DATABASE mental_health_chatbot;
# 3. Import schema: mysql -u root -p mental_health_chatbot < database/schema.sql
# 4. Note your MySQL password
```

**Variables to Set:**
- `DB_HOST` → localhost
- `DB_PORT` → 3306
- `DB_USER` → root
- `DB_PASSWORD` → your MySQL password
- `DB_NAME` → mental_health_chatbot

---

### 2. Email Setup (5-10 minutes)

**Choose ONE:**

#### Option A: Gmail
```
1. Go to https://myaccount.google.com/security
2. Enable 2-Step Verification
3. Go to App passwords
4. Generate password
5. Copy 16-character password
```

**Variables to Set:**
- `EMAIL_SERVICE` → gmail
- `EMAIL_USER` → your Gmail address
- `EMAIL_PASSWORD` → 16-character app password (with spaces)
- `EMAIL_FROM_NAME` → Mental Health Chatbot
- `EMAIL_FROM_ADDRESS` → noreply@mentalhealth.com

#### Option B: SendGrid
```
1. Go to https://sendgrid.com/
2. Create account
3. Create API key
4. Verify sender email
```

**Variables to Set:**
- `EMAIL_SERVICE` → sendgrid
- `SENDGRID_API_KEY` → your API key (SG.xxxxx)
- `EMAIL_FROM_NAME` → Mental Health Chatbot
- `EMAIL_FROM_ADDRESS` → verified sender email

---

### 3. Server & Frontend Setup (2 minutes)
```bash
# These are defaults, just update FRONTEND_URL if needed
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

---

### 4. Authentication Setup (1 minute)
```bash
# Generate secure keys (don't reuse defaults!)
JWT_SECRET=your_super_secure_random_string_here_min_32_chars
JWT_REFRESH_SECRET=another_super_secure_random_string_min_32_chars
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
JWT_REFERRAL_EXPIRY=7d
```

---

## Complete .env Template

```env
# DATABASE
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=mental_health_chatbot

# JWT
JWT_SECRET=mental_health_chatbot_super_secret_key_2024
JWT_REFRESH_SECRET=mental_health_refresh_token_secret_2024
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
JWT_REFERRAL_EXPIRY=7d

# SERVER
PORT=5000
NODE_ENV=development

# FRONTEND
FRONTEND_URL=http://localhost:3000

# EMAIL - GMAIL VERSION
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx
EMAIL_FROM_NAME=Mental Health Chatbot
EMAIL_FROM_ADDRESS=noreply@mentalhealth.com

# LOGGING
LOG_LEVEL=debug
LOG_FILE=logs/app.log
```

---

## Variable Checklist

| Variable | Status | Source | Notes |
|----------|--------|--------|-------|
| DB_HOST | Required | MySQL | localhost |
| DB_PORT | Required | MySQL | 3306 |
| DB_USER | Required | MySQL | root or custom |
| DB_PASSWORD | Required | MySQL | Your password |
| DB_NAME | Required | MySQL | Created in Step 1 |
| JWT_SECRET | Required | Generate | Secure random string |
| JWT_REFRESH_SECRET | Required | Generate | Different from JWT_SECRET |
| JWT_EXPIRY | Required | Set | 15m (15 minutes) |
| JWT_REFRESH_EXPIRY | Required | Set | 7d (7 days) |
| JWT_REFERRAL_EXPIRY | Required | Set | 7d (expires therapist access) |
| PORT | Required | Set | 5000 |
| NODE_ENV | Required | Set | development |
| FRONTEND_URL | Required | Input | http://localhost:3000 |
| EMAIL_SERVICE | Required | Choose | gmail or sendgrid |
| EMAIL_USER | Required (Gmail) | Gmail | Your Gmail address |
| EMAIL_PASSWORD | Required (Gmail) | Gmail | App-specific password |
| SENDGRID_API_KEY | Required (SendGrid) | SendGrid | Your API key |
| EMAIL_FROM_NAME | Required | Set | Any name |
| EMAIL_FROM_ADDRESS | Required | Set | Any email format |
| LOG_LEVEL | Optional | Set | debug, info, warn, error |
| LOG_FILE | Optional | Set | logs/app.log |

---

## Security Checklist

- [ ] JWT_SECRET is unique and strong (min 32 characters)
- [ ] JWT_REFRESH_SECRET is different from JWT_SECRET
- [ ] EMAIL_PASSWORD is app-specific (not regular Gmail password)
- [ ] SENDGRID_API_KEY starts with SG.
- [ ] DB_PASSWORD is secure (never default like "password")
- [ ] .env file is in .gitignore (never commit to git!)
- [ ] .env file is only readable by application user
- [ ] EMAIL_FROM_ADDRESS is verified (in SendGrid if using SendGrid)

---

## File Location

Create this file in your backend root:
```
/backend/.env
```

**Not:**
- /backend/.env.example (that's the template)
- /backend/.env.local (Next.js format)
- root/.env (that's frontend)

---

## How Variables Are Used

### In Code
```javascript
// config/database.js
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// config/email.js
if (process.env.EMAIL_SERVICE === 'gmail') {
  // Use Gmail
} else if (process.env.EMAIL_SERVICE === 'sendgrid') {
  // Use SendGrid
}
```

### Loading
```javascript
// server.js - loaded automatically via package.json
require('dotenv').config();
console.log(`Connected to ${process.env.DB_HOST}`);
```

---

## Production Considerations

### Change for Production:
```env
NODE_ENV=production
FRONTEND_URL=https://your-production-domain.com
LOG_LEVEL=warn
```

### Use Strong Secrets:
```env
JWT_SECRET=generate_with_crypto.randomBytes(32).toString('hex')
JWT_REFRESH_SECRET=generate_with_crypto.randomBytes(32).toString('hex')
```

### Use SendGrid (not Gmail):
```env
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=SG.your_production_key
```

---

## Troubleshooting

### Database Not Connecting
**Check:** DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
**Test:** `mysql -u root -p -h localhost`

### Email Not Sending
**Check:** EMAIL_SERVICE, EMAIL_USER, EMAIL_PASSWORD
**Test:** See `SETUP_EMAIL.md` for test commands

### CORS Errors
**Check:** FRONTEND_URL matches your frontend exactly
**Update:** Change if frontend URL changes

### JWT Errors
**Check:** JWT_SECRET is set (not empty)
**Note:** Changing JWT_SECRET invalidates all existing tokens

---

## Next Steps

1. Fill in your `.env` file with values from this guide
2. Run `npm install` to install dependencies
3. Start backend: `npm run dev`
4. Check server running on `http://localhost:5000`
5. Connect frontend and test

---

**All set! Your environment is configured. Ready to start the backend! 🚀**
