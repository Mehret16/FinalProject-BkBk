import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkSystemHealth() {
    console.log("--- 🏥 Starting System Health Check ---");

    // 1. Check Doctors Table
    const { data: doctors, error: docError } = await supabase
        .from('doctors')
        .select('id, name, speciality')
        .limit(1);

    if (docError) {
        console.error("❌ DOCTORS TABLE ERROR:", docError.message);
        console.log("💡 Fix: Check if 'doctors' table exists and RLS 'SELECT' policy is enabled.");
    } else {
        console.log("✅ DOCTORS TABLE: Accessible. Found:", doctors.length > 0 ? doctors[0].name : "Table is empty");
    }

    // 2. Check Messages Table Columns
    const { data: msgTest, error: msgError } = await supabase
        .from('messages')
        .select('flagged_reason, metadata, role')
        .limit(1);

    if (msgError) {
        console.error("❌ MESSAGES TABLE SCHEMA ERROR:", msgError.message);
        console.log("💡 Fix: Run the ALTER TABLE script to add missing columns (flagged_reason, metadata, role).");
    } else {
        console.log("✅ MESSAGES TABLE: Schema is correct.");
    }

    // 3. Check RLS for Inserts
    const tempUuid = "63732aaf-9b55-4225-a756-382f5b36e63d"; // Your test patient ID
    const { error: insertError } = await supabase
        .from('messages')
        .insert([{ 
            patient_id: tempUuid, 
            content: "Health check test", 
            role: "user" 
        }]);

    if (insertError) {
        console.error("❌ RLS INSERT ERROR:", insertError.message);
        console.log("💡 Fix: Add the 'FOR INSERT' policy to the messages table.");
    } else {
        console.log("✅ RLS POLICIES: Insert allowed.");
    }

    console.log("--- 🏥 Health Check Finished ---");
}

checkSystemHealth();
