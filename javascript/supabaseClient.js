// javascript/supabaseClient.js
// ⚠️ Mets tes vraies valeurs :
const SUPABASE_URL = "https://hiigdwqwtilboeimlybl.supabase.co/";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpaWdkd3F3dGlsYm9laW1seWJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzODQwMTYsImV4cCI6MjA2Njk2MDAxNn0.lDjA9eZwR_EV-hkZmg2Y9WzzXlD5Zfz5u7HCs6fXYOw";

window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Optionnel : expose une petite aide
window.db = (table) => window.supabase.from(table);
