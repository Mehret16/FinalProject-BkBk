import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// 1. Get the exact folder path of THIS script
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '.env');

// 2. Physical check: Does the file actually exist at this path?
const fileExists = fs.existsSync(envPath);

// 3. Try to load it
dotenv.config({ path: envPath });

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;

console.log("--- DEBUGGING START ---");
console.log("1. Current script folder:", __dirname);
console.log("2. Looking for .env at:", envPath);
console.log("3. Does .env exist there?:", fileExists ? "YES ✅" : "NO ❌");
console.log("4. URL from process.env:", url ? "Found" : "MISSING");
console.log("-----------------------");
const rawContent = fs.readFileSync(envPath, 'utf8');
console.log("3. Raw file starts with:", rawContent.substring(0, 15) + "...");

if (url && key) {
    const supabase = createClient(url, key);
    console.log("Attempting to ping Supabase...");
    const { data, error } = await supabase.from('policies').select('count');
    if (error) console.log("Error:", error.message);
    else console.log("Success! Connection established.");
} else {
    console.log("Exiting: No credentials found to test.");
}
console.log("4. SUPABASE_URL exists in process.env?:", process.env.hasOwnProperty('SUPABASE_URL'));
console.log("5. SUPABASE_ANON_KEY exists in process.env?:", process.env.hasOwnProperty('SUPABASE_ANON_KEY'));
console.log("-----------------------");