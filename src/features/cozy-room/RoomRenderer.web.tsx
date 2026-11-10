import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Alignment, Fit, Layout, RuntimeLoader, useRive } from '@rive-app/react-canvas';
import { RoomVectorFallback } from './RoomVectorFallback';
import type { RoomRendererProps } from './types';
RuntimeLoader.setWasmUrl('/mascot/rive.wasm');
RuntimeLoader.setWasmFallbackUrl(null);
export function RoomRenderer({ width, height, controls }: RoomRendererProps) {
  const [failed, setFailed] = useState(false);
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (controls.reduced) return;
    const controller = new AbortController();
    void fetch('/mascot/cozy-room.riv?v=cozy-3', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Room asset unavailable');
        return response.arrayBuffer();
      })
      .then((bytes) => {
        if (!controller.signal.aborted) setBuffer(bytes);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [controls.reduced]);
  const { rive, RiveComponent } = useRive(
    !buffer || controls.reduced || failed || (!loaded && controls.busy)
      ? null
      : {
          buffer,
          artboard: 'CozyRoom',
          stateMachine: 'PandaStateMachine',
          autoplay: true,
          layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
          onLoad: () => setLoaded(true),
          onLoadError: () => setFailed(true),
        },
  );
  const { active, night, fireRef } = controls;
  useEffect(() => {
    if (!rive) return;
    fireRef.current = (name) =>
      rive
        .stateMachineInputs('PandaStateMachine')
        ?.find((input) => input.name === name)
        ?.fire();
    return () => {
      fireRef.current = null;
    };
  }, [rive, fireRef]);
  useEffect(() => {
    if (!rive) return;
    const input = rive
      .stateMachineInputs('PandaStateMachine')
      ?.find((input) => input.name === 'night');
    if (input) input.value = night ? 1 : 0;
  }, [rive, night]);
  useEffect(() => {
    if (rive) {
      if (active) rive.play();
      else rive.pause();
    }
  }, [rive, active]);
  return (
    <View testID={rive ? 'cozy-rive' : 'cozy-vector-fallback'} style={{ width, height }}>
      {!rive && <RoomVectorFallback width={width} height={height} controls={controls} />}
      {!controls.reduced && !failed && (
        <RiveComponent
          aria-hidden="true"
          style={{ position: 'absolute', inset: 0, width, height, opacity: rive ? 1 : 0 }}
        />
      )}
    </View>
  );
}
