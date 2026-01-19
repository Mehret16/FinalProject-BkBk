# Email Configuration Guide

This guide helps you set up email for therapist notifications and referral links.

---

## Quick Overview

The backend supports two email services:
1. **Gmail** (Recommended for development)
2. **SendGrid** (Recommended for production)

Choose one below based on your needs.

---

## Option A: Gmail Setup (Recommended for Development)

### Step 1: Enable 2-Factor Authentication

1. Go to https://myaccount.google.com/security
2. Scroll to "How you sign in to Google"
3. Enable "2-Step Verification"
4. Follow the prompts

### Step 2: Create App Password

1. Go back to https://myaccount.google.com/security
2. Find "App passwords" (only visible if 2FA is enabled)
3. Select "Mail" and "Windows Computer" (or your OS)
4. Click "Generate"
5. Copy the 16-character password shown
6. **Save this password!** (you'll need it in .env)

### Step 3: Update .env File

Create/update `.env` in your `/backend` folder:

```env
# EMAIL CONFIGURATION (Gmail)
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com              # Your Gmail address
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx          # 16-char app password (with spaces)
EMAIL_FROM_NAME=Mental Health Chatbot
EMAIL_FROM_ADDRESS=noreply@mentalhealth.com  # Can be any name

# FRONTEND URL (for therapist email links)
FRONTEND_URL=http://localhost:3000
```

### Step 4: Test Gmail Configuration

```bash
# In your backend folder, run:
npm install

# Test email sending
node -e "
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'your_email@gmail.com',
    pass: 'xxxx xxxx xxxx xxxx'  // Your 16-char password
  }
});

transporter.verify((error, success) => {
  if (error) {
    console.log('❌ Email setup failed:', error);
  } else {
    console.log('✅ Email setup successful! Ready to send emails.');
  }
});
"
```

### Gmail Advantages ✅
- Free
- Easy to set up
- Works immediately
- Good for development/testing

### Gmail Limitations ⚠️
- Rate limited (~100 emails/day)
- May mark as spam if volume is high
- Not ideal for production

---

## Option B: SendGrid Setup (Recommended for Production)

### Step 1: Create SendGrid Account

1. Go to https://sendgrid.com/
2. Click "Sign Up Free"
3. Create account with your email
4. Verify your email address
5. Complete account setup

### Step 2: Create API Key

1. Log in to SendGrid dashboard
2. Go to "Settings" → "API Keys"
3. Click "Create API Key"
4. Name it: `mental-health-chatbot`
5. Select "Full Access"
6. Click "Create & Copy"
7. **Save this key!** (starts with `SG.`)

### Step 3: Verify Sender Email

1. In SendGrid dashboard, go to "Sender Authentication"
2. Click "Create New Sender"
3. Fill in:
   - From Name: Mental Health Chatbot
   - From Email: noreply@yourdomain.com (or your email)
   - Reply-To: support@yourdomain.com
4. Verify the email

### Step 4: Update .env File

Create/update `.env` in your `/backend` folder:

```env
# EMAIL CONFIGURATION (SendGrid)
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=SG.xxxxxx_your_api_key_xxxxxx  # Your SendGrid API key
EMAIL_FROM_NAME=Mental Health Chatbot
EMAIL_FROM_ADDRESS=noreply@yourdomain.com       # Your verified sender

# FRONTEND URL (for therapist email links)
FRONTEND_URL=https://your-app.com
```

### Step 5: Test SendGrid Configuration

```bash
# In your backend folder, run:
npm install

# Test email sending
node -e "
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey('SG.xxxxxx_your_api_key_xxxxxx');

const msg = {
  to: 'test@example.com',
  from: 'noreply@yourdomain.com',
  subject: 'Test Email',
  html: '<strong>SendGrid is working!</strong>',
};

sgMail
  .send(msg)
  .then(() => console.log('✅ SendGrid email sent successfully!'))
  .catch(error => console.log('❌ Error:', error));
"
```

### SendGrid Advantages ✅
- Professional email delivery
- High deliverability rates
- Scales to millions of emails
- Detailed analytics
- 100+ emails/day on free tier
- Better spam filtering

### SendGrid Limitations ⚠️
- Requires account setup
- API key management needed
- Needs sender verification

---

## Email Templates Used

The system sends emails in these scenarios:

### 1. Therapist Referral Email
**Sent when:** Patient creates a referral request
**Contains:** 
- Patient name
- Access link with JWT token
- Therapist accepts/rejects option
- Link to patient's chat history

**Example:**
```
Subject: New Patient Referral - [Patient Name]

Hi [Therapist Name],

You've received a referral request from [Patient Name].

Access Patient Profile:
https://your-app.com/therapist/referral?access_token=eyJhbGc...

This link expires in 7 days.

Accept | Reject
```

### 2. Referral Acceptance Email
**Sent to:** Patient (when therapist accepts)
**Contains:** 
- Therapist accepted the referral
- Therapist's contact information
- Next steps

---

## Environment Variables Reference

| Variable | Example | Description |
|----------|---------|-------------|
| EMAIL_SERVICE | `gmail` or `sendgrid` | Which service to use |
| EMAIL_USER | your_email@gmail.com | Gmail address (Gmail only) |
| EMAIL_PASSWORD | xxxx xxxx xxxx xxxx | Gmail app password (Gmail only) |
| SENDGRID_API_KEY | SG.xxxxx | SendGrid API key (SendGrid only) |
| EMAIL_FROM_NAME | Mental Health Chatbot | Sender name in emails |
| EMAIL_FROM_ADDRESS | noreply@example.com | Sender email address |
| FRONTEND_URL | http://localhost:3000 | Frontend base URL (for links) |

---

## Testing Your Setup

### 1. Send Test Email

```bash
# Create a test.js file in backend folder
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

const mailOptions = {
  from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
  to: 'your_test_email@gmail.com',
  subject: 'Test Email from Mental Health Chatbot',
  html: '<h1>If you see this, email is working!</h1>'
};

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.log('❌ Email error:', error);
  } else {
    console.log('✅ Email sent:', info.response);
  }
});
```

### 2. Run Test
```bash
node test.js
```

---

## Troubleshooting

### Gmail Issues

**Issue: "Invalid login credentials"**
- Make sure 2FA is enabled
- Use the 16-character app password (with spaces)
- Don't use your regular Gmail password

**Issue: "Less secure app access"**
- Google blocks some less secure apps
- Use App Passwords instead (described above)

**Issue: "Too many failed login attempts"**
- Wait 24 hours
- Reset your Gmail password

### SendGrid Issues

**Issue: "401 Unauthorized"**
- Check your API key is correct
- Regenerate API key if needed
- Ensure no extra spaces in .env

**Issue: "Invalid email from address"**
- Make sure sender email is verified in SendGrid
- Use exact email from verification

**Issue: "Bounce/Undeliverable"**
- Check recipient email is valid
- Check spam folder
- Review SendGrid logs for details

---

## Email Testing Services

### Temporary Email for Testing
- https://temp-mail.org (temporary emails)
- https://mailinator.com (inbox testing)
- https://10minutemail.com (disposable email)

### Email Testing Tools
- https://mailtrap.io (Email sandbox)
- https://ethereal.email (Ethereal test service)

---

## Production Recommendations

### For Production:
1. **Use SendGrid** (not Gmail for volume)
2. **Verify domain** (DKIM, SPF, DMARC)
3. **Monitor deliverability** (bounce rates, complaints)
4. **Use reply-to email** (different from sender)
5. **Add unsubscribe links** (email compliance)
6. **Monitor email logs** (SendGrid dashboard)
7. **Set up alerts** (failed emails, bounces)

### SPF/DKIM Setup (SendGrid)
```
SPF Record: v=spf1 sendgrid.net ~all
DKIM: Add provided key from SendGrid dashboard
```

---

## Next Steps

1. Choose Gmail or SendGrid ✓
2. Complete setup steps above ✓
3. Test with provided test commands ✓
4. Update `.env` file ✓
5. Start backend: `npm run dev`
6. Create a referral to test email ✓

---

## Email Configuration in Code

The backend uses these files for email:

- `/backend/config/email.js` - Email service configuration
- `/backend/services/referralService.js` - Sends therapist referral emails
- `/backend/routes/referrals.js` - Referral endpoints

---

## Support

- Gmail Help: https://support.google.com/accounts/
- SendGrid Help: https://help.sendgrid.com/
- Node Mailer: https://nodemailer.com/
- Backend Email Config: `/backend/config/email.js`

---

**✅ Ready?** Move to `SETUP_COMPLETE.md` for final steps!
