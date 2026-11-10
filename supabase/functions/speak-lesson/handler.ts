import { z } from 'zod';
import {
  authenticate,
  endpoint,
  env,
  HttpError,
  json,
  providerFetch,
  readJSON,
  reserve,
} from '../_shared/http.ts';

const inputSchema = z.object({ text: z.string().trim().min(1).max(160) });
export const handler = endpoint(async (req) => {
  const { user, admin } = await authenticate(req);
  const { text } = inputSchema.parse(await readJSON(req));
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  const hash = [...new Uint8Array(digest)]
    .map((part) => part.toString(16).padStart(2, '0'))
    .join('');
  const path = `${user.id}/lesson-${hash}.mp3`;
  const bucket = admin.storage.from('tutor-audio');
  const existing = await bucket.createSignedUrl(path, 300);
  if (!existing.error && existing.data) return json({ url: existing.data.signedUrl });

  await reserve(admin, user.id, 'speech');
  const voice = env('ELEVENLABS_VOICE_ID');
  if (!/^[a-zA-Z0-9_-]+$/.test(voice))
    throw new HttpError(503, 'The configured voice identifier is invalid.');
  const response = await providerFetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_22050_32`,
    {
      method: 'POST',
      headers: { 'xi-api-key': env('ELEVENLABS_API_KEY'), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        model_id: Deno.env.get('ELEVENLABS_TTS_MODEL') || 'eleven_flash_v2_5',
        language_code: 'ko',
      }),
    },
  );
  const audio = await response.arrayBuffer();
  if (audio.byteLength > 5_000_000) throw new HttpError(502, 'The generated audio was too large.');
  const upload = await bucket.upload(path, audio, { contentType: 'audio/mpeg', upsert: true });
  if (upload.error)
    throw new HttpError(503, 'Could not save lesson audio. Check the private tutor-audio bucket.');
  const signed = await bucket.createSignedUrl(path, 300);
  if (signed.error || !signed.data)
    throw new HttpError(503, 'Could not open lesson audio. Please retry.');
  return json({ url: signed.data.signedUrl });
});
