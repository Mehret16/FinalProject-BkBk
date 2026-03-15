import { createClient } from '@supabase/supabase-js';
import { Groq } from "groq-sdk";
import nodemailer from 'nodemailer';
import 'dotenv/config';
import { Agent } from 'undici';

const getSupabase = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
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

        // --- 2. DOCTOR FETCHING ---
        let availableDoctors = [];
        if (riskLevel === 'high') {
            const { data: docs } = await supabase
                .from('doctors')
                .select('id, first_name, last_name, specialization')
                .limit(3);
            
            availableDoctors = docs || [];
            
            await supabaseAdmin
                .from('patients')
                .update({ risk_level: 'high', status: 'High Risk' })
                .eq('id', patientId);
        }

        // --- 3. AI RESPONSE ---
        const systemPrompt = `You are SafeSpace AI. Current Risk: ${riskLevel}. Respond in English unless user uses Amharic.`;
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: message }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.2,
        });

        const aiReply = chatCompletion.choices[0].message.content;

        // --- 4. PERSISTENCE ---
        await supabase.from('messages').insert([
            { patient_id: patientId, content: message, sender_type: 'patient' },
            { patient_id: patientId, content: aiReply, sender_type: 'ai' }
        ]);

        return res.status(200).json({ risk: riskLevel, reply: aiReply, doctors: availableDoctors });
    } catch (err) {
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const notifySelectedDoctor = async (req, res) => {
    try {
        const { doctorId, messageContent } = req.body;
        const supabase = getSupabase();
        const { data: doctor } = await supabase
            .from('doctors')
            .select('first_name, last_name, email')
            .eq('id', doctorId)
            .single();

        if (!doctor) return res.status(404).json({ error: "Doctor not found" });

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: doctor.email,
            subject: '🚨 EMERGENCY: High-Risk Intervention Requested',
            
            html: `<p>Hello ${doctor.first_name} ${doctor.last_name}, a patient needs help.</p><p>Context: ${messageContent}</p>`
        });
        
        return res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};