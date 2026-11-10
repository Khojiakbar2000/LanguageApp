import type { MutableRefObject } from 'react';
import type { SharedValue } from 'react-native-reanimated';
export type RoomAction = 'idle' | 'wave' | 'coffee';
export interface RoomControls {
  active: boolean;
  busy: boolean;
  reduced: boolean;
  night: boolean;
  nightProgress: SharedValue<number>;
  action: SharedValue<number>;
  actionTime: SharedValue<number>;
  fireRef: MutableRefObject<((input: 'wave' | 'coffee') => void) | null>;
}
export type RoomRendererProps = { width: number; height: number; controls: RoomControls };
