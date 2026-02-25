import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';


const getSupabase = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const getSupabaseAdmin = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);


const delay = (ms) => new Promise(res => setTimeout(res, ms));


const handleSignup = async (req, res, assignedRole) => {
    try {
        const { email, password, firstName, lastName, age, gender, country, adminKey } = req.body;
        
        const supabase = getSupabase();
        const supabaseAdmin = getSupabaseAdmin();

       
        if (assignedRole === 'doctor') {
            const DOCTOR_SECRET = process.env.DOCTOR_SIGNUP_SECRET || 'MY_SUPER_SECRET_123'; 
            if (adminKey !== DOCTOR_SECRET) {
                return res.status(403).json({ error: "Unauthorized: Invalid Doctor Secret Key." });
            }
        }

      
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { first_name: firstName, last_name: lastName, role: assignedRole }
            }
        });

        if (error) return res.status(400).json({ error: error.message });

    
        if (data.user) {
           
            await delay(500); 

            let dbError = null;

            if (assignedRole === 'patient') {
                const { error } = await supabaseAdmin.from('patients').insert([{
                    id: data.user.id,
                    email: email,
                    first_name: firstName,
                    last_name: lastName,
                    age: age,
                    gender: gender,
                    country: country,
                    password: password, 
                    assigned_doctor_id: null,
                    status: "Normal" 
                }]);
                dbError = error;
            } else if (assignedRole === 'doctor') {
                const { error } = await supabaseAdmin.from('doctors').insert([{
                    id: data.user.id,
                    name: `${firstName} ${lastName}`,
                    email: email
                }]);
                dbError = error;
            }

    
            if (dbError) {
                console.error(`❌ ${assignedRole} Table Insert Error:`, dbError.message);
                
                await supabaseAdmin.auth.admin.deleteUser(data.user.id);
                
                return res.status(500).json({ 
                    error: "Profile creation failed. Database connection timed out. Please try again." 
                });
            }
        }

        res.status(200).json({ 
            message: `Registration successful as ${assignedRole}. Please check your email for confirmation.`,
            user: data.user 
        });

    } catch (err) {
        console.error("Signup Crash:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};


export const signupPatient = (req, res) => handleSignup(req, res, 'patient');
export const signupDoctor = (req, res) => handleSignup(req, res, 'doctor');



export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const supabase = getSupabase();
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) return res.status(401).json({ error: error.message });

        res.status(200).json({ 
            message: "Welcome back", 
            token: data.session.access_token,
            role: data.user.user_metadata.role 
        });
    } catch (err) {
        res.status(500).json({ error: "Login failed" });
    }
};