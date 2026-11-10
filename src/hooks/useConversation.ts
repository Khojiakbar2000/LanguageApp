import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import {
  useAudioPlayer,
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';
import { z } from 'zod';
import { db, invoke } from '../lib/supabase';
import { errorMessage } from '../lib/learning';
import { useApp } from '../state/store';
import type { Correction, Message, TurnResult } from '../lib/types';

const messageSchema = z.object({
  id: z.uuid(),
  conversation_id: z.uuid(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  translation: z.string().nullable(),
  created_at: z.string(),
});
const turnSchema = z.object({
  message: messageSchema,
  learnerMessage: messageSchema.nullable(),
  encouragement: z.string(),
  corrections: z.array(
    z.object({
      id: z.uuid(),
      conversation_id: z.uuid(),
      message_id: z.uuid(),
      original: z.string(),
      corrected: z.string(),
      explanation: z.string(),
      category: z.string(),
      created_at: z.string(),
    }),
  ),
});
export type Phase = 'loading' | 'idle' | 'recording' | 'transcribing' | 'thinking' | 'speaking';

export function useConversation(id: string, lessonId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [phase, setPhase] = useState<Phase>('loading');
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [encouragement, setEncouragement] = useState('');
  const [completed, setCompleted] = useState(false);
  const [streakAward, setStreakAward] = useState<{
    recorded?: boolean;
    first_activity_today?: boolean;
    current_streak?: number;
    xp_awarded?: number;
    milestones?: number[];
  } | null>(null);
  const [finishing, setFinishing] = useState(false);
  const player = useAudioPlayer(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recording = useAudioRecorderState(recorder, 200);
  const alive = useRef(true);
  const locked = useRef(false);
  const pending = useRef<{ text?: string; requestId: string } | null>(null);
  const lastRecording = useRef<string | null>(null);
  const audioGeneration = useRef(0);
  const loadAgain = useRef<(() => Promise<void>) | null>(null);
  const [retryKind, setRetryKind] = useState<'load' | 'turn' | 'transcribe' | 'finish' | null>(
    null,
  );
  const recordingFiles = useRef(new Set<string>());
  const foreground = useRef(AppState.currentState !== 'background');

  const stopSpeech = useCallback(() => {
    audioGeneration.current++;
    player.pause();
    setPhase((p) => (p === 'speaking' ? 'idle' : p));
  }, [player]);
  const speak = useCallback(
    async (message: Message) => {
      if (!alive.current || !foreground.current) return;
      const generation = ++audioGeneration.current;
      player.pause();
      setSpeechError(null);
      setPhase('speaking');
      try {
        const result = z
          .object({ url: z.url() })
          .parse(await invoke('speak', { messageId: message.id }));
        if (!alive.current || generation !== audioGeneration.current) return;
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
        player.replace(result.url);
        player.play();
      } catch (e) {
        if (alive.current && generation === audioGeneration.current) {
          setSpeechError(errorMessage(e));
          setPhase('idle');
        }
      }
    },
    [player],
  );

  const send = useCallback(
    async (text?: string) => {
      if (locked.current || completed) return;
      locked.current = true;
      stopSpeech();
      setPhase('thinking');
      setError(null);
      lastRecording.current = null;
      setRetryKind('turn');
      const normalized = text?.trim();
      if (!pending.current || pending.current.text !== normalized)
        pending.current = { text: normalized, requestId: Crypto.randomUUID() };
      try {
        const result = turnSchema.parse(
          await invoke<TurnResult>('conversation', {
            conversationId: id,
            lessonId,
            requestId: pending.current.requestId,
            ...(normalized ? { text: normalized } : {}),
          }),
        );
        if (!alive.current) return;
        setMessages((previous) => {
          const ids = new Set(previous.map((m) => m.id));
          return [
            ...previous,
            ...[result.learnerMessage, result.message].filter(
              (m): m is Message => !!m && !ids.has(m.id),
            ),
          ];
        });
        setCorrections((previous) => [
          ...previous,
          ...result.corrections.filter((c) => !previous.some((p) => p.id === c.id)),
        ]);
        setEncouragement(result.encouragement);
        pending.current = null;
        setRetryKind(null);
        setDraft('');
        setPhase('idle');
        void useApp.getState().refresh();
        void speak(result.message);
      } catch (e) {
        if (alive.current) {
          setError(errorMessage(e));
          setPhase('idle');
        }
      } finally {
        locked.current = false;
      }
    },
    [id, lessonId, completed, stopSpeech, speak],
  );

  useEffect(() => {
    alive.current = true;
    let disposed = false;
    async function load() {
      try {
        if (!z.uuid().safeParse(id).success)
          throw new Error('Invalid conversation link. Please choose a lesson again.');
        const result = await db()
          .from('conversations')
          .select('status,lesson_id')
          .eq('id', id)
          .maybeSingle();
        if (result.error) throw new Error(result.error.message);
        if (disposed) return;
        if (!result.data) {
          await send();
          return;
        }
        const [history, feedback] = await Promise.all([
          db().from('messages').select('*').eq('conversation_id', id).order('sequence'),
          db().from('corrections').select('*').eq('conversation_id', id).order('created_at'),
        ]);
        if (history.error || feedback.error)
          throw new Error('Could not load your saved conversation.');
        if (disposed) return;
        setMessages(history.data as Message[]);
        setCorrections(feedback.data as Correction[]);
        setCompleted(result.data.status === 'completed');
        setPhase('idle');
        if (!history.data.length && result.data.status === 'active') await send();
      } catch (e) {
        if (!disposed) {
          setRetryKind('load');
          setError(errorMessage(e));
          setPhase('idle');
        }
      }
    }
    loadAgain.current = load;
    const files = recordingFiles.current;
    void load();
    return () => {
      disposed = true;
      alive.current = false;
      stopSpeech();
      loadAgain.current = null;
      const cleanup = async () => {
        if (recorder.isRecording) await recorder.stop();
        if (recorder.uri) files.add(recorder.uri);
        for (const uri of files) {
          if (Platform.OS === 'web') URL.revokeObjectURL(uri);
          else await FileSystem.deleteAsync(uri, { idempotent: true });
        }
        files.clear();
        await setAudioModeAsync({ allowsRecording: false });
      };
      void cleanup().catch(() => {});
    };
    // A conversation is initialized once per route identity. Reactive send updates must not restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const subscription = player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) setPhase((p) => (p === 'speaking' ? 'idle' : p));
    });
    return () => subscription.remove();
  }, [player]);
  useEffect(() => {
    if (phase !== 'speaking') return;
    const timer = setTimeout(() => {
      if (!player.playing) {
        setSpeechError('Audio did not start. Tap Replay, or continue with captions.');
        setPhase('idle');
      }
    }, 45_000);
    return () => clearTimeout(timer);
  }, [phase, player]);

  const transcribe = useCallback(
    async (uri: string) => {
      if (locked.current) return;
      locked.current = true;
      setPhase('transcribing');
      setError(null);
      lastRecording.current = uri;
      setRetryKind('transcribe');
      recordingFiles.current.add(uri);
      try {
        let audio: string;
        if (Platform.OS === 'web') {
          const blob = await (await fetch(uri)).blob();
          audio = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(String(reader.result).split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } else
          audio = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
        const result = z.object({ text: z.string().min(1).max(1000) }).parse(
          await invoke('transcribe', {
            conversationId: id,
            audio,
            mimeType: Platform.OS === 'web' ? 'audio/webm' : 'audio/mp4',
          }),
        );
        if (alive.current) {
          setDraft(result.text);
          lastRecording.current = null;
          setRetryKind(null);
          setEncouragement('Check the transcript, then send it to Dori.');
        }
        if (Platform.OS === 'web') URL.revokeObjectURL(uri);
        else await FileSystem.deleteAsync(uri, { idempotent: true });
        recordingFiles.current.delete(uri);
      } catch (e) {
        if (alive.current) setError(errorMessage(e));
      } finally {
        locked.current = false;
        if (alive.current) setPhase('idle');
      }
    },
    [id],
  );
  const stopRecording = useCallback(async () => {
    if (locked.current) return;
    locked.current = true;
    setPhase('transcribing');
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      const uri = recorder.uri;
      if (!uri) throw new Error('The recording was empty. Please try again.');
      locked.current = false;
      await transcribe(uri);
    } catch (e) {
      locked.current = false;
      setRetryKind(null);
      setError(errorMessage(e));
      setPhase('idle');
    }
  }, [recorder, transcribe]);
  useEffect(() => {
    if (phase !== 'recording') return;
    const timer = setTimeout(() => {
      void stopRecording();
    }, 45_000);
    return () => clearTimeout(timer);
  }, [phase, stopRecording]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      foreground.current = state === 'active';
      if (state !== 'active') {
        stopSpeech();
        if (recorder.isRecording) {
          void recorder
            .stop()
            .then(async () => {
              if (recorder.uri) recordingFiles.current.add(recorder.uri);
              await setAudioModeAsync({ allowsRecording: false });
            })
            .catch(() => {});
          setRetryKind(null);
          setPhase('idle');
          setError('Recording stopped when the app left the foreground. Please record again.');
        }
      }
    });
    return () => subscription.remove();
  }, [recorder, stopSpeech]);
  async function toggleRecording() {
    if (phase === 'recording') {
      await stopRecording();
      return;
    }
    if (locked.current || phase !== 'idle' || completed) return;
    locked.current = true;
    setError(null);
    setRetryKind(null);
    stopSpeech();
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted)
        throw new Error(
          'Microphone permission is needed for voice practice. Enable it in your device settings, or type your reply.',
        );
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setPhase('recording');
    } catch (e) {
      setError(errorMessage(e));
      setPhase('idle');
    } finally {
      locked.current = false;
    }
  }
  async function finish() {
    setFinishing(true);
    setError(null);
    setRetryKind('finish');
    stopSpeech();
    try {
      const { data, error } = await db().rpc('complete_conversation', { p_conversation_id: id });
      if (error) throw new Error(error.message);
      setStreakAward(data);
      setRetryKind(null);
      setCompleted(true);
      await useApp.getState().refresh();
      return true;
    } catch (e) {
      setError(errorMessage(e));
      return false;
    } finally {
      setFinishing(false);
    }
  }
  return {
    messages,
    corrections,
    phase,
    draft,
    setDraft,
    error,
    speechError,
    encouragement,
    completed,
    streakAward,
    finishing,
    recordingSeconds: Math.floor(recording.durationMillis / 1000),
    send: () => {
      if (draft.trim()) void send(draft);
    },
    canRetry: retryKind !== null,
    retry: () => {
      if (retryKind === 'load') {
        setError(null);
        setPhase('loading');
        void loadAgain.current?.();
      } else if (retryKind === 'transcribe' && lastRecording.current)
        void transcribe(lastRecording.current);
      else if (retryKind === 'finish') void finish();
      else if (retryKind === 'turn') void send(pending.current?.text);
    },
    speak,
    stopSpeech,
    toggleRecording,
    finish,
  };
}
