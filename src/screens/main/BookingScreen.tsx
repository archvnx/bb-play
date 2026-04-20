import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Modal, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../../store/useAuthStore';
import { useBookingStore } from '../../store/useBookingStore';
import { get, post } from '../../api/apiClient';
import { ArrowRightIcon, BookingIcon, RefreshIcon, ChevronDownIcon } from '../../components/ui/Icons';
import Svg, { Path, Circle, Rect, G, Text as SvgText } from 'react-native-svg';

// ─── Константы карты ─────────────────────────────────────────────────────────
const SCREEN_W = Dimensions.get('window').width;

// ─── Маппинг зон ПК → зоны пакетов ──────────────────────────────────────────
const ZONE_MAP: Record<string, string> = {
  GameZone: 'GZ',
  BootCamp: 'BC',
  VIP: 'VP',
};
const PKG_ZONE_STYLES: Record<string, { accent: string }> = {
  BC:      { accent: '#9333EA' },
  GZ:      { accent: '#22C55E' },
  VP:      { accent: '#F59E0B' },
  default: { accent: '#FFCC00' },
};
const PKG_ZONE_NAMES: Record<string, string> = {
  BC: 'BC',
  GZ: 'GZ',
  VP: 'VIP',
};

// ─── MD5 + генерация ключа бронирования ──────────────────────────────────────
function md5(str: string): string {
  function safeAdd(x: number, y: number) { const lsw = (x & 0xffff) + (y & 0xffff); const msw = (x >> 16) + (y >> 16) + (lsw >> 16); return (msw << 16) | (lsw & 0xffff); }
  function bitRotateLeft(num: number, cnt: number) { return (num << cnt) | (num >>> (32 - cnt)); }
  function md5cmn(q: number, a: number, b: number, x: number, s: number, t: number) { return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b); }
  function md5ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return md5cmn((b & c) | (~b & d), a, b, x, s, t); }
  function md5gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return md5cmn((b & d) | (c & ~d), a, b, x, s, t); }
  function md5hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return md5cmn(b ^ c ^ d, a, b, x, s, t); }
  function md5ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return md5cmn(c ^ (b | ~d), a, b, x, s, t); }
  function utf8Encode(s: string) { return unescape(encodeURIComponent(s)); }
  function str2binl(str: string) { const bin: number[] = []; const mask = (1 << 8) - 1; for (let i = 0; i < str.length * 8; i += 8) { bin[i >> 5] |= (str.charCodeAt(i / 8) & mask) << (i % 32); } return bin; }
  function binl2hex(binarray: number[]) { const hex = '0123456789abcdef'; let str2 = ''; for (let i = 0; i < binarray.length * 4; i++) { str2 += hex.charAt((binarray[i >> 2] >> ((i % 4) * 8 + 4)) & 0xf) + hex.charAt((binarray[i >> 2] >> ((i % 4) * 8)) & 0xf); } return str2; }
  function coreMd5(x: number[], len: number) {
    x[len >> 5] |= 0x80 << (len % 32); x[(((len + 64) >>> 9) << 4) + 14] = len;
    let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
    for (let i = 0; i < x.length; i += 16) {
      const olda = a, oldb = b, oldc = c, oldd = d;
      a = md5ff(a, b, c, d, x[i], 7, -680876936); d = md5ff(d, a, b, c, x[i + 1], 12, -389564586); c = md5ff(c, d, a, b, x[i + 2], 17, 606105819); b = md5ff(b, c, d, a, x[i + 3], 22, -1044525330);
      a = md5ff(a, b, c, d, x[i + 4], 7, -176418897); d = md5ff(d, a, b, c, x[i + 5], 12, 1200080426); c = md5ff(c, d, a, b, x[i + 6], 17, -1473231341); b = md5ff(b, c, d, a, x[i + 7], 22, -45705983);
      a = md5ff(a, b, c, d, x[i + 8], 7, 1770035416); d = md5ff(d, a, b, c, x[i + 9], 12, -1958414417); c = md5ff(c, d, a, b, x[i + 10], 17, -42063); b = md5ff(b, c, d, a, x[i + 11], 22, -1990404162);
      a = md5ff(a, b, c, d, x[i + 12], 7, 1804603682); d = md5ff(d, a, b, c, x[i + 13], 12, -40341101); c = md5ff(c, d, a, b, x[i + 14], 17, -1502002290); b = md5ff(b, c, d, a, x[i + 15], 22, 1236535329);
      a = md5gg(a, b, c, d, x[i + 1], 5, -165796510); d = md5gg(d, a, b, c, x[i + 6], 9, -1069501632); c = md5gg(c, d, a, b, x[i + 11], 14, 643717713); b = md5gg(b, c, d, a, x[i], 20, -373897302);
      a = md5gg(a, b, c, d, x[i + 5], 5, -701558691); d = md5gg(d, a, b, c, x[i + 10], 9, 38016083); c = md5gg(c, d, a, b, x[i + 15], 14, -660478335); b = md5gg(b, c, d, a, x[i + 4], 20, -405537848);
      a = md5gg(a, b, c, d, x[i + 9], 5, 568446438); d = md5gg(d, a, b, c, x[i + 14], 9, -1019803690); c = md5gg(c, d, a, b, x[i + 3], 14, -187363961); b = md5gg(b, c, d, a, x[i + 8], 20, 1163531501);
      a = md5gg(a, b, c, d, x[i + 13], 5, -1444681467); d = md5gg(d, a, b, c, x[i + 2], 9, -51403784); c = md5gg(c, d, a, b, x[i + 7], 14, 1735328473); b = md5gg(b, c, d, a, x[i + 12], 20, -1926607734);
      a = md5hh(a, b, c, d, x[i + 5], 4, -378558); d = md5hh(d, a, b, c, x[i + 8], 11, -2022574463); c = md5hh(c, d, a, b, x[i + 11], 16, 1839030562); b = md5hh(b, c, d, a, x[i + 14], 23, -35309556);
      a = md5hh(a, b, c, d, x[i + 1], 4, -1530992060); d = md5hh(d, a, b, c, x[i + 4], 11, 1272893353); c = md5hh(c, d, a, b, x[i + 7], 16, -155497632); b = md5hh(b, c, d, a, x[i + 10], 23, -1094730640);
      a = md5hh(a, b, c, d, x[i + 13], 4, 681279174); d = md5hh(d, a, b, c, x[i], 11, -358537222); c = md5hh(c, d, a, b, x[i + 3], 16, -722521979); b = md5hh(b, c, d, a, x[i + 6], 23, 76029189);
      a = md5hh(a, b, c, d, x[i + 9], 4, -640364487); d = md5hh(d, a, b, c, x[i + 12], 11, -421815835); c = md5hh(c, d, a, b, x[i + 15], 16, 530742520); b = md5hh(b, c, d, a, x[i + 2], 23, -995338651);
      a = md5ii(a, b, c, d, x[i], 6, -198630844); d = md5ii(d, a, b, c, x[i + 7], 10, 1126891415); c = md5ii(c, d, a, b, x[i + 14], 15, -1416354905); b = md5ii(b, c, d, a, x[i + 5], 21, -57434055);
      a = md5ii(a, b, c, d, x[i + 12], 6, 1700485571); d = md5ii(d, a, b, c, x[i + 3], 10, -1894986606); c = md5ii(c, d, a, b, x[i + 10], 15, -1051523); b = md5ii(b, c, d, a, x[i + 1], 21, -2054922799);
      a = md5ii(a, b, c, d, x[i + 8], 6, 1873313359); d = md5ii(d, a, b, c, x[i + 15], 10, -30611744); c = md5ii(c, d, a, b, x[i + 6], 15, -1560198380); b = md5ii(b, c, d, a, x[i + 13], 21, 1309151649);
      a = md5ii(a, b, c, d, x[i + 4], 6, -145523070); d = md5ii(d, a, b, c, x[i + 11], 10, -1120210379); c = md5ii(c, d, a, b, x[i + 2], 15, 718787259); b = md5ii(b, c, d, a, x[i + 9], 21, -343485551);
      a = safeAdd(a, olda); b = safeAdd(b, oldb); c = safeAdd(c, oldc); d = safeAdd(d, oldd);
    }
    return [a, b, c, d];
  }
  const encoded = utf8Encode(str);
  return binl2hex(coreMd5(str2binl(encoded), encoded.length * 8));
}
function generateBookingKey(icafeId: string, pcName: string, login: string, memberId: string, startDate: string, startTime: string, mins: number, randKey: string): string {
  return md5(`${icafeId}${pcName}${login}${memberId}${startDate}${startTime}${mins}${randKey}`);
}
function generateRandKey(): string {
  return String(Math.floor(Math.random() * 89999999999) + 10000000000);
}

// ─── Типы ─────────────────────────────────────────────────────────────────────
interface Cafe { address: string; icafe_id: string | number; }
interface PC { pc_name: string; pc_area_name: string; pc_group_name: string; is_using: boolean; price_name: string; }
interface Price { duration: number; total_price: string; price_name?: string; group_name?: string; }
interface MapPC { pc_name: string; pos_x: number; pos_y: number; area_name: string; }
interface MapArea {
  area_name: string;
  area_frame_x: number;
  area_frame_y: number;
  area_frame_width: number;
  area_frame_height: number;
  color_border: string;
  color_text: string;
}

// ─── Утилиты времени ──────────────────────────────────────────────────────────
function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildTimeOptions(selectedDate: string) {
  const options = [];
  const now = new Date();
  const isToday = selectedDate === getTodayString();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      if (isToday) {
        if (h < currentHour || (h === currentHour && m < currentMin)) continue;
      }
      const hh = String(h).padStart(2, '0'), mm = String(m).padStart(2, '0');
      options.push({ label: `${hh}:${mm}`, value: `${hh}:${mm}` });
    }
  }
  return options;
}

function buildDateOptions() {
  const options = []; const today = new Date();
  const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today); d.setDate(today.getDate() + i);
    const label = i === 0 ? 'Сегодня' : i === 1 ? 'Завтра' : `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
    options.push({ label, value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` });
  }
  return options;
}

function buildDurationOptions() {
  return [
    { label: '30 мин', value: 30 },
    { label: '1 час', value: 60 },
    { label: '2 часа', value: 120 },
    { label: '3 часа', value: 180 },
    { label: '4 часа', value: 240 },
    { label: '5 часов', value: 300 },
  ];
}

// ─── Иконки ───────────────────────────────────────────────────────────────────
const CheckIcon = ({ size = 16, color = '#00CC66' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M20 6L9 17L4 12" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const LockIcon = ({ size = 14, color = '#FF4444' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="11" width="18" height="11" rx="2" stroke={color} strokeWidth="2" />
    <Path d="M7 11V7C7 4.24 9.24 2 12 2C14.76 2 17 4.24 17 7V11" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);
const MoneyIcon = ({ size = 14, color = '#FFCC00' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
    <Path 
      d="M12 7V17 M9 9.5H13.5C14.33 9.5 15 10.17 15 11C15 11.83 14.33 12.5 13.5 12.5H10.5C9.67 12.5 9 13.17 9 14C9 14.83 9.67 15.5 10.5 15.5H15" 
      stroke={color} 
      strokeWidth="1.8" 
      strokeLinecap="round" 
    />
  </Svg>
);
const MapIcon = ({ size = 16, color = '#555' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 7L9 4L15 7L21 4V17L15 20L9 17L3 20V7Z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M9 4V17M15 7V20" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);
const ListIcon = ({ size = 16, color = '#555' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M8 6H21M8 12H21M8 18H21M3 6H3.01M3 12H3.01M3 18H3.01" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─── Модалка выбора ───────────────────────────────────────────────────────────
function PickerModal({ visible, title, options, selected, onSelect, onClose }: any) {
  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={pickerSt.backdrop}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={pickerSt.sheet}>
          <View style={pickerSt.handle} />
          <Text style={pickerSt.title}>{title}</Text>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 340 }}>
            {options.length === 0 ? (
              <Text style={{ color: '#888', textAlign: 'center', marginTop: 20 }}>Нет доступного времени</Text>
            ) : (
              options.map((opt: any) => {
                const isActive = opt.value === selected;
                return (
                  <TouchableOpacity key={String(opt.value)} style={[pickerSt.row, isActive && pickerSt.rowActive]} onPress={() => { onSelect(opt.value); onClose(); }} activeOpacity={0.75}>
                    <Text style={[pickerSt.rowText, isActive && pickerSt.rowTextActive]}>{opt.label}</Text>
                    {isActive && <CheckIcon size={18} color="#000" />}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Модалка успеха ───────────────────────────────────────────────────────────
function SuccessModal({ visible, password, pcName, date, time, mins, cost, onClose }: any) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={successSt.backdrop}>
        <View style={successSt.card}>
          <View style={successSt.iconWrap}><CheckIcon size={36} color="#000" /></View>
          <Text style={successSt.title}>Бронирование подтверждено!</Text>
          <View style={successSt.infoCard}>
            <View style={successSt.infoRow}><Text style={successSt.infoLabel}>Компьютер</Text><Text style={successSt.infoValue}>{pcName}</Text></View>
            <View style={successSt.infoRow}><Text style={successSt.infoLabel}>Дата</Text><Text style={successSt.infoValue}>{date.split('-').reverse().join('.')}</Text></View>
            <View style={successSt.infoRow}><Text style={successSt.infoLabel}>Время</Text><Text style={successSt.infoValue}>{time}</Text></View>
            <View style={successSt.infoRow}><Text style={successSt.infoLabel}>Длительность</Text><Text style={successSt.infoValue}>{mins} мин</Text></View>
            {cost !== undefined && <View style={successSt.infoRow}><Text style={successSt.infoLabel}>Стоимость</Text><Text style={[successSt.infoValue, { color: '#FFCC00' }]}>{cost.toFixed(2)} ₽</Text></View>}
          </View>
          <View style={successSt.passwordWrap}>
            <Text style={successSt.passwordLabel}>КОД ДЛЯ ПК</Text>
            <Text style={successSt.password}>{password}</Text>
          </View>
          <TouchableOpacity style={successSt.btn} onPress={onClose} activeOpacity={0.85}>
            <Text style={successSt.btnText}>Готово</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Легенда карты ────────────────────────────────────────────────────────────
function MapLegend() {
  return (
    <View style={mapSt.legend}>
      <View style={mapSt.legendItem}>
        <View style={[mapSt.legendDot, { backgroundColor: '#1A1A1A', borderColor: '#2A2A2A' }]} />
        <Text style={mapSt.legendText}>Свободен</Text>
      </View>
      <View style={mapSt.legendItem}>
        <View style={[mapSt.legendDot, { backgroundColor: '#FFCC00' }]} />
        <Text style={mapSt.legendText}>Выбран</Text>
      </View>
      <View style={mapSt.legendItem}>
        <View style={[mapSt.legendDot, { backgroundColor: '#991B1B', borderColor: '#EF4444' }]} />
        <Text style={mapSt.legendText}>Занят</Text>
      </View>
    </View>
  );
}

// ─── Главный экран ────────────────────────────────────────────────────────────
export default function BookingScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuthStore();
  const { setRecentBooking } = useBookingStore();

  const [step, setStep] = useState<'club' | 'params' | 'pcs'>('club');
  const [clubs, setClubs] = useState<Cafe[]>([]);
  const [loadingClubs, setLoadingClubs] = useState(true);
  const [selectedClub, setSelectedClub] = useState<Cafe | null>(null);

  const dateOptions = buildDateOptions();
  const [date, setDate] = useState(dateOptions[0].value);
  const timeOptions = buildTimeOptions(date);
  const [time, setTime] = useState(timeOptions.length > 0 ? timeOptions[0].value : '00:00');
  const durationOptions = buildDurationOptions();
  const [mins, setMins] = useState(route.params?.mins || 60);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);

  const [pcs, setPcs] = useState<PC[]>([]);
  const [loadingPcs, setLoadingPcs] = useState(false);
  const [selectedPc, setSelectedPc] = useState<PC | null>(null);
  const [prices, setPrices] = useState<Price[]>([]);

  // ── Map state ──
  const [activeTab, setActiveTab] = useState<'list' | 'map'>('list');
  const [mapData, setMapData] = useState<MapPC[]>([]);
  const [mapAreas, setMapAreas] = useState<MapArea[]>([]);
  const [loadingMap, setLoadingMap] = useState(false);

  const [booking, setBooking] = useState(false);
  const [successData, setSuccessData] = useState<{ password: string; pcName: string; cost?: number; } | null>(null);

  // ── Пакеты с сервера ──
  interface ServerPackage { id: string; label: string; zone: string; value: number; price: number; pricePerHour: number; highlight: boolean; }
  const [serverPackages, setServerPackages] = useState<ServerPackage[]>([]);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);

  const parseName = (raw: string): string => raw?.split('<<<')[0]?.trim() ?? raw;
  const parseZone = (raw: string): string => { const parts = raw?.split('<<<'); return parts?.[parts.length - 1]?.trim() ?? ''; };
  const parseDurationFromName = (name: string): number => {
    const match = name.match(/(\d+)\s*(час|часа|часов)/i);
    if (match) return parseInt(match[1], 10) * 60;
    const matchMin = name.match(/(\d+)\s*мин/i);
    if (matchMin) return parseInt(matchMin[1], 10);
    return 0;
  };

  useEffect(() => {
    const validTimes = buildTimeOptions(date);
    if (validTimes.length > 0 && !validTimes.find(t => t.value === time)) {
      setTime(validTimes[0].value);
    }
  }, [date]);

  // ── Сброс при каждом новом входе с параметрами (фикс: назад → вперёд) ──
  const lastTimestamp = useRef<number | undefined>(undefined);
  useFocusEffect(
    useCallback(() => {
      const t = route.params?._t;
      // Если _t изменился (новое нажатие из HomeScreen) — сбрасываем состояние
      if (t !== undefined && t !== lastTimestamp.current) {
        lastTimestamp.current = t;
        // Сброс шага и выбранных значений
        setStep('club');
        setSelectedClub(null);
        setSelectedPc(null);
        setPcs([]);
        setSuccessData(null);

        const passedCafeId = route.params?.cafeId;
        const passedDate = route.params?.date;
        const passedTime = route.params?.time;
        const passedMins = route.params?.mins;
        const passedPcName = route.params?.pcName;
        const resetStep = route.params?._resetStep ?? 'club';

        if (passedDate) setDate(passedDate);
        if (passedTime) setTime(passedTime);
        if (passedMins) setMins(passedMins);

        if (passedCafeId && clubs.length > 0) {
          const found = clubs.find((c) => String(c.icafe_id) === String(passedCafeId));
          if (found) {
            setSelectedClub(found);
            setStep(resetStep === 'pcs' ? 'pcs' : 'params');
            if (resetStep === 'pcs') {
              setPendingPcName(passedPcName ?? null);
            }
          }
        } else if (passedCafeId) {
          // Клубы ещё не загружены — ставим флаг для последующего эффекта
          setPendingCafeId(passedCafeId);
          setPendingResetStep(resetStep);
          setPendingPcName(passedPcName ?? null);
        } else if (resetStep === 'club') {
          setStep('club');
        }
      }
    }, [route.params?._t])
  );

  // Состояния для отложенного применения параметров (клубы ещё не загружены)
  const [pendingCafeId, setPendingCafeId] = useState<string | null>(null);
  const [pendingResetStep, setPendingResetStep] = useState<string>('club');
  const [pendingPcName, setPendingPcName] = useState<string | null>(null);

  useEffect(() => {
    get<any>('/cafes').then((data) => {
      const mappedClubs = (Array.isArray(data) ? data : []).map((c: any) => ({ address: c.address, icafe_id: String(c.icafe_id) }));
      setClubs(mappedClubs);

      // Первоначальная загрузка: если параметры пришли до загрузки клубов
      const passedCafeId = route.params?.cafeId ?? pendingCafeId;
      if (passedCafeId && mappedClubs.length > 0) {
        const found = mappedClubs.find((c: Cafe) => String(c.icafe_id) === String(passedCafeId));
        if (found) {
          setSelectedClub(found);
          const resetStep = pendingResetStep || (route.params?._resetStep ?? 'params');
          setStep(resetStep === 'pcs' ? 'pcs' : 'params');
        }
        setPendingCafeId(null);
      }
    }).finally(() => setLoadingClubs(false));
  }, []);

  useEffect(() => {
    if (selectedClub && user?.member_id) {
      get('/all-prices-icafe', { cafeId: selectedClub.icafe_id, memberId: user.member_id })
        .then((data: any) => setPrices(Array.isArray(data?.prices) ? data.prices : []))
        .catch(() => {});

      get<any>(`/api/v2/cafe/${selectedClub.icafe_id}/products`)
        .then((data: any) => {
          const items: any[] = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
          const seen = new Set<string>();
          const unique = items.filter((p: any) => { const id = String(p.product_id); if (seen.has(id)) return false; seen.add(id); return true; });
          const parsed: ServerPackage[] = unique
            .filter((p: any) => p.product_enable_client !== 0)
            .map((p: any) => {
              const raw: string = p.product_name ?? '';
              const label = parseName(raw);
              const zone = parseZone(raw);
              const value = parseDurationFromName(label);
              const price = parseFloat(p.product_cost ?? p.product_price ?? '0');
              const pricePerHour = value > 0 ? Math.round(price / (value / 60)) : 0;
              return { id: String(p.product_id), label, zone, value, price, pricePerHour, highlight: false };
            })
            .filter((p) => p.value > 0 && p.price > 0)
            .sort((a, b) => a.value - b.value || a.zone.localeCompare(b.zone));
          if (parsed.length > 0) parsed[parsed.length - 1].highlight = true;
          setServerPackages(parsed);
        })
        .catch(() => {});
    }
  }, [selectedClub, user]);

  // ── Загрузка структуры карты ──
  const loadMapStructure = useCallback(async () => {
    if (!selectedClub) return;
    setLoadingMap(true);
    try {
      const data: any = await get('/struct-rooms-icafe', { cafeId: selectedClub.icafe_id });
      const rooms: any[] = Array.isArray(data?.rooms) ? data.rooms : [];

      setMapAreas(rooms.map(r => ({
        area_name: r.area_name,
        area_frame_x: r.area_frame_x ?? 0,
        area_frame_y: r.area_frame_y ?? 0,
        area_frame_width: r.area_frame_width ?? 120,
        area_frame_height: r.area_frame_height ?? 120,
        color_border: r.color_border ?? '#FFFFFF33',
        color_text: r.color_text ?? '#FFFFFF99',
      })));

      const PC_BOX_SIZE = 50;
      const pcsFlat: MapPC[] = rooms.flatMap((room: any) =>
        (Array.isArray(room.pcs_list) ? room.pcs_list : []).map((pc: any) => {
          const relX = pc.pc_box_left ?? 0;
          const relY = pc.pc_box_top ?? 0;
          const zoneW = room.area_frame_width ?? 120;
          const zoneH = room.area_frame_height ?? 120;
          const clampedX = Math.max(0, Math.min(relX, zoneW - PC_BOX_SIZE));
          const clampedY = Math.max(0, Math.min(relY, zoneH - PC_BOX_SIZE));
          return {
            pc_name: pc.pc_name,
            area_name: room.area_name,
            pos_x: (room.area_frame_x ?? 0) + clampedX,
            pos_y: (room.area_frame_y ?? 0) + clampedY,
          };
        })
      );
      setMapData(pcsFlat);
    } catch (e) {
      setMapData([]);
      setMapAreas([]);
    } finally {
      setLoadingMap(false);
    }
  }, [selectedClub]);

  const loadPcs = useCallback(async () => {
    if (!selectedClub) return;
    setLoadingPcs(true); setPcs([]); setSelectedPc(null);
    try {
      const pcData: any = await get('/available-pcs-for-booking', {
        cafeId: selectedClub.icafe_id, dateStart: date, timeStart: time, mins, isFindWindow: true,
      });
      setPcs(Array.isArray(pcData?.pc_list) ? pcData.pc_list : []);
    } catch {
      Alert.alert('Ошибка', 'Не удалось загрузить список ПК');
    } finally { setLoadingPcs(false); }
  }, [selectedClub, date, time, mins]);

  useEffect(() => {
    if (step === 'pcs') {
      loadPcs();
      loadMapStructure();
    }
  }, [step]);

  // ── Автовыбор ПК по имени после загрузки ──────────────────────────────────
  useEffect(() => {
    if (pendingPcName && pcs.length > 0) {
      const found = pcs.find(pc => pc.pc_name.toLowerCase() === pendingPcName.toLowerCase() && !pc.is_using);
      if (found) {
        setSelectedPc(found);
      }
      setPendingPcName(null);
    }
  }, [pcs, pendingPcName]);

  const pcGroups = pcs.reduce<Record<string, PC[]>>((acc, pc) => {
    const zone = pc.pc_area_name || pc.pc_group_name || 'Основной зал';
    if (!acc[zone]) acc[zone] = [];
    acc[zone].push(pc); return acc;
  }, {});

  const matchedPriceObj = prices.find(p => p.duration === mins && (selectedPc ? p.price_name === selectedPc.price_name : true));
  const rawPrice = matchedPriceObj?.total_price || prices.find(p => p.duration === mins)?.total_price;
  const estimatedPrice = (() => {
    if (selectedPc && selectedDuration) {
      const zone = ZONE_MAP[selectedPc.pc_area_name] ?? selectedPc.pc_area_name;
      const pkg = serverPackages.find(p => p.value === selectedDuration && p.zone === zone);
      if (pkg) return pkg.price;
    }
    return rawPrice !== undefined ? parseFloat(String(rawPrice)) : undefined;
  })();

  const handleBook = async () => {
  if (!selectedPc || !selectedClub || !user) return;
  setBooking(true);
  try {
    const randKey = generateRandKey();
    const key = generateBookingKey(
      String(selectedClub.icafe_id),
      selectedPc.pc_name,
      user.member_account,
      user.member_id,
      date, time, mins, randKey
    );
    const result: any = await post('/booking', {
      icafe_id: String(selectedClub.icafe_id),
      pc_name: selectedPc.pc_name,
      member_account: user.member_account,
      member_id: user.member_id,
      start_date: date,
      start_time: time,
      mins,
      rand_key: randKey,
      key,
    });
    const pwd = result?.iCafe_response?.data?.booking_password
      || result?.booking_password
      || result?.data?.booking_password;
    if (!pwd) throw new Error(
      result?.message || result?.iCafe_response?.message
      || 'У вас уже есть активная бронь или выбранное время занято.'
    );
    const cost = result?.booking_cost || result?.iCafe_response?.data?.cost || estimatedPrice;
    setRecentBooking({
      cafeId: String(selectedClub.icafe_id),
      cafeAddress: selectedClub.address,
      pcName: selectedPc.pc_name,
      startDate: date,
      startTime: time,
      mins,
      password: String(pwd),
      timestamp: Date.now(),
      account: user.member_account, // ← добавлено
    });
    setSuccessData({ password: String(pwd), pcName: selectedPc.pc_name, cost });
  } catch (e: any) {
    const msg = e?.message || '';
    if (msg.includes('600') || msg.toLowerCase().includes('occupied'))
      Alert.alert('Занято', 'Этот компьютер уже забронирован. Выберите другой ПК или время.');
    else Alert.alert('Ошибка бронирования', msg);
  } finally {
    setBooking(false);
  }
};

  // ─── Шаг 1: Клуб ──────────────────────────────────────────────────────────
  const renderClubStep = () => (
    <ScrollView style={st.content} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={st.sectionTitle}>ВЫБЕРИТЕ КЛУБ</Text>
      {loadingClubs ? <ActivityIndicator color="#FFCC00" style={{ marginTop: 40 }} /> : clubs.length === 0 ? <Text style={st.emptyText}>Клубы не найдены</Text> : (
        clubs.map((club) => (
          <TouchableOpacity key={String(club.icafe_id)} style={st.clubCard} onPress={() => { setSelectedClub(club); setStep('params'); }} activeOpacity={0.8}>
            <View style={st.clubIconWrap}><BookingIcon size={22} color="#FFCC00" strokeWidth={2} /></View>
            <View style={{ flex: 1 }}><Text style={st.clubAddress}>{club.address}</Text><Text style={st.clubId}>ID: {club.icafe_id}</Text></View>
            <ArrowRightIcon size={18} color="#555" strokeWidth={2} />
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );

  // ─── Шаг 2: Параметры ─────────────────────────────────────────────────────
  const renderParamsStep = () => {
    const dateLabel = dateOptions.find(d => d.value === date)?.label ?? date;
    const durationLabel = durationOptions.find(d => d.value === mins)?.label ?? (serverPackages.find(p => p.value === mins)?.label ?? `${mins} мин`);
    return (
      <ScrollView style={st.content} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={st.sectionTitle}>ПАРАМЕТРЫ БРОНИРОВАНИЯ</Text>
        <View style={st.clubBadge}><BookingIcon size={16} color="#FFCC00" strokeWidth={2} /><Text style={st.clubBadgeText}>{selectedClub?.address}</Text></View>
        <Text style={st.fieldLabel}>ДАТА И ВРЕМЯ</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          <TouchableOpacity style={[st.selector, { flex: 1 }]} onPress={() => setShowDatePicker(true)} activeOpacity={0.8}>
            <Text style={st.selectorValue}>{dateLabel}</Text><ChevronDownIcon size={16} color="#FFCC00" strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity style={[st.selector, { flex: 0.8 }]} onPress={() => setShowTimePicker(true)} activeOpacity={0.8}>
            <Text style={st.selectorValue}>{time}</Text><ChevronDownIcon size={16} color="#FFCC00" strokeWidth={2} />
          </TouchableOpacity>
        </View>
        <Text style={st.fieldLabel}>ГОТОВЫЕ ПАКЕТЫ (ВЫГОДНО)</Text>
        {serverPackages.length > 0 ? (() => {
          const durations = [...new Set(serverPackages.map(p => p.value))].sort((a, b) => a - b);
          return (
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              {durations.map((dur) => {
                const hours = dur / 60;
                const zonesForDur = serverPackages.filter(p => p.value === dur);
                return (
                  <TouchableOpacity
                    key={dur}
                    style={st.pkgZoneCard}
                    onPress={() => { setSelectedDuration(dur); setMins(dur); setSelectedPc(null); setStep('pcs'); }}
                    activeOpacity={0.75}
                  >
                    <Text style={st.pkgZoneCardTitle}>
                      {hours} {hours === 1 ? 'час' : hours < 5 ? 'часа' : 'часов'}
                    </Text>
                    <View style={{ gap: 6, marginTop: 4 }}>
                      {zonesForDur.map((pkg) => {
                        const zoneStyle = PKG_ZONE_STYLES[pkg.zone] ?? PKG_ZONE_STYLES.default;
                        const zoneName = PKG_ZONE_NAMES[pkg.zone] ?? pkg.zone;
                        return (
                          <View
                            key={pkg.id}
                            style={[
                              st.pkgZoneRow,
                              {
                                backgroundColor: '#1A1A1A',
                              }
                            ]}
                          >
                            <Text style={[st.pkgZoneRowName, { color: zoneStyle.accent }]} numberOfLines={1}>{zoneName}</Text>
                            <View style={[st.pkgZonePriceWrap, { backgroundColor:'#333333', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }]}>
                              <Text style={st.pkgZoneRowPrice}>{pkg.price} ₽</Text>
                              <Text style={st.pkgZoneRowPer}>{pkg.pricePerHour} ₽/ч</Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })() : null}
        <Text style={st.fieldLabel}>ИЛИ СТАНДАРТНОЕ ВРЕМЯ</Text>
        <TouchableOpacity style={st.selector} onPress={() => setShowDurationPicker(true)} activeOpacity={0.8}>
          <Text style={st.selectorValue}>{durationLabel}</Text>
          <ChevronDownIcon size={16} color="#FFCC00" strokeWidth={2} />
        </TouchableOpacity>
        <View style={st.balanceHint}>
          <MoneyIcon size={14} color="#FFCC00" />
          <Text style={st.balanceHintText}>Баланс: {parseFloat(user?.balance || '0').toFixed(2)} ₽</Text>
        </View>
        <TouchableOpacity style={st.nextBtn} onPress={() => { setSelectedDuration(null); setStep('pcs'); }} activeOpacity={0.85}>
          <Text style={st.nextBtnText}>Выбрать ПК</Text><ArrowRightIcon size={18} color="#000" strokeWidth={2.5} />
        </TouchableOpacity>
        <PickerModal visible={showDatePicker} title="ДАТА" options={dateOptions} selected={date} onSelect={setDate} onClose={() => setShowDatePicker(false)} />
        <PickerModal visible={showTimePicker} title="ВРЕМЯ" options={timeOptions} selected={time} onSelect={setTime} onClose={() => setShowTimePicker(false)} />
        <PickerModal visible={showDurationPicker} title="ДЛИТЕЛЬНОСТЬ" options={durationOptions} selected={mins} onSelect={(v: number) => { setMins(v); setSelectedDuration(null); }} onClose={() => setShowDurationPicker(false)} />
      </ScrollView>
    );
  };

  // ─── Шаг 3: Список ПК ─────────────────────────────────────────────────────
  const renderPcList = () => {
    if (loadingPcs) {
      return (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <ActivityIndicator color="#FFCC00" size="large" />
          <Text style={[st.emptyText, { marginTop: 12 }]}>Загрузка ПК...</Text>
        </View>
      );
    }
    if (pcs.length === 0) {
      return (
        <View style={st.emptyWrap}>
          <Text style={st.emptyText}>ПК не найдены</Text>
          <TouchableOpacity style={st.retryBtn} onPress={loadPcs} activeOpacity={0.8}>
            <RefreshIcon size={16} color="#FFCC00" strokeWidth={2} /><Text style={st.retryText}>Повторить</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <>
        {Object.entries(pcGroups).map(([zone, zonePcs]) => (
          <View key={zone}>
            <Text style={st.zoneTitle}>{zone.toUpperCase()}</Text>
            <View style={st.pcGrid}>
              {zonePcs.map((pc) => {
                const isSelected = selectedPc?.pc_name === pc.pc_name;
                const isBusy = pc.is_using;
                return (
                  <TouchableOpacity
                    key={pc.pc_name}
                    style={[st.pcCard, isBusy && st.pcCardBusy, isSelected && st.pcCardSelected]}
                    onPress={() => !isBusy && setSelectedPc(isSelected ? null : pc)}
                    activeOpacity={isBusy ? 1 : 0.75}
                    disabled={isBusy}
                  >
                    <Text style={[st.pcName, isBusy && st.pcNameBusy, isSelected && st.pcNameSelected]}>{pc.pc_name}</Text>
                    {isBusy ? <LockIcon size={12} color="#FFFFFF" /> : isSelected ? <CheckIcon size={12} color="#000" /> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </>
    );
  };



  // ─── Шаг 3: Карта ПК — план этажа с зонами и дверями ─────────────────────────
  const renderPcMap = () => {
    if (loadingMap || loadingPcs) {
      return (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <ActivityIndicator color="#FFCC00" size="large" />
          <Text style={[st.emptyText, { marginTop: 12 }]}>Загрузка схемы...</Text>
        </View>
      );
    }
    if (mapAreas.length === 0) {
      return <View style={st.emptyWrap}><Text style={st.emptyText}>Схема недоступна</Text></View>;
    }

    // ViewBox
    const VB_W = 700;
    const PAD = 8;
    const GAP = 8;
    const BG = '#0D1117';
    const mapW = Math.min(SCREEN_W - 32, 500);

    // ── Цвета зон ────────────────────────────────────────────────────────────
    const ZONE_COLORS: Record<string, { border: string; fill: string; text: string }> = {
      BootCamp:  { border: '#9333EA', fill: 'rgba(147,51,234,0.13)', text: '#9333EA' },
      GameZone:  { border: 'transparent', fill: 'rgba(34,197,94,0.11)', text: '#16A34A' },
      VIP:       { border: '#CA8A04', fill: 'rgba(202,138,4,0.13)', text: '#CA8A04' },
    };

    // ── Хардкод координат зон (серверные перекрываются, нельзя использовать напрямую) ──
    const BC_X = PAD,  BC_Y = PAD,  BC_W = 230, BC_H = 430;
    const VIP_W = 300, VIP_H = 148;
    const VIP_X = VB_W - PAD - VIP_W;
    const VIP_Y = PAD;
    const GZ_W = VIP_W, GZ_H = 158;
    const GZ_X = VIP_X;
    const GZ_Y = VIP_Y + VIP_H + GAP;

    const BOTTOM_Y = BC_Y + BC_H + GAP;
    const BOTTOM_H = 200;
    const TOI_W = 130;
    const TOI_X = VB_W - PAD - TOI_W;
    const KAS_X = PAD;
    const KAS_W = TOI_X - KAS_X - GAP;
    const C_KAS = '#4B5563';
    const C_TOI = '#2563EB';

    const VB_H = BOTTOM_Y + BOTTOM_H + PAD;
    const mapH = (mapW / VB_W) * VB_H;
    const sx = mapW / VB_W;
    const sy = mapH / VB_H;

    // ── ПК — центрированы в своих зонах ─────────────────────────────────────
    const PC_W = 60; const PC_H = 60;

    const getPcData   = (name: string) => pcs.find(p => p.pc_name === name);
    const isSel       = (name: string) => selectedPc?.pc_name === name;
    const isBusyPc    = (name: string) => getPcData(name)?.is_using ?? false;
    const isUnavailPc = (name: string) => !getPcData(name);
    const handlePcPress = (name: string) => {
      const pc = getPcData(name);
      if (!pc || pc.is_using) return;
      setSelectedPc(isSel(name) ? null : pc);
    };

    // Группируем ПК из mapData по зоне и раскладываем по центру зоны с переносом строк
    const zoneLayouts: Record<string, { x: number; y: number; w: number; h: number; perRow: number }> = {
      BootCamp: { x: BC_X, y: BC_Y, w: BC_W, h: BC_H, perRow: 2 },
      VIP:      { x: VIP_X, y: VIP_Y, w: VIP_W, h: VIP_H, perRow: 4 },
      GameZone: { x: GZ_X, y: GZ_Y, w: GZ_W, h: GZ_H, perRow: 4 },
    };

    const pcsLayout = Object.entries(zoneLayouts).flatMap(([zoneName, zone]) => {
      const areaPcs = mapData.filter(p => p.area_name === zoneName);
      if (areaPcs.length === 0) return [];
      const GAP_PC = 6;
      const rows: typeof areaPcs[] = [];
      for (let i = 0; i < areaPcs.length; i += zone.perRow) {
        rows.push(areaPcs.slice(i, i + zone.perRow));
      }
      const rowCount = rows.length;
      const totalContentH = rowCount * PC_H + (rowCount - 1) * GAP_PC + 30; // +30 подпись зоны
      const startY = zone.y + (zone.h - totalContentH) / 2;
      return rows.flatMap((row, rowIdx) => {
        const rowW = row.length * PC_W + (row.length - 1) * GAP_PC;
        const startX = zone.x + (zone.w - rowW) / 2;
        return row.map((pc, colIdx) => ({
          name: pc.pc_name,
          x: startX + colIdx * (PC_W + GAP_PC),
          y: startY + rowIdx * (PC_H + GAP_PC),
        }));
      });
    });

    // Дверь
    const DoorIcon = (key: string, x: number, y: number, color: string) => (
      <G key={key} transform={`translate(${x}, ${y})`}>
        <Rect x="-15" y="-15" width="30" height="30" fill={BG} />
        <Path d="M-10 13 L-10 -11 C-10 -12.1 -9.1 -13 -8 -13 L8 -13 C9.1 -13 10 -12.1 10 -11 L10 13"
          fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <Path d="M-10 13 L-10 -11 L4 -8 L4 13 Z"
          fill={color} fillOpacity="0.25" stroke={color} strokeWidth="1.5" />
        <Circle cx="2" cy="2" r="2.5" fill={color} />
      </G>
    );

    return (
      <>
        <MapLegend />
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={{ width: mapW, height: mapH, alignSelf: 'center', marginBottom: 20 }}>
            <Svg width={mapW} height={mapH} viewBox={`0 0 ${VB_W} ${VB_H}`}>

              {/* ФОН */}
              <Rect x={0} y={0} width={VB_W} height={VB_H} fill={BG} rx={14} />
              <Rect x={2} y={2} width={VB_W - 4} height={VB_H - 4}
                fill="none" stroke="#334155" strokeWidth="1.5" rx={14} />

              {/* ── BOOTCAMP ────────────────────────────────────────────────── */}
              <Rect x={BC_X} y={BC_Y} width={BC_W} height={BC_H}
                fill={ZONE_COLORS.BootCamp.fill} stroke={ZONE_COLORS.BootCamp.border} strokeWidth="2.5" rx={8} />
              <SvgText x={BC_X + BC_W / 2} y={BC_Y + BC_H - 14}
                fill={ZONE_COLORS.BootCamp.text} fontSize="15" fontWeight="bold" textAnchor="middle" opacity="0.8">
                BOOTCAMP
              </SvgText>

              {/* ── VIP ─────────────────────────────────────────────────────── */}
              <Rect x={VIP_X} y={VIP_Y} width={VIP_W} height={VIP_H}
                fill={ZONE_COLORS.VIP.fill} stroke={ZONE_COLORS.VIP.border} strokeWidth="2.5" rx={8} />
              <SvgText x={VIP_X + VIP_W / 2} y={VIP_Y + VIP_H - 14}
                fill={ZONE_COLORS.VIP.text} fontSize="15" fontWeight="bold" textAnchor="middle" opacity="0.8">
                VIP
              </SvgText>

              {/* ── GAMEZONE ────────────────────────────────────────────────── */}
              <Rect x={GZ_X} y={GZ_Y} width={GZ_W} height={GZ_H}
                fill={ZONE_COLORS.GameZone.fill} rx={8} />
              <SvgText x={GZ_X + GZ_W / 2} y={GZ_Y + GZ_H - 14}
                fill={ZONE_COLORS.GameZone.text} fontSize="15" fontWeight="bold" textAnchor="middle" opacity="0.8">
                GAMEZONE
              </SvgText>

              {/* ── КАССА ───────────────────────────────────────────────────── */}
              <Rect x={KAS_X} y={BOTTOM_Y} width={KAS_W} height={BOTTOM_H}
                fill="rgba(55,65,81,0.3)" stroke={C_KAS} strokeWidth="2.5" rx={8} />
              <SvgText x={KAS_X + KAS_W / 2} y={BOTTOM_Y + BOTTOM_H / 2 + 8}
                fill={C_KAS} fontSize="20" fontWeight="bold" textAnchor="middle" opacity="0.8">
                КАССА
              </SvgText>

              {/* ── ТУАЛЕТ ──────────────────────────────────────────────────── */}
              <Rect x={TOI_X} y={BOTTOM_Y} width={TOI_W} height={BOTTOM_H}
                fill="rgba(30,58,138,0.3)" stroke={C_TOI} strokeWidth="2.5" rx={8} />
              <SvgText x={TOI_X + TOI_W / 2} y={BOTTOM_Y + BOTTOM_H / 2 + 8}
                fill={C_TOI} fontSize="17" fontWeight="bold" textAnchor="middle" opacity="0.8">
                ТУАЛЕТ
              </SvgText>

              {/* ── ДВЕРИ ───────────────────────────────────────────────────── */}
              {DoorIcon('door-bc',  BC_X + BC_W,       BC_Y + Math.round(BC_H * 0.75),   ZONE_COLORS.BootCamp.border)}
              {DoorIcon('door-vip', VIP_X,              VIP_Y + Math.round(VIP_H * 0.48), ZONE_COLORS.VIP.border)}
              {DoorIcon('door-kas', KAS_X + KAS_W / 2, BOTTOM_Y,                          C_KAS)}
              {DoorIcon('door-toi', TOI_X + TOI_W / 2, BOTTOM_Y,                          C_TOI)}

              {/* ── ПК ──────────────────────────────────────────────────────── */}
              {pcsLayout.map(({ name, x, y }) => {
                const sel     = isSel(name);
                const busy    = isBusyPc(name);
                const unavail = isUnavailPc(name);
                return (
                  <G key={`svg-${name}`} opacity={unavail ? 0.3 : 1}>
                    <Rect x={x} y={y} width={PC_W} height={PC_H}
                      fill={sel ? '#FFCC00' : busy ? '#991B1B' : '#1A1A1A'}
                      stroke={sel ? '#FFCC00' : busy ? '#EF4444' : '#2A2A2A'}
                      strokeWidth={sel ? 2.5 : 2} rx={8} />
                    <SvgText
                      x={x + PC_W / 2}
                      y={sel || busy ? y + PC_H / 2 - 4 : y + PC_H / 2 + 6}
                      fill={sel ? '#000' : busy ? '#FFFFFF' : '#CCC'}
                      fontSize="13" fontWeight="bold" textAnchor="middle">
                      {name}
                    </SvgText>
                    {sel && (
                      <Path
                        d={`M${x + PC_W/2 - 7} ${y + PC_H/2 + 8} L${x + PC_W/2 - 2} ${y + PC_H/2 + 14} L${x + PC_W/2 + 8} ${y + PC_H/2 + 4}`}
                        stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"
                      />
                    )}
                    {busy && (
                      <G>
                        <Rect x={x + PC_W/2 - 5} y={y + PC_H/2 + 8} width={10} height={8} rx={1.5}
                          fill="none" stroke="#FFFFFF" strokeWidth="1.5" />
                        <Path d={`M${x + PC_W/2 - 3} ${y + PC_H/2 + 8} L${x + PC_W/2 - 3} ${y + PC_H/2 + 4} C${x + PC_W/2 - 3} ${y + PC_H/2 + 1} ${x + PC_W/2 + 3} ${y + PC_H/2 + 1} ${x + PC_W/2 + 3} ${y + PC_H/2 + 4} L${x + PC_W/2 + 3} ${y + PC_H/2 + 8}`}
                          fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
                      </G>
                    )}
                  </G>
                );
              })}
            </Svg>

            {/* OVERLAY для касаний */}
            {pcsLayout.map(({ name, x, y }) => {
              const busy    = isBusyPc(name);
              const unavail = isUnavailPc(name);
              return (
                <TouchableOpacity
                  key={`t-${name}`}
                  style={{
                    position: 'absolute',
                    left: x * sx, top: y * sy,
                    width: PC_W * sx, height: PC_H * sy,
                  }}
                  onPress={() => handlePcPress(name)}
                  activeOpacity={busy || unavail ? 1 : 0.75}
                  disabled={busy || unavail}
                />
              );
            })}
          </View>
        </ScrollView>
      </>
    );
  };


  // ─── Главный рендер ─────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={st.container} edges={['top']}>
      {/* Шапка */}
      <View style={st.header}>
        {step !== 'club' && (
          <TouchableOpacity
            style={st.backBtn}
            onPress={() => setStep(step === 'pcs' ? 'params' : 'club')}
            activeOpacity={0.8}
          >
            <ChevronDownIcon size={20} color="#FFCC00" strokeWidth={2.5} />
          </TouchableOpacity>
        )}
        <Text style={st.headerTitle}>
          {step === 'club' ? 'Бронирование' : step === 'params' ? 'Параметры' : 'Выбор ПК'}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Контент по шагам */}
      {step === 'club' && renderClubStep()}
      {step === 'params' && renderParamsStep()}
      {step === 'pcs' && (
        <View style={{ flex: 1 }}>
          {/* Таб-переключатель */}
          <View style={st.tabBar}>
            <TouchableOpacity
              style={[st.tab, activeTab === 'list' && st.tabActive]}
              onPress={() => setActiveTab('list')}
              activeOpacity={0.8}
            >
              <ListIcon size={14} color={activeTab === 'list' ? '#000' : '#555'} />
              <Text style={[st.tabText, activeTab === 'list' && st.tabTextActive]}>Список</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[st.tab, activeTab === 'map' && st.tabActive]}
              onPress={() => setActiveTab('map')}
              activeOpacity={0.8}
            >
              <MapIcon size={14} color={activeTab === 'map' ? '#000' : '#555'} />
              <Text style={[st.tabText, activeTab === 'map' && st.tabTextActive]}>Карта</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={st.content} contentContainerStyle={{ paddingBottom: selectedPc ? 100 : 40 }}>
            {/* Параметры брони */}
            <View style={st.paramsBar}>
              <View style={st.paramChip}><Text style={st.paramChipText}>{date.split('-').reverse().join('.')}</Text></View>
              <View style={st.paramChip}><Text style={st.paramChipText}>{time}</Text></View>
              <View style={st.paramChip}><Text style={st.paramChipText}>{mins} мин</Text></View>
              <TouchableOpacity onPress={() => setStep('params')}><Text style={st.changeParamsText}>Изменить</Text></TouchableOpacity>
            </View>

            {activeTab === 'list' ? renderPcList() : renderPcMap()}
          </ScrollView>

          {/* Футер с кнопкой бронирования */}
          {selectedPc && (
            <View style={st.footer}>
              <View style={st.footerInfo}>
                <Text style={st.footerPc}>{selectedPc.pc_name}</Text>
                <Text style={st.footerPrice}>
                  {estimatedPrice !== undefined ? `${estimatedPrice.toFixed(2)} ₽` : 'Цена уточняется'}
                </Text>
              </View>
              <TouchableOpacity style={st.bookBtn} onPress={handleBook} activeOpacity={0.85} disabled={booking}>
                {booking
                  ? <ActivityIndicator color="#000" size="small" />
                  : <><BookingIcon size={18} color="#000" strokeWidth={2.5} /><Text style={st.bookBtnText}>Забронировать</Text></>
                }
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Модалка успеха */}
      {successData && (
        <SuccessModal
          visible
          password={successData.password}
          pcName={successData.pcName}
          date={date}
          time={time}
          mins={mins}
          cost={successData.cost}
          onClose={() => { setSuccessData(null); navigation.goBack(); }}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Стили главного экрана ────────────────────────────────────────────────────
const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#111' },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '90deg' }] },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  sectionTitle: { color: '#555', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 16 },
  tabBar: { flexDirection: 'row', marginHorizontal: 16, marginTop: 12, marginBottom: 4, backgroundColor: '#0D0D0D', borderRadius: 12, padding: 4, gap: 4 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 9 },
  tabActive: { backgroundColor: '#FFCC00' },
  tabText: { color: '#555', fontSize: 13, fontWeight: '700' },
  tabTextActive: { color: '#000' },
  clubCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#0D0D0D', borderRadius: 16, borderWidth: 1, borderColor: '#1A1A1A', padding: 16, marginBottom: 10 },
  clubIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#1A1100', borderWidth: 1, borderColor: '#FFCC00', alignItems: 'center', justifyContent: 'center' },
  clubAddress: { color: '#fff', fontSize: 14, fontWeight: '700' },
  clubId: { color: '#444', fontSize: 11, marginTop: 2 },
  clubBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1A1100', borderRadius: 10, borderWidth: 1, borderColor: '#FFCC00', padding: 10, marginBottom: 18 },
  clubBadgeText: { color: '#FFCC00', fontSize: 13, fontWeight: '700' },
  fieldLabel: { color: '#555', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 6, marginTop: 14 },
  selector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0D0D0D', borderRadius: 12, borderWidth: 1, borderColor: '#1A1A1A', padding: 14 },
  selectorValue: { color: '#fff', fontSize: 15, fontWeight: '700' },
  balanceHint: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20, marginBottom: 4 },
  balanceHintText: { color: '#FFCC00', fontSize: 13, fontWeight: '700' },
  nextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FFCC00', borderRadius: 14, padding: 16, marginTop: 24 },
  nextBtnText: { color: '#000', fontWeight: '900', fontSize: 15 },
  paramsBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  paramChip: { backgroundColor: '#111', borderRadius: 8, borderWidth: 1, borderColor: '#1A1A1A', paddingHorizontal: 10, paddingVertical: 5 },
  paramChipText: { color: '#CCC', fontSize: 12, fontWeight: '600' },
  changeParamsText: { color: '#FFCC00', fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' },
  zoneTitle: { color: '#555', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 10, marginTop: 16 },
  pcGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  pcCard: { width: 90, height: 72, borderRadius: 14, backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center', gap: 5 },
  pcCardBusy: { backgroundColor: '#991B1B', borderColor: '#EF4444' }, // Ярко красный цвет для занятых ПК в списке
  pcCardSelected: { backgroundColor: '#FFCC00', borderColor: '#FFCC00' },
  pcName: { color: '#CCC', fontSize: 13, fontWeight: '700' },
  pcNameBusy: { color: '#FFFFFF' },
  pcNameSelected: { color: '#000' },
  emptyWrap: { alignItems: 'center', paddingTop: 40, gap: 16 },
  emptyText: { color: '#444', fontSize: 14, textAlign: 'center' },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#111', borderRadius: 10, borderWidth: 1, borderColor: '#1A1A1A', paddingHorizontal: 16, paddingVertical: 10 },
  retryText: { color: '#FFCC00', fontSize: 13, fontWeight: '700' },
  footer: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 24, backgroundColor: '#000', borderTopWidth: 1, borderTopColor: '#111', gap: 12 },
  footerInfo: { flex: 1 },
  footerPc: { color: '#fff', fontSize: 16, fontWeight: '900' },
  footerPrice: { color: '#555', fontSize: 12, marginTop: 2 },
  bookBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFCC00', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20 },
  bookBtnText: { color: '#000', fontWeight: '900', fontSize: 15 },
  pkgCard: { backgroundColor: '#111', borderRadius: 12, borderWidth: 1, borderColor: '#1A1A1A', paddingVertical: 12, paddingHorizontal: 16, marginRight: 10, minWidth: 120, alignItems: 'center' },
  pkgCardActive: { borderColor: '#FFCC00', backgroundColor: '#1A1100' },
  pkgLabel: { color: '#CCC', fontSize: 13, fontWeight: '700' },
  pkgLabelActive: { color: '#FFCC00' },
  pkgBadge: { position: 'absolute', top: -10, right: -8, backgroundColor: '#FF4444', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, zIndex: 2 },
  pkgBadgeText: { color: '#fff', fontSize: 8, fontWeight: '900' },
  pkgZoneCard: { flex: 1, backgroundColor: '#0D0D0D', borderRadius: 16, borderWidth: 1, borderColor: '#1A1A1A', padding: 14 },
  pkgZoneCardTitle: { color: '#FFCC00', fontSize: 18, fontWeight: '900', marginBottom: 6 },
  pkgZoneRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161616', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  pkgZoneRowName: { fontSize: 11, fontWeight: '800', flex: 1, marginRight: 6 },
  pkgZonePriceWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pkgZoneRowPrice: { color: '#fff', fontSize: 12, fontWeight: '900' },
  pkgZoneRowPer: { color: '#555', fontSize: 10, fontWeight: '600' },
});

// ─── Стили модалки выбора ─────────────────────────────────────────────────────
const pickerSt = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#111', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#333', alignSelf: 'center', marginBottom: 16 },
  title: { color: '#555', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 12, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 8, borderRadius: 10, marginBottom: 2 },
  rowActive: { backgroundColor: '#FFCC00' },
  rowText: { color: '#CCC', fontSize: 15, fontWeight: '600' },
  rowTextActive: { color: '#000', fontWeight: '800' },
});

// ─── Стили модалки успеха ─────────────────────────────────────────────────────
const successSt = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', backgroundColor: '#0D0D0D', borderRadius: 24, borderWidth: 1, borderColor: '#1A1A1A', padding: 24, alignItems: 'center' },
  iconWrap: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#FFCC00', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { color: '#fff', fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 20 },
  infoCard: { width: '100%', backgroundColor: '#111', borderRadius: 14, padding: 16, marginBottom: 16, gap: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { color: '#555', fontSize: 12, fontWeight: '600' },
  infoValue: { color: '#fff', fontSize: 13, fontWeight: '700' },
  passwordWrap: { width: '100%', backgroundColor: '#1A1100', borderRadius: 14, borderWidth: 1, borderColor: '#FFCC00', padding: 16, alignItems: 'center', marginBottom: 20 },
  passwordLabel: { color: '#FFCC00', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 6 },
  password: { color: '#FFCC00', fontSize: 28, fontWeight: '900', letterSpacing: 4 },
  btn: { width: '100%', backgroundColor: '#FFCC00', borderRadius: 14, padding: 16, alignItems: 'center' },
  btnText: { color: '#000', fontWeight: '900', fontSize: 15 },
});

// ─── Стили карты ──────────────────────────────────────────────────────────────
const mapSt = StyleSheet.create({
  legend: { flexDirection: 'row', gap: 16, paddingVertical: 8, paddingHorizontal: 4, marginBottom: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 4, borderWidth: 1, borderColor: 'transparent' },
  legendText: { color: '#555', fontSize: 11, fontWeight: '600' },
});