# Gemini AI Deployment Checklist

## Pre-Deployment Verification

### ✅ Setup Phase
- [ ] Read `GEMINI_QUICK_START.md`
- [ ] Have Google account ready
- [ ] Have terminal/command line open

### ✅ API Key Phase
- [ ] Visit https://aistudio.google.com/app/apikeys
- [ ] Create new API key
- [ ] Copy API key to clipboard
- [ ] Don't share key anywhere

### ✅ Environment Configuration
- [ ] Open `/backend/.env`
- [ ] Add `GEMINI_API_KEY=your_key`
- [ ] Add `GEMINI_MODEL=gemini-pro`
- [ ] Add `GEMINI_TEMPERATURE=0.7`
- [ ] Add `GEMINI_MAX_TOKENS=1024`
- [ ] Save `.env` file

### ✅ Installation Phase
- [ ] Open terminal in `/backend` folder
- [ ] Run: `npm install`
- [ ] Wait for installation complete
- [ ] Check for no errors

### ✅ Testing Phase
- [ ] Run: `npm run dev`
- [ ] See "Server running on port 5000"
- [ ] Test with curl (see below)
- [ ] Get JWT token for testing

---

## Quick Testing Commands

### 1. Create Session
```bash
curl -X POST http://localhost:5000/api/chat/session/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"language": "en"}'
```

Expected: `{ "message": "Chat session created", "session": { "sessionId": 1, ... } }`

### 2. Send Message
```bash
curl -X POST http://localhost:5000/api/chat/message \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sessionId": 1, "messageText": "I feel anxious"}'
```

Expected: Bot response from Gemini AI

### 3. Get Analytics
```bash
curl -X GET http://localhost:5000/api/chat/analytics/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Expected: Session analytics with message counts

---

## Common Issues & Fixes

### ❌ "GEMINI_API_KEY is not set"

**Fix:**
1. Check `.env` file exists
2. Verify `GEMINI_API_KEY=` line is there
3. Make sure key is not empty
4. Restart backend: `npm run dev`

### ❌ "Invalid API key"

**Fix:**
1. Go to https://aistudio.google.com/app/apikeys
2. Create new key
3. Replace in `.env`
4. Restart backend

### ❌ "Cannot find module '@google/generative-ai'"

**Fix:**
```bash
cd /backend
npm install
npm run dev
```

### ❌ "Unauthorized" on API call

**Fix:**
1. Get valid JWT token
2. Include in Authorization header: `Bearer YOUR_TOKEN`
3. See AUTH docs for token generation

### ❌ "Timeout" error

**Fix:**
1. Check internet connection
2. Verify API key is valid
3. Check Google Gemini API status
4. Increase timeout in config/gemini.js

---

## Feature Verification

### Language Detection ✓
Send message in English:
```json
{ "messageText": "I feel stressed" }
```
Expected: Response in English

Send message in Amharic:
```json
{ "messageText": "ተጨነቅሁ" }
```
Expected: Response in Amharic (አማርኛ)

### Risk Detection ✓
Send low-risk message:
```json
{ "messageText": "I feel a bit anxious" }
```
Expected: `"risk_level": "LOW"`

Send high-risk message:
```json
{ "messageText": "I want to hurt myself" }
```
Expected: `"risk_level": "HIGH"` + `"alert": { "type": "CRISIS_ALERT" }`

### Session Tracking ✓
After sending messages, run:
```bash
GET /api/chat/analytics/1
```
Expected: Message counts, risk distribution, duration

---

## Performance Benchmarks

### Expected Response Times
- Session creation: 100-200ms
- Message processing: 2-5 seconds (Gemini API call)
- Crisis analysis: 500-1000ms
- Analytics retrieval: 200-500ms

### Database Load
- Per patient: ~10-50 messages per session
- Storage: ~1KB per message
- Session: ~100KB with full history

---

## Security Checklist

- [ ] API key stored in `.env` (not in code)
- [ ] `.env` file in `.gitignore`
- [ ] No API key in logs
- [ ] Rate limiting enabled
- [ ] JWT authentication required
- [ ] SQL injection prevention active
- [ ] CORS configured for localhost:3000
- [ ] Error messages don't expose system info

---

## Production Readiness

### Before Going Live
- [ ] Change `NODE_ENV=production` in `.env`
- [ ] Update `FRONTEND_URL` to production domain
- [ ] Increase `GEMINI_MAX_TOKENS` if needed
- [ ] Set up monitoring/alerting
- [ ] Configure database backups
- [ ] Set up error tracking (Sentry)
- [ ] Enable detailed logging
- [ ] Test load with multiple users
- [ ] Set up rate limiting thresholds
- [ ] Plan crisis response workflow

### Database Setup
- [ ] Run migration: `mysql < database/schema.sql`
- [ ] Verify all tables created
- [ ] Set up regular backups
- [ ] Test recovery process
- [ ] Document admin procedures

### Email Setup (for alerts)
- [ ] Configure SMTP service
- [ ] Set up therapist alert emails
- [ ] Test email delivery
- [ ] Create email templates
- [ ] Document email workflow

---

## Monitoring

### Logs to Monitor
```bash
# View all logs
tail -f /backend/logs/app.log

# Filter by level
grep "error" /backend/logs/app.log
grep "warn" /backend/logs/app.log
grep "info" /backend/logs/app.log
```

### Key Metrics
- Response time (should be < 5s)
- Error rate (should be < 1%)
- API calls/minute (watch for limits)
- Session count (user growth)
- Crisis detection rate (should increase with usage)

### Alert Triggers
- API rate limit exceeded
- Database connection errors
- Gemini API timeouts
- HIGH risk messages (crisis alerts)
- Email delivery failures

---

## Rollback Plan

If something goes wrong:

1. **Check logs**
   ```bash
   tail -f /backend/logs/app.log
   ```

2. **Verify configuration**
   ```bash
   cat /backend/.env
   ```

3. **Test API key**
   ```bash
   # Try a simple API call
   curl -X GET http://localhost:5000/api/health
   ```

4. **Restart service**
   ```bash
   # Kill running process
   Ctrl + C
   # Restart
   npm run dev
   ```

5. **Restore from backup**
   - If database corrupted
   - If configs lost
   - If need to reset

---

## Documentation Links

- **Quick Start:** `GEMINI_QUICK_START.md`
- **Full Setup:** `GEMINI_AI_SETUP.md`
- **Integration Status:** `GEMINI_INTEGRATION_COMPLETE.md`
- **API Reference:** `API_ENDPOINTS.md`
- **All Guides:** `INDEX.md`

---

## Support Contacts

### API Issues
- Google Gemini Status: https://status.cloud.google.com
- Check rate limits: https://aistudio.google.com/app/apikeys

### Database Issues
- MySQL Documentation: https://dev.mysql.com/doc
- Connection Testing: Use provided SQL commands

### Backend Issues
- Check logs: `/backend/logs/app.log`
- Review error messages
- Test with curl examples

---

## Sign-Off

- [ ] All tests passed
- [ ] Logs showing normal operation
- [ ] API endpoints responding correctly
- [ ] Database working
- [ ] Gemini AI generating responses
- [ ] Crisis detection working
- [ ] Ready for production

---

## Quick Reference

### Start Backend
```bash
cd /backend && npm run dev
```

### Test Message
```bash
curl -X POST http://localhost:5000/api/chat/message \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sessionId": 1, "messageText": "test"}'
```

### View Logs
```bash
tail -f /backend/logs/app.log
```

### Check .env
```bash
cat /backend/.env | grep GEMINI
```

---

**Status: Ready for Deployment ✅**

Generated: January 19, 2024
