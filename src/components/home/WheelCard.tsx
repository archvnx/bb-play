import React from 'react';
import { StyleProp, ViewStyle, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Svg, { Path, Line, Circle } from 'react-native-svg';
import type { WheelStatus } from '../../types/backend';

const WheelIcon = ({ size = 32, color = "#FFCC00" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 12 L12 2 A10 10 0 0 1 19.071 4.929 Z" fill="#FF4444"/>
    <Path d="M12 12 L19.071 4.929 A10 10 0 0 1 22 12 Z" fill="#FF8C00"/>
    <Path d="M12 12 L22 12 A10 10 0 0 1 19.071 19.071 Z" fill="#FFCC00"/>
    <Path d="M12 12 L19.071 19.071 A10 10 0 0 1 12 22 Z" fill="#44BB44"/>
    <Path d="M12 12 L12 22 A10 10 0 0 1 4.929 19.071 Z" fill="#22AADD"/>
    <Path d="M12 12 L4.929 19.071 A10 10 0 0 1 2 12 Z" fill="#6644EE"/>
    <Path d="M12 12 L2 12 A10 10 0 0 1 4.929 4.929 Z" fill="#EE44AA"/>
    <Path d="M12 12 L4.929 4.929 A10 10 0 0 1 12 2 Z" fill="#FF6633"/>
    <Line x1="12" y1="2" x2="12" y2="22" stroke="#1a1a1a" strokeWidth="0.5"/>
    <Line x1="2" y1="12" x2="22" y2="12" stroke="#1a1a1a" strokeWidth="0.5"/>
    <Line x1="19.071" y1="4.929" x2="4.929" y2="19.071" stroke="#1a1a1a" strokeWidth="0.5"/>
    <Line x1="4.929" y1="4.929" x2="19.071" y2="19.071" stroke="#1a1a1a" strokeWidth="0.5"/>
    <Circle cx="12" cy="12" r="10" fill="none" stroke={color} strokeWidth="1.2"/>
    <Circle cx="12" cy="12" r="2.5" fill="#1a1a1a" stroke={color} strokeWidth="0.8"/>
  </Svg>
);

interface Props {
  status: WheelStatus | null;
  loading: boolean;
  onPress: () => void;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export function WheelCard({ status, loading, onPress, size, style }: Props) {
  const canSpin = status?.canSpin ?? false;

  const countdown = (() => {
    if (canSpin || !status?.nextSpinAt) return '';
    const diff = new Date(status.nextSpinAt).getTime() - Date.now();
    if (diff <= 0) return '';
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    return `через ${h}ч ${m}м`;
  })();

  const flatStyle = StyleSheet.flatten(style ?? {}) as any;
  const isHidden = flatStyle?.opacity === 0;

  return (
    <TouchableOpacity
      style={[
        c.card,
        size != null && { width: size, height: size, aspectRatio: undefined },
        style,
      ]}
      activeOpacity={0.85}
      onPress={onPress}
      disabled={isHidden}
    >
      {/* Надпись сверху */}
      <Text style={c.title}>ЕЖЕДНЕВНЫЙ{'\n'}ПОДАРОК</Text>

      {/* Иконка по центру */}
      <View style={c.iconWrap}>
        {loading
          ? <ActivityIndicator color="#FFCC00" size="small" />
          : <WheelIcon size={52} color="#FFCC00" />
        }
      </View>

      {/* Нижняя строка */}
      {!loading && (canSpin ? (
        <View style={[c.countdownWrap, { backgroundColor: '#FFCC00' }]}>
          <Text style={[c.countdownText, { color: '#000', fontWeight: '900' }]}>Испытай удачу</Text>
        </View>
      ) : (
        <View style={c.countdownWrap}>
          <Text style={c.countdownText}>Спин {countdown}</Text>
        </View>
      ))}
    </TouchableOpacity>
  );
}

export { WheelCard as default };

const c = StyleSheet.create({
  card: {
    aspectRatio: 1,
    alignSelf: 'stretch',
    backgroundColor: '#0D0D0D',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1A1A1A',
    padding: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: '#FFCC00',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.2,
    textAlign: 'left',
    alignSelf: 'flex-start',
  },
  iconWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownWrap: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    width: '100%',
  },
  countdownText: { color: '#bbb', fontSize: 10, fontWeight: '700' },
});