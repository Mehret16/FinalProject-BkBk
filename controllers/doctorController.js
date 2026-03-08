import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const getSupabase = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const getSupabaseAdmin = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export const getAllDoctors = async (req, res) => {
    try {
        const supabase = getSupabase();
        
        console.log('🔍 Fetching doctors for user:', { userId: req.user.id, userRole: req.user.role });
        
        // Query doctors table with correct column names
        const { data, error } = await supabase
            .from('doctors')
            .select('id, name, speciality, role, gender, email');

        if (error) {
            console.error('❌ Database error fetching doctors:', error.message);
            throw error;
        }

        // Filter to only include doctors with role set to 'doctor'
        const doctorsWithRole = (data || []).filter(doctor => doctor.role === 'doctor');

        console.log('✅ Successfully fetched doctors:', { 
            total: data?.length || 0, 
            withDoctorRole: doctorsWithRole.length 
        });
        
        // Return empty array if no doctors found
        res.status(200).json(doctorsWithRole);
    } catch (error) {
        console.error('❌ Error in getAllDoctors:', error.message);
        console.dir(error); // Add full error object inspection
        res.status(500).json({ error: "Failed to fetch doctors list" });
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
        
        console.log('🔍 Fetching ALL high-risk patients for doctor:', { doctorId: req.user.id });
        
        // Return ALL patients with status === 'High', not just assigned ones
        const { data, error } = await supabase
            .from('patients')
            .select('id, first_name, last_name, email, status, flagged_reason, created_at') 
            .eq('status', 'High')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Database error fetching high-risk patients:', error.message);
            throw error;
        }

        console.log('✅ Successfully fetched high-risk patients:', { count: data?.length || 0 });
        
        // Return empty array if no patients found
        const patients = data || [];
        res.status(200).json(patients);
    } catch (error) {
        console.error('❌ Error in getHighRiskPatients:', error.message);
        res.status(500).json({ error: "Failed to fetch high-risk patients" });
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
        const supabase = getSupabaseAdmin(); // Use admin client to bypass RLS

        const { error } = await supabase
            .from('messages')
            .insert([{
                patient_id: patientId,
                content: message,
                role: 'user', // Doctor messages are from user perspective
                is_ai_response: false 
            }]);

        if (error) throw error;
        res.status(200).json({ message: "Reply sent to patient" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};