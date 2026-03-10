import { createClient } from '@supabase/supabase-js';
import 'dotenv/config'; 

// Function to safely get Supabase Client only when needed
const getSupabase = () => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    if (!url || !key) {
        console.error("❌ Critical: Missing Supabase Environment Variables!");
        throw new Error("supabaseKey or supabaseUrl is missing from environment.");
    }
    return createClient(url, key);
};

// Function to safely get Admin Client
const getSupabaseAdmin = () => {
    const url = process.env.SUPABASE_URL;
    const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !adminKey) {
        console.error("❌ Critical: Missing Supabase Admin Key!");
        throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing from environment.");
    }
    return createClient(url, adminKey);
};

export const verifyToken = async (req, res, next) => {
    // Initialize clients INSIDE the middleware to ensure process.env is ready
    const supabase = getSupabase();
    const supabaseAdmin = getSupabaseAdmin();

    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') 
        ? authHeader.split(' ')[1] 
        : req.cookies?.token;
    
    if (!token) {
        return res.status(401).json({ error: "Authentication required. Please login." });
    }

    try {
        // 1. Verify token with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            console.log('❌ Middleware: Invalid token or user not found');
            return res.status(401).json({ error: "Session expired. Please login again." });
        }

        // 2. Extract role from metadata first
        let userRole = user.user_metadata?.role;
        
        // 3. If role not in metadata, fetch from database tables
        if (!userRole) {
            console.log('🔍 Middleware: Role not in metadata, checking database...');
            
            // Check patients table
            const { data: patientData, error: patientError } = await supabaseAdmin
                .from('patients')
                .select('role')
                .eq('id', user.id)
                .single();
            
            if (!patientError && patientData) {
                userRole = patientData.role || 'patient';
                console.log('✅ Middleware: Found role in patients table:', userRole);
            } else {
                // Check doctors table
                const { data: doctorData, error: doctorError } = await supabaseAdmin
                    .from('doctors')
                    .select('id')
                    .eq('id', user.id)
                    .single();
                
                if (!doctorError && doctorData) {
                    userRole = 'doctor';
                    console.log('✅ Middleware: Found role in doctors table:', userRole);
                }
            }
        }

        // 4. Final check and assignment
        req.user = {
            ...user,
            id: user.id, // Explicitly set for handleChat
            role: userRole || 'patient'
        };

        console.log('🔐 Middleware Success:', { userId: user.id, role: req.user.role });
        next();
    } catch (err) {
        console.error("Auth Middleware Crash:", err.message);
        return res.status(500).json({ error: "Internal server error during authentication." });
    }
};