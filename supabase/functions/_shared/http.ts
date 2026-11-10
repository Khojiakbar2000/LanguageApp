import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
export function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
export function env(name: string) {
  const value = Deno.env.get(name);
  if (!value)
    throw new HttpError(503, `The server needs ${name}. Please contact the app administrator.`);
  return value;
}
export async function readJSON(req: Request, maxBytes = 16_384): Promise<unknown> {
  if (!req.headers.get('content-type')?.includes('application/json'))
    throw new HttpError(415, 'Send a JSON request.');
  const reader = req.body?.getReader();
  if (!reader) throw new HttpError(400, 'A request body is required.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new HttpError(413, 'This request is too large. Please send a shorter recording.');
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, 'The request body is not valid JSON.');
  } finally {
    reader.releaseLock();
  }
}
export async function authenticate(req: Request) {
  const token = req.headers.get('authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) throw new HttpError(401, 'Please sign in to practice.');
  const client = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, 'Your session expired. Please sign in again.');
  const admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return { user: data.user, admin };
}
export type Admin = Awaited<ReturnType<typeof authenticate>>['admin'];
export async function reserve(
  admin: Admin,
  userId: string,
  kind: 'chat' | 'transcribe' | 'speech' | 'start',
) {
  const { data, error } = await admin.rpc('reserve_usage', {
    p_user_id: userId,
    p_kind: kind,
    p_amount: 1,
  });
  if (error) throw new HttpError(503, 'Usage tracking is unavailable. Please try again later.');
  if (!data)
    throw new HttpError(
      429,
      'You have reached today’s practice allowance. It resets at midnight UTC.',
    );
}
export async function providerFetch(url: string, init: RequestInit) {
  try {
    const response = await fetch(url, { ...init, signal: AbortSignal.timeout(35_000) });
    if (!response.ok)
      throw new HttpError(
        502,
        'The AI or speech service is temporarily unavailable. Please retry.',
      );
    return response;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(
      504,
      'The service took too long to respond. Your saved conversation is safe; please retry.',
    );
  }
}
export function endpoint(handler: (req: Request) => Promise<Response>) {
  return async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
    try {
      return await handler(req);
    } catch (error) {
      if (error instanceof z.ZodError)
        return json({ error: 'Invalid request. Check the supplied fields and try again.' }, 400);
      if (error instanceof HttpError) return json({ error: error.message }, error.status);
      console.error('Function failed', { type: error instanceof Error ? error.name : 'Unknown' });
      return json({ error: 'The request could not be completed. Please try again.' }, 500);
    }
  };
}
