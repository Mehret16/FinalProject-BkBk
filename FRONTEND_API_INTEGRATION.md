# Frontend API Integration Guide

## Quick Start - Connect Frontend to Backend

**Backend URL:** `http://localhost:5000/api`

---

## Installation - Frontend Dependencies

```bash
npm install axios
# or
npm install node-fetch
```

---

## 1. AUTHENTICATION SETUP

### Helper Functions (Create in Frontend)

**File: `/src/services/api.js` or `/src/lib/api.ts`**

```javascript
const API_BASE_URL = 'http://localhost:5000/api';

// Store tokens
const setTokens = (accessToken, refreshToken) => {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
};

const getAccessToken = () => localStorage.getItem('accessToken');
const getRefreshToken = () => localStorage.getItem('refreshToken');

// API call with auth header
const apiCall = async (endpoint, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const token = getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API Error');
  }

  return await response.json();
};

export { apiCall, setTokens, getAccessToken, getRefreshToken };
```

---

## 2. AUTHENTICATION ENDPOINTS

### Register User

```javascript
// Frontend: /components/Auth/Register.jsx or /app/register/page.tsx

const handleRegister = async (formData) => {
  try {
    const response = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: 'patient' // or 'therapist'
      })
    });

    const data = await response.json();
    if (response.ok) {
      console.log('Registration successful:', data);
      // Redirect to login
    }
  } catch (error) {
    console.error('Registration error:', error);
  }
};
```

### Login User

```javascript
const handleLogin = async (email, password) => {
  try {
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    if (response.ok) {
      // Save tokens
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Redirect to dashboard
      window.location.href = '/dashboard';
    }
  } catch (error) {
    console.error('Login error:', error);
  }
};
```

### Get Current User

```javascript
const getCurrentUser = async () => {
  try {
    const response = await apiCall('/auth/me');
    return response.user;
  } catch (error) {
    console.error('Failed to get user:', error);
    return null;
  }
};
```

---

## 3. CHAT ENDPOINTS

### Create Chat Session

```javascript
// Frontend: /components/Chat/ChatWindow.jsx

const createChatSession = async (language = 'en') => {
  try {
    const response = await apiCall('/chat/session/create', {
      method: 'POST',
      body: JSON.stringify({ language })
    });

    // Save session ID
    localStorage.setItem('sessionId', response.session.sessionId);
    return response.session;
  } catch (error) {
    console.error('Failed to create session:', error);
  }
};
```

### Send Message (With Gemini AI Response)

```javascript
const sendMessage = async (sessionId, messageText) => {
  try {
    const response = await apiCall('/chat/message', {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        messageText,
        language: 'en'
      })
    });

    // Response includes:
    // - patientMessage: Your message saved
    // - botResponse: Gemini AI response
    // - alert: Crisis alert if detected

    return response;
  } catch (error) {
    console.error('Failed to send message:', error);
  }
};
```

### Get Chat History

```javascript
const getChatHistory = async (sessionId) => {
  try {
    const response = await apiCall(`/chat/history/${sessionId}?limit=50`);
    return response.messages; // Array of messages
  } catch (error) {
    console.error('Failed to get history:', error);
  }
};
```

### Get All Patient Sessions

```javascript
const getPatientSessions = async () => {
  try {
    const response = await apiCall('/chat/sessions');
    return response.sessions;
  } catch (error) {
    console.error('Failed to get sessions:', error);
  }
};
```

### Escalate Chat Session

```javascript
const escalateSession = async (sessionId, reason) => {
  try {
    const response = await apiCall(`/chat/escalate/${sessionId}`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
    return response;
  } catch (error) {
    console.error('Failed to escalate:', error);
  }
};
```

### Close Chat Session

```javascript
const closeSession = async (sessionId) => {
  try {
    const response = await apiCall(`/chat/close/${sessionId}`, {
      method: 'POST'
    });
    return response;
  } catch (error) {
    console.error('Failed to close session:', error);
  }
};
```

---

## 4. REFERRAL ENDPOINTS

### Create Referral (Patient creates & emails therapist)

```javascript
// Frontend: /components/Referral/CreateReferral.jsx

const createReferral = async (therapistId, reason, urgency = 'medium') => {
  try {
    const response = await apiCall('/referrals/create', {
      method: 'POST',
      body: JSON.stringify({
        therapistId,
        reason,
        urgency
      })
    });

    if (response.ok) {
      alert('Therapist has been notified!');
      return response.referral;
    }
  } catch (error) {
    console.error('Failed to create referral:', error);
  }
};
```

### Get Patient's Referrals

```javascript
const getMyReferrals = async () => {
  try {
    const response = await apiCall('/referrals/my-referrals');
    return response.referrals;
  } catch (error) {
    console.error('Failed to get referrals:', error);
  }
};
```

### Therapist Access Patient Data (Using Email Link)

```javascript
// Frontend: /therapist/referral/page.tsx or similar
// URL: http://localhost:3000/therapist/referral?access_token=JWT&referral_id=1

const getPatientDataAsTherapist = async (accessToken) => {
  try {
    const response = await fetch('http://localhost:5000/api/referrals/access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Referral-Token': accessToken
      }
    });

    const data = await response.json();
    
    // data contains:
    // - patient: Full patient profile
    // - chatSessions: All sessions
    // - messages: All messages
    // - referralDetails: Referral info

    return data.data;
  } catch (error) {
    console.error('Failed to access patient data:', error);
  }
};
```

### Get Therapist's Referrals

```javascript
const getTherapistReferrals = async () => {
  try {
    const response = await apiCall('/referrals/therapist');
    return response.referrals;
  } catch (error) {
    console.error('Failed to get referrals:', error);
  }
};
```

### Therapist Updates Referral Status

```javascript
const updateReferralStatus = async (referralId, status) => {
  // status: 'accepted', 'rejected', 'completed'
  try {
    const response = await apiCall(`/referrals/${referralId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status })
    });
    return response;
  } catch (error) {
    console.error('Failed to update referral:', error);
  }
};
```

### Therapist Add Notes

```javascript
const addReferralNotes = async (referralId, notes) => {
  try {
    const response = await apiCall(`/referrals/${referralId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ notes })
    });
    return response;
  } catch (error) {
    console.error('Failed to add notes:', error);
  }
};
```

---

## 5. USER ENDPOINTS

### Get User Profile

```javascript
const getUserProfile = async () => {
  try {
    const response = await apiCall('/users/profile');
    return response.user;
  } catch (error) {
    console.error('Failed to get profile:', error);
  }
};
```

### Update User Profile

```javascript
const updateProfile = async (profileData) => {
  try {
    const response = await apiCall('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
    return response.user;
  } catch (error) {
    console.error('Failed to update profile:', error);
  }
};
```

### Get Therapist Info

```javascript
const getTherapistInfo = async (therapistId) => {
  try {
    const response = await apiCall(`/users/therapist/${therapistId}/info`);
    return response.therapist;
  } catch (error) {
    console.error('Failed to get therapist info:', error);
  }
};
```

---

## 6. THERAPIST ENDPOINTS

### Get Therapist Dashboard

```javascript
const getTherapistDashboard = async () => {
  try {
    const response = await apiCall('/therapist/dashboard');
    return response;
  } catch (error) {
    console.error('Failed to get dashboard:', error);
  }
};
```

### Get Therapist's Patients

```javascript
const getTherapistPatients = async () => {
  try {
    const response = await apiCall('/therapist/patients');
    return response.patients;
  } catch (error) {
    console.error('Failed to get patients:', error);
  }
};
```

### Get Patient Report

```javascript
const getPatientReport = async (patientId) => {
  try {
    const response = await apiCall(`/therapist/patient/${patientId}/report`);
    return response;
  } catch (error) {
    console.error('Failed to get report:', error);
  }
};
```

### Get Patient Conversations

```javascript
const getPatientConversations = async (patientId) => {
  try {
    const response = await apiCall(`/therapist/patient/${patientId}/conversations`);
    return response.conversations;
  } catch (error) {
    console.error('Failed to get conversations:', error);
  }
};
```

---

## 7. ADMIN ENDPOINTS

### Get Admin Dashboard

```javascript
const getAdminDashboard = async () => {
  try {
    const response = await apiCall('/admin/dashboard');
    return response;
  } catch (error) {
    console.error('Failed to get admin dashboard:', error);
  }
};
```

### Get All Users

```javascript
const getAllUsers = async (role = null, limit = 50, offset = 0) => {
  let url = `/admin/users?limit=${limit}&offset=${offset}`;
  if (role) url += `&role=${role}`;
  
  try {
    const response = await apiCall(url);
    return response.users;
  } catch (error) {
    console.error('Failed to get users:', error);
  }
};
```

### Get Sentiment Analytics

```javascript
const getSentimentAnalytics = async () => {
  try {
    const response = await apiCall('/admin/analytics/sentiment');
    return response;
  } catch (error) {
    console.error('Failed to get analytics:', error);
  }
};
```

### Get Usage Statistics

```javascript
const getUsageStats = async () => {
  try {
    const response = await apiCall('/admin/analytics/usage');
    return response;
  } catch (error) {
    console.error('Failed to get usage stats:', error);
  }
};
```

---

## 8. RESOURCES ENDPOINTS

### Get Resources (Public)

```javascript
const getResources = async (category = null, language = 'en') => {
  let url = `/resources?language=${language}`;
  if (category) url += `&category=${category}`;
  
  try {
    const response = await fetch(`http://localhost:5000/api${url}`);
    return await response.json();
  } catch (error) {
    console.error('Failed to get resources:', error);
  }
};
```

### Get Resource Categories (Public)

```javascript
const getResourceCategories = async () => {
  try {
    const response = await fetch('http://localhost:5000/api/resources/categories');
    return await response.json();
  } catch (error) {
    console.error('Failed to get categories:', error);
  }
};
```

### Create Resource (Admin)

```javascript
const createResource = async (resourceData) => {
  try {
    const response = await apiCall('/resources', {
      method: 'POST',
      body: JSON.stringify(resourceData)
    });
    return response;
  } catch (error) {
    console.error('Failed to create resource:', error);
  }
};
```

---

## 9. COMPLETE EXAMPLE - Chat Component

```javascript
import React, { useState, useEffect } from 'react';
import { apiCall } from '@/lib/api';

export default function ChatComponent() {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Create session on mount
  useEffect(() => {
    const initializeChat = async () => {
      try {
        const response = await apiCall('/chat/session/create', {
          method: 'POST',
          body: JSON.stringify({ language: 'en' })
        });
        setSessionId(response.session.sessionId);
      } catch (error) {
        console.error('Failed to create session:', error);
      }
    };

    initializeChat();
  }, []);

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !sessionId) return;

    setLoading(true);
    try {
      const response = await apiCall('/chat/message', {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          messageText: input,
          language: 'en'
        })
      });

      // Add messages to chat
      setMessages([
        ...messages,
        {
          id: response.patientMessage.id,
          text: input,
          sender: 'patient',
          timestamp: new Date()
        },
        {
          id: response.botResponse.messageId,
          text: response.botResponse.response,
          sender: 'bot',
          timestamp: new Date()
        }
      ]);

      // Check for alerts
      if (response.alert) {
        alert(`⚠️ ${response.alert.type}: ${response.alert.riskLevel}`);
      }

      setInput('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.sender}`}>
            {msg.text}
          </div>
        ))}
      </div>

      <form onSubmit={handleSendMessage}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={loading}
        />
        <button type="submit" disabled={loading}>
          Send
        </button>
      </form>
    </div>
  );
}
```

---

## 10. ERROR HANDLING

```javascript
const handleApiError = (error) => {
  if (error instanceof TypeError) {
    console.error('Network error:', error);
    return 'Network connection failed';
  }

  if (error.message === 'Unauthorized') {
    // Token expired, redirect to login
    localStorage.removeItem('accessToken');
    window.location.href = '/login';
    return 'Session expired. Please login again.';
  }

  return error.message || 'Something went wrong';
};
```

---

## 11. ENVIRONMENT VARIABLES - Frontend

**File: `.env.local` or `.env`**

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_APP_NAME=Mental Health Chatbot
```

Then use:

```javascript
const API_URL = process.env.NEXT_PUBLIC_API_URL;
```

---

## Summary

| Feature | Endpoint | Method |
|---------|----------|--------|
| Register | `/auth/register` | POST |
| Login | `/auth/login` | POST |
| Create Chat | `/chat/session/create` | POST |
| Send Message | `/chat/message` | POST |
| Get History | `/chat/history/:id` | GET |
| Create Referral | `/referrals/create` | POST |
| Therapist Access | `/referrals/access` | POST |
| Get Resources | `/resources` | GET |

**All protected endpoints require:** `Authorization: Bearer {accessToken}` header
