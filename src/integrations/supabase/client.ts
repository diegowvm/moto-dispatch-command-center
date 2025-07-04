// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://attstwurmdvxvjmerhcp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0dHN0d3VybWR2eHZqbWVyaGNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2MDA4NjksImV4cCI6MjA2NzE3Njg2OX0.FxpuBDdu-8Pdl6ina4lxPRfsY5-Zhp0jMvb1DU_C7sk";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});