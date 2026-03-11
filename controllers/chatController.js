import { createClient } from '@supabase/supabase-js';
import { Groq } from "groq-sdk";
import nodemailer from 'nodemailer';
import 'dotenv/config';
import { Agent } from 'undici'; // Use the newly installed package

const getSupabase = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export const handleChat = async (req, res) => {
    // This dispatcher bypasses the "Connection Error" by ignoring SSL issues
    const dispatcher = new Agent({
        connect: { rejectUnauthorized: false }
    });

    const groq = new Groq({ 
        apiKey: process.env.GROQ_API_KEY,
        fetch: (url, options) => fetch(url, { ...options, dispatcher })
    });

    const supabase = getSupabase();
    const patientId = req.user.id;
    const { message } = req.body;

    try {
        // ... (Keep your history fetching and risk assessment logic)

        const chatCompletion = await groq.chat.completions.create({
            messages: chatMessages,
            model: "llama3-8b-8192",
        });

        const aiReply = chatCompletion.choices[0].message.content;

        // ... (Keep your database save logic)

        res.status(200).json({ reply: aiReply });

    } catch (err) {
        console.error("--- 🚨 GROQ DEBUG START 🚨 ---");
        console.error("Error Message:", err.message);
        console.error("--- 🚨 GROQ DEBUG END 🚨 ---");

        res.status(500).json({ 
            reply: "I am having trouble connecting. Please try again.", 
            debug_info: err.message 
        });
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