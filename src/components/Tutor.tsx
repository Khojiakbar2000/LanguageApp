import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Image, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useReducedMotion } from 'react-native-reanimated';
import type { RiveRef } from 'rive-react-native';
import type { TutorState } from '../lib/types';
import { pandaInputs, type PandaAppearance } from '../lib/panda';
import { usePandaAppearance } from '../hooks/usePandaAppearance';
import { pandaStills } from '../panda_rive_assets/appearances';

type Props = { state?: TutorState; size?: number; appearance?: PandaAppearance };

// Keep Expo Go usable. Its fixed native module set cannot load Rive.
export function Tutor({ state = 'idle', size = 190, appearance: preview }: Props) {
  const saved = usePandaAppearance();
  const appearance = preview ?? saved;
  const reducedMotion = useReducedMotion();
  const [failed, setFailed] = useState(false);
  const canAnimate =
    !reducedMotion &&
    !failed &&
    Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Dori the panda tutor, ${state}`}
      style={{ width: size, height: size, alignSelf: 'center' }}
    >
      {canAnimate ? (
        <NativePanda
          state={state}
          size={size}
          appearance={appearance}
          onError={() => setFailed(true)}
        />
      ) : (
        <Image
          source={pandaStills[appearance.outfit][appearance.accessory]}
          resizeMode="contain"
          style={{ width: size, height: size }}
        />
      )}
    </View>
  );
}

function NativePanda({
  state,
  size,
  onError,
  appearance,
}: {
  state: TutorState;
  size: number;
  onError: () => void;
  appearance: PandaAppearance;
}) {
  // Deliberately load only in a development/production build with native Rive.
  // Native module must remain lazy so Expo Go can use the still fallback.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Rive = (require('rive-react-native') as typeof import('rive-react-native')).default;
  const ref = useRef<RiveRef>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (ready) ref.current?.fireState('Panda', state);
  }, [ready, state]);
  const { outfit, accessory } = pandaInputs(appearance);
  useEffect(() => {
    if (!ready) return;
    ref.current?.setInputState('Panda', 'outfit', outfit);
    ref.current?.setInputState('Panda', 'accessory', accessory);
  }, [ready, outfit, accessory]);
  useFocusEffect(
    useCallback(() => {
      if (!ready) return;
      const resume = () => ref.current?.play('Panda', undefined, undefined, true);
      resume();
      const listener = AppState.addEventListener('change', (value) => {
        if (value === 'active') resume();
        else ref.current?.pause();
      });
      return () => {
        listener.remove();
        ref.current?.pause();
      };
    }, [ready]),
  );
  return (
    <Rive
      ref={ref}
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      source={require('../../public/mascot/panda.riv')}
      artboardName="Panda"
      stateMachineName="Panda"
      autoplay
      onPlay={() => setReady(true)}
      onError={onError}
      style={{ width: size, height: size }}
    />
  );
}
