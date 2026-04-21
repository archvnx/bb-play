import React from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

export const CheckIcon = ({ size = 16, color = '#00CC66' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M20 6L9 17L4 12" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const LockIcon = ({ size = 14, color = '#FF4444' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="11" width="18" height="11" rx="2" stroke={color} strokeWidth="2" />
    <Path d="M7 11V7C7 4.24 9.24 2 12 2C14.76 2 17 4.24 17 7V11" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

export const MoneyIcon = ({ size = 14, color = '#FFCC00' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
    <Path d="M12 7V17 M9 9.5H13.5C14.33 9.5 15 10.17 15 11C15 11.83 14.33 12.5 13.5 12.5H10.5C9.67 12.5 9 13.17 9 14C9 14.83 9.67 15.5 10.5 15.5H15" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

export const MapIcon = ({ size = 16, color = '#555' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 7L9 4L15 7L21 4V17L15 20L9 17L3 20V7Z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M9 4V17M15 7V20" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

export const ListIcon = ({ size = 16, color = '#555' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M8 6H21M8 12H21M8 18H21M3 6H3.01M3 12H3.01M3 18H3.01" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
