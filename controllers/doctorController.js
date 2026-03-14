import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const getSupabase = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const getSupabaseAdmin = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * GET ALL DOCTORS
 * Used by patients to browse available doctors
 */
export const getAllDoctors = async (req, res) => {
    try {
        const supabase = getSupabase();
        
        const { data, error } = await supabase
            .from('doctors')
            .select('id, name, speciality, is_online, avatar, email');

        if (error) throw error;

        res.status(200).json(data || []);
    } catch (error) {
        console.error('❌ Error in getAllDoctors:', error.message);
        res.status(500).json({ error: "Failed to fetch doctors list" });
    }
};

/**
 * ASSIGN DOCTOR
 * Links a patient to a specific doctor in the database
 */
export const assignDoctor = async (req, res) => {
    try {
        const { doctorId } = req.body;
        const patientId = req.user.id;
        const supabase = getSupabaseAdmin(); // Admin needed to update other user profiles
        
        const { error } = await supabase
            .from('patients')
            .update({ assigned_doctor_id: doctorId })
            .eq('id', patientId);

        if (error) throw error;
        res.status(200).json({ message: "Doctor assigned successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * GET HIGH RISK PATIENTS
 * Used by the Doctor Dashboard to show crisis alerts
 */
export const getHighRiskPatients = async (req, res) => {
    try {
        const supabase = getSupabase();
        
        // Fetches patients with High risk. 
        // Note: RLS handles the privacy of who can see what.
        const { data, error } = await supabase
            .from('patients')
            .select('id, first_name, last_name, email, status, created_at') 
            .eq('status', 'High')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.status(200).json(data || []);
    } catch (error) {
        console.error('❌ Error in getHighRiskPatients:', error.message);
        res.status(500).json({ error: "Failed to fetch alerts" });
    }
};

/**
 * DOCTOR REPLY
 * Insert a message from the doctor into the shared chat history
 */
export const doctorReply = async (req, res) => {
    try {
        const { patientId, message } = req.body;
        const doctorId = req.user.id;
        const supabase = getSupabaseAdmin(); 

        const { error } = await supabase
            .from('messages')
            .insert([{
                patient_id: patientId,
                doctor_id: doctorId,
                content: message,
                sender_type: 'doctor', // Aligned with new SQL Schema
                is_ai_response: false,
                is_read: false
            }]);

        if (error) throw error;
        res.status(200).json({ message: "Reply sent to patient" });
    } catch (error) {
        console.error('❌ Error in doctorReply:', error.message);
        res.status(500).json({ error: error.message });
    }
};

/**
 * UPDATE PATIENT STATUS
 * Allows doctor to manually lower or raise risk levels
 */
export const updatePatientStatus = async (req, res) => {
    try {
        const { patientId, newStatus } = req.body; 
        const supabase = getSupabaseAdmin();
        
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