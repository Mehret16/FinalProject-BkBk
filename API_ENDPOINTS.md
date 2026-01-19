# Mental Health Chatbot Backend - API Endpoints

## Base URL
```
http://localhost:5000/api
```

## Authentication
- Use `Authorization: Bearer <accessToken>` header for protected endpoints
- Tokens expire in 15 minutes
- Use refresh endpoint to get new tokens

---

## 🔐 AUTHENTICATION ENDPOINTS

### POST /auth/register
Register a new user.

**Request Body:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "patient"  // or "therapist", "admin"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "role": "patient"
  }
}
```

### POST /auth/login
Login user and get tokens.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "role": "patient"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "abc123def456..."
}
```

### GET /auth/me
Get current user info (protected).

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "role": "patient"
  }
}
```

---

## 👤 USER ENDPOINTS

### GET /users/profile
Get logged-in user's full profile (protected).

**Headers:** `Authorization: Bearer <token>`

### PUT /users/profile
Update user profile (protected).

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Updated",
  "phone_number": "+251911123456",
  "date_of_birth": "1990-05-15",
  "gender": "male",
  "language_preference": "am"
}
```

### GET /users/:userId
Get user info by ID.

### GET /users/therapist/:therapistId/info
Get therapist information including specialization.

### GET /users/patient/:patientId/therapists
Get patient's assigned therapists (patient or admin only).

---

## 💬 CHAT ENDPOINTS

### POST /chat/session/create
Create a new chat session (patient only).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "language": "en"  // or "am"
}
```

**Response:**
```json
{
  "message": "Chat session created",
  "session": {
    "sessionId": 1,
    "sessionToken": "uuid-token",
    "patientId": 1,
    "language": "en"
  }
}
```

### POST /chat/message
Send a message in chat session (patient only).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "sessionId": 1,
  "messageText": "I'm feeling anxious",
  "language": "en"
}
```

**Response:**
```json
{
  "message": "Message saved",
  "messageData": {
    "messageId": 1,
    "sessionId": 1,
    "senderType": "patient",
    "sentimentScore": -0.3,
    "distressKeywords": ["anxious"]
  }
}
```

### GET /chat/history/:sessionId
Get chat history for a session.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `limit`: Number of messages (default: 50)

### GET /chat/sessions
Get all patient's chat sessions (patient only).

**Headers:** `Authorization: Bearer <token>`

### GET /chat/session/:sessionId
Get session details.

**Headers:** `Authorization: Bearer <token>`

### POST /chat/escalate/:sessionId
Escalate a chat session for human intervention.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "reason": "Patient expressing suicidal thoughts"
}
```

### POST /chat/close/:sessionId
Close a chat session (patient only).

**Headers:** `Authorization: Bearer <token>`

---

## 🔗 REFERRAL ENDPOINTS

### POST /referrals/create
Patient creates referral to therapist (patient only).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "therapistId": 2,
  "reason": "Need professional depression support",
  "urgency": "high"  // low, medium, high
}
```

**Response:**
```json
{
  "message": "Referral created and therapist notified",
  "referral": {
    "referralId": 1,
    "patientId": 1,
    "therapistId": 2,
    "status": "pending",
    "accessToken": "jwt-token",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

**What Happens:**
1. Referral is created in database
2. Unique access token is generated (valid 7 days)
3. Email is sent to therapist with access link
4. Email contains full access to patient data

### GET /referrals/my-referrals
Get patient's referrals (patient only).

**Headers:** `Authorization: Bearer <token>`

### GET /referrals/therapist
Get referrals to therapist (therapist only).

**Headers:** `Authorization: Bearer <token>`

### POST /referrals/access
Therapist accesses full patient data using referral token.

**Query Parameters or Headers:**
- `access_token`: JWT token from email link
- OR `X-Referral-Token` header

**Response:**
```json
{
  "message": "Patient data accessed",
  "data": {
    "referralId": 1,
    "patient": {
      "id": 1,
      "username": "john_doe",
      "email": "john@example.com",
      "first_name": "John",
      "last_name": "Doe"
    },
    "chatSessions": [
      {
        "id": 1,
        "language": "en",
        "detected_sentiment": "negative",
        "distress_level": 3,
        "is_escalated": false,
        "created_at": "2024-01-15T09:00:00Z"
      }
    ],
    "messages": [
      {
        "id": 1,
        "session_id": 1,
        "sender_type": "patient",
        "message_text": "I'm feeling depressed",
        "sentiment_score": -0.7,
        "emotion_label": "sad",
        "created_at": "2024-01-15T09:05:00Z"
      }
    ],
    "referralDetails": {
      "reason": "Need professional help",
      "urgency": "high",
      "status": "pending",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

### GET /referrals/patient/:referralId
Get patient data by referral (requires access token).

**Query Parameters:**
- `access_token`: JWT token

### POST /referrals/:referralId/status
Update referral status (therapist only).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "status": "accepted"  // accepted, rejected, completed
}
```

### POST /referrals/:referralId/notes
Add notes to referral (therapist only).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "notes": "Patient showing signs of depression. Recommend cognitive behavioral therapy."
}
```

---

## 👨‍⚕️ THERAPIST ENDPOINTS

### GET /therapist/dashboard
Get therapist dashboard (therapist only).

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "therapistId": 2,
  "patientsCount": 5,
  "pendingReferrals": 2,
  "recentConversationsCount": 12,
  "patients": [...],
  "referrals": [...],
  "recentConversations": [...]
}
```

### GET /therapist/patients
Get list of assigned patients (therapist only).

**Headers:** `Authorization: Bearer <token>`

### GET /therapist/patient/:patientId/report
Get patient report and statistics (therapist only).

**Headers:** `Authorization: Bearer <token>`

### GET /therapist/patient/:patientId/conversations
Get all conversations with patient (therapist only).

**Headers:** `Authorization: Bearer <token>`

---

## 👨‍💼 ADMIN ENDPOINTS

### GET /admin/dashboard
Get system dashboard (admin only).

**Headers:** `Authorization: Bearer <token>`

### GET /admin/users
Get all users with filtering (admin only).

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `role`: Filter by role (patient, therapist, admin)
- `status`: active or inactive
- `limit`: Number of records (default: 50)
- `offset`: Pagination offset (default: 0)

### GET /admin/analytics/sentiment
Get sentiment trend data (admin only).

**Headers:** `Authorization: Bearer <token>`

### GET /admin/analytics/usage
Get usage statistics (admin only).

**Headers:** `Authorization: Bearer <token>`

### GET /admin/referrals
Get all referrals with filtering (admin only).

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `status`: Filter by status (pending, accepted, rejected, completed)
- `limit`: Number of records
- `offset`: Pagination offset

### GET /admin/audit-logs
Get audit logs (admin only).

**Headers:** `Authorization: Bearer <token>`

### POST /admin/assign-therapist
Assign therapist to patient (admin only).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "therapistId": 2,
  "patientId": 1,
  "referralId": 1
}
```

---

## 📚 RESOURCES ENDPOINTS

### GET /resources
Get published mental health resources (public).

**Query Parameters:**
- `category`: Filter by category
- `language`: en, am, or both
- `limit`: Default 50
- `offset`: Pagination

### GET /resources/categories
Get available resource categories (public).

### GET /resources/:resourceId
Get specific resource by ID (public).

### POST /resources
Create new resource (admin only).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "title_en": "Understanding Depression",
  "title_am": "ምስጋና ገምግም",
  "description_en": "...",
  "description_am": "...",
  "category": "Mental Health",
  "language": "both",
  "contentUrl": "https://...",
  "resourceType": "article"
}
```

### PUT /resources/:resourceId
Update resource (admin only).

**Headers:** `Authorization: Bearer <token>`

### DELETE /resources/:resourceId
Delete resource (admin only).

**Headers:** `Authorization: Bearer <token>`

---

## 🏥 HEALTH CHECK

### GET /health
Check API health status (no authentication).

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:35:00Z",
  "database": "connected"
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error message here",
  "details": "Additional details if available"
}
```

**Common Status Codes:**
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 409: Conflict (e.g., duplicate entry)
- 500: Internal Server Error

---

## Authentication Flow

1. **Register:** POST `/auth/register`
2. **Login:** POST `/auth/login` → Get `accessToken` and `refreshToken`
3. **Use Token:** Include in all protected requests: `Authorization: Bearer <accessToken>`
4. **Referral Access:** Therapist receives email with special access link containing `access_token` query parameter

---

## Referral Workflow (Key Feature)

1. Patient creates referral: `POST /referrals/create`
2. System generates unique JWT access token (valid 7 days)
3. Email sent to therapist with link: `https://frontend.com/therapist/referral?access_token=TOKEN&referral_id=ID`
4. Therapist clicks email link
5. Therapist accesses patient data: `POST /referrals/access?access_token=TOKEN`
6. Therapist gets:
   - Full patient profile
   - All chat sessions
   - Complete message history
   - Referral details

This ensures therapist has complete access to patient data when needed!
