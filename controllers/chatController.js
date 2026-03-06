import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";
import nodemailer from 'nodemailer';
import 'dotenv/config';


const getSupabase = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);


const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { 
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS 
    }
});


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });


export const handleChat = async (req, res) => {
    const supabase = getSupabase();
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
        
        const websiteContext = `
            Your name is "AI". You are the AI assistant for "SafeSpace".
            - Provide empathetic support and guide users to professional doctors.
            - SCOPE: ONLY discuss mental health, stress, anxiety, and wellness.
            - LANGUAGE: Always match the user's language (English or Amharic).
            -ONLY use the resources provided in this chat.
            - DO NOT mention international hotlines, external websites, or groups like LGBTQ helpers.
           -If the user is in high risk, ONLY say that a local doctor from SafeSpace has been notified.
           -Stay focused ONLY on the local medical intervention provided by this platform. `;

        const { data: history } = await supabase
            .from('messages')
            .select('content, is_ai_response')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false })
            .limit(5);

        const formattedHistory = history ? history.reverse().map(msg => ({
            role: msg.is_ai_response ? "model" : "user",
            parts: [{ text: msg.content }],
        })) : [];

  const highRiskKeywords = /\b(kill|suicide|die|end it all|ራስን ማጥፋት|መሞት|ሞት)\b/i;
        let riskLevel = 'Low';
        let isCrisis = false;
        let isHighRisk = false;
       
        // Crisis Detection BEFORE calling Gemini API
        if (highRiskKeywords.test(message)) {
            riskLevel = 'High';
            isCrisis = true;
            isHighRisk = true;
            
            console.log('🚨 Crisis detected, updating patient status immediately');
            
            // Update patient status to High
            const { error: statusError } = await supabase
                .from('patients')
                .update({ 
                    status: 'High',
                    flagged_reason: 'Suicide Risk'
                })
                .eq('id', patientId);
            
            if (statusError) {
                console.error('❌ Failed to update patient status:', statusError.message);
                // Don't throw error, continue with crisis response
            } else {
                console.log('✅ Patient status updated to High with flagged_reason: Suicide Risk');
            }
        }

    
       // Insert user message with all required fields
        try {
            const { error: dbError } = await supabase.from('messages').insert([{
                patient_id: patientId, // Use consistent patientId variable
                content: message,
                role: 'user',
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
        let redirectToDoctor = false;
        
        if (isCrisis) {
            // Path B: Crisis - Don't call Gemini, use predefined response
            finalReply = "I'm concerned about your safety. I am a chatbot, and you need professional help. Please choose a doctor from the list on your dashboard immediately.";
            redirectToDoctor = true;
            console.log('🚨 Crisis path: Using predefined crisis response');
        } else {
            // Path A: Normal Counseling - Call Gemini API
            const chatSession = model.startChat({ 
                history: formattedHistory 
            });

            const combinedPrompt = `System Context: ${websiteContext}\n\nUser Message: ${message}`;
            
            const result = await chatSession.sendMessage(combinedPrompt);
            aiReply = result.response.text();
            finalReply = aiReply;
            console.log('💬 Normal path: Using Gemini counseling response');
        }

        // Remove duplicate status update - already handled in crisis detection above
        if (riskLevel === 'High' && !isCrisis) {
            console.log('⚠️ High-risk (non-crisis) message detected, updating patient status and fetching doctors');
            
            // Update patient status to High
            const { error: statusError } = await supabase
                .from('patients')
                .update({ 
                    status: 'High',
                    flagged_reason: 'high_risk'
                })
                .eq('id', patientId);
            
            if (statusError) {
                console.error('❌ Failed to update patient status:', statusError.message);
                throw statusError;
            }
            
            console.log('✅ Patient status updated to High with flagged_reason: high_risk');
        }
        
        // Fetch available doctors if risk level is high
        let availableDoctors = [];
        
        if (riskLevel === 'High') {
            const { data: docs, error: doctorsError } = await supabase
                .from('doctors')
                .select('id, name, speciality, gender, email')
                .limit(5);
            
            if (doctorsError) {
                console.error('❌ Failed to fetch doctors:', doctorsError.message);
                // Don't throw error, continue with empty doctors list
            } else {
                availableDoctors = docs || [];
                console.log(`✅ Fetched ${availableDoctors.length} available doctors`);
            }

            // Fix the patient query - remove invalid doctors relationship
            const { data: patientData } = await supabase
                .from('patients')
                .select('assigned_doctor_id, first_name, last_name')
                .eq('id', patientId)
                .single();

            // If patient has an assigned doctor, notify them
            if (patientData?.assigned_doctor_id) {
                const { data: assignedDoctor } = await supabase
                    .from('doctors')
                    .select('name, email')
                    .eq('id', patientData.assigned_doctor_id)
                    .single();
                
                if (assignedDoctor) {
                    await transporter.sendMail({
                        from: process.env.EMAIL_USER,
                        to: assignedDoctor.email,
                        subject: '🚨 URGENT: High-Risk Alert',
                        html: `<h3>Emergency Alert</h3><p>Patient <b>${fName} ${lName}</b> sent a message: "${finalReply}"</p>`
                    });
                    console.log('📧 Email sent to assigned doctor:', assignedDoctor.email);
                }
            }
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
            risk: riskLevel, 
            reply: finalReply, 
            doctors: availableDoctors,
            isCrisis: isCrisis, 
            isHighRisk: isHighRisk, 
            redirectToDoctor: redirectToDoctor
        });

    } catch (err) {
        console.error("--- GOOGLE API ERROR ---", err.message);

        if (err.message.includes('429')) {
            return res.status(429).json({ 
                error: "Google is still throttling your IP. Wait 5 minutes without sending ANY requests." 
            });
        }
        
        res.status(500).json({ error: "Failed to process chat" });
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
            const { data: access } = await supabase
                .from('patients')
                .select('id')
                .eq('id', targetPatientId)
                .eq('assigned_doctor_id', req.user.id || req.user.userId) 
                .eq('status', 'High') 
                .single();

            if (!access) return res.status(403).json({ error: "Access denied." });
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