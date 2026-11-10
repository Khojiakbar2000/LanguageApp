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
import { speechInputSchema } from '../_shared/contracts.ts';

export const handler = endpoint(async (req) => {
  const { user, admin } = await authenticate(req);
  const { messageId } = speechInputSchema.parse(await readJSON(req));
  const { data: message } = await admin
    .from('messages')
    .select('id,content,audio_path,conversation_id')
    .eq('id', messageId)
    .eq('user_id', user.id)
    .eq('role', 'assistant')
    .single();
  if (!message) throw new HttpError(404, 'This tutor message is unavailable.');
  const bucket = admin.storage.from('tutor-audio');
  if (message.audio_path) {
    const { data, error } = await bucket.createSignedUrl(message.audio_path, 300);
    if (!error && data) return json({ url: data.signedUrl });
  }
  const key = env('ELEVENLABS_API_KEY');
  const voice = env('ELEVENLABS_VOICE_ID');
  if (!/^[a-zA-Z0-9_-]+$/.test(voice))
    throw new HttpError(503, 'The configured voice identifier is invalid.');
  await reserve(admin, user.id, 'speech');
  const response = await providerFetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_22050_32`,
    {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: message.content,
        model_id: Deno.env.get('ELEVENLABS_TTS_MODEL') || 'eleven_flash_v2_5',
        language_code: 'ko',
      }),
    },
  );
  const audio = await response.arrayBuffer();
  if (audio.byteLength > 5_000_000) throw new HttpError(502, 'The generated audio was too large.');
  const path = `${user.id}/${message.conversation_id}/${message.id}.mp3`;
  const upload = await bucket.upload(path, audio, { contentType: 'audio/mpeg', upsert: true });
  if (upload.error)
    throw new HttpError(503, 'Could not save tutor audio. Check the private storage bucket.');
  const update = await admin
    .from('messages')
    .update({ audio_path: path })
    .eq('id', message.id)
    .eq('user_id', user.id);
  if (update.error) throw new HttpError(503, 'Could not save the audio reference. Please retry.');
  const { data, error } = await bucket.createSignedUrl(path, 300);
  if (error || !data) throw new HttpError(503, 'Could not open tutor audio. Please retry.');
  return json({ url: data.signedUrl });
});
