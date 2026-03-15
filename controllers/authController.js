import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const getSupabaseAdmin = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const getSupabase = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const handleSignup = async (req, res, assignedRole) => {
    const supabase = getSupabase();
    const supabaseAdmin = getSupabaseAdmin();
    
    try {
        const { email, password, firstName, lastName, age, gender, country, specialization, speciality, adminKey } = req.body;
        
        const finalFirstName = firstName || 'User';
        const finalLastName = lastName || '';
        const finalSpec = specialization || speciality || 'General';

        if (assignedRole === 'doctor') {
            const SECRET = process.env.DOCTOR_SIGNUP_SECRET || 'MY_SUPER_SECRET_123'; 
            if (adminKey !== SECRET) return res.status(403).json({ error: "Invalid Secret Key" });
        }

        const { data, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { first_name: finalFirstName, role: assignedRole } }
        });

        if (authError) return res.status(400).json({ error: authError.message });

        let dbError = null;
        if (assignedRole === 'patient') {
            const { error } = await supabaseAdmin.from('patients').upsert({
                id: data.user.id,
                first_name: finalFirstName,
                last_name: finalLastName,
                email,
                age,
                gender,
                country,
                role: 'patient',
                status: 'Normal'
            });
            dbError = error;
        } else {
            const { error } = await supabaseAdmin.from('doctors').upsert({
                id: data.user.id,
                first_name: finalFirstName,
                last_name: finalLastName,
                email,
                specialization: finalSpec,
                role: 'doctor'
            });
            dbError = error;
        }

        if (dbError) {
            await supabaseAdmin.auth.admin.deleteUser(data.user.id);
            return res.status(500).json({ error: dbError.message });
        }

        res.status(200).json({ message: "Signup successful", user: data.user });
    } catch (err) {
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const signupPatient = (req, res) => handleSignup(req, res, 'patient');
export const signupDoctor = (req, res) => handleSignup(req, res, 'doctor');

export const login = async (req, res) => {
    const { email, password } = req.body;
    const supabase = getSupabase();
    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: error.message });

    let userRole = data.user.user_metadata?.role;
    if (!userRole) {
        const { data: p } = await supabaseAdmin.from('patients').select('role').eq('id', data.user.id).single();
        userRole = p ? p.role : 'doctor';
    }

    res.status(200).json({
        token: data.session?.access_token,
        role: userRole,
        user: { id: data.user.id, email: data.user.email }
    });
};