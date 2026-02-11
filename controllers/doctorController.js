import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const getSupabase = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export const getAllDoctors = async (req, res) => {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('doctors').select('id, name, specialty, gender');
    if (error) return res.status(500).json({ error: error.message });
    res.status(200).json(data);
};

export const assignDoctor = async (req, res) => {
    const { doctorId } = req.body;
    const supabase = getSupabase();
    const { error } = await supabase.from('patients').update({ assigned_doctor_id: doctorId }).eq('id', req.user.id);
    if (error) return res.status(500).json({ error: error.message });
    res.status(200).json({ message: "Doctor assigned successfully" });
};

export const getHighRiskPatients = async (req, res) => {
    const supabase = getSupabase();
    const { data, error } = await supabase
        .from('patients')
        .select('id, first_name, last_name, email, status')
        .eq('assigned_doctor_id', req.user.id)
        .eq('status', 'High');
    if (error) return res.status(500).json({ error: error.message });
    res.status(200).json(data);
};

// NEW: Doctor sends a manual intervention message
export const doctorReply = async (req, res) => {
    const { patientId, message } = req.body;
    const supabase = getSupabase();
    const { error } = await supabase.from('messages').insert([{
        patient_id: patientId,
        content: message,
        is_ai_response: false // Marks this as a human doctor message
    }]);
    if (error) return res.status(500).json({ error: error.message });
    res.status(200).json({ message: "Reply sent to patient" });
};