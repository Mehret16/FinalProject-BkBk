import { createClient } from '@supabase/supabase-js';
import 'dotenv/config'; // 1. Load environment variables first

console.log("Connecting to:", process.env.SUPABASE_URL);
const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_ANON_KEY
);

// 3. Now it is safe to log
console.log("Checking Supabase...", supabase ? "Client Initialized" : "Client Failed");

export const verifyToken = async (req, res, next) => {
    // Look for token in Authorization header or Cookies
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;

    if (!token) {
        return res.status(401).json({ error: "Please login first. No token found." });
    }

    try {
        // Verify the token with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ error: "Invalid session or token expired." });
        }

        // Attach user to the request object for the next middleware/route
        req.user = user; 
        next();
    } catch (err) {
        return res.status(500).json({ error: "Internal server error during authentication." });
    }
};