// javascript/supabaseClient.js
// ⚠️ Mets tes vraies valeurs :
const SUPABASE_URL = "https://xxxxx.supabase.co/";
const SUPABASE_ANON_KEY = "eyJhbGciOi...";

window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Optionnel : expose une petite aide
window.db = (table) => window.supabase.from(table);
