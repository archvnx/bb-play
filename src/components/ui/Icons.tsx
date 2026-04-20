import React from 'react';
import Svg, { Path, Circle, Rect, G, Line, Polyline } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

// Home icon
export const HomeIcon = ({ size = 24, color = '#fff', strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 9.5L12 3L21 9.5V20C21 20.5523 20.5523 21 20 21H15V15H9V21H4C3.44772 21 3 20.5523 3 20V9.5Z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Calendar / Booking icon
export const BookingIcon = ({ size = 24, color = '#fff', strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="4" width="18" height="18" rx="3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Path d="M3 10H21" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Path d="M8 2V6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Path d="M16 2V6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Path d="M8 14H10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Path d="M14 14H16" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Path d="M8 17.5H10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Path d="M14 17.5H16" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </Svg>
);

// News / newspaper icon
export const NewsIcon = ({ size = 24, color = '#fff', strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="18" height="18" rx="3" stroke={color} strokeWidth={strokeWidth} />
    <Path d="M7 8H13" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Path d="M7 12H17" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Path d="M7 16H14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Rect x="14" y="7" width="4" height="3" rx="0.5" stroke={color} strokeWidth={strokeWidth} />
  </Svg>
);

// Chat / Bot icon
export const BotIcon = ({ size = 24, color = '#fff', strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="8" width="18" height="13" rx="3" stroke={color} strokeWidth={strokeWidth} />
    <Circle cx="9" cy="14" r="1.5" fill={color} />
    <Circle cx="15" cy="14" r="1.5" fill={color} />
    <Path d="M9 18H15" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Path d="M12 8V4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Circle cx="12" cy="3" r="1" fill={color} />
    <Path d="M7 8L5 6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Path d="M17 8L19 6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </Svg>
);

// Profile / User icon
export const ProfileIcon = ({ size = 24, color = '#fff', strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth={strokeWidth} />
    <Path
      d="M4 20C4 17.2386 7.58172 15 12 15C16.4183 15 20 17.2386 20 20"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
  </Svg>
);

// Arrow right icon (chevron)
export const ArrowRightIcon = ({ size = 18, color = '#FFCC00', strokeWidth = 2.5 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M9 18L15 12L9 6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Edit / Pencil icon
export const EditIcon = ({ size = 16, color = '#FFCC00', strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M11 4H4C3.44772 4 3 4.44772 3 5V20C3 20.5523 3.44772 21 4 21H19C19.5523 21 20 20.5523 20 19V12"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
    <Path
      d="M18.5 2.5C19.3284 1.67157 20.6716 1.67157 21.5 2.5C22.3284 3.32843 22.3284 4.67157 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Camera icon (for avatar hint)
export const CameraIcon = ({ size = 14, color = '#FFCC00', strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M23 19C23 20.1046 22.1046 21 21 21H3C1.89543 21 1 20.1046 1 19V8C1 6.89543 1.89543 6 3 6H7L9 3H15L17 6H21C22.1046 6 23 6.89543 23 8V19Z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx="12" cy="13" r="4" stroke={color} strokeWidth={strokeWidth} />
  </Svg>
);

// Wallet / Topup icon
export const WalletIcon = ({ size = 18, color = '#000', strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="2" y="6" width="20" height="14" rx="3" stroke={color} strokeWidth={strokeWidth} />
    <Path d="M2 10H22" stroke={color} strokeWidth={strokeWidth} />
    <Circle cx="17" cy="15" r="1.5" fill={color} />
    <Path d="M6 3L18 3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </Svg>
);

// Refresh icon
export const RefreshIcon = ({ size = 20, color = '#FFCC00', strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M23 4V10H17"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M20.49 15C19.84 16.8 18.62 18.35 17 19.41C15.38 20.47 13.47 21 11.53 21C9.59 21 7.68 20.47 6.06 19.41C4.44 18.35 3.22 16.8 2.57 15C1.92 13.2 1.97 11.24 2.7 9.47C3.43 7.7 4.79 6.22 6.52 5.27C8.24 4.32 10.23 3.96 12.17 4.22C14.11 4.48 15.94 5.35 17.37 6.72L23 12"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Logout icon
export const LogoutIcon = ({ size = 18, color = '#FF4444', strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path d="M16 17L21 12L16 7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M21 12H9" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// VK icon
export const VkIcon = ({ size = 16, color = '#5181B8' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17H17.42c-.472 0-.617-.374-1.467-1.226-1.108-1.12-.67-1.79-.67-1.79s-.143-.197 0-.395l1.143-1.63c.337-.48.65-1.02.47-1.334-.155-.282-.69-.206-.69-.206H14.09c-.437 0-.557.248-.557.248s-1.19 3.13-1.69 4.022c-.5.893-.69.71-.84.673-.157-.037-.233-.178-.233-.178V12c0-.45.16-.63.16-.63s.107-.155-.355-.155h-2.13c-.317 0-.463.235-.463.235s-1.447 2.18-2.037 3.197c-.59 1.016-.88.762-.88.762s-.383-.144-.383-.58V12.14c0-.41-.148-.62-.148-.62s-.188-.26-.62-.26H4.07c-.428 0-.428.28-.428.28s-.016 3.59 1.675 4.87c1.69 1.28 3.193.187 3.193.187s.635-.357 1.155-1.02v.98c0 .55.154.804.46.804h1.52c1.33 0 1.52-1.28 1.52-1.28l.44-1.56c.024.09.05.18.09.27.3.88.93 1.57 1.55 1.57h1.928c.63 0 .75-.35.75-.35s.078-.22-.09-.59z" />
  </Svg>
);

// Expand arrow down
export const ChevronDownIcon = ({ size = 16, color = '#FFCC00', strokeWidth = 2.5 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M6 9L12 15L18 9" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Expand arrow up
export const ChevronUpIcon = ({ size = 16, color = '#FFCC00', strokeWidth = 2.5 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 15L12 9L6 15" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Controller icon for clubs
export const ControllerIcon = ({ size = 28, color = '#FFCC00', strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="2" y="8" width="20" height="12" rx="4" stroke={color} strokeWidth={strokeWidth} />
    <Path d="M8 12V16" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Path d="M6 14H10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Circle cx="15" cy="13" r="1" fill={color} />
    <Circle cx="17" cy="15" r="1" fill={color} />
  </Svg>
);
