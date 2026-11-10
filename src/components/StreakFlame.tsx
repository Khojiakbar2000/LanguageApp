import Svg, { Path } from 'react-native-svg';

export function StreakFlame({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 1.18} viewBox="0 0 32 38">
      <Path
        d="M17.4 1.2c.7 7.2-5.8 9.5-4.6 15.4-2.4-1.7-3.5-4.6-3.2-7.5C5 13.1 2 18.2 2 24a14 14 0 0 0 28 0c0-8.5-5.4-15.6-12.6-22.8Z"
        fill="#F28D2D"
      />
      <Path
        d="M18.3 17c.2 3.5-3.7 5.2-3.4 8.2-.8-.8-1.2-1.9-1.2-3.1-2.2 1.5-3.4 3.5-3.4 5.7a5.8 5.8 0 0 0 11.6 0c0-4.1-1.3-7.6-3.6-10.8Z"
        fill="#FFD166"
      />
      <Path
        d="M13 12.1c-.1 1.8.4 3 1.4 4.1"
        fill="none"
        stroke="#FFE8A3"
        strokeLinecap="round"
        strokeWidth="1.4"
      />
    </Svg>
  );
}
