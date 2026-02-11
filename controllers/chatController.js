import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import 'dotenv/config';

// Initialize Supabase
const getSupabase = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// 1. Setup Nodemailer Transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { 
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS 
    }
});

/**
 * SEND CHAT MESSAGE & TRIAGE
 * This handles the patient sending a message, checks for suicide risk,
 * updates the DB, and emails the doctor if risk is High.
 */
export const handleChat = async (req, res) => {
    try {
        const { message } = req.body;
        const patientId = req.user.id;
        
        // Get metadata from Supabase Auth
        const fName = req.user.user_metadata?.first_name || "Patient";
        const lName = req.user.user_metadata?.last_name || "";
        
        const supabase = getSupabase();

        // --- Triage Logic ---
        let riskLevel = 'Low';
        let flaggedReason = null;

        if (/(suicide|kill myself|end it all|die)/i.test(message)) {
            riskLevel = 'High';
            flaggedReason = 'Suicide Intent';
        } else if (/(depressed|hopeless|sad|empty)/i.test(message)) {
            riskLevel = 'Medium';
            flaggedReason = 'Depression Symptoms';
        }

        // --- Save Message to DB ---
        await supabase.from('messages').insert([{ 
            patient_id: patientId, 
            content: message, 
            flagged_reason: flaggedReason,
            is_ai_response: false
        }]);

        // --- High Risk Actions ---
        if (riskLevel === 'High') {
            // 1. Fetch the assigned doctor's email/name
            const { data: patientData } = await supabase
                .from('patients')
                .select('assigned_doctor_id, doctors(name, email)')
                .eq('id', patientId)
                .single();

            const doctor = patientData?.doctors;

            // 2. Update patient status to 'High' in DB
            await supabase.from('patients')
                .update({ status: 'High' })
                .eq('id', patientId);

            // 3. Email the doctor immediately
            if (doctor) {
                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: doctor.email,
                    subject: '🚨 URGENT: High-Risk Alert Detected',
                    html: `
                        <h3>Emergency Intervention Required</h3>
                        <p>Patient <b>${fName} ${lName}</b> sent a high-risk message.</p>
                        <p><b>Message:</b> "${message}"</p>
                        <hr>
                        <p><a href="http://localhost:5173/chat/history/${patientId}">Open History to Intervene</a></p>
                    `
                };
                await transporter.sendMail(mailOptions);
                
                return res.status(200).json({ 
                    risk: 'High', 
                    reply: `I've alerted Dr. ${doctor.name}. Please stay calm, they are reviewing our chat.` 
                });
            }
        }

        // --- Normal AI Response ---
        res.status(200).json({ 
            risk: riskLevel, 
            reply: "I'm listening. Can you tell me more about that?" 
        });

    } catch (err) {
        console.error("Chat Error:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

/**
 * GET CHAT HISTORY
 * This allows the Telegram-style sidebar to work. 
 * Fetches all messages between the system and a specific patient.
 */
export const getChatHistory = async (req, res) => {
    try {
        const supabase = getSupabase();
        
        // If doctor passes ID in URL, use it. Otherwise, use the logged-in patient's ID.
        const targetPatientId = req.params.patientId || req.user.id; 

        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('patient_id', targetPatientId)
            .order('created_at', { ascending: true }); // Oldest to newest

        if (error) throw error;
        res.status(200).json(data);
    } catch (err) {
        console.error("History Error:", err);
        res.status(500).json({ error: err.message });
    }
};