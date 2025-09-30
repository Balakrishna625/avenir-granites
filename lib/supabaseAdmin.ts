import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE;

// Create the admin client with proper fallback for build time
let supabaseAdmin: any;

if (!supabaseUrl || !supabaseServiceRole) {
  // During build time, environment variables might not be available
  // Create a dummy client that will fail gracefully
  console.warn("Missing Supabase environment variables. Using dummy client.");
  
  supabaseAdmin = {
    from: () => ({
      select: () => ({ data: [], error: new Error("Supabase not configured") }),
      insert: () => ({ data: null, error: new Error("Supabase not configured") }),
      update: () => ({ data: null, error: new Error("Supabase not configured") }),
      delete: () => ({ data: null, error: new Error("Supabase not configured") }),
    }),
  };
} else {
  supabaseAdmin = createClient(
    supabaseUrl,
    supabaseServiceRole,
    { auth: { persistSession: false } }
  );
}

export { supabaseAdmin };
