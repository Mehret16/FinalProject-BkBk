import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";
import nodemailer from 'nodemailer';
import 'dotenv/config';

// 1. Initialize Supabase
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
 * 1. HANDLE CHAT (Main Logic)
 */
export const handleChat = async (req, res) => {
    const supabase = getSupabase();
    const patientId = req.user.id;
    const { message } = req.body;
    
    const fName = req.user.user_metadata?.first_name || "Patient";
    const lName = req.user.user_metadata?.last_name || "";

    try {
        // Dynamic Gemini model initialization for fresh API key loading
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.0-flash",
            apiVersion: "v1",
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ]
        });
        const websiteContext = `
            You are the AI assistant for "SafeSpace Ethiopia".
            - Provide empathetic support and guide users to professional doctors.
            - SCOPE: ONLY discuss mental health, stress, anxiety, and wellness.
            - LANGUAGE: Always match the user's language (English or Amharic).
        `;

        // Fetch last 6 messages to provide context
        const { data: history } = await supabase
            .from('messages')
            .select('content, is_ai_response')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false })
            .limit(6);

        let formattedHistory = history ? history.reverse().map(msg => ({
            role: msg.is_ai_response ? "model" : "user",
            parts: [{ text: msg.content }],
        })) : [];

        // --- HISTORY GUARD: Fixes "First content must be user" error ---
        while (formattedHistory.length > 0 && formattedHistory[0].role !== "user") {
            formattedHistory.shift(); 
        }

        // Triage Logic
        let riskLevel = 'Low';
        const highRiskKeywords = /(suicide|kill myself|end it all|die|ራስን ማጥፋት|መሞት እፈልጋለሁ|ህይወቴን ማጥፋት|ሞት)/i;
        if (highRiskKeywords.test(message)) riskLevel = 'High';

        // Save User Message
        await supabase.from('messages').insert([{
            patient_id: patientId,
            content: message,
            is_ai_response: false,
            flagged_reason: riskLevel === 'High' ? 'Suicide Risk' : null
        }]);

        // Gemini Call
        const chatSession = model.startChat({ history: formattedHistory });
        const combinedPrompt = `System Context: ${websiteContext}\n\nUser Message: ${message}`;
        const result = await chatSession.sendMessage(combinedPrompt);
        const aiReply = result.response.text();

        // High Risk Actions
        let availableDoctors = [];
        if (riskLevel === 'High') {
            await supabase.from('patients').update({ status: 'High' }).eq('id', patientId);
            const { data: docs } = await supabase.from('doctors').select('id, name, speciality, email').limit(5); 
            availableDoctors = docs || [];

            // Alert Assigned Doctor
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

        // Save AI Message
        await supabase.from('messages').insert([{
            patient_id: patientId,
            content: aiReply,
            is_ai_response: true
        }]);

        // Frontend Expects { reply: ... }
        res.status(200).json({ 
            risk: riskLevel, 
            reply: aiReply, 
            doctors: availableDoctors 
        });

    } catch (err) {
        console.error("=== FULL ERROR OBJECT ===");
        console.dir(err, { depth: null });
        console.error("=== ERROR MESSAGE ===", err.message);
        console.error("=== ERROR STACK ===", err.stack);
        
        // Check for common API key issues
        if (!process.env.GEMINI_API_KEY) {
            console.error("❌ GEMINI_API_KEY is missing from environment variables");
        }
        
        if (err.message.includes('API_KEY_INVALID') || err.message.includes('UNAUTHENTICATED')) {
            console.error("❌ Invalid Gemini API Key - check Render Dashboard environment variables");
        }
        
        if (err.message.includes('404') || err.message.includes('not found') || err.message.includes('model')) {
            console.error("❌ Model 'gemini-2.0-flash' may not be available - check Google AI Studio");
        }
        
        // Return proper JSON format for frontend to prevent empty bubbles
        res.status(500).json({ 
            risk: 'Low', 
            reply: "I'm having trouble connecting right now. Please try again in a moment.", 
            doctors: [],
            error: err.message 
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
                html: `<p>A patient chose you for intervention.</p><p>Context: ${messageContent}</p>`
            });
            res.status(200).json({ success: true, message: `Alert sent to Dr. ${doctor.name}` });
        } else {
            res.status(404).json({ error: "Doctor not found" });
        }
    } catch (err) {
        res.status(500).json({ error: "Failed to notify doctor" });
    }
};

/**
 * 3. GET CHAT HISTORY (The Missing Export)
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
        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};