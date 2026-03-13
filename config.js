/**
 * config.js - Configuración de conexión a Supabase
 */

// Reemplaza con tus datos reales de Supabase que tienes en Vercel
const SUPABASE_URL = "https://csbkqfrktvvkyyrmdnri.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzYmtxZnJrdHZ2a3l5cm1kbnJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwODY2NDksImV4cCI6MjA4ODY2MjY0OX0.bRCMu8qTf4AO_vr-dMftR4HVEJKWPYAupTEQ4DiwT-c";

// Inicialización del cliente de Supabase

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

