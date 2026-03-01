import { createClient } from '@supabase/supabase-js';
import 'dotenv/config'; 


const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_ANON_KEY
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
        // 2. Verify token with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ error: "Session expired. Please login again." });
        }
        const assignedRole = user.user_metadata?.role || 'patient';

        req.user = {
            ...user,
            role: assignedRole
        };

        next();
    } catch (err) {
        console.error("Auth Middleware Crash:", err.message);
        return res.status(500).json({ error: "Internal server error during authentication." });
    }
};