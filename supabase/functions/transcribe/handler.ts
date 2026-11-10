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
import { transcriptionSchema } from '../_shared/contracts.ts';

export const handler = endpoint(async (req) => {
  const { user, admin } = await authenticate(req);
  const input = transcriptionSchema.parse(await readJSON(req, 5_650_000));
  const key = env('ELEVENLABS_API_KEY');
  const { data: session } = await admin
    .from('conversations')
    .select('id')
    .eq('id', input.conversationId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();
  if (!session) throw new HttpError(404, 'An active conversation is required.');
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(atob(input.audio), (c) => c.charCodeAt(0));
  } catch {
    throw new HttpError(400, 'The recording could not be read. Please record again.');
  }
  if (bytes.length > 4_000_000) throw new HttpError(413, 'Keep recordings under 45 seconds.');
  await reserve(admin, user.id, 'transcribe');
  const form = new FormData();
  form.set(
    'file',
    new Blob([bytes as Uint8Array<ArrayBuffer>], { type: input.mimeType }),
    `practice.${input.mimeType === 'audio/webm' ? 'webm' : input.mimeType === 'audio/wav' ? 'wav' : 'm4a'}`,
  );
  form.set('model_id', Deno.env.get('ELEVENLABS_STT_MODEL') || 'scribe_v2');
  form.set('language_code', 'ko');
  form.set('tag_audio_events', 'false');
  form.set('diarize', 'false');
  const response = await providerFetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: { 'xi-api-key': key },
    body: form,
  });
  const output = await response.json();
  if (typeof output.text !== 'string' || !output.text.trim())
    throw new HttpError(
      422,
      'No clear speech was detected. Try a shorter phrase closer to the microphone.',
    );
  if (output.text.trim().length > 1000)
    throw new HttpError(422, 'That reply is too long. Try a shorter recording.');
  return json({ text: output.text.trim() });
});
