import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  Animated, Easing, Dimensions, ActivityIndicator, Alert,
} from 'react-native';
import Svg, { Path, Polygon, G } from 'react-native-svg';
import { spinWheel } from '../../services/backendService';
import type { WheelStatus, SpinResult, PrizeType } from '../../types/backend';

// ─── Встроенные SVG Иконки ───────────────────────────────────────────────────
const Icons = {
  free_mins: ({ color = "#fff", size = 24 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2"/></Svg>
  ),
  topup_bonus: ({ color = "#fff", size = 24 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></Svg>
  ),
  booking_discount: ({ color = "#fff", size = 24 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Path d="M19 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zM15 5v14M9 5v14"/></Svg>
  ),
  nothing: ({ color = "#fff", size = 24 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Path d="M18 6L6 18M6 6l12 12"/></Svg>
  ),
  star: ({ color = "#FFCC00", size = 24 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></Svg>
  ),
  close: ({ color = "#666", size = 24 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Path d="M18 6L6 18M6 6l12 12"/></Svg>
  )
};

const getPrizeIcon = (type: PrizeType, color = "#fff", size = 24) => {
  const Icon = Icons[type] || Icons.nothing;
  return <Icon color={color} size={size} />;
};

// ─── Размеры и Цвета ──────────────────────────────────────────────────────────
const { width: SCREEN_W } = Dimensions.get('window');
const WHEEL_D = Math.min(SCREEN_W - 60, 280);
const R = WHEEL_D / 2;

const SECTOR_COLORS = ['#FFCC00', '#FF6B35', '#7C3AED', '#16A34A', '#2563EB', '#DB2777', '#D97706', '#0D9488'];

// ─── Математика SVG секторов ──────────────────────────────────────────────────
const polarToCartesian = (cx: number, cy: number, r: number, angleInDegrees: number) => {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return { x: cx + (r * Math.cos(angleInRadians)), y: cy + (r * Math.sin(angleInRadians)) };
};

const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return ["M", x, y, "L", start.x, start.y, "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y, "Z"].join(" ");
};

// ─── Компонент ────────────────────────────────────────────────────────────────
type Phase = 'idle' | 'spinning' | 'result';

interface Props {
  visible: boolean;
  status: WheelStatus | null;
  memberId: string;
  onClose: () => void;
  onSpinDone: (result: SpinResult) => void;
}

export function FortuneWheelModal({ visible, status, memberId, onClose, onSpinDone }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<SpinResult | null>(null);

  const rotVal = useRef(new Animated.Value(0)).current;
  const actualDeg = useRef(0);
  const fastActive = useRef(false);

  useEffect(() => {
    const id = rotVal.addListener(({ value }) => { actualDeg.current = value; });
    return () => rotVal.removeListener(id);
  }, [rotVal]);

  useEffect(() => {
    if (!visible) {
      fastActive.current = false;
      rotVal.stopAnimation();
      setPhase('idle');
      setResult(null);
    }
  }, [visible, rotVal]);

  const spinFastStep = useCallback(() => {
    if (!fastActive.current) return;
    const target = actualDeg.current + 360;
    Animated.timing(rotVal, { toValue: target, duration: 420, easing: Easing.linear, useNativeDriver: true })
      .start(({ finished }) => { if (finished && fastActive.current) spinFastStep(); });
  }, [rotVal]);

  const handleSpin = async () => {
    if (phase !== 'idle' || !status?.canSpin) return;
    setPhase('spinning');
    fastActive.current = true;
    spinFastStep();

    try {
      const res = await spinWheel(memberId);
      fastActive.current = false;
      rotVal.stopAnimation();

      const n = (status?.sectors?.length) || 8;
      const sectorAngle = 360 / n;
      const centerOfSector = res.sectorIndex * sectorAngle + (sectorAngle / 2);
      const targetMod = (360 - centerOfSector) % 360;
      const currentMod = actualDeg.current % 360;
      const diff = ((targetMod - currentMod) + 360) % 360;
      const finalDeg = actualDeg.current + diff + 4 * 360;

      Animated.timing(rotVal, {
        toValue: finalDeg,
        duration: 3500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        setResult(res);
        setPhase('result');
        onSpinDone(res);
      });
    } catch (e: any) {
      fastActive.current = false;
      rotVal.stopAnimation();
      setPhase('idle');
      Alert.alert('Ошибка', e?.response?.data?.message ?? 'Попробуй позже');
    }
  };

  const rotate = rotVal.interpolate({ inputRange: [0, 36000], outputRange: ['0deg', '36000deg'] });
  const sectors = status?.sectors ?? [];
  const n = sectors.length || 8;
  const sectorAngle = 360 / n;
  const canSpin = status?.canSpin ?? false;

  const countdown = (() => {
    if (canSpin || !status?.nextSpinAt) return '';
    const diff = new Date(status.nextSpinAt).getTime() - Date.now();
    if (diff <= 0) return '';
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    return `через ${h}ч ${m}м`;
  })();

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={s.overlay}>
        <TouchableOpacity style={s.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={s.sheet}>
          
          <View style={s.header}>
            <View style={s.headerLeft}>
              <Icons.star size={22} color="#FFCC00" />
              <Text style={s.headerTitle}>ЕЖЕДНЕВНЫЙ ПОДАРОК</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={s.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icons.close size={16} color="#888" />
            </TouchableOpacity>
          </View>

          <View style={s.wheelArea}>
            <View style={s.pointerWrap}>
              <Svg width="24" height="24" viewBox="0 0 24 24">
                <Polygon points="12,22 4,6 20,6" fill="#FFCC00" />
              </Svg>
            </View>

            <View style={[s.wheelGlow, { width: WHEEL_D + 20, height: WHEEL_D + 20, borderRadius: (WHEEL_D + 20) / 2 }]} />

            <Animated.View style={[s.wheel, { width: WHEEL_D, height: WHEEL_D, borderRadius: R, transform: [{ rotate }] }]}>
              <Svg width={WHEEL_D} height={WHEEL_D} style={StyleSheet.absoluteFill}>
                {sectors.map((_, i) => (
                  <Path
                    key={`slice_${i}`}
                    d={describeArc(R, R, R, i * sectorAngle, (i + 1) * sectorAngle)}
                    fill={SECTOR_COLORS[i % SECTOR_COLORS.length]}
                    stroke="#111"
                    strokeWidth="1.5"
                  />
                ))}
              </Svg>

              {sectors.map((sec, i) => (
                <View
                  key={`content_${i}`}
                  style={[
                    StyleSheet.absoluteFill,
                    { transform: [{ rotate: `${i * sectorAngle + sectorAngle / 2}deg` }], alignItems: 'center', paddingTop: 10 }
                  ]}
                >
                  {getPrizeIcon(sec.type, '#111', 18)}
                  <Text style={s.sliceText}>{sec.label}</Text>
                </View>
              ))}

              <View style={[s.wheelCenter, { width: WHEEL_D * 0.22, height: WHEEL_D * 0.22, borderRadius: WHEEL_D * 0.11, top: R - WHEEL_D * 0.11, left: R - WHEEL_D * 0.11 }]}>
                <Icons.star size={WHEEL_D * 0.1} color="#FFCC00" />
              </View>
            </Animated.View>
          </View>

          {/* Результат */}
          {phase === 'result' && result && (
            <View style={s.resultCard}>
              <View style={{ marginBottom: 12 }}>{getPrizeIcon(result.prizeType, '#FFCC00', 48)}</View>
              <Text style={s.resultTitle}>{result.prizeLabel}</Text>
              {result.prizeType !== 'nothing' && result.promoCode && (
                <>
                  <Text style={s.promoLabel}>ВАШ ПРОМОКОД</Text>
                  <View style={s.promoBadge}>
                    <Text style={s.promoCode}>{result.promoCode}</Text>
                  </View>
                  <Text style={s.promoHint}>
                    Промокод можно найти во вкладке Профиль
                  </Text>
                </>
              )}
              {result.prizeType === 'nothing' && (
                <Text style={s.nothingText}>Повезет в следующий раз</Text>
              )}
            </View>
          )}

          {/* Кнопки */}
          {phase !== 'result' ? (
            <TouchableOpacity
              style={[s.spinBtn, (!canSpin || phase === 'spinning') && s.spinBtnOff]}
              onPress={handleSpin}
              disabled={!canSpin || phase === 'spinning'}
              activeOpacity={0.85}
            >
              {phase === 'spinning'
                ? <ActivityIndicator color="#000" size="small" />
                : <Text style={canSpin ? s.spinBtnText : s.spinBtnTextOff}>
                    {canSpin ? 'КРУТИТЬ КОЛЕСО' : `СЛЕДУЮЩИЙ ШАНС ${countdown}`}
                  </Text>
              }
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={s.doneBtn} onPress={onClose} activeOpacity={0.85}>
              <Text style={s.doneBtnText}>Отлично</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', paddingHorizontal: 0 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.85)' },
  sheet: {
    backgroundColor: '#0A0A0A',
    borderRadius: 32,
    borderWidth: 1, borderColor: '#1F1F1F',
    paddingHorizontal: 24, paddingBottom: 32, paddingTop: 12,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingVertical: 16, marginBottom: 10 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { color: '#FFCC00', fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center' },
  wheelArea: { alignItems: 'center', justifyContent: 'center', marginBottom: 24, position: 'relative' },
  pointerWrap: { position: 'absolute', top: -14, zIndex: 10, alignItems: 'center' },
  wheelGlow: { position: 'absolute', borderWidth: 2, borderColor: '#FFCC0033', shadowColor: '#FFCC00', shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
  wheel: { overflow: 'hidden', borderWidth: 4, borderColor: '#111', backgroundColor: '#111' },
  sliceText: { color: '#111', fontSize: 9, fontWeight: '900', textAlign: 'center', marginTop: 2, width: 44 },
  wheelCenter: { position: 'absolute', backgroundColor: '#111', borderWidth: 4, borderColor: '#FFCC00', alignItems: 'center', justifyContent: 'center', zIndex: 5, shadowColor: '#000', shadowOpacity: 0.8, shadowRadius: 10 },
  resultCard: { width: '100%', backgroundColor: '#111', borderRadius: 24, borderWidth: 1.5, borderColor: '#FFCC00', padding: 24, alignItems: 'center', marginBottom: 24 },
  resultTitle: { color: '#fff', fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 20 },
  promoLabel: { color: '#666', fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 8 },
  promoBadge: { backgroundColor: '#1A1A1A', borderRadius: 16, borderWidth: 1, borderColor: '#FFCC00', paddingHorizontal: 28, paddingVertical: 14, marginBottom: 14 },
  promoCode: { color: '#FFCC00', fontSize: 26, fontWeight: '900', letterSpacing: 4 },
  promoHint: { color: '#555', fontSize: 12, textAlign: 'center', lineHeight: 18 },
  nothingText: { color: '#777', fontSize: 15, marginTop: 4 },
  spinBtn: { backgroundColor: '#FFCC00', borderRadius: 18, paddingVertical: 18, width: '100%', alignItems: 'center', shadowColor: '#FFCC00', shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  spinBtnOff: { backgroundColor: '#1A1A1A', shadowOpacity: 0, elevation: 0, borderWidth: 1, borderColor: '#2A2A2A' },
  spinBtnText: { color: '#000', fontWeight: '900', fontSize: 15, letterSpacing: 1 },
  spinBtnTextOff: { color: '#666', fontWeight: '900', fontSize: 13, letterSpacing: 1 },
  doneBtn: { backgroundColor: '#1A1A1A', borderRadius: 18, paddingVertical: 18, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  doneBtnText: { color: '#FFF', fontWeight: '900', fontSize: 15 },
});