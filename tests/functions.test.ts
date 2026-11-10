import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handler as conversation } from '../supabase/functions/conversation/handler';
import { handler as transcribe } from '../supabase/functions/transcribe/handler';
import { handler as speak } from '../supabase/functions/speak/handler';

const userId = 'b1000000-0000-4000-8000-000000000001';
const conversationId = 'b1000000-0000-4000-8000-000000000002';
const requestId = 'b1000000-0000-4000-8000-000000000003';
const messageId = 'b1000000-0000-4000-8000-000000000004';
const result = {
  message: {
    id: messageId,
    conversation_id: conversationId,
    role: 'assistant',
    content: '커피를 좋아해요?',
    translation: 'Do you like coffee?',
    created_at: '2026-11-02T00:00:00Z',
  },
  learnerMessage: null,
  corrections: [],
  encouragement: '',
};
type Mode =
  | 'normal'
  | 'foreign'
  | 'busy'
  | 'cached'
  | 'malformed'
  | 'speech-cache'
  | 'silence'
  | 'auth-denied'
  | 'limited';
let mode: Mode;
let urls: string[];
let bodies: { url: string; body: unknown }[];
function response(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
function request(body: object, authenticated = true) {
  return new Request('http://localhost/function', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authenticated ? { authorization: 'Bearer unit-test-token' } : {}),
    },
    body: JSON.stringify(body),
  });
}
const input = { conversationId, requestId, lessonId: null, text: '커피을 좋아해요.' };

beforeEach(() => {
  mode = 'normal';
  urls = [];
  bodies = [];
  // These REST-only function tests never open realtime sockets. Supabase JS still
  // constructs its realtime client, so provide a harmless Node 20 test global.
  vi.stubGlobal('WebSocket', class TestWebSocket {});
  vi.stubGlobal('Deno', {
    env: {
      get: (name: string) =>
        (
          ({
            SUPABASE_URL: 'http://127.0.0.1:54321',
            SUPABASE_ANON_KEY: 'local-anon-key',
            SUPABASE_SERVICE_ROLE_KEY: 'local-service-key',
            GEMINI_API_KEY: 'not-a-real-key',
            GEMINI_MODEL: 'test-model',
            ELEVENLABS_API_KEY: 'not-a-real-key',
            ELEVENLABS_VOICE_ID: 'test-voice',
          }) as Record<string, string>
        )[name],
    },
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (source: RequestInfo | URL, init?: RequestInit) => {
      const req = new Request(source, init);
      const url = req.url;
      urls.push(url);
      if (typeof init?.body === 'string') {
        try {
          bodies.push({ url, body: JSON.parse(init.body) });
        } catch {
          /* not JSON */
        }
      }
      const one = (value: unknown) =>
        response(
          req.headers.get('accept')?.includes('vnd.pgrst.object') ? value : value ? [value] : [],
        );
      if (url.includes('/auth/v1/user'))
        return mode === 'auth-denied'
          ? response({ message: 'Expired', code: 'bad_jwt' }, 401)
          : response({
              id: userId,
              aud: 'authenticated',
              role: 'authenticated',
              email: 'test@example.invalid',
            });
      if (url.includes('/rest/v1/profiles'))
        return one({ level: 'Beginner', goal: 'Daily Conversation' });
      if (url.includes('/rest/v1/conversations'))
        return mode === 'foreign'
          ? one(null)
          : one({ id: conversationId, level: 'Beginner', lesson_id: null, status: 'active' });
      if (url.includes('/rest/v1/rpc/claim_turn'))
        return response(
          mode === 'cached'
            ? { state: 'completed', result }
            : { state: mode === 'busy' ? 'busy' : 'claimed' },
        );
      if (url.includes('/rest/v1/rpc/get_vocabulary_context'))
        return response([{ word: '안녕하세요', level: 'beginner', due: false }]);
      if (url.includes('/rest/v1/rpc/reserve_usage')) return response(mode !== 'limited');
      if (url.includes('/rest/v1/rpc/commit_turn')) return response(result);
      if (url.includes('/rest/v1/messages'))
        return req.headers.get('accept')?.includes('vnd.pgrst.object')
          ? response(
              mode === 'foreign'
                ? null
                : {
                    id: messageId,
                    conversation_id: conversationId,
                    content: '안녕하세요.',
                    audio_path: mode === 'speech-cache' ? `${userId}/session/audio.mp3` : null,
                  },
            )
          : response([]);
      if (url.includes('/rest/v1/corrections')) return response([]);
      if (url.includes('/rest/v1/turn_requests')) return response(null);
      if (url.includes('generativelanguage.googleapis.com'))
        return response({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text:
                      mode === 'malformed'
                        ? 'not json'
                        : JSON.stringify({
                            korean: '커피를 좋아해요?',
                            english: 'Do you like coffee?',
                            encouragement: '',
                            corrections: [
                              {
                                original: '커피을',
                                corrected: '커피를',
                                explanation: 'Use 를 after a vowel.',
                                category: 'grammar',
                              },
                              {
                                original: 'not in the learner message',
                                corrected: '안녕하세요',
                                explanation: 'Unsupported correction.',
                                category: 'grammar',
                              },
                            ],
                          }),
                  },
                ],
              },
            },
          ],
        });
      if (url.includes('/v1/speech-to-text'))
        return response({ text: mode === 'silence' ? '' : '안녕하세요.' });
      if (url.includes('/storage/v1/object/sign/'))
        return response({ signedURL: '/object/sign/tutor-audio/test?token=temporary' });
      throw new Error(`Unexpected test network request: ${url}`);
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('authorization and bounded AI execution', () => {
  it('rejects missing authentication before accessing providers', async () => {
    expect((await conversation(request(input, false))).status).toBe(401);
    expect(urls).toEqual([]);
  });
  it('verifies the token with Auth, not a decoded JWT', async () => {
    mode = 'auth-denied';
    expect((await conversation(request(input))).status).toBe(401);
    expect(urls.every((u) => u.includes('/auth/v1/user'))).toBe(true);
  });
  it('rejects caller-controlled user IDs and oversized input', async () => {
    expect((await conversation(request({ ...input, userId }))).status).toBe(400);
    expect((await conversation(request({ ...input, text: 'x'.repeat(1001) }))).status).toBe(400);
    expect(urls.some((u) => u.includes('googleapis.com'))).toBe(false);
  });
  it('does not let a caller use another user’s conversation', async () => {
    mode = 'foreign';
    expect((await conversation(request(input))).status).toBe(404);
    expect(urls.some((u) => u.includes('googleapis.com'))).toBe(false);
  });
  it('does not call the model for a busy or already committed turn', async () => {
    mode = 'busy';
    expect((await conversation(request(input))).status).toBe(409);
    mode = 'cached';
    expect(await (await conversation(request(input))).json()).toEqual(result);
    expect(urls.some((u) => u.includes('googleapis.com'))).toBe(false);
  });
  it('enforces usage before spending a provider request', async () => {
    mode = 'limited';
    expect((await conversation(request(input))).status).toBe(429);
    expect(urls.some((u) => u.includes('googleapis.com'))).toBe(false);
  });
  it('validates structured output and discards corrections unsupported by the learner text', async () => {
    expect((await conversation(request(input))).status).toBe(200);
    const commit = bodies.find((b) => b.url.includes('/rpc/commit_turn'))!.body as {
      p_reply: { corrections: { original: string }[] };
    };
    expect(commit.p_reply.corrections).toHaveLength(1);
    expect(commit.p_reply.corrections[0].original).toBe('커피을');
    const modelRequest = bodies.find((b) => b.url.includes('googleapis.com'))!.body as {
      systemInstruction: { parts: { text: string }[] };
    };
    expect(modelRequest.systemInstruction.parts[0].text).toContain('Beginner');
    expect(modelRequest.systemInstruction.parts[0].text).toContain(
      'Never claim to assess pronunciation',
    );
    expect(modelRequest.systemInstruction.parts[0].text).toContain('안녕하세요');
    expect(urls.some((u) => u.includes('/rpc/get_vocabulary_context'))).toBe(true);
  });
  it('does not save a malformed model response and releases the turn for retry', async () => {
    mode = 'malformed';
    expect((await conversation(request(input))).status).toBe(502);
    expect(urls.some((u) => u.includes('/commit_turn'))).toBe(false);
    expect(urls.some((u) => u.includes('/turn_requests'))).toBe(true);
  });
});
describe('speech requests', () => {
  it('rejects an unsupported format before sending audio to a provider', async () => {
    expect(
      (
        await transcribe(
          request({ conversationId, audio: 'YWJj'.repeat(10), mimeType: 'video/mp4' }),
        )
      ).status,
    ).toBe(400);
    expect(urls.some((u) => u.includes('elevenlabs.io'))).toBe(false);
  });
  it('requires an owned active conversation for transcription', async () => {
    mode = 'foreign';
    expect(
      (
        await transcribe(
          request({ conversationId, audio: 'YWJj'.repeat(10), mimeType: 'audio/mp4' }),
        )
      ).status,
    ).toBe(404);
  });
  it('returns a usable error for silent recordings', async () => {
    mode = 'silence';
    expect(
      (
        await transcribe(
          request({ conversationId, audio: 'YWJj'.repeat(10), mimeType: 'audio/mp4' }),
        )
      ).status,
    ).toBe(422);
  });
  it('does not accept arbitrary text for billable speech generation', async () => {
    expect((await speak(request({ messageId, text: 'Generate arbitrary audio' }))).status).toBe(
      400,
    );
  });
  it('replays cached owned tutor audio without another speech-provider charge', async () => {
    mode = 'speech-cache';
    expect((await speak(request({ messageId }))).status).toBe(200);
    expect(urls.some((u) => u.includes('elevenlabs.io'))).toBe(false);
    expect(urls.some((u) => u.includes('/reserve_usage'))).toBe(false);
  });
});
