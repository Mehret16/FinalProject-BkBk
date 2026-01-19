# Copy-Paste Ready Code for Frontend

Use these code snippets directly in your Next.js or React frontend.

---

## 1. API Service Layer (Copy to Frontend)

**File: `/src/lib/api.ts` or `/src/services/api.js`**

```typescript
// lib/api.ts
import type { NextRequest } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// Store tokens in localStorage
export const setTokens = (accessToken: string, refreshToken: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }
};

export const getAccessToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('accessToken');
  }
  return null;
};

export const clearTokens = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
};

// Main API call function
export const apiCall = async <T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };

  const token = getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle auth errors
      if (response.status === 401) {
        clearTokens();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
      throw new Error(data.error || `API Error: ${response.status}`);
    }

    return data as T;
  } catch (error) {
    console.error('API Call Error:', error);
    throw error;
  }
};
```

---

## 2. Authentication Hooks

**File: `/src/hooks/useAuth.ts`**

```typescript
import { useState, useCallback } from 'react';
import { apiCall, setTokens, clearTokens } from '@/lib/api';

export interface User {
  id: number;
  username: string;
  email: string;
  role: 'patient' | 'therapist' | 'admin';
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const response: any = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      setTokens(response.accessToken, response.refreshToken);
      setUser(response.user);
      return response.user;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(
    async (formData: {
      username: string;
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      role: string;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const response: any = await apiCall('/auth/register', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
        return response.user;
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
  }, []);

  const getCurrentUser = useCallback(async () => {
    try {
      const response: any = await apiCall('/auth/me');
      setUser(response.user);
      return response.user;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  }, []);

  return {
    user,
    loading,
    error,
    login,
    register,
    logout,
    getCurrentUser,
  };
};
```

---

## 3. Chat Hook

**File: `/src/hooks/useChat.ts`**

```typescript
import { useState, useCallback } from 'react';
import { apiCall } from '@/lib/api';

export interface Message {
  id: number;
  sessionId: number;
  senderType: 'patient' | 'bot';
  messageText: string;
  sentimentScore: number;
  timestamp: string;
}

export interface ChatSession {
  sessionId: number;
  language: string;
  createdAt: string;
}

export const useChat = () => {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSession = useCallback(async (language = 'en') => {
    setLoading(true);
    setError(null);
    try {
      const response: any = await apiCall('/chat/session/create', {
        method: 'POST',
        body: JSON.stringify({ language }),
      });
      setSessionId(response.session.sessionId);
      return response.session;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (messageText: string) => {
    if (!sessionId) throw new Error('No active session');

    setLoading(true);
    setError(null);
    try {
      const response: any = await apiCall('/chat/message', {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          messageText,
          language: 'en',
        }),
      });

      // Add both patient and bot messages
      setMessages((prev) => [
        ...prev,
        {
          id: response.patientMessage.id,
          sessionId,
          senderType: 'patient',
          messageText: messageText,
          sentimentScore: response.patientMessage.sentimentScore,
          timestamp: new Date().toISOString(),
        },
        {
          id: response.botResponse.messageId,
          sessionId,
          senderType: 'bot',
          messageText: response.botResponse.response,
          sentimentScore: 0,
          timestamp: new Date().toISOString(),
        },
      ]);

      return response;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const getHistory = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const response: any = await apiCall(`/chat/history/${id}?limit=50`);
      setMessages(response.messages || []);
      return response.messages;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const closeSession = useCallback(async () => {
    if (!sessionId) return;

    try {
      await apiCall(`/chat/close/${sessionId}`, {
        method: 'POST',
      });
      setSessionId(null);
      setMessages([]);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [sessionId]);

  return {
    sessionId,
    messages,
    loading,
    error,
    createSession,
    sendMessage,
    getHistory,
    closeSession,
  };
};
```

---

## 4. Referral Hook

**File: `/src/hooks/useReferral.ts`**

```typescript
import { useState, useCallback } from 'react';
import { apiCall } from '@/lib/api';

export interface Referral {
  referralId: number;
  patientId: number;
  therapistId: number;
  status: string;
  reason: string;
  urgency: string;
  createdAt: string;
}

export const useReferral = () => {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createReferral = useCallback(
    async (therapistId: number, reason: string, urgency = 'medium') => {
      setLoading(true);
      setError(null);
      try {
        const response: any = await apiCall('/referrals/create', {
          method: 'POST',
          body: JSON.stringify({ therapistId, reason, urgency }),
        });
        return response.referral;
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const getMyReferrals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response: any = await apiCall('/referrals/my-referrals');
      setReferrals(response.referrals || []);
      return response.referrals;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getTherapistReferrals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response: any = await apiCall('/referrals/therapist');
      setReferrals(response.referrals || []);
      return response.referrals;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const accessPatientData = useCallback(async (accessToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const response: any = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/referrals/access`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Referral-Token': accessToken,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to access patient data');

      const data = await response.json();
      return data.data; // Contains patient, sessions, messages, etc.
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateReferralStatus = useCallback(async (referralId: number, status: string) => {
    try {
      const response: any = await apiCall(`/referrals/${referralId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      });
      return response;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  return {
    referrals,
    loading,
    error,
    createReferral,
    getMyReferrals,
    getTherapistReferrals,
    accessPatientData,
    updateReferralStatus,
  };
};
```

---

## 5. Login Component (Copy-Paste Ready)

**File: `/src/components/Auth/LoginForm.tsx`**

```typescript
'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const user = await login(email, password);
      
      // Redirect based on role
      if (user.role === 'patient') {
        router.push('/patient/dashboard');
      } else if (user.role === 'therapist') {
        router.push('/therapist/dashboard');
      } else {
        router.push('/admin/dashboard');
      }
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="bg-red-100 text-red-700 p-3 rounded">{error}</div>}

      <div>
        <label className="block text-sm font-medium">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 border rounded"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-2 border rounded"
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50"
      >
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

---

## 6. Chat Component (Copy-Paste Ready)

**File: `/src/components/Chat/ChatWindow.tsx`**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useChat } from '@/hooks/useChat';

export default function ChatWindow() {
  const [input, setInput] = useState('');
  const { sessionId, messages, loading, error, createSession, sendMessage } = useChat();

  // Create session on mount
  useEffect(() => {
    createSession('en');
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !sessionId) return;

    try {
      await sendMessage(input);
      setInput('');
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto">
      {error && <div className="bg-red-100 text-red-700 p-3">{error}</div>}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.senderType === 'patient' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs px-4 py-2 rounded ${
                msg.senderType === 'patient'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-300 text-black'
              }`}
            >
              {msg.messageText}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSendMessage} className="p-4 border-t flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 px-4 py-2 border rounded"
          disabled={loading || !sessionId}
        />
        <button
          type="submit"
          disabled={loading || !sessionId}
          className="bg-blue-600 text-white px-6 py-2 rounded disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
```

---

## 7. Create Referral Component (Copy-Paste Ready)

**File: `/src/components/Referral/CreateReferral.tsx`**

```typescript
'use client';

import { useState } from 'react';
import { useReferral } from '@/hooks/useReferral';

export default function CreateReferral() {
  const [therapistId, setTherapistId] = useState('');
  const [reason, setReason] = useState('');
  const [urgency, setUrgency] = useState('medium');
  const { createReferral, loading, error } = useReferral();
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createReferral(parseInt(therapistId), reason, urgency);
      setSuccess('Therapist has been notified!');
      setTherapistId('');
      setReason('');
      setUrgency('medium');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to create referral:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      {error && <div className="bg-red-100 text-red-700 p-3 rounded">{error}</div>}
      {success && <div className="bg-green-100 text-green-700 p-3 rounded">{success}</div>}

      <div>
        <label className="block text-sm font-medium">Therapist ID</label>
        <input
          type="number"
          value={therapistId}
          onChange={(e) => setTherapistId(e.target.value)}
          className="w-full px-4 py-2 border rounded"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Reason</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full px-4 py-2 border rounded"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Urgency</label>
        <select
          value={urgency}
          onChange={(e) => setUrgency(e.target.value)}
          className="w-full px-4 py-2 border rounded"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-green-600 text-white py-2 rounded disabled:opacity-50"
      >
        {loading ? 'Creating...' : 'Create Referral'}
      </button>
    </form>
  );
}
```

---

## Summary of Files to Create in Frontend

1. `/src/lib/api.ts` - API service
2. `/src/hooks/useAuth.ts` - Auth hook
3. `/src/hooks/useChat.ts` - Chat hook
4. `/src/hooks/useReferral.ts` - Referral hook
5. `/src/components/Auth/LoginForm.tsx` - Login form
6. `/src/components/Chat/ChatWindow.tsx` - Chat component
7. `/src/components/Referral/CreateReferral.tsx` - Referral component

Copy-paste these into your frontend and you're ready to go!
