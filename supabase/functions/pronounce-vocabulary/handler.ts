import { z } from 'zod';
import { authenticate, endpoint, env, HttpError, json, providerFetch, readJSON, reserve } from '../_shared/http.ts';

const inputSchema = z.object({
  audio: z.string().min(20).max(5_600_000).regex(/^[A-Za-z0-9+/]*={0,2}$/),
  mimeType: z.enum(['audio/mp4', 'audio/m4a', 'audio/webm', 'audio/wav']),
}).strict();

/** Returns only the Korean speech recognizer transcript. This is not pronunciation scoring. */
export const handler = endpoint(async (req) => {
  const { user, admin } = await authenticate(req);
  const input = inputSchema.parse(await readJSON(req, 5_650_000));
  let bytes: Uint8Array;
  try { bytes = Uint8Array.from(atob(input.audio), (c) => c.charCodeAt(0)); }
  catch { throw new HttpError(400, 'The recording could not be read. Please record again.'); }
  if (bytes.length > 4_000_000) throw new HttpError(413, 'Keep recordings under 45 seconds.');
  await reserve(admin, user.id, 'transcribe');
  const form = new FormData();
  form.set('file', new Blob([bytes as Uint8Array<ArrayBuffer>], { type: input.mimeType }), `vocabulary.${input.mimeType === 'audio/webm' ? 'webm' : input.mimeType === 'audio/wav' ? 'wav' : 'm4a'}`);
  form.set('model_id', Deno.env.get('ELEVENLABS_STT_MODEL') || 'scribe_v2');
  form.set('language_code', 'ko');
  form.set('tag_audio_events', 'false');
  form.set('diarize', 'false');
  const response = await providerFetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST', headers: { 'xi-api-key': env('ELEVENLABS_API_KEY') }, body: form,
  });
  const output = await response.json();
  if (typeof output.text !== 'string' || !output.text.trim()) throw new HttpError(422, 'No clear Korean speech was detected. Try again closer to the microphone.');
  if (output.text.trim().length > 1000) throw new HttpError(422, 'Keep the spoken practice short and try again.');
  return json({ transcript: output.text.trim() });
});
