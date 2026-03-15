import { createClient } from '@supabase/supabase-js';
import { Groq } from "groq-sdk";
import nodemailer from 'nodemailer';
import 'dotenv/config';
import { Agent } from 'undici';

const getSupabase = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
// Use Admin for updating sensitive patient status
const getSupabaseAdmin = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { 
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS 
    }
});

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
    const fName = req.user.first_name || "Patient"; 

    try {
        // --- 1. FIXED TRIAGE LOGIC ---
        // Added 'dead', 'die', and 'end' specifically.
        let riskLevel = 'Low';
        const highRiskPattern = /\b(suicide|dead|die|kill|killing|death|harm|end it|ራስን ማጥፋት|መሞት|ሞት)\b/i;
        const mediumRiskPattern = /\b(depression|anxiety|panic|stress|sad|unhappy|ጭንቀት|ሀዘን)\b/i;

        if (highRiskPattern.test(message)) {
            riskLevel = 'High';
        } else if (mediumRiskPattern.test(message)) {
            riskLevel = 'Medium';
        }

        // --- 2. DOCTOR FETCHING (Move this UP so we can tell the AI) ---
        let availableDoctors = [];
        if (riskLevel === 'High') {
            const { data: docs } = await supabase
                .from('doctors')
                .select('id, first_name, last_name, specialization')
                .limit(3);
            availableDoctors = docs || [];
            
            // Sync status to DB
            await supabaseAdmin.from('patients').update({ risk_level: 'High' }).eq('id', patientId);
        }

        // --- 3. REFINED SYSTEM PROMPT (Strict Language Control) ---
        const websiteContext = `
You are SafeSpace AI.
STRICT LANGUAGE RULES:
1. Detect the user's language. 
2. If the user speaks English, respond 100% in English.
3. ONLY if the user speaks Amharic, use the Amharic template, then switch to English.
4. If the user says something like "I want to be dead", this is HIGH RISK.

CURRENT RISK STATE: ${riskLevel}
${riskLevel === 'High' ? 'ACTION: Provide immediate comfort in English and tell them to look at the doctor list below.' : ''}

Response Template for High Risk:
"I am deeply sorry you are feeling this way. Your safety is the priority. I have surfaced available specialists below who can help you right now. Please reach out to one of them immediately or call emergency services."
`;

        // --- 4. GROQ API CALL ---
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: websiteContext },
                { role: "user", content: message }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.2, // Lower temperature = more stable language choice
        });

        const aiReply = chatCompletion.choices[0].message.content;

        // --- 5. PERSIST & RESPOND ---
        await supabase.from('messages').insert([
            { patient_id: patientId, content: message, sender_type: 'patient', risk_level: riskLevel },
            { patient_id: patientId, content: aiReply, sender_type: 'ai', risk_level: riskLevel }
        ]);

        return res.status(200).json({ 
            risk: riskLevel, 
            reply: aiReply, 
            doctors: availableDoctors // These will now show up in the frontend
        });

    } catch (err) {
        console.error("System Error:", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};