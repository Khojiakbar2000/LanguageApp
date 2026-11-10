import { HStack, Image, ProgressView, Text, VStack } from '@expo/ui/swift-ui';
import {
  aspectRatio,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  resizable,
  tint,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { WidgetProps } from '../data';
function DailyKorean(props: WidgetProps, environment: WidgetEnvironment) {
  'widget';
  const dark = environment.colorScheme === 'dark';
  return (
    <HStack
      spacing={13}
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
          frame({ width: 80, height: 88 }),
        ]}
      />
      <VStack alignment="leading" spacing={7}>
        <Text
          modifiers={[
            font({ size: 16, weight: 'semibold' }),
            foregroundStyle(dark ? '#F0F6FF' : '#081F5C'),
            lineLimit(2),
          ]}
        >
          {props.korean}
        </Text>
        <Text
          modifiers={[
            font({ size: 11 }),
            foregroundStyle(dark ? '#C1D7F0' : '#4E6593'),
            lineLimit(2),
          ]}
        >
          {props.english}
        </Text>
        <ProgressView value={props.turns / 3} modifiers={[tint(dark ? '#9EDAF2' : '#7096D1')]} />
        <Text
          modifiers={[
            font({ size: 10 }),
            foregroundStyle(dark ? '#C1D7F0' : '#4E6593'),
            lineLimit(1),
          ]}
        >{`🔥 ${props.streak} days · ${props.turns} / 3 replies`}</Text>
      </VStack>
    </HStack>
  );
}
export default createWidget<WidgetProps>('DailyKorean', DailyKorean, {
  korean: '오늘도 조금씩 성장해요.',
  english: 'Let’s improve a little every day.',
  streak: 0,
  turns: 0,
});
