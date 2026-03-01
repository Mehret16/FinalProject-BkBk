import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// 1. Setup Clients
const getSupabase = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const getSupabaseAdmin = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const delay = (ms) => new Promise(res => setTimeout(res, ms));

const handleSignup = async (req, res, assignedRole) => {
    try {
        const { email, password, firstName, lastName, age, gender, country, adminKey } = req.body;
        
        const supabase = getSupabase();
        const supabaseAdmin = getSupabaseAdmin();

        // 2. Secret Key Check for Doctors
        if (assignedRole === 'doctor') {
            const DOCTOR_SECRET = process.env.DOCTOR_SIGNUP_SECRET || 'MY_SUPER_SECRET_123'; 
            if (adminKey !== DOCTOR_SECRET) {
                return res.status(403).json({ error: "Unauthorized: Invalid Doctor Secret Key." });
            }
        }

        // 3. SUPABASE AUTH SIGNUP 
        // 🛡️ Supabase hashes the password automatically. No bcrypt needed.
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { 
                    first_name: firstName, 
                    last_name: lastName, 
                    role: assignedRole 
                }
            }
        });

        if (error) return res.status(400).json({ error: error.message });

        // 4. Insert Profile into Public Tables
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
                    assigned_doctor_id: null,
                    status: "Normal" 
                    // 🛡️ REMOVED: password: password (NEVER store plain passwords here)
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
                // Rollback: Delete the auth user if profile creation fails
                await supabaseAdmin.auth.admin.deleteUser(data.user.id);
                return res.status(500).json({ error: "Profile creation failed. Please try again." });
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

        // 1. Check for Auth Errors (Wrong password, unconfirmed email, etc.)
        if (error) return res.status(401).json({ error: error.message });

        // 2. Safety Check: Verify user and metadata exist
        if (!data?.user) {
            return res.status(404).json({ error: "User not found." });
        }

        // 3. Extract role safely from metadata
        const userRole = data.user.user_metadata?.role || 'patient';

        res.status(200).json({ 
            message: "Welcome back! Login successful.", 
            token: data.session?.access_token,
            role: userRole
        });
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ error: "Login failed" });
    }
};

export const logout = async (req, res) => {
    try {
        const supabase = getSupabase();
        await supabase.auth.signOut(); 
        res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};