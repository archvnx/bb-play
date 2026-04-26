import React from 'react';
import { View, Text as RNText, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import type { StreakInfo } from '../../types/backend';

interface Props {
  streak: StreakInfo | null;
  theme?: 'light' | 'dark'; // light = жёлтая карточка (Home), dark = тёмная карточка (Profile)
}

const MARKS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function StreakMeter({ streak, theme = 'light' }: Props) {
  const currentDiscount = streak?.discountPct ?? 0;
  const currentStreak = streak?.currentStreak ?? 0;

  const fillWidth = (currentDiscount / 10) * 100;

  const isDark = theme === 'dark';

  const textColor  = isDark ? '#fff' : '#000';
  const streakColor = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)';
  const barBg      = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)';
  const markStroke = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)';
  const pctFill    = currentDiscount > 5 ? '#FFF' : isDark ? '#fff' : '#000';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <RNText style={[styles.title, { color: textColor }]}>
          СКИДКА НА БРОНЬ
        </RNText>
        <RNText style={[styles.streakInfo, { color: streakColor }]}>
          {currentStreak} дн. серия
        </RNText>
      </View>

      <View style={styles.svgWrapper}>
        <Svg width="100%" height="32">
          <Rect x="0" y="0" width="100%" height="32" rx="16" fill={barBg} />
          <Rect
            x="0" y="0"
            width={`${fillWidth}%`}
            height="32"
            rx="16"
            fill="#FF6B35"
          />
          {MARKS.map((m) => (
            <Line
              key={m}
              x1={`${(m / 10) * 100}%`} y1="8"
              x2={`${(m / 10) * 100}%`} y2="24"
              stroke={markStroke}
              strokeWidth="1"
              strokeDasharray="2, 2"
            />
          ))}
          <SvgText
            x="50%"
            y="20"
            fontSize="13"
            fontWeight="900"
            fill={pctFill}
            textAnchor="middle"
            letterSpacing="1"
          >
            {currentDiscount} %
          </SvgText>
        </Svg>
      </View>

      <View style={styles.footer}>
        <RNText style={[styles.markText, { color: textColor }]}>0%</RNText>
        <RNText style={[styles.markText, { color: textColor }]}>МАКС: 10%</RNText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 6,
    marginBottom: 4,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    opacity: 0.4,
  },
  streakInfo: {
    fontSize: 11,
    fontWeight: '800',
  },
  svgWrapper: {
    height: 32,
    width: '100%',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  markText: {
    fontSize: 9,
    fontWeight: '700',
    opacity: 0.3,
  },
});