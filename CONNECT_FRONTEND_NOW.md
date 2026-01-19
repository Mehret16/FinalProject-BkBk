# Connect Your Frontend to Backend - Complete Guide

## 3 Simple Steps to Connect

---

## STEP 1: Copy API Service to Frontend

### Copy This File to Your Frontend:
**Backend File:** `/backend/COPY_PASTE_CODE.md`

**What to do:**
1. Open `COPY_PASTE_CODE.md` 
2. Copy the "API Service Layer" section
3. Create file in frontend: `/src/lib/api.ts`
4. Paste the code

---

## STEP 2: Copy Hooks to Frontend

From the same file, copy all 3 hooks:

1. **useAuth Hook** → `/src/hooks/useAuth.ts`
2. **useChat Hook** → `/src/hooks/useChat.ts`
3. **useReferral Hook** → `/src/hooks/useReferral.ts`

---

## STEP 3: Use in Components

Copy ready-to-use components:

1. **LoginForm** → `/src/components/Auth/LoginForm.tsx`
2. **ChatWindow** → `/src/components/Chat/ChatWindow.tsx`
3. **CreateReferral** → `/src/components/Referral/CreateReferral.tsx`

Then import and use:

```tsx
import LoginForm from '@/components/Auth/LoginForm';
import ChatWindow from '@/components/Chat/ChatWindow';

export default function Page() {
  return (
    <>
      <LoginForm />
      <ChatWindow />
    </>
  );
}
```

---

## Complete API Reference

### Backend URL
```
http://localhost:5000/api
```

### Authentication
All protected endpoints need header:
```
Authorization: Bearer {accessToken}
```

### Core Endpoints

| Feature | Endpoint | Method | Auth |
|---------|----------|--------|------|
| Register | `/auth/register` | POST | No |
| Login | `/auth/login` | POST | No |
| Get Profile | `/users/profile` | GET | Yes |
| Create Chat | `/chat/session/create` | POST | Yes |
| Send Message | `/chat/message` | POST | Yes |
| Get History | `/chat/history/:id` | GET | Yes |
| Create Referral | `/referrals/create` | POST | Yes |
| Access Patient Data | `/referrals/access` | POST | Token |
| Get Resources | `/resources` | GET | No |

---

## Example: Complete Login Flow

```typescript
import LoginForm from '@/components/Auth/LoginForm';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const { user } = useAuth();

  if (user) {
    return <div>Welcome {user.username}!</div>;
  }

  return <LoginForm />;
}
```

---

## Example: Complete Chat Flow

```typescript
import ChatWindow from '@/components/Chat/ChatWindow';

export default function ChatPage() {
  return <ChatWindow />;
}
```

---

## Example: Therapist Access Patient Data

```typescript
'use client';

import { useReferral } from '@/hooks/useReferral';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function TherapistAccessPage() {
  const searchParams = useSearchParams();
  const accessToken = searchParams.get('access_token');
  const { accessPatientData, loading } = useReferral();
  const [patientData, setPatientData] = useState(null);

  useEffect(() => {
    if (accessToken) {
      accessPatientData(accessToken).then(setPatientData);
    }
  }, [accessToken]);

  if (loading) return <div>Loading...</div>;
  if (!patientData) return <div>No data</div>;

  return (
    <div>
      <h1>Patient: {patientData.patient.first_name}</h1>
      <h2>Chat Sessions: {patientData.chatSessions.length}</h2>
      <h2>Total Messages: {patientData.messages.length}</h2>
      
      <div>
        {patientData.messages.map((msg) => (
          <div key={msg.id}>
            <strong>{msg.sender_type}:</strong> {msg.message_text}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Environment Setup - Frontend

**File: `.env.local`**

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

## Common Issues & Solutions

### Issue: CORS Error
**Solution:**
Backend already has CORS configured. Make sure:
- Backend is running on `http://localhost:5000`
- Frontend is on `http://localhost:3000`

### Issue: 401 Unauthorized
**Solution:**
Token might be expired. Auto-handled by API - user redirected to login.

### Issue: Network Error
**Solution:**
Check if backend is running:
```bash
curl http://localhost:5000/api/health
```

Should return:
```json
{ "status": "healthy" }
```

---

## Files You Need from Backend

**Copy these to your frontend:**

1. **COPY_PASTE_CODE.md** - Ready-to-use code
2. **FRONTEND_API_INTEGRATION.md** - Complete API reference
3. **API_ENDPOINTS.md** - All endpoints detailed

All in `/backend/` folder.

---

## Quick Checklist

- [ ] Backend running on `http://localhost:5000`
- [ ] Frontend running on `http://localhost:3000`
- [ ] Created `/src/lib/api.ts`
- [ ] Created `/src/hooks/useAuth.ts`
- [ ] Created `/src/hooks/useChat.ts`
- [ ] Created `/src/hooks/useReferral.ts`
- [ ] Created login component
- [ ] Created chat component
- [ ] Set `.env.local` with `NEXT_PUBLIC_API_URL`
- [ ] Tested login - should work!

---

## Start Using the Backend

Your backend is ready! Choose where to start:

**For Patient Features:**
1. Login with patient account
2. Create chat session
3. Send messages (gets AI responses)
4. Create referral to therapist

**For Therapist Features:**
1. Login with therapist account
2. View dashboard
3. Receive referral emails
4. Click email link to access patient data
5. Add notes and update status

**For Admin Features:**
1. Login with admin account
2. View analytics
3. Manage users
4. View all referrals

---

## Support Files

All documentation in `/backend/`:

1. **FRONTEND_API_INTEGRATION.md** ← Main reference
2. **COPY_PASTE_CODE.md** ← Copy-paste ready
3. **API_ENDPOINTS.md** ← All endpoints
4. **FULL_DOCUMENTATION.md** ← Complete guide
5. **QUICK_REFERENCE_CARD.md** ← Cheat sheet

---

**Your backend and frontend integration is ready to go! Start building! 🚀**
