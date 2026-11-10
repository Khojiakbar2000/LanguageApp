import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioRecorder,
} from 'expo-audio';
import { createSpeechService } from '../lib/onboardingSpeech';
import type { StartingPoint } from '../lib/koreanFuture';
import type { TutorState } from '../lib/types';
import { colors } from './ui';

const phrases = {
  complete_beginner: {
    korean: '안녕하세요!',
    english: 'Hello!',
    hint: 'annyeonghaseyo',
    audio: require('../assets/onboarding-audio/hello.wav'),
  },
  some_expressions: {
    korean: '만나서 반가워요!',
    english: 'Nice to meet you!',
    hint: 'mannaseo bangawoyo',
    audio: require('../assets/onboarding-audio/nice.wav'),
  },
  basic_conversations: {
    korean: '오늘 하루 어땠어요?',
    english: 'How was your day?',
    hint: 'oneul haru eottaesseoyo',
    audio: require('../assets/onboarding-audio/day.wav'),
  },
  intermediate: {
    korean: '요즘 한국어 공부는 어떻게 하고 있어요?',
    english: 'How have you been studying Korean lately?',
    hint: 'yojeum hangugeo gongbuneun eotteoke hago isseoyo',
    audio: require('../assets/onboarding-audio/study.wav'),
  },
} as const;

export function FirstPhrase({
  level,
  completed,
  onCompleted,
  onAttempted,
  onMood,
}: {
  level: StartingPoint;
  completed: boolean;
  onCompleted: () => void;
  onAttempted: () => void;
  onMood: (mood: TutorState) => void;
}) {
  const phrase = phrases[level];
  const player = useAudioPlayer(phrase.audio);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const speech = useRef(createSpeechService());
  const [listening, setListening] = useState(false);
  const [romanization, setRomanization] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [notice, setNotice] = useState(
    completed ? 'A first Korean hello, shared with Dori.' : 'Listen first, then try it your way.',
  );
  useEffect(
    () => () => {
      speech.current.cancel();
      player.pause();
      if (recorder.isRecording) void recorder.stop().catch(() => {});
      void setAudioModeAsync({ allowsRecording: false }).catch(() => {});
    },
    [player, recorder],
  );

  async function play() {
    try {
      onMood('speaking');
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      await player.seekTo(0);
      player.play();
      setNotice('Dori says it slowly. You can replay it anytime.');
    } catch {
      setNotice('Audio could not play here. The Korean and translation are still below.');
    }
  }
  async function toggleMic() {
    if (listening) {
      setListening(false);
      onMood('thinking');
      try {
        const transcript = speech.current.canTranscribe
          ? await speech.current.stop()
          : await (async () => {
              await recorder.stop();
              return speech.current.stop();
            })();
        await setAudioModeAsync({ allowsRecording: false });
        setAttempts((value) => value + 1);
        onAttempted();
        onCompleted();
        onMood('celebrating');
        setNotice(
          transcript
            ? `I heard “${transcript}”. Thanks for speaking with me!`
            : 'You gave Korean a try! Speech recognition is unavailable here, so I cannot check pronunciation.',
        );
      } catch {
        const next = attempts + 1;
        setAttempts(next);
        onMood('encouraging');
        setNotice(
          next >= 2
            ? 'The microphone is having trouble. We can keep going together.'
            : 'I could not hear that recording. Want to try once more?',
        );
      }
      return;
    }
    try {
      player.pause();
      if (speech.current.canTranscribe) {
        await speech.current.start();
      } else {
        const permission = await requestRecordingPermissionsAsync();
        if (!permission.granted) {
          setNotice('Microphone access is off. We can still continue together.');
          return;
        }
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        await recorder.prepareToRecordAsync();
        recorder.record();
      }
      onMood('listening');
      setListening(true);
      setNotice('I’m listening. Tap Done when you finish.');
    } catch {
      setNotice('Microphone access is unavailable. You can continue without it.');
    }
  }
  return (
    <View style={s.root}>
      <View style={s.phrase}>
        <Text style={s.korean}>{phrase.korean}</Text>
        <Text style={s.translation}>{phrase.english}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={romanization ? 'Hide romanization' : 'Show romanization'}
          onPress={() => setRomanization(!romanization)}
          style={s.romanization}
        >
          <Text style={s.link}>{romanization ? phrase.hint : 'Show pronunciation guide'}</Text>
        </Pressable>
      </View>
      <View style={s.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Listen to Dori say the phrase"
          onPress={() => void play()}
          style={s.listenButton}
        >
          <Ionicons name="volume-high" size={22} color={colors.primary} />
          <Text style={s.listenText}>Listen</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={listening ? 'Finish speaking' : 'Repeat the phrase'}
          onPress={() => void toggleMic()}
          style={[s.micButton, listening && s.recording]}
        >
          <Ionicons name={listening ? 'stop' : 'mic'} size={23} color={colors.paper} />
          <Text style={s.micText}>
            {listening ? 'Done' : completed ? 'Try again' : 'Your turn'}
          </Text>
        </Pressable>
      </View>
      <Text accessibilityLiveRegion="polite" style={s.notice}>
        {notice}
      </Text>
      {!completed && (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            onCompleted();
            onMood('happy');
            setNotice('We can practice speaking together whenever you are ready.');
          }}
          style={s.skip}
        >
          <Text style={s.link}>Continue without microphone</Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { gap: 16, alignItems: 'center', paddingTop: 2 },
  phrase: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#FFFDF8',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 20,
    gap: 5,
  },
  korean: {
    fontSize: 29,
    lineHeight: 39,
    fontWeight: '800',
    color: colors.ink,
    textAlign: 'center',
  },
  translation: { fontSize: 15, lineHeight: 22, color: colors.muted, textAlign: 'center' },
  romanization: { minHeight: 38, justifyContent: 'center' },
  link: { color: colors.primary, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  actions: { flexDirection: 'row', width: '100%', gap: 10 },
  listenButton: {
    flex: 1,
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 18,
    backgroundColor: colors.ice,
  },
  listenText: { color: colors.primary, fontSize: 16, fontWeight: '800' },
  micButton: {
    flex: 1.2,
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 18,
    backgroundColor: colors.primary,
  },
  recording: { backgroundColor: '#A23D4B' },
  micText: { color: colors.paper, fontSize: 16, fontWeight: '800' },
  notice: { minHeight: 44, fontSize: 13, lineHeight: 19, color: colors.muted, textAlign: 'center' },
  skip: { minHeight: 44, justifyContent: 'center' },
});
