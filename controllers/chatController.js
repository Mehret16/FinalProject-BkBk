import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";
import nodemailer from 'nodemailer';
import 'dotenv/config';


const getSupabase = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const getSupabaseAdmin = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);


const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { 
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS 
    }
});


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel(
    { 
        model: "gemini-1.5-flash",
        systemInstruction: "You are a specialized Mental Health Assistant for 'SafeSpace'. Focus strictly on mental health, stress, and wellness. If high risk is detected, escalate to a doctor. Match the user's language (English or Amharic). You are the AI assistant for SafeSpace. Provide empathetic support and guide users to professional doctors. SCOPE: ONLY discuss mental health, stress, anxiety, and wellness. LANGUAGE: Always match the user's language (English or Amharic). ONLY use the resources provided in this chat. DO NOT mention international hotlines, external websites, or groups like LGBTQ helpers. If the user is in high risk, ONLY say that a local doctor from SafeSpace has been notified. Stay focused ONLY on the local medical intervention provided by this platform.",
        safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
    }, 
    { apiVersion: 'v1' } // Explicitly force stable v1
);


export const handleChat = async (req, res) => {
    const supabase = getSupabaseAdmin(); // Use admin client to bypass RLS
    const patientId = req.user.id || req.user.userId; // Handle both id and userId from middleware
    const { message } = req.body;
    
    // Validate required fields
    if (!patientId) {
        return res.status(403).json({ error: "Unauthorized: User ID not found" });
    }
    
    if (!message || typeof message !== 'string' || message.trim() === '') {
        return res.status(400).json({ error: "Message is required and must be a non-empty string" });
    }
  
    const fName = req.user.user_metadata?.first_name || "Patient";
    const lName = req.user.user_metadata?.last_name || "";

    try {
        
        const { data: history } = await supabase
            .from('messages')
            .select('content, role, is_ai_response')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false })
            .limit(10);

        let formattedHistory = history ? history.reverse().map(msg => ({
            role: msg.is_ai_response || msg.role === 'ai' ? "model" : "user",
            parts: [{ text: msg.content }]
        })) : [];
        
        // Gemini SDK: First message MUST be from 'user'
        if (formattedHistory.length > 0 && formattedHistory[0].role === 'model') {
            formattedHistory.shift();
        }
        
        // Ensure we don't pass empty history if array becomes empty
        if (formattedHistory.length === 0) {
            formattedHistory = [];
        }

        const immediateCrisisKeywords = /\b(suicide|self-harm|kill myself|end my life|ራስን ማጥፋት)\b/i;
        const isCrisis = immediateCrisisKeywords.test(message);
        const riskLevel = isCrisis ? 'High' : 'Low';
        const redirectToDoctor = isCrisis;    
        
        // Verify patient exists before inserting messages
        try {
            // Check if patient exists in database
            const { data: patient, error: patientError } = await supabase
                .from('patients')
                .select('id')
                .eq('id', patientId)
                .single();

            if (patientError || !patient) {
                console.error('❌ Patient not found in database:', { patientId, error: patientError?.message });
                return res.status(404).json({ error: "Patient profile not found. Please ensure you are properly registered." });
            }

            console.log('✅ Patient verified:', patientId);

            // Insert user message with all required fields
            const { error: dbError } = await supabase.from('messages').insert([{
                patient_id: patientId, // Use consistent patientId variable
                content: message,
                role: 'patient', // Changed from 'user' to 'patient' to match DB schema
                is_ai_response: false
            }]);
            
            if (dbError) {
                console.error("❌ Supabase Save Error (User Message):", dbError.message);
                return res.status(400).json({ error: dbError.message });
            }
        } catch (insertError) {
            console.error("❌ Database Insert Error:", insertError.message);
            return res.status(400).json({ error: insertError.message });
        }

        // Dual-Path Logic: Crisis vs Normal Counseling
        let aiReply = '';
        let finalReply = '';
        
        if (isCrisis) {
            // Path B: Crisis - Don't call Gemini, use predefined response
            finalReply = "Please select a doctor from list for immediate professional help.";
            redirectToDoctor = true;
            console.log('🚨 Crisis path: Using predefined crisis response');
        } else {
            try {
                const chatSession = model.startChat({ history: formattedHistory });
                const result = await chatSession.sendMessage(message);
                finalReply = result.response.text();
                console.log('💬 Normal path: Using Gemini counseling response');
            } catch (geminiError) {
                console.error('❌ Gemini API Error:', geminiError.message);
                console.error('Full Gemini Error:', geminiError);
                // Friendly fallback message for API failures
                finalReply = "I'm having a little trouble connecting right now, but I've noted your message. Please try again in a moment or contact a doctor directly if it is urgent.";
                console.log('🔄 Using fallback response due to Gemini failure');
                
                // Return proper JSON format even on error
                return res.status(200).json({ 
                    reply: finalReply, 
                    isCrisis: false, 
                    risk: 'Low', 
                    redirectToDoctor: false,
                    doctors: []
                });
            }
            
            // Additional fallback for empty responses
            if (!finalReply || finalReply.trim() === '') {
                console.log('⚠️ Empty response detected, using fallback');
                finalReply = 'I received your message, but I\'m having trouble generating a response. How else can I help?';
            }
        }

        // Handle High Risk Actions (Update DB & Notify Doctors)
        let availableDoctors = [];
        if (riskLevel === 'High') {
            await supabase.from('patients').update({ 
                status: 'High', 
                flagged_reason: 'high_risk' 
            }).eq('id', patientId);

            const { data: docs } = await supabase.from('doctors').select('id, name, speciality, email').limit(5);
            availableDoctors = docs || [];

            // Optional: Email notification logic for assigned doctor goes here...
        }

        // Insert AI response with all required fields
        const { error: aiResponseError } = await supabase.from('messages').insert([{
            patient_id: patientId, // Use consistent patientId variable
            content: finalReply, // Use finalReply (contains either AI response or crisis message)
            is_ai_response: true,
            role: 'ai'
        }]);
        
        if (aiResponseError) {
            console.error("❌ Supabase Save Error (AI Response):", aiResponseError.message);
            // Don't throw error, continue with response
        }

        console.log('✅ Chat processed successfully:', { 
            riskLevel, 
            isCrisis,
            doctorsAvailable: availableDoctors.length,
            messageLength: finalReply.length,
            redirectToDoctor
        });

        res.status(200).json({ 
            reply: finalReply, 
            isCrisis: isCrisis, 
            risk: riskLevel, 
            redirectToDoctor: redirectToDoctor,
            doctors: availableDoctors
        });

    } catch (err) {
        console.error("--- CHAT PROCESSING ERROR ---", err.message);
        console.error("--- ERROR STACK ---", err.stack);

        if (err.message.includes('429')) {
            return res.status(429).json({ 
                error: "Google is still throttling your IP. Wait 5 minutes without sending ANY requests." 
            });
        }
        
        res.status(500).json({ 
            error: err.message, 
            stack: err.stack 
        });
    }
};


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
                html: `<p>A patient chose you for intervention.</p><p><b>Context:</b> ${messageContent}</p>`
            });
            res.status(200).json({ success: true, message: `Alert sent to Dr. ${doctor.name}` });
        } else {
            res.status(404).json({ error: "Doctor not found" });
        }
    } catch (err) {
        res.status(500).json({ error: "Failed to notify doctor" });
    }
};


export const getChatHistory = async (req, res) => {
    try {
        const supabase = getSupabase();
        const userRole = req.user.user_metadata?.role;
        const targetPatientId = req.params.patientId || req.user.id || req.user.userId; 
        
        // Validate that we have a patient ID
        if (!targetPatientId) {
            return res.status(400).json({ error: "Patient ID is required" });
        }

        if (userRole === 'doctor') {
            // Allow access to ANY high-risk patient, not just assigned ones
            const { data: access } = await supabase
                .from('patients')
                .select('id')
                .eq('id', targetPatientId)
                .eq('status', 'High') 
                .single();

            if (!access) return res.status(403).json({ error: "Access denied. Patient must be high-risk status." });
        }

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