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
    const patientId = req.user.id; // From verifyToken middleware
    const { message } = req.body;
    
    // Verify patient_id matches auth.uid() for RLS compliance
    if (!patientId || patientId !== req.user.id) {
        return res.status(403).json({ error: "Unauthorized: User ID mismatch" });
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
       
        if (highRiskKeywords.test(message)) {
            riskLevel = 'High';
        }

    
       // Insert user message with proper risk tracking
        const { error: dbError } = await supabase.from('messages').insert([{
            patient_id: patientId,
            content: message,
            is_ai_response: false,
            flagged_reason: riskLevel === 'High' ? 'Suicide Risk' : null
        }]);
        
        if (dbError) {
            console.error("❌ Supabase Save Error (User Message):", dbError.message);
            throw dbError;
        }

        const chatSession = model.startChat({ 
            history: formattedHistory 
        });

     
        const combinedPrompt = `System Context: ${websiteContext}\n\nUser Message: ${message}`;
        
        const result = await chatSession.sendMessage(combinedPrompt);
        const aiReply = result.response.text();

        
        let availableDoctors = [];
        
        if (riskLevel === 'High') {
            console.log('🚨 High-risk message detected, updating patient status and fetching doctors');
            
            // Update patient status to High
            const { error: statusError } = await supabase
                .from('patients')
                .update({ status: 'High' })
                .eq('id', patientId);
            
            if (statusError) {
                console.error('❌ Failed to update patient status:', statusError.message);
                throw statusError;
            }
            
            console.log('✅ Patient status updated to High');
            
            // Fetch available doctors with proper error handling
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
                        html: `<h3>Emergency Alert</h3><p>Patient <b>${fName} ${lName}</b> sent a crisis message: "${message}"</p>`
                    });
                    console.log('📧 Email sent to assigned doctor:', assignedDoctor.email);
                }
            }
        }

       
        // Insert AI response with proper role
        const { error: aiResponseError } = await supabase.from('messages').insert([{
            patient_id: patientId,
            content: aiReply,
            is_ai_response: true,
            role: 'ai'
        }]);
        
        if (aiResponseError) {
            console.error("❌ Supabase Save Error (AI Response):", aiResponseError.message);
            // Don't throw error, continue with response
        }

        // Generate specific high-risk response if needed
        let finalReply = aiReply;
        if (riskLevel === 'High') {
            finalReply = "I've detected that you're going through a very difficult time. I am connecting you with our available healthcare professionals immediately. Please select a doctor from the list on the left to talk to someone who can help you right now.";
        }

        console.log('✅ Chat processed successfully:', { 
            riskLevel, 
            doctorsAvailable: availableDoctors.length,
            messageLength: finalReply.length
        });

        res.status(200).json({ 
            risk: riskLevel, 
            reply: finalReply, 
            doctors: availableDoctors 
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
        const targetPatientId = req.params.patientId || req.user.id; 

        if (userRole === 'doctor') {
            const { data: access } = await supabase
                .from('patients')
                .select('id')
                .eq('id', targetPatientId)
                .eq('assigned_doctor_id', req.user.id) 
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