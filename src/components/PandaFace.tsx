import { useState } from 'react';
import { View } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useReducedMotion } from 'react-native-reanimated';
import { PandaFaceFallback } from './PandaFaceFallback';
export function PandaFace({ size = 240, onReady }: { size?: number; onReady: () => void }) {
  const reduced = useReducedMotion();
  if (reduced || Constants.executionEnvironment === ExecutionEnvironment.StoreClient)
    return <PandaFaceFallback size={size} onReady={onReady} />;
  return <NativeFace size={size} onReady={onReady} />;
}
function NativeFace({ size, onReady }: { size: number; onReady: () => void }) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Rive = (require('rive-react-native') as typeof import('rive-react-native')).default;
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <View style={{ width: size, height: size }}>
      {(!playing || failed) && <PandaFaceFallback size={size} onReady={onReady} />}
      {!failed && (
        <Rive
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          source={require('../../public/mascot/panda-face.riv')}
          artboardName="Panda face"
          stateMachineName="Face"
          autoplay
          onPlay={() => {
            setPlaying(true);
            onReady();
          }}
          onError={() => {
            setFailed(true);
            onReady();
          }}
          style={{ position: 'absolute', width: size, height: size }}
        />
      )}
    </View>
  );
}
