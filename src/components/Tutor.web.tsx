import { useCallback, useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useRive, Layout, Fit, Alignment, RuntimeLoader } from '@rive-app/react-canvas';
import { useReducedMotion } from 'react-native-reanimated';
import type { TutorState } from '../lib/types';
import { pandaInputs, type PandaAppearance } from '../lib/panda';
import { usePandaAppearance } from '../hooks/usePandaAppearance';
import { pandaStills } from '../panda_rive_assets/appearances';

// Serve the matching WASM locally, including in offline builds.
RuntimeLoader.setWasmUrl('/mascot/rive.wasm');
RuntimeLoader.setWasmFallbackUrl(null);

export function Tutor({
  state = 'idle',
  size = 190,
  appearance: preview,
}: {
  state?: TutorState;
  size?: number;
  appearance?: PandaAppearance;
}) {
  const saved = usePandaAppearance();
  const appearance = preview ?? saved;
  const { outfit, accessory } = pandaInputs(appearance);
  const reducedMotion = useReducedMotion();
  const [failed, setFailed] = useState(false);
  const { rive, RiveComponent } = useRive(
    reducedMotion || failed
      ? null
      : {
          src: '/mascot/panda.riv?v=panda-v2-2',
          artboard: 'Panda',
          stateMachine: 'Panda',
          autoplay: true,
          layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
          onLoadError: () => setFailed(true),
        },
  );
  useEffect(() => {
    if (!rive || reducedMotion) return;
    rive
      .stateMachineInputs('Panda')
      ?.find((input) => input.name === state)
      ?.fire();
  }, [rive, state, reducedMotion]);
  useEffect(() => {
    if (!rive) return;
    const inputs = rive.stateMachineInputs('Panda');
    const outfitInput = inputs?.find((input) => input.name === 'outfit');
    const accessoryInput = inputs?.find((input) => input.name === 'accessory');
    if (outfitInput) outfitInput.value = outfit;
    if (accessoryInput) accessoryInput.value = accessory;
  }, [rive, outfit, accessory]);
  useFocusEffect(
    useCallback(() => {
      if (rive && !reducedMotion) rive.play();
      return () => rive?.pause();
    }, [rive, reducedMotion]),
  );
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Dori the panda tutor, ${state}`}
      testID={`panda-${state}`}
      style={{ width: size, height: size, alignSelf: 'center' }}
    >
      <View
        testID={`panda-look-${appearance.outfit}-${appearance.accessory}`}
        style={{ width: size, height: size }}
      >
        {!rive && (
          <Image
            source={pandaStills[appearance.outfit][appearance.accessory]}
            resizeMode="contain"
            style={{ position: 'absolute', width: size, height: size }}
          />
        )}
        {!reducedMotion && !failed && (
          <RiveComponent aria-hidden="true" style={{ width: size, height: size }} />
        )}
      </View>
    </View>
  );
}
