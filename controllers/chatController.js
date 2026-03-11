import { createClient } from '@supabase/supabase-js';
import { Groq } from "groq-sdk";
import nodemailer from 'nodemailer';
import 'dotenv/config';
import { Agent } from 'undici';

const getSupabase = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { 
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS 
    }
});

/**
 * HANDLE CHAT
 * Triage risk, call Groq, fetch doctors on High risk, and persist to Supabase.
 */
export const handleChat = async (req, res) => {
    const dispatcher = new Agent({ connect: { rejectUnauthorized: false } });
    const groq = new Groq({ 
        apiKey: process.env.GROQ_API_KEY,
        fetch: (url, options) => fetch(url, { ...options, dispatcher })
    });
    
    groq.timeout = 30000;
    const supabase = getSupabase();
    
    if (!req.body.message) {
        return res.status(400).json({ error: "Message is required" });
    }

    const patientId = req.user.id;
    const { message } = req.body;
    const fName = req.user.user_metadata?.first_name || "Patient";
    const lName = req.user.user_metadata?.last_name || "";

    try {
        // --- 1. TRIAGE LOGIC ---
        let riskLevel = 'Low';
        const highRiskPattern = /suicide|kill|die|pointless|end it|ራስን ማጥፋት|መሞት|ሞት|self-harm|cut|burn|voices|hallucination|psychosis|schizophrenia|anorexia|bulimia/i;
        const mediumRiskPattern = /depression|anxiety|panic|ocd|ptsd|empty|tired|worrying|personality|instability/i;

        if (highRiskPattern.test(message)) {
            riskLevel = 'High';
        } else if (mediumRiskPattern.test(message)) {
            riskLevel = 'Medium';
        }

        // --- 2. FETCH HISTORY ---
        const { data: history, error: historyError } = await supabase
            .from('messages')
            .select('content, is_ai_response')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false })
            .limit(6);

        if (historyError) console.error("Supabase History Error:", historyError);

        const websiteContext = `You are SafeSpace AI. If the user expresses self-harm or suicide (High Risk), be empathetic and tell them: "I hear you, and I want to make sure you get the right support immediately. Please choose one of our available professional doctors below to start a direct intervention."`;

        let chatMessages = [{ role: "system", content: websiteContext }];
        if (history && history.length > 0) {
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
            temperature: 0.6,
        });

        const aiReply = chatCompletion.choices[0].message.content;

        // --- 4. DOCTOR FETCHING & RISK ACTIONS ---
        let availableDoctors = [];
        if (riskLevel === 'High') {
            // Update patient status in DB
            await supabase.from('patients').update({ status: 'High' }).eq('id', patientId);

            // Fetch any 5 doctors (removed is_online filter to ensure results)
            const { data: docs, error: docError } = await supabase
                .from('doctors')
                .select('id, name, speciality')
                .limit(5);

            if (docError) console.error("Doctor Fetch Error:", docError);
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

        // --- 5. PERSIST TO DATABASE (Aligned with Schema) ---
        const { error: insertError } = await supabase.from('messages').insert([
            { 
                patient_id: patientId, 
                content: message, 
                role: 'user', 
                is_ai_response: false, 
                flagged_reason: riskLevel !== 'Low' ? `${riskLevel} Risk` : null 
            },
            { 
                patient_id: patientId, 
                content: aiReply, 
                role: 'ai', 
                is_ai_response: true, 
                metadata: { risk: riskLevel } 
            }
        ]);

        if (insertError) console.error("Supabase Insert Error:", insertError);

        // --- 6. FINAL RESPONSE ---
        return res.status(200).json({ 
            risk: riskLevel, 
            reply: aiReply, 
            doctors: availableDoctors 
        });

    } catch (err) {
        console.error("Critical System Error:", err);
        return res.status(500).json({ 
            reply: "The system is currently experiencing a connection issue.", 
            debug_info: err.message 
        });
    }
};

/**
 * NOTIFY SELECTED DOCTOR
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
                subject: '🚨 EMERGENCY INTERVENTION',
                html: `<p>A patient requested urgent intervention.</p><p>Context: ${messageContent}</p>`
            });
            return res.status(200).json({ success: true, message: `Alert sent to Dr. ${doctor.name}` });
        }
        return res.status(404).json({ error: "Doctor not found" });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

/**
 * GET CHAT HISTORY
 */
export const getChatHistory = async (req, res) => {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('patient_id', req.user.id)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};