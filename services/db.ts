
import { UserAccount, SavedPatient, AppSettings, WellnessLog } from '../types';
import { getSupabase, isSupabaseConfigured, disableSupabase } from '../supabase';

let apiOfflineFallback = (() => {
  try {
    return localStorage.getItem('api_offline_fallback') === 'true';
  } catch (e) {
    return false;
  }
})();

export const setApiOfflineFallback = (active: boolean) => {
  try {
    if (active) {
      apiOfflineFallback = true;
      localStorage.setItem('api_offline_fallback', 'true');
    } else {
      apiOfflineFallback = false;
      localStorage.removeItem('api_offline_fallback');
    }
  } catch (e) {}
};

const fetchWithRetry = async (url: string, options?: RequestInit, retries = 2, delay = 300): Promise<Response> => {
  if (apiOfflineFallback) {
    throw new TypeError('API Server currently offline/unreachable (Cache Mode Active)');
  }
  try {
    return await fetch(url, options);
  } catch (err: any) {
    if (retries > 0) {
      console.warn(`Fetch to ${url} failed ("${err.message || err}"). Retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 1.5);
    }
    if (err && (err.name === 'TypeError' || err.message?.includes('fetch') || err.toString().includes('fetch'))) {
      setApiOfflineFallback(true);
    }
    throw err;
  }
};

export const DEFAULT_ADMIN: UserAccount = {
  uid: 'admin-init',
  username: 'admin',
  password: 'admin123', 
  role: 'SUPER_SAINT',
  createdAt: Date.now()
};

export const db = {
  settings: {
    get: async (): Promise<AppSettings | null> => {
      // Try local first for speed, then sync with Supabase
      let localData: AppSettings | null = null;
      try {
        const local = localStorage.getItem('tcm_app_settings');
        localData = local ? JSON.parse(local) : null;
      } catch (e) {
        console.warn('Failed to parse app settings from localStorage', e);
      }

      if (!isSupabaseConfigured()) {
        if (localData && !localData.geminiApiKeys) {
          localData.geminiApiKeys = [];
        }
        return localData;
      }

      try {
        const supabase = getSupabase();
        const { data, error } = await supabase.from('settings').select('*').maybeSingle();
        if (error) throw error;
        
        // Sync local with remote
        if (data) {
          // Ensure geminiApiKeys exists even if column is missing in DB (though upsert would fail)
          const mergedData = {
            ...data,
            geminiApiKeys: data.geminiApiKeys || []
          };
          localStorage.setItem('tcm_app_settings', JSON.stringify(mergedData));
          return mergedData;
        }
        
        if (localData && !localData.geminiApiKeys) {
          localData.geminiApiKeys = [];
        }
        return localData;
      } catch (e: any) {
        console.warn('Supabase Error (settings.get):', e.message || e);
        if (e && (e.message?.includes('fetch') || e.toString().includes('fetch') || e.name === 'TypeError')) {
          disableSupabase();
        }
        if (localData && !localData.geminiApiKeys) {
          localData.geminiApiKeys = [];
        }
        return localData;
      }
    },
    update: async (settings: AppSettings): Promise<{ success: boolean; error?: string }> => {
      console.log('DB: Attempting settings update', settings);
      
      try {
        // 1. Save to Local Storage first
        const settingsString = JSON.stringify(settings);
        localStorage.setItem('tcm_app_settings', settingsString);
        
        // Verify local save
        const verified = localStorage.getItem('tcm_app_settings');
        if (verified !== settingsString) {
          console.warn('DB: LocalStorage verification failed!');
          return { success: false, error: "Local storage write failed. Your browser might be blocking storage." };
        }
        console.log('DB: LocalStorage save verified');

        // 2. Try Supabase if configured
        if (!isSupabaseConfigured()) {
          console.log('DB: Supabase not configured, using LocalStorage only.');
          return { success: true };
        }

        const supabase = getSupabase();
        const payload = { 
          id: 1, 
          geminiApiKey: settings.geminiApiKey,
          geminiApiKeys: settings.geminiApiKeys,
          clinicName: settings.clinicName,
          clinicAddress: settings.clinicAddress,
          clinicPhone: settings.clinicPhone
        };

        console.log('DB: Sending to Supabase', payload);
        const { error } = await supabase.from('settings').upsert(payload);
        
        if (error) {
          console.warn('DB: Supabase Upsert Error', error);
          // We return success: true because LocalStorage worked, but we warn about the DB
          return { 
            success: true, 
            error: `Saved locally, but Cloud Sync failed: ${error.message}. Please check if the "settings" table has a "geminiApiKeys" column.` 
          };
        }

        console.log('DB: Supabase sync successful');
        return { success: true };
      } catch (e: any) {
        console.warn('DB: Critical info in settings.update', e.message || e);
        return { success: false, error: e.message || "An unexpected error occurred while saving." };
      }
    }
  },
  users: {
    getAll: async (): Promise<UserAccount[]> => {
      const getLocal = async (): Promise<UserAccount[]> => {
        try {
          const res = await fetchWithRetry('/api/users');
          if (!res.ok) throw new Error('Failed to fetch local users');
          const data = await res.json();
          if (data && data.length > 0) {
            const mapped = data.map((u: any) => ({
              uid: u.uid || u.username,
              username: u.username,
              password: u.password || '',
              role: u.role || 'REGULAR',
              createdAt: u.createdAt || Date.now()
            }));
            localStorage.setItem('tcm_patients_users_cache', JSON.stringify(mapped));
            return mapped;
          }
          return [DEFAULT_ADMIN];
        } catch (e: any) {
          console.warn('Local SQLite fetch users error, checking cache:', e?.message || e);
          const cached = localStorage.getItem('tcm_patients_users_cache');
          if (cached) {
            try {
              return JSON.parse(cached);
            } catch (pErr) {}
          }
          return [DEFAULT_ADMIN];
        }
      };

      if (!isSupabaseConfigured()) {
        return await getLocal();
      }

      try {
        const supabase = getSupabase();
        const { data, error } = await supabase.from('users').select('*');
        if (error) throw error;
        // If Supabase has users, don't return the hardcoded DEFAULT_ADMIN
        if (data && data.length > 0) return data;
        // Only return DEFAULT_ADMIN if the database is empty
        return [DEFAULT_ADMIN];
      } catch (e: any) {
        console.warn('Supabase Error (users.getAll), falling back to local SQLite:', e?.message || e);
        if (e && (e.message?.includes('fetch') || e.toString().includes('fetch') || e.name === 'TypeError')) {
          disableSupabase();
        }
        return await getLocal();
      }
    },
    add: async (user: UserAccount): Promise<boolean> => {
      const addLocal = async (): Promise<boolean> => {
        try {
          // Update cache
          const cached = localStorage.getItem('tcm_patients_users_cache');
          let list: UserAccount[] = [];
          if (cached) {
            try {
              list = JSON.parse(cached);
            } catch (err) {}
          }
          if (!list.some(u => u.username === user.username)) {
            list.push(user);
            localStorage.setItem('tcm_patients_users_cache', JSON.stringify(list));
          }
        } catch (pErr) {}

        try {
          const res = await fetchWithRetry('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: user.username,
              password: user.password,
              role: user.role,
              createdAt: user.createdAt || Date.now()
            })
          });
          return res.ok;
        } catch (e: any) {
          console.warn('Local SQLite add user error:', e?.message || e);
          return true; // Return true as cache is updated
        }
      };

      if (!isSupabaseConfigured()) {
        return await addLocal();
      }

      try {
        const supabase = getSupabase();
        const userData = { ...user, uid: user.uid || Date.now().toString() };
        const { error } = await supabase.from('users').upsert(userData);
        if (error) throw error;
        return true;
      } catch (e: any) {
        console.warn('Supabase Error (users.add), falling back to local SQLite:', e?.message || e);
        if (e && (e.message?.includes('fetch') || e.toString().includes('fetch') || e.name === 'TypeError')) {
          disableSupabase();
        }
        return await addLocal();
      }
    },
    register: async (user: Omit<UserAccount, 'uid' | 'createdAt' | 'role'>): Promise<boolean> => {
      const registerLocal = async (): Promise<boolean> => {
        try {
          // Check if already exists in local SQLite
          const checkRes = await fetchWithRetry('/api/users');
          if (checkRes.ok) {
            const users = await checkRes.json();
            if (users.some((u: any) => u.username === user.username)) {
              return false;
            }
          }
          const res = await fetchWithRetry('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: user.username,
              password: user.password,
              role: 'REGULAR',
              createdAt: Date.now()
            })
          });
          return res.ok;
        } catch (e: any) {
          console.warn('Local SQLite register user error:', e?.message || e);
          return false;
        }
      };

      if (!isSupabaseConfigured()) {
        return await registerLocal();
      }

      try {
        const supabase = getSupabase();
        // Check if user exists
        const { data: existing, error: checkError } = await supabase.from('users').select('username').eq('username', user.username).maybeSingle();
        if (checkError) throw checkError;
        if (existing) return false;

        const { error } = await supabase.from('users').insert({
          uid: Date.now().toString(),
          username: user.username,
          password: user.password,
          role: 'REGULAR',
          createdAt: Date.now()
        });
        if (error) throw error;
        return true;
      } catch (e: any) {
        console.warn('Supabase Error (users.register), falling back to local SQLite:', e?.message || e);
        if (e && (e.message?.includes('fetch') || e.toString().includes('fetch') || e.name === 'TypeError')) {
          disableSupabase();
        }
        return await registerLocal();
      }
    },
    delete: async (uid: string): Promise<boolean> => {
      const deleteLocal = async (): Promise<boolean> => {
        try {
          const res = await fetchWithRetry(`/api/users/${encodeURIComponent(uid)}`, {
            method: 'DELETE'
          });
          return res.ok;
        } catch (e: any) {
          console.warn('Local SQLite delete user error:', e?.message || e);
          return false;
        }
      };

      if (!isSupabaseConfigured()) {
        return await deleteLocal();
      }

      try {
        const supabase = getSupabase();
        // Supabase user might have matching uid or username
        const { error } = await supabase.from('users').delete().or(`uid.eq.${uid},username.eq.${uid}`);
        if (error) throw error;
        return true;
      } catch (e: any) {
        console.warn('Supabase Error (users.delete), falling back to local SQLite:', e?.message || e);
        if (e && (e.message?.includes('fetch') || e.toString().includes('fetch') || e.name === 'TypeError')) {
          disableSupabase();
        }
        return await deleteLocal();
      }
    }
  },
  patients: {
    getAll: async (): Promise<SavedPatient[]> => {
      const getLocal = async (): Promise<SavedPatient[]> => {
        try {
          const res = await fetchWithRetry('/api/patients');
          if (!res.ok) throw new Error('Failed to fetch local patients');
          const data = await res.json();
          localStorage.setItem('tcm_patients_list_cache', JSON.stringify(data || []));
          return data || [];
        } catch (e: any) {
          console.warn('Local SQLite fetch patients error, looking up cache:', e?.message || e);
          const cached = localStorage.getItem('tcm_patients_list_cache');
          if (cached) {
            try {
              return JSON.parse(cached);
            } catch (pErr) {}
          }
          return [];
        }
      };

      if (!isSupabaseConfigured()) {
        return await getLocal();
      }

      try {
        const supabase = getSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          return await getLocal();
        }
        const { data, error } = await supabase.from('patients').select('*').eq('authorUid', user.id);
        if (error) throw error;
        localStorage.setItem('tcm_patients_list_cache', JSON.stringify(data || []));
        return data || [];
      } catch (e: any) {
        console.warn('Supabase Error (patients.getAll), falling back to local SQLite:', e?.message || e);
        if (e && (e.message?.includes('fetch') || e.toString().includes('fetch') || e.name === 'TypeError')) {
          disableSupabase();
        }
        return await getLocal();
      }
    },
    add: async (patient: SavedPatient) => {
      const addLocal = async () => {
        try {
          // Update cache first
          const cached = localStorage.getItem('tcm_patients_list_cache');
          let list: SavedPatient[] = [];
          if (cached) {
            try {
              list = JSON.parse(cached);
            } catch (err) {}
          }
          const idx = list.findIndex(p => p.id === patient.id);
          if (idx >= 0) {
            list[idx] = patient;
          } else {
            list.push(patient);
          }
          localStorage.setItem('tcm_patients_list_cache', JSON.stringify(list));
        } catch (pErr) {}

        try {
          const res = await fetchWithRetry('/api/patients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patient)
          });
          if (!res.ok) throw new Error('Failed to save to local patients API');
        } catch (e: any) {
          console.warn('Local SQLite save patient error:', e?.message || e);
        }
      };

      // Ensure local copy is ALWAYS saved first
      await addLocal();

      if (!isSupabaseConfigured()) return;

      try {
        const supabase = getSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const patientWithAuth = { ...patient, authorUid: user.id };
        const { error } = await supabase.from('patients').upsert(patientWithAuth);
        if (error) throw error;
      } catch (e: any) {
        console.warn('Supabase Error (patients.add) skipped:', e?.message || e);
        if (e && (e.message?.includes('fetch') || e.toString().includes('fetch') || e.name === 'TypeError')) {
          disableSupabase();
        }
      }
    },
    delete: async (id: string) => {
      const deleteLocal = async () => {
        try {
          // Update cache first
          const cached = localStorage.getItem('tcm_patients_list_cache');
          if (cached) {
            try {
              let list: SavedPatient[] = JSON.parse(cached);
              list = list.filter(p => p.id !== id);
              localStorage.setItem('tcm_patients_list_cache', JSON.stringify(list));
            } catch (err) {}
          }
        } catch (pErr) {}

        try {
          const res = await fetchWithRetry(`/api/patients/${encodeURIComponent(id)}`, {
            method: 'DELETE'
          });
          if (!res.ok) throw new Error('Failed to delete local patient');
        } catch (e: any) {
          console.warn('Local SQLite delete patient error:', e?.message || e);
        }
      };

      await deleteLocal();

      if (!isSupabaseConfigured()) return;

      try {
        const supabase = getSupabase();
        const { error } = await supabase.from('patients').delete().eq('id', id);
        if (error) throw error;
      } catch (e: any) {
        console.warn('Supabase Error (patients.delete) skipped:', e?.message || e);
        if (e && (e.message?.includes('fetch') || e.toString().includes('fetch') || e.name === 'TypeError')) {
          disableSupabase();
        }
      }
    }
  },
  wellnessLogs: {
    getAll: async (): Promise<WellnessLog[]> => {
      try {
        const res = await fetchWithRetry('/api/wellness-logs');
        if (!res.ok) throw new Error('Failed to fetch wellness logs');
        const data = await res.json();
        localStorage.setItem('tcm_wellness_logs_cache', JSON.stringify(data || []));
        return data || [];
      } catch (e: any) {
        console.warn('Local SQLite fetch wellness logs error, checking cache:', e?.message || e);
        const cached = localStorage.getItem('tcm_wellness_logs_cache');
        if (cached) {
          try {
            return JSON.parse(cached);
          } catch (pErr) {}
        }
        return [];
      }
    },
    add: async (log: WellnessLog): Promise<boolean> => {
      try {
        const cached = localStorage.getItem('tcm_wellness_logs_cache');
        let list: WellnessLog[] = [];
        if (cached) {
          try {
            list = JSON.parse(cached);
          } catch (err) {}
        }
        const idx = list.findIndex(l => l.date === log.date);
        if (idx >= 0) {
          list[idx] = log;
        } else {
          list.push(log);
        }
        localStorage.setItem('tcm_wellness_logs_cache', JSON.stringify(list));
      } catch (pErr) {}

      try {
        const res = await fetchWithRetry('/api/wellness-logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(log)
        });
        return res.ok;
      } catch (e: any) {
        console.warn('Local SQLite save wellness log error:', e?.message || e);
        return true;
      }
    },
    delete: async (id: string): Promise<boolean> => {
      try {
        const cached = localStorage.getItem('tcm_wellness_logs_cache');
        if (cached) {
          try {
            let list: WellnessLog[] = JSON.parse(cached);
            list = list.filter(l => l.id !== id);
            localStorage.setItem('tcm_wellness_logs_cache', JSON.stringify(list));
          } catch (err) {}
        }
      } catch (pErr) {}

      try {
        const res = await fetchWithRetry(`/api/wellness-logs/${encodeURIComponent(id)}`, {
          method: 'DELETE'
        });
        return res.ok;
      } catch (e: any) {
        console.warn('Local SQLite delete wellness log error:', e?.message || e);
        return true;
      }
    }
  }
};

