import { createClient } from '@supabase/supabase-js';
import 'dotenv/config'; 
console.log("Checking Env Vars:", { 
  hasUrl: !!process.env.SUPABASE_URL, 
  hasKey: !!process.env.SUPABASE_ANON_KEY 
});

const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_ANON_KEY
);

const supabaseAdmin = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log("Checking Supabase...", supabase ? "Client Initialized" : "Client Failed");

export const verifyToken = async (req, res, next) => {
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
            return res.status(401).json({ error: "Session expired. Please login again." });
        }

        // 2. Extract role from metadata first
        let userRole = user.user_metadata?.role;
        
        // 3. If role not in metadata, fetch from database tables
        if (!userRole) {
            console.log('🔍 Middleware: Role not in metadata, checking database...');
            
            // Check patients table first
            const { data: patientData, error: patientError } = await supabaseAdmin
                .from('patients')
                .select('role')
                .eq('id', user.id)
                .single();
            
            if (!patientError && patientData) {
                userRole = patientData.role;
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

        // 4. Default to patient if still not found
        if (!userRole) {
            userRole = 'patient';
            console.log('⚠️ Middleware: Role not found, defaulting to patient');
        }

        req.user = {
            ...user,
            role: userRole
        };

        console.log('🔐 Middleware Success:', { userId: user.id, role: userRole });
        next();
    } catch (err) {
        console.error("Auth Middleware Crash:", err.message);
        return res.status(500).json({ error: "Internal server error during authentication." });
    }
};