import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;
let supabaseDisabled = (() => {
  try {
    return localStorage.getItem('supabase_disabled_permanently') === 'true';
  } catch (e) {
    return false;
  }
})();

export const disableSupabase = (): void => {
  console.warn("Supabase integration disabled dynamically due to connection/iframe restrictions.");
  supabaseDisabled = true;
  try {
    localStorage.setItem('supabase_disabled_permanently', 'true');
  } catch (e) {}
};

export const enableSupabase = (): void => {
  console.log("Supabase integration re-enabled manually.");
  supabaseDisabled = false;
  try {
    localStorage.removeItem('supabase_disabled_permanently');
  } catch (e) {}
};

export const isSupabaseConfigured = (): boolean => {
  if (supabaseDisabled) return false;
  
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  
  // Convert to lowercase to catch any casing mixups
  const lowerUrl = url.toLowerCase();
  const lowerKey = key.toLowerCase();
  
  // Check for common placeholders or generic dummy values
  const isPlaceholder = 
    lowerUrl.includes('your-') || 
    lowerUrl.includes('your_') ||
    lowerUrl.includes('yourproject') ||
    lowerUrl.includes('placeholder') || 
    lowerUrl.includes('example') ||
    lowerUrl.includes('project-ref') ||
    lowerKey.includes('your-') || 
    lowerKey.includes('your_') ||
    lowerKey.includes('yourproject') ||
    lowerKey.includes('placeholder') ||
    lowerKey.includes('example') ||
    lowerKey.includes('anon-key') ||
    key.trim().length < 40; // Real Supabase anon keys are JWTs and always >100 characters. Symmetrical shield against invalid config keys.
    
  if (isPlaceholder) return false;

  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (e) {
    return false;
  }
};

export const getSupabase = (): SupabaseClient => {
  if (!supabaseInstance) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase URL and Anon Key are required. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables.');
    }

    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      global: {
        fetch: async (url, options) => {
          try {
            return await fetch(url, options);
          } catch (err: any) {
            console.warn("Supabase fetch failed, disabling active cloud integration to prevent further failures:", err);
            if (err && (err.message?.includes('fetch') || err.toString().includes('fetch') || err.name === 'TypeError')) {
              disableSupabase();
            }
            throw err;
          }
        }
      }
    });
  }
  return supabaseInstance;
};
