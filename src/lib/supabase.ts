import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const supabaseUrl = `https://${projectId}.supabase.co`;

// Create Supabase client for direct database access
// This is used for PUBLIC reads (no authentication required)
export const supabase = createClient(supabaseUrl, publicAnonKey);
