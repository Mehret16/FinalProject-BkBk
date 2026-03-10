import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const getSupabaseAdmin = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(`Supabase Configuration Missing: URL exists: ${!!url}, Key exists: ${!!key}`);
  }
  return createClient(url, key);
};

const getSupabase = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(`Supabase Configuration Missing: URL exists: ${!!url}, Key exists: ${!!key}`);
  }
  return createClient(url, key);
};

const delay = (ms) => new Promise(res => setTimeout(res, ms));

const handleSignup = async (req, res, assignedRole) => {
    console.log(' Request URL:', req.originalUrl);
    console.log('Incoming Body:', req.body);
    const supabase = getSupabase();
    const supabaseAdmin = getSupabaseAdmin();
    try {
        const { email, password, firstName, FirstName, lastName, LastName, age, gender, country, adminKey, specialization } = req.body;
        
        // Handle potential casing mismatches from frontend
        const finalFirstName = firstName || FirstName || 'Unknown';
        const finalLastName = lastName || LastName || '';
        
        console.log(' Signup Request:', { email, firstName: finalFirstName, lastName: finalLastName, age, gender, country, assignedRole, specialization });
        
        // 2. Secret Key Check for Doctors
        if (assignedRole === 'doctor') {
            const DOCTOR_SECRET = process.env.DOCTOR_SIGNUP_SECRET || 'MY_SUPER_SECRET_123'; 
            if (adminKey !== DOCTOR_SECRET) {
                console.error(' Invalid Doctor Secret Key:', { adminKey, DOCTOR_SECRET });
                return res.status(403).json({ error: "Unauthorized: Invalid Doctor Secret Key." });
            }
        }

        // 3. SUPABASE AUTH SIGNUP 
        //  Supabase hashes the password automatically. No bcrypt needed.
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { 
                    first_name: finalFirstName, 
                    last_name: finalLastName, 
                    role: assignedRole 
                }
            }
        });

        if (error) return res.status(400).json({ error: error.message });

        // 4. WAIT for Auth user to propagate
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 4. Insert Profile into Public Tables
        if (data.user) {
            let dbError = null;

            if (assignedRole === 'patient') {
                const patientData = {
                    id: data.user.id, // Use EXACT id from signup response
                    first_name: finalFirstName,
                    last_name: finalLastName,
                    email: email,
                    role: assignedRole,
                    age: age,
                    gender: gender,
                    country: country,
                    assigned_doctor_id: null,
                    status: "Normal"
                };
                
                console.log(' Inserting patient data:', patientData);
                
                try {
                    const { error } = await supabaseAdmin.from('patients').upsert([patientData], {
                        onConflict: 'id'
                    });
                    dbError = error;
                } catch (insertError) {
                    console.error(' Patient Insert Exception:', insertError.message);
                    console.dir(insertError); 
                    return res.status(400).json({ error: insertError.message });
                }
            } else if (assignedRole === 'doctor') {
                const doctorData = {
                    id: data.user.id, // Use EXACT id from signup response
                    name: `${finalFirstName} ${finalLastName}`,
                    email: email,
                    gender: gender,
                    speciality: specialization,
                    role: assignedRole
                };
                
                console.log(' Inserting doctor data:', doctorData);
                
                try {
                    const { error } = await supabaseAdmin.from('doctors').upsert([doctorData], {
                        onConflict: 'id'
                    });
                    dbError = error;
                } catch (insertError) {
                    console.error(' Doctor Insert Exception:', insertError.message);
                    console.dir(insertError); 
                    return res.status(400).json({ error: insertError.message });
                }
            }

            if (dbError) {
                console.error(` ${assignedRole} Table Insert Error:`, dbError.message);
                console.error(' Full Error Details:', dbError.details || 'No details available');
                console.dir(dbError); 
                
                // Rollback: Delete the auth user if profile creation fails
                await supabaseAdmin.auth.admin.deleteUser(data.user.id);
                
                // Return detailed error message to frontend
                return res.status(500).json({ 
                    error: "Profile creation failed. Please try again.",
                    details: dbError.details || dbError.message,
                    code: dbError.code || 'UNKNOWN'
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
        const supabaseAdmin = getSupabaseAdmin();
        
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        // 1. Check for Auth Errors (Wrong password, unconfirmed email, etc.)
        if (error) return res.status(401).json({ error: error.message });

        // 2. Safety Check: Verify user and metadata exist
        if (!data?.user) {
            return res.status(404).json({ error: "User not found." });
        }

        // 3. Extract role from metadata first
        let userRole = data.user.user_metadata?.role;
        
        // 4. If role not in metadata, fetch from database tables
        if (!userRole) {
            console.log('🔍 Role not in metadata, checking database...');
            
            // Check patients table first
            const { data: patientData, error: patientError } = await supabaseAdmin
                .from('patients')
                .select('role')
                .eq('id', data.user.id)
                .single();
            
            if (!patientError && patientData) {
                userRole = patientData.role;
                console.log('✅ Found role in patients table:', userRole);
            } else {
                // Check doctors table
                const { data: doctorData, error: doctorError } = await supabaseAdmin
                    .from('doctors')
                    .select('id')
                    .eq('id', data.user.id)
                    .single();
                
                if (!doctorError && doctorData) {
                    userRole = 'doctor';
                    console.log('✅ Found role in doctors table:', userRole);
                }
            }
        }

        // 5. Default to patient if still not found
        if (!userRole) {
            userRole = 'patient';
            console.log('⚠️ Role not found, defaulting to patient');
        }

        console.log('🔑 Login Success:', { email, userId: data.user.id, role: userRole });

        res.status(200).json({ 
            message: "Welcome back! Login successful.", 
            token: data.session?.access_token,
            role: userRole,
            user: {
                id: data.user.id,
                email: data.user.email
            }
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