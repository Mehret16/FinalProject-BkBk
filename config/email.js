import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let transporter;

if (process.env.NODE_ENV === 'production') {
  transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
} else {
  // Use test account for development
  transporter = nodemailer.createTransport({
    host: 'localhost',
    port: 1025,
    secure: false
  });
}

export async function sendEmail(to, subject, htmlContent) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@mentalhealth.com',
      to,
      subject,
      html: htmlContent
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send error:', error);
    throw error;
  }
}

export function generateTherapistAccessEmail(therapistEmail, patientName, accessLink) {
  return `
    <html>
      <body style="font-family: Arial, sans-serif; color: #333;">
        <h2>New Patient Referral</h2>
        <p>Hello,</p>
        <p>A new patient, <strong>${patientName}</strong>, has referred to you for mental health support.</p>
        <p>Click the button below to access their full profile and conversation history:</p>
        <a href="${accessLink}" style="display: inline-block; padding: 12px 30px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
          Access Patient Profile
        </a>
        <p style="color: #666; font-size: 12px;">
          This link is valid for 7 days. If you have questions, please contact the administrator.
        </p>
        <p>Best regards,<br/>Mental Health Support Team</p>
      </body>
    </html>
  `;
}
