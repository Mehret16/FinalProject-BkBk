# Backend Documentation Index

All your backend documentation organized by purpose.

---

## 🎯 Choose Your Path

### 👤 I'm New - Where Do I Start?
1. **READ FIRST:** [`START_HERE.md`](./START_HERE.md) - Navigation guide
2. **THEN:** [`QUICKSTART.md`](./QUICKSTART.md) - 5-minute setup
3. **NEED DETAILS?** [`SETUP_COMPLETE.md`](./SETUP_COMPLETE.md) - Step-by-step guide

### ⚡ I Want Quick Setup
**Go to:** [`QUICK_REFERENCE.md`](./QUICK_REFERENCE.md)
- Copy-paste `.env` template
- 3-minute checklist
- Test API commands

### 📚 I Want Everything
**Go to:** [`README.md`](./README.md)
- Complete documentation
- All features explained
- Deployment guide
- Troubleshooting

### 🔧 I'm Setting Up MySQL
**Go to:** [`SETUP_MYSQL.md`](./SETUP_MYSQL.md)
- Install MySQL
- Create database
- Import schema
- Verify setup

### 📧 I'm Setting Up Email
**Go to:** [`SETUP_EMAIL.md`](./SETUP_EMAIL.md)
- Gmail setup
- SendGrid setup
- Test configuration
- Troubleshooting

### 🌐 I Need API Reference
**Go to:** [`API_ENDPOINTS.md`](./API_ENDPOINTS.md)
- All 50+ endpoints
- Request/response examples
- Auth requirements
- Error codes

### 🔐 I'm Configuring Environment Variables
**Go to:** [`ENV_CONFIGURATION_SUMMARY.md`](./ENV_CONFIGURATION_SUMMARY.md)
- All variables explained
- Where to get values
- Step-by-step setup
- Checklist

### 📋 I Want a Quick Cheat Sheet
**Go to:** [`QUICK_REFERENCE.md`](./QUICK_REFERENCE.md)
- Copy-paste configs
- Common commands
- Test API calls
- Quick troubleshooting

---

## 📖 Full Documentation List

| File | Purpose | Read Time |
|------|---------|-----------|
| **START_HERE.md** | Navigation guide | 5 min |
| **QUICKSTART.md** | 5-minute setup | 5 min |
| **QUICK_REFERENCE.md** | Cheat sheet | 3 min |
| **SETUP_COMPLETE.md** | Complete step-by-step | 20 min |
| **README.md** | Full documentation | 30 min |
| **API_ENDPOINTS.md** | All API endpoints | 20 min |
| **SETUP_MYSQL.md** | Database setup guide | 15 min |
| **SETUP_EMAIL.md** | Email configuration | 15 min |
| **ENV_CONFIGURATION_SUMMARY.md** | Environment variables | 15 min |
| **PROJECT_SUMMARY.md** | Project overview | 10 min |
| **INDEX.md** | This file | 5 min |

---

## 🚀 Get Started in 3 Steps

1. **Database** - Run MySQL setup
   - See: [`SETUP_MYSQL.md`](./SETUP_MYSQL.md)
   - Time: 5 minutes
   
2. **Email** - Choose Gmail or SendGrid
   - See: [`SETUP_EMAIL.md`](./SETUP_EMAIL.md)
   - Time: 5-10 minutes
   
3. **Start Backend** - Run npm commands
   - See: [`QUICK_REFERENCE.md`](./QUICK_REFERENCE.md)
   - Time: 2 minutes

---

## 🎯 Quick Links by Task

### Setup Tasks
- **First time setup?** → [`START_HERE.md`](./START_HERE.md)
- **Database setup?** → [`SETUP_MYSQL.md`](./SETUP_MYSQL.md)
- **Email setup?** → [`SETUP_EMAIL.md`](./SETUP_EMAIL.md)
- **Environment variables?** → [`ENV_CONFIGURATION_SUMMARY.md`](./ENV_CONFIGURATION_SUMMARY.md)
- **Complete walkthrough?** → [`SETUP_COMPLETE.md`](./SETUP_COMPLETE.md)

### Reference Tasks
- **Quick commands?** → [`QUICK_REFERENCE.md`](./QUICK_REFERENCE.md)
- **API documentation?** → [`API_ENDPOINTS.md`](./API_ENDPOINTS.md)
- **Feature overview?** → [`PROJECT_SUMMARY.md`](./PROJECT_SUMMARY.md)
- **Complete guide?** → [`README.md`](./README.md)

### Troubleshooting
- **Having issues?** → See section at end of relevant file
- **Database issues?** → [`SETUP_MYSQL.md`](./SETUP_MYSQL.md) → Troubleshooting
- **Email issues?** → [`SETUP_EMAIL.md`](./SETUP_EMAIL.md) → Troubleshooting
- **API issues?** → [`API_ENDPOINTS.md`](./API_ENDPOINTS.md) → Error Handling

---

## 📊 Your Backend Architecture

```
┌─────────────────────────────────────────────────────┐
│         Frontend (http://localhost:3000)            │
└────────────────┬────────────────────────────────────┘
                 │ HTTP API Calls
                 │
┌────────────────▼────────────────────────────────────┐
│    Backend (http://localhost:5000)                  │
│  ┌────────────────────────────────────────────────┐ │
│  │ Express.js Server with 7 Route Files           │ │
│  │ - Auth, Chat, Referrals, Users, etc.          │ │
│  ├────────────────────────────────────────────────┤ │
│  │ Middleware: Auth, Validation, Errors          │ │
│  ├────────────────────────────────────────────────┤ │
│  │ Services: Business Logic (Chat, Auth, etc)    │ │
│  ├────────────────────────────────────────────────┤ │
│  │ MySQL Database Connection Pool                │ │
│  └────────────────────────────────────────────────┘ │
└────────────────┬────────────────────────────────────┘
        ┌────────┴────────┬──────────────┐
        │                 │              │
        ▼                 ▼              ▼
    ┌────────┐    ┌─────────────┐   ┌──────────┐
    │ MySQL  │    │ Gmail/      │   │ Logging  │
    │ Db     │    │ SendGrid    │   │ System   │
    └────────┘    └─────────────┘   └──────────┘
```

---

## 🛠️ Tech Stack

**Backend Framework**
- Node.js (JavaScript runtime)
- Express.js (Web framework)

**Database**
- MySQL 8.0+
- mysql2 driver

**Authentication**
- JWT (JSON Web Tokens)
- bcryptjs (password hashing)

**Email Service**
- Gmail SMTP OR SendGrid API
- Nodemailer

**Other**
- Winston (logging)
- CORS (cross-origin)
- dotenv (environment variables)

---

## 📁 Key Backend Files

### Configuration
- `server.js` - Main entry point
- `.env` - Environment variables (create this!)
- `package.json` - Dependencies
- `database/schema.sql` - Database tables

### Configuration Folder
- `config/database.js` - MySQL connection
- `config/email.js` - Email service setup
- `config/logger.js` - Winston logger

### Middleware
- `middleware/auth.js` - JWT verification
- `middleware/errorHandler.js` - Error handling
- `middleware/validation.js` - Input validation

### Services (Business Logic)
- `services/authService.js` - Login/register
- `services/chatService.js` - Message handling
- `services/referralService.js` - Therapist access
- `services/userService.js` - User management

### Routes (API Endpoints)
- `routes/auth.js` - /api/auth/*
- `routes/chat.js` - /api/chat/*
- `routes/referrals.js` - /api/referrals/*
- `routes/users.js` - /api/users/*
- `routes/therapist.js` - /api/therapist/*
- `routes/admin.js` - /api/admin/*
- `routes/resources.js` - /api/resources/*

---

## 🔑 Key Features

### Authentication & Authorization
- User registration (patient, therapist, admin)
- JWT-based authentication
- Refresh token mechanism
- Role-based access control

### Chat System
- Create chat sessions
- Send/receive messages
- Sentiment analysis
- Distress detection
- Language support (English, Amharic)

### ⭐ Therapist Referral System
- Patient initiates referral
- Auto-email sent to therapist (with JWT token)
- Therapist clicks email link
- Therapist gets full patient data access
- Access expires after 7 days

### Mental Health Resources
- Bilingual content (EN/AM)
- Category-based organization
- Admin publishing control

### Admin Dashboard
- User management
- System analytics
- Audit logging
- Referral tracking

---

## 🚦 Setup Progress Tracker

```
Setup Steps:
[ ] 1. Read START_HERE.md or QUICKSTART.md
[ ] 2. Install MySQL (or verify it's installed)
[ ] 3. Create database: mental_health_chatbot
[ ] 4. Import schema from database/schema.sql
[ ] 5. Set up Gmail or SendGrid email
[ ] 6. Create .env file in /backend
[ ] 7. Run: npm install
[ ] 8. Run: npm run dev
[ ] 9. Test API endpoints (see QUICK_REFERENCE.md)
[ ] 10. Connect frontend and test
[ ] 11. Deploy to production (see README.md)
```

---

## 📞 Common Questions

### Q: Where do I start?
**A:** Start with [`START_HERE.md`](./START_HERE.md)

### Q: How do I set up the database?
**A:** See [`SETUP_MYSQL.md`](./SETUP_MYSQL.md)

### Q: How do I set up email?
**A:** See [`SETUP_EMAIL.md`](./SETUP_EMAIL.md)

### Q: What are all the API endpoints?
**A:** See [`API_ENDPOINTS.md`](./API_ENDPOINTS.md)

### Q: How do I start the server?
**A:** `npm run dev` (see [`QUICKSTART.md`](./QUICKSTART.md))

### Q: What environment variables do I need?
**A:** See [`ENV_CONFIGURATION_SUMMARY.md`](./ENV_CONFIGURATION_SUMMARY.md)

### Q: How does the therapist referral work?
**A:** See [`PROJECT_SUMMARY.md`](./PROJECT_SUMMARY.md) → Therapist Referral System

### Q: How do I deploy to production?
**A:** See [`README.md`](./README.md) → Deployment

### Q: Something is broken, what do I do?
**A:** See the relevant guide's troubleshooting section

### Q: I need a quick reference
**A:** See [`QUICK_REFERENCE.md`](./QUICK_REFERENCE.md)

---

## 🎓 Learning Path

### For First-Time Setup (30 minutes)
1. [`START_HERE.md`](./START_HERE.md) - 5 min
2. [`SETUP_MYSQL.md`](./SETUP_MYSQL.md) - 10 min
3. [`SETUP_EMAIL.md`](./SETUP_EMAIL.md) - 10 min
4. [`QUICK_REFERENCE.md`](./QUICK_REFERENCE.md) - 5 min

### For Complete Understanding (2 hours)
1. [`START_HERE.md`](./START_HERE.md) - 5 min
2. [`README.md`](./README.md) - 30 min
3. [`API_ENDPOINTS.md`](./API_ENDPOINTS.md) - 30 min
4. [`PROJECT_SUMMARY.md`](./PROJECT_SUMMARY.md) - 20 min
5. [`SETUP_COMPLETE.md`](./SETUP_COMPLETE.md) - 20 min
6. Explore code - 15 min

### For Reference & Troubleshooting
- [`QUICK_REFERENCE.md`](./QUICK_REFERENCE.md) - Commands & quick fixes
- [`ENV_CONFIGURATION_SUMMARY.md`](./ENV_CONFIGURATION_SUMMARY.md) - Variable details

---

## ✅ Checklist Before Starting Server

- [ ] MySQL installed and running
- [ ] Database `mental_health_chatbot` created
- [ ] Schema imported from `database/schema.sql`
- [ ] `.env` file created in `/backend`
- [ ] All `.env` variables filled in
- [ ] Gmail or SendGrid configured
- [ ] `npm install` has been run
- [ ] No other service using port 5000

**If all checked:** Ready to run `npm run dev`!

---

## 🆘 Need Help?

1. **Check the documentation** - Your answer is likely in one of these files
2. **Review troubleshooting sections** - Found at end of relevant guides
3. **Test with QUICK_REFERENCE.md** - Verify setup with curl commands
4. **Check logs** - Look in `logs/app.log`
5. **Verify `.env`** - Make sure all variables are filled correctly

---

## 🎉 You're All Set!

Your complete backend is configured and documented.

**Next Step:** Pick a guide above and start!

---

**Last Updated:** 2024
**Documentation Version:** 1.0
**Backend Files:** 50+ files
**API Endpoints:** 50+
**Database Tables:** 12
