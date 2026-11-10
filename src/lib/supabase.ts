import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { Database } from './database.types';
import { createAuthStorage } from './authStorage';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
function validProjectUrl(value: string | undefined) {
  if (!value || value.includes('your-project')) return false;
  try {
    const parsed = new URL(value);
    return ['https:', 'http:'].includes(parsed.protocol) && !!parsed.hostname;
  } catch {
    return false;
  }
}
export const configured = validProjectUrl(url) && !!key && !key.startsWith('your-');

// Native refresh tokens are split into small Keychain/Keystore items, never persisted in Zustand.
export const authStorage = createAuthStorage(SecureStore, Platform.OS === 'web');

export const supabase = configured
  ? createClient<Database>(url!, key!, {
      auth: {
        storage: authStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    })
  : null;
export function db() {
  if (!supabase)
    throw new Error(
      'Connect Supabase in .env to sign in and practice. Open Setup for instructions.',
    );
  return supabase;
}

export async function invoke<T>(name: string, body: object): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 70_000);
  let response;
  try {
    response = await db().functions.invoke(name, { body, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
  const { data, error } = response;
  if (error) {
    let detail = 'Could not reach the server. Check your connection and deployed Edge Functions.';
    if ('context' in error && error.context instanceof Response) {
      try {
        const payload = await error.context.clone().json();
        if (typeof payload.error === 'string') detail = payload.error;
      } catch {
        /* keep safe fallback */
      }
    } else if (error.message) detail = error.message;
    throw new Error(detail);
  }
  return data as T;
}
