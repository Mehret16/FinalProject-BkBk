import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';


const getSupabase = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);


export const getAllDoctors = async (req, res) => {
    try {
        const supabase = getSupabase();
     
        const { data, error } = await supabase
            .from('doctors')
            .select('id, name, specialization, gender');

        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const assignDoctor = async (req, res) => {
    try {
        const { doctorId } = req.body;
        const supabase = getSupabase();
        
        const { error } = await supabase
            .from('patients')
            .update({ assigned_doctor_id: doctorId })
            .eq('id', req.user.id);

        if (error) throw error;
        res.status(200).json({ message: "Doctor assigned successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


export const getHighRiskPatients = async (req, res) => {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('patients')
            .select('id, name, email, status') 
            .eq('assigned_doctor_id', req.user.id)
            .eq('status', 'High');

        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


export const updatePatientStatus = async (req, res) => {
    try {
        const { patientId, newStatus } = req.body; 
        const supabase = getSupabase();
        
        const { error } = await supabase
            .from('patients')
            .update({ status: newStatus })
            .eq('id', patientId);

        if (error) throw error;
        res.status(200).json({ message: `Patient status updated to ${newStatus}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


export const doctorReply = async (req, res) => {
    try {
        const { patientId, message } = req.body;
        const supabase = getSupabase();

        const { error } = await supabase
            .from('messages')
            .insert([{
                patient_id: patientId,
                content: message,
                is_ai_response: false 
            }]);

        if (error) throw error;
        res.status(200).json({ message: "Reply sent to patient" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};