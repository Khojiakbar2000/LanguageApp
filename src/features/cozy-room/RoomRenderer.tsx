import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import type { RiveRef } from 'rive-react-native';
import { RoomVectorFallback } from './RoomVectorFallback';
import type { RoomRendererProps } from './types';
export function RoomRenderer(props: RoomRendererProps) {
  const [failed, setFailed] = useState(false);
  if (
    props.controls.reduced ||
    failed ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
  )
    return <RoomVectorFallback {...props} />;
  return <NativeRoom {...props} onError={() => setFailed(true)} />;
}
function NativeRoom({
  width,
  height,
  controls,
  onError,
}: RoomRendererProps & { onError: () => void }) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Rive = (require('rive-react-native') as typeof import('rive-react-native')).default;
  const ref = useRef<RiveRef>(null);
  const [ready, setReady] = useState(false);
  const { active, night, fireRef } = controls;
  useEffect(() => {
    if (!ready) return;
    fireRef.current = (input) => ref.current?.fireState('PandaStateMachine', input);
    return () => {
      fireRef.current = null;
    };
  }, [ready, fireRef]);
  useEffect(() => {
    if (ready) ref.current?.setInputState('PandaStateMachine', 'night', night ? 1 : 0);
  }, [ready, night]);
  useEffect(() => {
    if (ready) {
      if (active) ref.current?.play('PandaStateMachine', undefined, undefined, true);
      else ref.current?.pause();
    }
  }, [ready, active]);
  return (
    <View style={{ width, height }}>
      {!ready && <RoomVectorFallback width={width} height={height} controls={controls} />}
      {(!controls.busy || ready) && (
        <Rive
          ref={ref}
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          source={require('../../../public/mascot/cozy-room.riv')}
          artboardName="CozyRoom"
          stateMachineName="PandaStateMachine"
          autoplay
          onPlay={() => setReady(true)}
          onError={onError}
          style={{ position: 'absolute', width, height }}
        />
      )}
    </View>
  );
}
