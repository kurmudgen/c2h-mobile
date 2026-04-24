import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fcufnmnxhmunmgfcczja.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjdWZubW54aG11bm1nZmNjemphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MzM1OTUsImV4cCI6MjA5MDIwOTU5NX0.RxK2bXaeuNJRPo1owqIBRhkhpXejrNoMSrQyn1vj8ZI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
