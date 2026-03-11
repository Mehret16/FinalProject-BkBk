import { createClient } from '@supabase/supabase-js';
import { Groq } from "groq-sdk";
import nodemailer from 'nodemailer';
import 'dotenv/config';
import { Agent } from 'undici';

// 1. Initialize Clients
const getSupabase = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// 2. Setup Nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { 
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS 
    }
});

/**
 * 1. HANDLE CHAT
 * Processes messages, performs clinical triage, and manages AI response + doctor referrals.
 */
export const handleChat = async (req, res) => {
    const dispatcher = new Agent({ connect: { rejectUnauthorized: false } });
    const groq = new Groq({ 
        apiKey: process.env.GROQ_API_KEY,
        fetch: (url, options) => fetch(url, { ...options, dispatcher })
    });
    
    groq.timeout = 30000;
    const supabase = getSupabase();
    const patientId = req.user.id;
    const { message } = req.body;
    
    const fName = req.user.user_metadata?.first_name || "Patient";
    const lName = req.user.user_metadata?.last_name || "";

    try {
        // --- 1. PRECISE CLINICAL TRIAGE ---
        let riskLevel = 'Low';
        const highRiskKeywords = /(suicide|kill myself|end it all|die|life is pointless|don't want to live|ራስን ማጥፋት|መሞት እፈልጋለሁ|ህይወቴን ማጥፋት|ሞት|self-harm|cutting|burning|voices|hurt myself|hallucination|delusion|psychosis|schizophrenia|manic|anorexia|bulimia|addiction|loss of control)/i;
        const mediumRiskKeywords = /(depression|empty and tired|anxiety|stop worrying|panic|panic for no reason|ocd|obsessive|compulsive|ptsd|social anxiety|personality disorder|instability)/i;

        if (highRiskKeywords.test(message)) {
            riskLevel = 'High';
        } else if (mediumRiskKeywords.test(message)) {
            riskLevel = 'Medium';
        }

        // --- 2. PREPARE AI CONTEXT & HISTORY ---
        const { data: history } = await supabase
            .from('messages')
            .select('content, is_ai_response')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false })
            .limit(6);

        const websiteContext = `
            You are SafeSpace AI assistant.
            SCOPE: Mental health only (stress, anxiety, wellness).
            LANGUAGE: Match the user's language (English or Amharic).
            CRISIS PROTOCOL: If risk is HIGH (self-harm/suicide), be extremely empathetic and say: 
            "I hear you, and I want to make sure you get the right support immediately. Please choose one of our available professional doctors below to start a direct intervention."
        `;

        let chatMessages = [{ role: "system", content: websiteContext }];
        if (history) {
            chatMessages.push(...history.reverse().map(msg => ({
                role: msg.is_ai_response ? "assistant" : "user",
                content: msg.content,
            })));
        }
        chatMessages.push({ role: "user", content: message });

        // --- 3. GROQ API CALL ---
        const chatCompletion = await groq.chat.completions.create({
            messages: chatMessages,
            model: "llama-3.3-70b-versatile",
            temperature: 0.7,
        });

        const aiReply = chatCompletion.choices[0].message.content;

        // --- 4. HIGH RISK ACTIONS & DOCTOR FETCHING ---
        let availableDoctors = [];
        if (riskLevel === 'High') {
            // Mark patient as High Risk
            await supabase.from('patients').update({ status: 'High' }).eq('id', patientId);
            
            // Fetch Online Doctors; Fallback to all registered if none are online
            let { data: docs } = await supabase.from('doctors').select('id, name, speciality, avatar').eq('is_online', true).limit(5);
            
            if (!docs || docs.length === 0) {
                const { data: allDocs } = await supabase.from('doctors').select('id, name, speciality, avatar').limit(5);
                docs = allDocs;
            }
            availableDoctors = docs || [];

            // Email Notification for Assigned Doctor
            const { data: patientData } = await supabase.from('patients').select('assigned_doctor_id').eq('id', patientId).single();
            if (patientData?.assigned_doctor_id) {
                const { data: doctor } = await supabase.from('doctors').select('email').eq('id', patientData.assigned_doctor_id).single();
                if (doctor?.email) {
                    await transporter.sendMail({
                        from: process.env.EMAIL_USER,
                        to: doctor.email,
                        subject: '🚨 URGENT: High-Risk Alert',
                        html: `<p>Patient <b>${fName} ${lName}</b> is in crisis. Message: "${message}"</p>`
                    });
                }
            }
        }

        // --- 5. SAVE CONVERSATION TO DATABASE ---
        await supabase.from('messages').insert([
            { 
                patient_id: patientId, 
                content: message, 
                is_ai_response: false, 
                flagged_reason: riskLevel !== 'Low' ? `${riskLevel} Risk Detected` : null 
            },
            { 
                patient_id: patientId, 
                content: aiReply, 
                is_ai_response: true, 
                metadata: { risk: riskLevel } 
            }
        ]);

        // --- 6. FINAL RESPONSE ---
        return res.status(200).json({ 
            risk: riskLevel, 
            reply: aiReply, 
            doctors: availableDoctors 
        });

    } catch (err) {
        console.error("Critical Error in handleChat:", err.message);
        return res.status(500).json({ 
            reply: "I'm having trouble connecting right now. Please try again later.", 
            debug_info: err.message 
        });
    }
};

/**
 * 2. NOTIFY SELECTED DOCTOR
 */
export const notifySelectedDoctor = async (req, res) => {
    try {
        const { doctorId, messageContent } = req.body;
        const supabase = getSupabase();
        const { data: doctor } = await supabase.from('doctors').select('name, email').eq('id', doctorId).single();

        if (doctor) {
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: doctor.email,
                subject: '🚨 EMERGENCY INTERVENTION REQUESTED',
                html: `<p>A patient requested an urgent intervention.</p><p>Patient Message Context: ${messageContent}</p>`
            });
            return res.status(200).json({ success: true, message: `Alert sent to Dr. ${doctor.name}` });
        } else {
            return res.status(404).json({ error: "Doctor not found" });
        }
    } catch (err) {
        return res.status(500).json({ error: "Failed to notify doctor" });
    }
};

/**
 * 3. GET CHAT HISTORY
 */
export const getChatHistory = async (req, res) => {
    try {
        const supabase = getSupabase();
        const targetPatientId = req.params.patientId || req.user.id; 

        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('patient_id', targetPatientId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({ error: "Failed to fetch history" });
    }
};