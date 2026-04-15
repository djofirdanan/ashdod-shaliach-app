import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nwqzzzbjsqfrrjprkkrk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53cXp6emJqc3FmcnJqcHJra3JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyMTIzNDEsImV4cCI6MjA5MTc4ODM0MX0.4irzP4BiQrj6zF0Ua4ASec_wuY6lm4VI7W1NCSE9rTQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
