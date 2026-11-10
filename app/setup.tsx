import { router } from 'expo-router';
import { Back, Body, Button, Card, Heading, Screen } from '../src/components/ui';
import { configured } from '../src/lib/supabase';
export default function Setup() {
  return (
    <Screen>
      <Back />
      <Heading>{configured ? 'Your practice connection' : 'A little setup first.'}</Heading>
      <Body muted>
        {configured
          ? 'The mobile client has its public Supabase configuration. Backend and provider availability are checked when you use them.'
          : 'You can explore all 20 original lessons now. An administrator must connect the backend before accounts and live practice are available.'}
      </Body>
      <Card>
        <Heading small>For the app administrator</Heading>
        <Body>
          1. Copy .env.example to .env and set the public Supabase URL and publishable key.
        </Body>
        <Body>2. Apply the SQL migration and seed in supabase/.</Body>
        <Body>3. Deploy conversation, transcribe, speak and delete-account Edge Functions.</Body>
        <Body>
          4. Set Gemini and ElevenLabs secrets only in Supabase. Never add provider keys to
          EXPO_PUBLIC variables.
        </Body>
        <Body>
          5. Configure auth redirect URLs for the app’s email links. Restart Expo after editing
          .env.
        </Body>
      </Card>
      <Card>
        <Heading small>Your learning data</Heading>
        <Body>
          Microphone clips are sent through the server to ElevenLabs for transcription and then
          removed from the app’s temporary storage. Text turns and corrections are saved to your
          account. Tutor audio is cached privately in Supabase for replay.
        </Body>
        <Body>
          Gemini and speech-provider retention policies also apply. Account deletion removes Haru
          records and stored tutor audio; it cannot promise deletion from an external provider’s
          independent logs.
        </Body>
        <Body>
          V1 has per-user daily limits: 20 new sessions, 60 AI requests, 50 transcriptions and 80
          newly generated audio replies. Replays use cached audio. Limits reset at midnight UTC.
        </Body>
      </Card>
      <Button title="Explore the lessons" onPress={() => router.replace('/(tabs)/lessons')} />
    </Screen>
  );
}
