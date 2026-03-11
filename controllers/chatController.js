import { createClient } from '@supabase/supabase-js';
import { Groq } from "groq-sdk";
import nodemailer from 'nodemailer';
import 'dotenv/config';
import * as httpx from 'httpx';
console.log("🔑 Checking GROQ Key:", process.env.GROQ_API_KEY ? "FOUND (Starts with gsk)" : "NOT FOUND ❌");
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
 */
export const handleChat = async (req, res) => {
   const groq = new Groq({ 
        apiKey: process.env.GROQ_API_KEY,
        http_client: new httpx.Client({ verify: false }) 
    });
    
    groq.timeout = 30000;
    const supabase = getSupabase();
    const patientId = req.user.id;
    const { message } = req.body;
    
    const fName = req.user.user_metadata?.first_name || "Patient";
    const lName = req.user.user_metadata?.last_name || "";

    try {
        // --- PREPARE CONTEXT ---
        const websiteContext = `
            You are AI assistant for "SafeSpace".
            - Provide empathetic mental health support and guide users to professional doctors.
            - SCOPE: ONLY discuss mental health, stress, anxiety, and wellness.
            - LANGUAGE: Always match the user's language (English or Amharic).
            - Keep responses supportive but professional.
        `;

        // Fetch last 6 messages for context
        const { data: history } = await supabase
            .from('messages')
            .select('content, is_ai_response')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false })
            .limit(6);

        // Map history to Groq format { role: "user/assistant", content: "..." }
        let chatMessages = [
            { role: "system", content: websiteContext }
        ];

        if (history) {
            const formattedHistory = history.reverse().map(msg => ({
                role: msg.is_ai_response ? "assistant" : "user",
                content: msg.content,
            }));
            chatMessages.push(...formattedHistory);
        }

        // Add the current message
        chatMessages.push({ role: "user", content: message });

        // --- TRIAGE LOGIC ---
        let riskLevel = 'Low';
        const highRiskKeywords = /(suicide|kill myself|end it all|die|ራስን ማጥፋት|መሞት እፈልጋለሁ|ህይወቴን ማጥፋት|ሞት)/i;
        if (highRiskKeywords.test(message)) riskLevel = 'High';

        // Save User Message to DB
        await supabase.from('messages').insert([{
            patient_id: patientId,
            content: message,
            is_ai_response: false,
            flagged_reason: riskLevel === 'High' ? 'Suicide Risk' : null
        }]);

        // --- GROQ API CALL ---
        const chatCompletion = await groq.chat.completions.create({
            messages: chatMessages,
            model: "llama3-8b-8192", // Fast, reliable, and free
            temperature: 0.7,
        });

        const aiReply = chatCompletion.choices[0].message.content;

        // --- HIGH RISK ACTIONS ---
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

        // Save AI Message to DB
        await supabase.from('messages').insert([{
            patient_id: patientId,
            content: aiReply,
            is_ai_response: true
        }]);

        // Return to Frontend
        res.status(200).json({ 
            risk: riskLevel, 
            reply: aiReply, 
            doctors: availableDoctors 
        });

    } catch (err) {
      //  console.error("Groq/Server Error:", err.message);
       // res.status(500).json({ 
          //  reply: "I'm having trouble connecting right now. Please try again later.", 
           // error: err.message 
          
    console.error("--- 🚨 GROQ DEBUG START 🚨 ---");
    console.error("Error Name:", err.name);           // e.g., APIConnectionError
    console.error("Status Code:", err.status);       // e.g., 401, 403, 429
    console.error("Error Message:", err.message);    // The specific reason
    
    // Log the actual response if it's available
    if (err.response) {
        console.error("Response Data:", await err.response.text());
    }
    console.error("--- 🚨 GROQ DEBUG END 🚨 ---");

    res.status(500).json({ 
        reply: "Connection error detected.", 
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
                html: `<p>A patient requested an urgent intervention.</p><p>Context: ${messageContent}</p>`
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
        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch history" });
    }
};