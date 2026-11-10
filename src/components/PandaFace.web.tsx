import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRive, Layout, Fit, Alignment, RuntimeLoader } from '@rive-app/react-canvas';
import { useReducedMotion } from 'react-native-reanimated';
import { PandaFaceFallback } from './PandaFaceFallback';
RuntimeLoader.setWasmUrl('/mascot/rive.wasm');
RuntimeLoader.setWasmFallbackUrl(null);
export function PandaFace({ size = 240, onReady }: { size?: number; onReady: () => void }) {
  const reduced = useReducedMotion();
  const [failed, setFailed] = useState(false);
  const { rive, RiveComponent } = useRive(
    reduced || failed
      ? null
      : {
          src: '/mascot/panda-face.riv?v=panda-v2-1',
          artboard: 'Panda face',
          stateMachine: 'Face',
          autoplay: true,
          layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
          onLoadError: () => setFailed(true),
        },
  );
  useEffect(() => {
    if (rive) onReady();
  }, [rive, onReady]);
  return (
    <View style={{ width: size, height: size }}>
      {(!rive || reduced || failed) && <PandaFaceFallback size={size} onReady={onReady} />}
      {!reduced && !failed && (
        <RiveComponent
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            width: size,
            height: size,
            opacity: rive ? 1 : 0,
          }}
        />
      )}
    </View>
  );
}
