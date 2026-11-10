// Browser recognition is optional. Native onboarding records an attempt, while
// transcription remains a swappable service boundary rather than a fake score.
export interface SpeechService {
  readonly canTranscribe: boolean;
  start(): Promise<void>;
  stop(): Promise<string | null>;
  cancel(): void;
}

export const mockSpeechService: SpeechService = {
  canTranscribe: false,
  async start() {},
  async stop() {
    return null;
  },
  cancel() {},
};

type RecognitionEvent = { results?: ArrayLike<ArrayLike<{ transcript: string }>> };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
type RecognitionWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};

export function createSpeechService(): SpeechService {
  if (typeof window === 'undefined') return mockSpeechService;
  const browser = window as RecognitionWindow;
  const Constructor = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
  if (!Constructor) return mockSpeechService;
  let recognition: Recognition | null = null;
  let transcript: string | null = null;
  let failure: string | null = null;
  let done: Promise<void> | null = null;
  return {
    canTranscribe: true,
    async start() {
      transcript = null;
      failure = null;
      recognition = new Constructor();
      const current = recognition;
      current.lang = 'ko-KR';
      current.continuous = false;
      current.interimResults = false;
      let started = false;
      let resolveStart!: () => void;
      let rejectStart!: (error: Error) => void;
      const startResult = new Promise<void>((resolve, reject) => {
        resolveStart = resolve;
        rejectStart = reject;
      });
      done = new Promise<void>((resolve) => {
        current.onstart = () => {
          started = true;
          resolveStart();
        };
        current.onresult = (event) => {
          transcript = event.results?.[0]?.[0]?.transcript ?? null;
        };
        current.onerror = (event) => {
          failure = event.error;
          if (!started) rejectStart(new Error(event.error));
          resolve();
        };
        current.onend = () => {
          if (!started) rejectStart(new Error('Microphone did not start'));
          resolve();
        };
      });
      current.start();
      await startResult;
    },
    async stop() {
      recognition?.stop();
      await done;
      recognition = null;
      if (failure && failure !== 'no-speech') throw new Error(failure);
      return transcript;
    },
    cancel() {
      recognition?.abort();
      recognition = null;
    },
  };
}
