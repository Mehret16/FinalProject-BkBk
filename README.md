# Mental Health Support Chatbot - Backend

A production-ready Node.js + Express backend for a mental health support chatbot system serving Ethiopia with bilingual support (English & Amharic).

## 🎯 Features

✅ **Authentication & Authorization**
- Supabase-based authentication system
- Role-Based Access Control (Patient, Doctor/Therapist)
- JWT token verification via Supabase Auth
- Secure signup with secret key protection for doctors

✅ **Chat System**
- Real-time chat sessions with AI-powered responses
- Google Gemini AI integration for intelligent conversations
- Sentiment analysis and emotional support
- High-risk patient detection and alerts
- Chat history management and persistence

✅ **Doctor Assignment & Referral System** ⭐ (Key Feature)
- Patients can view and select from available doctors
- Doctor assignment with notification system
- High-risk patient alerts for doctors
- Secure doctor-patient communication channels
- Professional mental health support integration

✅ **Doctor Dashboard**
- View assigned patients and their chat histories
- Access patient profiles and risk assessments
- Review conversation logs and sentiment trends
- Respond to patient messages directly
- Manage high-risk patient alerts

✅ **AI-Powered Support**
- Google Gemini API for intelligent chat responses
- Contextual understanding and emotional support
- Crisis detection and escalation protocols
- Bilingual support capabilities (English/Amharic)

✅ **Security & Privacy**
- Supabase Auth for secure user management
- Role-based data access control
- Input validation & sanitization
- CORS protection for multiple frontend domains
- Secure API endpoints with token verification

---

## 🛠️ Tech Stack

- **Runtime:** Node.js (ES Modules)
- **Framework:** Express.js
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **AI Services:** Google Gemini API
- **Security:** CORS, Express Rate Limiting
- **Environment:** dotenv
- **Development:** nodemon, cross-env

---

## 📋 Prerequisites

- Node.js v16+
- Supabase account and project
- Google Gemini API key
- npm or yarn

---

## 🚀 Installation

### 1. Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd FinalProject-BkBk

# Install dependencies
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Google AI Configuration
GEMINI_API_KEY=your_google_gemini_api_key

# Doctor Signup Security
DOCTOR_SIGNUP_SECRET=your_secret_key_for_doctor_signup

# Server Configuration
PORT=5000
```

**Getting your credentials:**
1. **Supabase:** Create a project at [supabase.com](https://supabase.com) and get URL + keys from Settings > API
2. **Google Gemini:** Get API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
3. **Doctor Secret:** Create a secure secret key for doctor signup protection

### 3. Database Setup

Set up your Supabase database with the required tables:
- `patients` - Patient profiles and information
- `doctors` - Doctor profiles and specializations  
- `chat_sessions` - Chat session records
- `chat_messages` - Individual chat messages
- `doctor_assignments` - Doctor-patient relationships

You can use the Supabase dashboard SQL editor or migrate via the Supabase CLI.

### 4. Start Server

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm start
```

Expected output:
```
🚀 Server is working on port 5000
Checking Supabase... Client Initialized
```

### 5. Test Health Check

```bash
curl http://localhost:5000/
```

Expected response:
```
Mental Health API is running :rocket:
```

---

## 📁 Project Structure

```
FinalProject-BkBk/
├── controllers/               # Business logic controllers
│   ├── authController.js      # Authentication & user management
│   ├── chatController.js      # Chat handling & AI integration
│   └── doctorController.js    # Doctor management & assignments
│
├── middleware/               # Custom middleware
│   └── authMiddleware.js      # Supabase token verification
│
├── routes/                   # API route definitions
│   ├── authRoutes.js         # Authentication endpoints
│   └── chatRoutes.js         # Chat & doctor endpoints
│
├── .env                      # Environment variables (create this)
├── .gitignore                # Git ignore rules
├── package.json              # Dependencies & scripts
├── server.js                 # Express app entry point
├── app.js                    # Alternative app configuration
├── test-db.js                # Database connection testing
└── README.md                 # This file
```

---

## 🔑 Key API Endpoints

### Authentication
```
POST   /api/auth/signup           - Register new patient
POST   /api/auth/signup-doctor    - Register new doctor (requires secret)
POST   /api/auth/login             - Login user
POST   /api/auth/logout            - Logout user
```

### Chat & Communication
```
POST   /api/chat/send              - Send chat message (AI response)
GET    /api/chat/history/:patientId - Get chat history
POST   /api/chat/notify-doctor     - Notify selected doctor
```

### Doctor Management
```
GET    /api/chat/doctors           - Get available doctors
POST   /api/chat/assign            - Assign doctor to patient
GET    /api/chat/alerts            - Get high-risk patient alerts
POST   /api/chat/reply             - Doctor reply to patient
```

---

## 🔐 Security Features

### Authentication
- Supabase Auth integration with JWT tokens
- Role-based access control (Patient/Doctor)
- Secret key protection for doctor signup
- Secure session management

### Data Protection
- Input validation & sanitization
- CORS configuration for multiple frontend domains
- Rate limiting capabilities
- Secure API endpoint access control

### Database Security
- Supabase Row Level Security (RLS) policies
- Encrypted connections to database
- Role-based data access patterns
- Service role key for admin operations

---

## 🤖 AI Integration

### Google Gemini API
The system uses Google Gemini AI to provide intelligent, empathetic responses to patients:

**Features:**
- Contextual understanding of mental health conversations
- Emotional support and crisis detection
- Bilingual support (English/Amharic)
- Safe and appropriate response generation
- Integration with sentiment analysis

**Implementation:**
- API key configured via `GEMINI_API_KEY` environment variable
- Responses are processed through safety filters
- High-risk detection triggers doctor notifications
- Conversation context maintained for coherent dialogue

---

## 📊 Database Schema (Supabase)

### Main Tables:

**patients** - Patient profiles and demographics
**doctors** - Doctor profiles and specializations
**chat_sessions** - Chat session tracking
**chat_messages** - Individual messages with metadata
**doctor_assignments** - Doctor-patient relationships

All tables are managed through Supabase with appropriate Row Level Security (RLS) policies to ensure data privacy and access control.

---

## 🧪 Testing Endpoints

### 1. Register Patient
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@example.com",
    "password": "SecurePass123",
    "firstName": "John",
    "lastName": "Doe",
    "age": 25,
    "gender": "male",
    "country": "Ethiopia"
  }'
```

### 2. Register Doctor (with secret)
```bash
curl -X POST http://localhost:5000/api/auth/signup-doctor \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@example.com",
    "password": "SecurePass123",
    "firstName": "Dr. Sarah",
    "lastName": "Johnson",
    "adminKey": "MY_SUPER_SECRET_123"
  }'
```

### 3. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@example.com",
    "password": "SecurePass123"
  }'
```

### 4. Send Chat Message (with token)
```bash
curl -X POST http://localhost:5000/api/chat/send \
  -H "Authorization: Bearer <your_supabase_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I am feeling anxious today",
    "sessionId": "session_id_or_null"
  }'
```

---

##  Error Handling

All endpoints return consistent error format:
```json
{
  "error": "Error message",
  "details": "Additional context"
}
```

Common error codes:
- 400: Bad Request (validation errors)
- 401: Unauthorized (invalid/missing token)
- 403: Forbidden (insufficient permissions)
- 404: Not Found (resource doesn't exist)
- 500: Internal Server Error (database/API issues)

---

## 🔄 Environment Variables

Create `.env` file with the following variables:

**Required variables:**
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key  
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
GEMINI_API_KEY=your_google_gemini_api_key
DOCTOR_SIGNUP_SECRET=your_secure_secret_key
PORT=5000
```

**Optional variables:**
```env
NODE_ENV=development  # or production
```

---

## 📈 Architecture Overview

### Frontend Integration
The backend supports multiple frontend origins:
- `https://mental-health-safespace.netlify.app` (production)
- `http://localhost:3000` (development)
- `http://localhost:5173`, `http://localhost:5174`, `http://localhost:5175` (Vite dev servers)

### Authentication Flow
1. User registers via Supabase Auth
2. Supabase returns JWT token
3. Frontend includes token in Authorization header
4. Backend verifies token via Supabase middleware
5. User data and role extracted from token metadata

### AI Chat Flow
1. Patient sends message to `/api/chat/send`
2. System analyzes message for risk indicators
3. Message sent to Google Gemini API
4. AI response processed and returned
5. High-risk content triggers doctor notifications
6. Conversation stored in Supabase database

---

## 🐛 Troubleshooting

### Supabase Connection Error
```bash
Error: Supabase client initialization failed
```
- Verify SUPABASE_URL and SUPABASE_ANON_KEY in .env
- Check Supabase project is active
- Test connection: `node test-db.js`

### Gemini API Error
```bash
Error: Invalid API key
```
- Verify GEMINI_API_KEY is correct
- Check API key is enabled for Gemini API
- Ensure billing is set up in Google Cloud

### Doctor Signup Failed
```bash
Error: Unauthorized: Invalid Doctor Secret Key
```
- Verify DOCTOR_SIGNUP_SECRET matches .env
- Check adminKey is being sent in request body
- Ensure secret key is properly escaped

### CORS Issues
- Verify your frontend URL is in CORS origins list
- Check credentials are being sent with requests
- Ensure preflight OPTIONS requests are handled

---

## 🚀 Production Deployment

### Environment Setup
```env
NODE_ENV=production
PORT=5000
```

### Security Considerations
1. **Environment Variables:** Use secure secrets management
2. **Supabase RLS:** Enable Row Level Security policies
3. **API Keys:** Rotate keys regularly and monitor usage
4. **Rate Limiting:** Configure rate limiting for production
5. **Monitoring:** Set up error tracking and monitoring

### Deployment Platforms
- **Vercel:** Serverless functions (recommended)
- **Heroku:** Dyno-based deployment
- **AWS:** Lambda + API Gateway
- **DigitalOcean:** App Platform
- **Railway:** Container-based deployment

---

## � Development Notes

### Current Implementation Status
- ✅ Supabase authentication integration
- ✅ Google Gemini AI chat functionality  
- ✅ Doctor-patient assignment system
- ✅ High-risk patient detection
- ✅ CORS configuration for multiple frontends
- ✅ Role-based access control
- ✅ Secure doctor signup with secret key

### Tech Decisions
- **Supabase:** Chosen for managed PostgreSQL + Auth
- **Google Gemini:** Selected for advanced AI capabilities
- **Express.js:** Lightweight and flexible framework
- **ES Modules:** Modern JavaScript syntax support

---

## 📧 Support

For issues or questions:
1. Check environment variables configuration
2. Verify Supabase connection: `node test-db.js`
3. Review API key validity and permissions
4. Check CORS settings for your frontend domain

---

## 📄 License

MIT

---

**Built with ❤️ for mental health support in Ethiopia**
