import { Image, Text, VStack } from '@expo/ui/swift-ui';
import {
  aspectRatio,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  resizable,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { WidgetProps } from '../data';
function PandaCompanion(props: WidgetProps, environment: WidgetEnvironment) {
  'widget';
  const dark = environment.colorScheme === 'dark';
  return (
    <VStack
      spacing={5}
      modifiers={[
        containerBackground(dark ? '#162B48' : '#E7F1FF', 'widget'),
        widgetURL('harukorean://widget'),
      ]}
    >
      <Image
        assetName="PandaMascot"
        modifiers={[
          resizable(),
          aspectRatio({ contentMode: 'fit' }),
          frame({ width: 76, height: 76 }),
        ]}
      />
      <Text
        modifiers={[
          font({ size: 15, weight: 'semibold' }),
          foregroundStyle(dark ? '#F0F6FF' : '#081F5C'),
          lineLimit(1),
        ]}
      >
        오늘도 화이팅!
      </Text>
      <Text
        modifiers={[
          font({ size: 11 }),
          foregroundStyle(dark ? '#C1D7F0' : '#4E6593'),
          lineLimit(1),
        ]}
      >
        {props.streak > 0 ? `🔥 ${props.streak} day streak` : 'A little Korean, every day'}
      </Text>
    </VStack>
  );
}
export default createWidget<WidgetProps>('PandaCompanion', PandaCompanion, {
  korean: '오늘도 화이팅!',
  english: 'You’ve got this today!',
  streak: 0,
  turns: 0,
});
