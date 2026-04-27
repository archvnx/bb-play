import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Svg, { Path, Circle, Rect, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import type { StreakInfo } from '../../types/backend';

// --- Служебные иконки ---

const CloseIcon = ({ size = 16, color = '#888' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M18 6L6 18M6 6l12 12" />
  </Svg>
);

const FlameHeaderIcon = ({ color = '#FF6B35', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  </Svg>
);

// ─────────────────────────────────────────────
// ТИРЫ — иконки
// ─────────────────────────────────────────────

const Icon_Flame = ({ color = '#555', size = 48 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 72 100">
    <G transform="scale(1.3)">
      <Path d="M28 68A14 14 0 0 0 42 54c0-7.7-2.8-11.1-5.6-16.7-5.95-11.9-1.24-22.5 11.1-33.3 2.78 13.9 11.1 27.2 22.2 36.1 11.1 8.9 16.7 19.4 16.7 30.6a38.9 38.9 0 1 1-77.8 0c0-6.4 2.4-12.7 5.6-16.7A14 14 0 0 0 28 68z" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </G>
  </Svg>
);

const Icon_TwoCoins = ({ color = '#555', size = 48 }: { color?: string; size?: number }) => {
  const active = color === '#FF6B35';
  const c1   = active ? '#7a7a7a' : '#3a3a3a';
  const c2   = active ? '#9d9d9d' : '#444';
  const bg   = active ? '#2b2b2d' : '#111';
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Rect x="0" y="0" width="100" height="100" rx="12" fill={bg} />
      <Circle cx="55" cy="45" r="26" fill={c1} stroke={bg} strokeWidth="3" />
      <Circle cx="55" cy="45" r="17" fill="none" stroke={bg} strokeWidth="3" />
      <Circle cx="45" cy="58" r="26" fill={c2} stroke={bg} strokeWidth="3" />
      <Circle cx="45" cy="58" r="17" fill="none" stroke={bg} strokeWidth="3" />
      <Path d="M42 70 L42 48 L47 48 Q53 48 53 54 Q53 60 47 60 L35 60 M35 66 L49 66" fill="none" stroke={bg} strokeWidth="5" strokeLinecap="round" />
    </Svg>
  );
};

const Icon_OneCoin = ({ color = '#555', size = 48 }: { color?: string; size?: number }) => {
  const active = color === '#f07346';
  const fill = active ? '#9d9d9d' : '#444';
  const ring = active ? '#2b2b2d' : '#1a1a1a';
  const bg   = active ? '#2b2b2d' : '#111';
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Rect x="0" y="0" width="100" height="100" rx="12" fill={bg} />
      <Circle cx="50" cy="50" r="35" fill={fill} />
      <Circle cx="50" cy="50" r="24" fill="none" stroke={ring} strokeWidth="3.5" />
      <Path d="M46 66 L46 37 L53 37 Q61 37 61 45 Q61 53 53 53 L37 53 M37 61 L54 61" fill="none" stroke={ring} strokeWidth="6" strokeLinecap="round" />
    </Svg>
  );
};

const Icon_CoinStack = ({ color = '#555', size = 48 }: { color?: string; size?: number }) => {
  const active = color === '#FF6B35';
  const fill = active ? '#9d9d9d' : '#444';
  const ring = active ? '#2b2b2d' : '#1a1a1a';
  const bg   = active ? '#2b2b2d' : '#111';
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Rect x="0" y="0" width="100" height="100" rx="12" fill={bg} />
      <Rect x="58" y="28" width="32" height="12" rx="6" fill={fill} stroke={bg} strokeWidth="3" />
      <Rect x="58" y="40" width="32" height="12" rx="6" fill={fill} stroke={bg} strokeWidth="3" />
      <Rect x="58" y="52" width="32" height="12" rx="6" fill={fill} stroke={bg} strokeWidth="3" />
      <Rect x="58" y="64" width="32" height="12" rx="6" fill={fill} stroke={bg} strokeWidth="3" />
      <Circle cx="40" cy="58" r="28" fill={fill} stroke={bg} strokeWidth="3" />
      <Circle cx="40" cy="58" r="19" fill="none" stroke={ring} strokeWidth="3.5" />
      <Path d="M37 70 L37 48 L42 48 Q48 48 48 54 Q48 60 42 60 L30 60 M30 66 L44 66" fill="none" stroke={ring} strokeWidth="4.5" strokeLinecap="round" />
    </Svg>
  );
};

const Icon_FlameOneCoin = ({ color = '#555', size = 48 }: { color?: string; size?: number }) => {
  const active   = color === '#FF6B35';
  const coinFill = active ? '#9d9d9d' : '#444';
  const coinRing = active ? '#2b2b2d' : '#1a1a1a';
  return (
    <Svg width={size} height={size} viewBox="0 0 130 160">
      <G transform="scale(1.3)">
        <Path d="M28 68A14 14 0 0 0 42 54c0-7.7-2.8-11.1-5.6-16.7-5.95-11.9-1.24-22.5 11.1-33.3 2.78 13.9 11.1 27.2 22.2 36.1 11.1 8.9 16.7 19.4 16.7 30.6a38.9 38.9 0 1 1-77.8 0c0-6.4 2.4-12.7 5.6-16.7A14 14 0 0 0 28 68z" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </G>
      <G transform="translate(96, 120) scale(0.75)">
        <Circle cx="0" cy="0" r="35" fill={coinFill} />
        <Circle cx="0" cy="0" r="24" fill="none" stroke={coinRing} strokeWidth="3.5" />
        <Path d="M-4 16 L-4 -13 L3 -13 Q11 -13 11 -5 Q11 3 3 3 L-13 3 M-13 11 L6 11" fill="none" stroke={coinRing} strokeWidth="5" strokeLinecap="round" />
      </G>
    </Svg>
  );
};

const RublePathSmall = ({ ring }: { ring: string }) => (
  <Path d="M-3 12 L-3 -10 L2 -10 Q8 -10 8 -4 Q8 2 2 2 L-10 2 M-10 8 L5 8" fill="none" stroke={ring} strokeWidth="4.5" strokeLinecap="round" />
);

const Icon_FlameTwoCoins = ({ color = '#555', size = 48 }: { color?: string; size?: number }) => {
  const active = color === '#FF6B35';
  const c1 = active ? '#7a7a7a' : '#3a3a3a';
  const c2 = active ? '#9d9d9d' : '#444';
  const ring = active ? '#2b2b2d' : '#1a1a1a';
  return (
    <Svg width={size} height={size} viewBox="0 0 150 165">
      <G transform="scale(1.3)"><Path d="M28 68A14 14 0 0 0 42 54c0-7.7-2.8-11.1-5.6-16.7-5.95-11.9-1.24-22.5 11.1-33.3 2.78 13.9 11.1 27.2 22.2 36.1 11.1 8.9 16.7 19.4 16.7 30.6a38.9 38.9 0 1 1-77.8 0c0-6.4 2.4-12.7 5.6-16.7A14 14 0 0 0 28 68z" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></G>
      <G transform="translate(82, 104)"><Circle cx="0" cy="0" r="26" fill={c1} stroke={ring} strokeWidth="3" /><Circle cx="0" cy="0" r="17" fill="none" stroke={ring} strokeWidth="3" /></G>
      <G transform="translate(110, 126)"><Circle cx="0" cy="0" r="26" fill={c2} stroke={ring} strokeWidth="3" /><Circle cx="0" cy="0" r="17" fill="none" stroke={ring} strokeWidth="3" /><RublePathSmall ring={ring} /></G>
    </Svg>
  );
};

const Icon_FlameCoinStack = ({ color = '#555', size = 48 }: { color?: string; size?: number }) => {
  const active = color === '#FF6B35';
  const fill = active ? '#9d9d9d' : '#444';
  const ring = active ? '#2b2b2d' : '#1a1a1a';
  return (
    <Svg width={size} height={size} viewBox="0 0 150 175">
      <G transform="scale(1.3)"><Path d="M28 68A14 14 0 0 0 42 54c0-7.7-2.8-11.1-5.6-16.7-5.95-11.9-1.24-22.5 11.1-33.3 2.78 13.9 11.1 27.2 22.2 36.1 11.1 8.9 16.7 19.4 16.7 30.6a38.9 38.9 0 1 1-77.8 0c0-6.4 2.4-12.7 5.6-16.7A14 14 0 0 0 28 68z" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></G>
      <G transform="translate(88, 82) scale(1.02)">
        {[0, 12, 24, 36].map(y => <Rect key={y} x="0" y={y} width="32" height="12" rx="6" fill={fill} stroke={ring} strokeWidth="3" />)}
      </G>
      <G transform="translate(72, 128) scale(0.90)"><Circle cx="0" cy="0" r="28" fill={fill} stroke={ring} strokeWidth="3" /><Circle cx="0" cy="0" r="19" fill="none" stroke={ring} strokeWidth="3.5" /><RublePathSmall ring={ring} /></G>
    </Svg>
  );
};

const Icon_Crown = ({ color = '#555', size = 48 }: { color?: string; size?: number }) => {
  const active = color === '#FF6B35';
  const fill   = active ? '#9e9e9e' : '#444';
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Rect x="25" y="78" width="50" height="7" rx="3.5" fill={fill} />
      <Path
        fillRule="evenodd"
        fill={fill}
        stroke={fill}
        strokeWidth="1.5"
        strokeLinejoin="round"
        d="M 26 74 L 74 74 L 83 45 L 65 58 L 50 28 L 35 58 L 17 45 Z M 50 54 L 57 62.5 L 50 71 L 43 62.5 Z"
      />
      <Circle cx="50" cy="27" r="6.5" fill={fill} />
      <Circle cx="17" cy="44" r="5.5" fill={fill} />
      <Circle cx="83" cy="44" r="5.5" fill={fill} />
    </Svg>
  );
};

// --- Данные для сетки ---

const GRID_TIERS = [
  { days: 1,  discount: 0,  Icon: Icon_Flame },
  { days: 2,  discount: 1,  Icon: Icon_OneCoin },
  { days: 3,  discount: 2,  Icon: Icon_FlameOneCoin },
  { days: 4,  discount: 3,  Icon: Icon_TwoCoins },
  { days: 5,  discount: 4,  Icon: Icon_FlameTwoCoins },
  { days: 7,  discount: 5,  Icon: Icon_CoinStack },
  { days: 10, discount: 7,  Icon: Icon_FlameCoinStack },
  { days: 14, discount: 10, Icon: Icon_Crown },
];

interface Props {
  visible: boolean;
  streak: StreakInfo | null;
  loading?: boolean;
  onClose: () => void;
}

export function StreakModal({ visible, streak, loading = false, onClose }: Props) {
  const current = streak?.currentStreak ?? 0;

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={s.overlay}>
        <TouchableOpacity style={s.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={s.sheet}>

          <View style={s.header}>
            <View style={s.headerLeft}>
              <FlameHeaderIcon size={20} color="#FF6B35" />
              <Text style={s.headerTitle}>СЕРИЯ БРОНЕЙ</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <CloseIcon size={16} color="#888" />
            </TouchableOpacity>
          </View>

          {loading && (
            <View style={s.loadingWrap}>
              <ActivityIndicator color="#FF6B35" />
            </View>
          )}

          {!loading && (
            <View style={s.gridContainer}>
              {GRID_TIERS.map((tier) => {
                const reached    = current >= tier.days;
                const iconColor  = reached ? '#FF6B35' : '#333';
                const iconSize   = 38; 

                return (
                  <View key={tier.days} style={[s.gridCard, reached && s.gridCardReached]}>
                    <Text style={[s.gridDayText, reached && s.gridDayTextReached]}>ДЕНЬ {tier.days}</Text>
                    <View style={s.gridIconWrap}>
                      <tier.Icon color={iconColor} size={iconSize} />
                    </View>
                    <Text style={[s.gridDiscountText, reached && s.gridDiscountTextReached]}>
                      {tier.discount > 0 ? `${tier.discount}%` : '0%'}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          <TouchableOpacity style={s.submitButton} onPress={onClose}>
            <Text style={s.submitButtonText}>ЗАКРЫТЬ</Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay:  { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)' },
  sheet: {
    backgroundColor: '#000',
    borderRadius: 24,
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { color: '#FF6B35', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  closeBtn:    { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center' },

  loadingWrap: { height: 300, justifyContent: 'center', alignItems: 'center' },

  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },

  gridCard: {
    width: '23%', 
    aspectRatio: 1, // делает карточку идеально квадратной
    backgroundColor: '#111',
    borderRadius: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#222',
    marginBottom: 10,
  },
  gridCardReached: { 
    borderColor: '#FF6B35'
  },
  gridDayText: { 
    color: '#444', 
    fontSize: 9, 
    fontWeight: '800', 
    textTransform: 'uppercase' 
  },
  gridDayTextReached: { 
    color: '#fff' 
  },
  gridIconWrap: { 
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridDiscountText: { 
    color: '#333', 
    fontSize: 14, 
    fontWeight: '900' 
  },
  gridDiscountTextReached: { 
    color: '#fff' 
  },

  submitButton: {
    backgroundColor: '#FFCC00',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
});