/* ============================================================
   supabase.js — Supabase Backend Integration
   ============================================================ */

const SUPABASE_URL      = "https://eqgmcqojgikmezhvfgfv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxZ21jcW9qZ2lrbWV6aHZmZ2Z2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNTc3NjYsImV4cCI6MjA5MjYzMzc2Nn0.l4aBKBw2-QxAGQVxtqM_pn6hSvqPkDEpV76QQcJ2GzY";

// Initialize the Supabase client using the global 'supabase' object provided by the CDN
// We name it supabaseClient to avoid conflicting with the CDN's global variable
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);