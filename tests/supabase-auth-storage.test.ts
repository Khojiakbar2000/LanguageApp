import { beforeEach, describe, expect, it } from 'vitest';
import { createAuthStorage } from '../src/lib/authStorage';

const secure = new Map<string, string>();
const secureStore = {
  getItemAsync: async (key: string) => secure.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => {
    secure.set(key, value);
  },
  deleteItemAsync: async (key: string) => {
    secure.delete(key);
  },
};

describe('Supabase native session storage', () => {
  beforeEach(() => secure.clear());
  const authStorage = createAuthStorage(secureStore, false);

  it('persists and restores session tokens split into secure-store-sized chunks', async () => {
    const session = 'token'.repeat(900);
    await authStorage.setItem('supabase.auth.token', session);
    expect(secure.get('supabase.auth.token.count')).toBe('3');
    expect(await authStorage.getItem('supabase.auth.token')).toBe(session);
  });

  it('removes every chunk when a session is cleared', async () => {
    await authStorage.setItem('supabase.auth.token', 'a'.repeat(2000));
    await authStorage.removeItem('supabase.auth.token');
    expect(await authStorage.getItem('supabase.auth.token')).toBeNull();
    expect(secure.size).toBe(0);
  });
});
