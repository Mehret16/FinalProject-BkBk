import { createClient } from '@supabase/supabase-js';
import { Groq } from "groq-sdk";
import nodemailer from 'nodemailer';
import 'dotenv/config';
import { Agent } from 'undici';

// Helper to get Supabase clients
const getSupabase = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const getSupabaseAdmin = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Email Transporter for notifications
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { 
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS 
    }
});

/**
 * HANDLE CHAT
 * Triages risk, generates AI response, and fetches doctors if risk is high.
 */
export const handleChat = async (req, res) => {
    const dispatcher = new Agent({ connect: { rejectUnauthorized: false } });
    const groq = new Groq({ 
        apiKey: process.env.GROQ_API_KEY,
        fetch: (url, options) => fetch(url, { ...options, dispatcher })
    });
    
    groq.timeout = 30000;
    const supabase = getSupabase();
    const supabaseAdmin = getSupabaseAdmin();
    
    if (!req.body.message) {
        return res.status(400).json({ error: "Message is required" });
    }

    const patientId = req.user.id;
    const { message } = req.body;

    try {
        // --- 1. TRIAGE LOGIC ---
        let riskLevel = 'low';
        const highRiskPattern = /\b(suicide|dead|die|kill|killing|death|harm|end it|ራስን ማጥፋት|መሞት|ሞት)\b/i;
        const mediumRiskPattern = /\b(depression|anxiety|panic|stress|sad|unhappy|ጭንቀት|ሀዘን)\b/i;

        if (highRiskPattern.test(message)) {
            riskLevel = 'high';
        } else if (mediumRiskPattern.test(message)) {
            riskLevel = 'medium';
        }

        // --- 2. DOCTOR FETCHING & STATUS SYNC ---
        let availableDoctors = [];
        if (riskLevel === 'high') {
            // Updated to match your SQL schema: first_name, last_name, specialization
            const { data: docs } = await supabase
                .from('doctors')
                .select('id, first_name, last_name, specialization')
                .limit(3);
            
            availableDoctors = docs || [];
            
            // Sync High Risk status to DB using Admin client
            await supabaseAdmin
                .from('patients')
                .update({ risk_level: 'high' })
                .eq('id', patientId);
        }

        // --- 3. REFINED SYSTEM PROMPT ---
        const websiteContext = `
You are SafeSpace AI.
STRICT LANGUAGE RULES:
1. Detect the user's language. 
2. If the user speaks English, respond 100% in English.
3. ONLY if the user speaks Amharic, use an Amharic comfort message, then switch to English.
4. CURRENT RISK STATE: ${riskLevel}.

${riskLevel === 'high' ? 'ACTION: Provide immediate comfort and instruct them to contact the specialists listed below.' : ''}
`;

        // --- 4. GROQ API CALL ---
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: websiteContext },
                { role: "user", content: message }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.2,
        });

        const aiReply = chatCompletion.choices[0].message.content;

        // --- 5. PERSIST TO MESSAGES TABLE ---
        await supabase.from('messages').insert([
            { 
                patient_id: patientId, 
                content: message, 
                sender_type: 'patient' 
            },
            { 
                patient_id: patientId, 
                content: aiReply, 
                sender_type: 'ai' 
            }
        ]);

        return res.status(200).json({ 
            risk: riskLevel, 
            reply: aiReply, 
            doctors: availableDoctors 
        });

    } catch (err) {
        console.error("Chat System Error:", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

/**
 * GET CHAT HISTORY
 * Returns all messages for a specific patient.
 */
export const getChatHistory = async (req, res) => {
    try {
        const supabase = getSupabase();
        // If doctor is viewing, they use param; if patient is viewing, they use their own ID
        const patientId = req.params.patientId || req.user.id;

        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return res.status(200).json(data);
    } catch (err) {
        console.error("History Error:", err.message);
        return res.status(500).json({ error: "Could not retrieve chat history" });
    }
};

/**
 * NOTIFY SELECTED DOCTOR
 * Sends an email to a doctor when a patient selects them from the high-risk list.
 */
export const notifySelectedDoctor = async (req, res) => {
    try {
        const { doctorId, messageContent } = req.body;
        const supabase = getSupabase();
        
        // Updated select to match SQL Schema: first_name, last_name
        const { data: doctor, error } = await supabase
            .from('doctors')
            .select('first_name, last_name, email')
            .eq('id', doctorId)
            .single();

        if (error || !doctor) return res.status(404).json({ error: "Doctor not found" });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: doctor.email,
            subject: '🚨 EMERGENCY: High-Risk Patient Intervention',
            html: `
                <h3>Emergency Notification</h3>
                <p>Hello Dr. ${doctor.last_name},</p>
                <p>A patient has flagged a high-risk message and is requesting help.</p>
                <hr />
                <p><strong>Message Context:</strong> ${messageContent}</p>
                <hr />
                <p>Please log in to the SafeSpace dashboard to respond.</p>
            `
        };

        await transporter.sendMail(mailOptions);
        
        return res.status(200).json({ success: true, message: `Alert sent to Dr. ${doctor.last_name}` });
    } catch (err) {
        console.error("Notification Error:", err.message);
        return res.status(500).json({ error: "Failed to send notification to doctor" });
    }
};