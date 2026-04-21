import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../../store/useAuthStore';
import { useBookingStore } from '../../store/useBookingStore';
import {
  fetchClubsForBooking,
  fetchPrices,
  fetchServerPackages,
  fetchAvailablePcs,
  fetchMapData,
  createBooking,
} from '../../services/bookingService';
import { ArrowRightIcon, BookingIcon, RefreshIcon, ChevronDownIcon } from '../../components/ui/Icons';
import { CheckIcon, LockIcon, MoneyIcon, MapIcon, ListIcon } from '../../components/booking/BookingIcons';
import { PickerModal } from '../../components/booking/PickerModal';
import { SuccessModal } from '../../components/booking/SuccessModal';
import { MapLegend } from '../../components/booking/MapLegend';
import { ZONE_MAP, PKG_ZONE_STYLES, PKG_ZONE_NAMES } from '../../constants/config';
import {
  buildDateOptions, buildTimeOptions, buildDurationOptions, getTodayString,
} from '../../utils/dateUtils';
import { generateRandKey, generateBookingKey } from '../../utils/bookingUtils';
import { handleApiError } from '../../services/errorHandler';
import {
  CafeBooking, PC, Price, MapPC, MapArea, ServerPackage, BookingResult,
} from '../../types';
import Svg, { Path, Circle, Rect, G, Text as SvgText } from 'react-native-svg';

const SCREEN_W = Dimensions.get('window').width;

// ─── Главный экран ────────────────────────────────────────────────────────────
export default function BookingScreen() {
  const navigation = useNavigation<ReturnType<typeof useNavigation<any>>>();
  const route      = useRoute<ReturnType<typeof useRoute<any>>>();
  const { user }   = useAuthStore();
  const { setRecentBooking } = useBookingStore();

  const [step, setStep]                   = useState<'club' | 'params' | 'pcs'>('club');
  const [clubs, setClubs]                 = useState<CafeBooking[]>([]);
  const [loadingClubs, setLoadingClubs]   = useState(true);
  const [selectedClub, setSelectedClub]   = useState<CafeBooking | null>(null);

  const dateOptions     = buildDateOptions();
  const durationOptions = buildDurationOptions();
  const [date, setDate] = useState(dateOptions[0].value);
  const timeOptions     = buildTimeOptions(date);
  const [time, setTime] = useState(timeOptions.length > 0 ? timeOptions[0].value : '00:00');
  const [mins, setMins] = useState<number>(route.params?.mins || 60);

  const [showDatePicker, setShowDatePicker]         = useState(false);
  const [showTimePicker, setShowTimePicker]         = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);

  const [pcs, setPcs]               = useState<PC[]>([]);
  const [loadingPcs, setLoadingPcs] = useState(false);
  const [selectedPc, setSelectedPc] = useState<PC | null>(null);
  const [prices, setPrices]         = useState<Price[]>([]);

  const [activeTab, setActiveTab]   = useState<'list' | 'map'>('list');
  const [mapData, setMapData]       = useState<MapPC[]>([]);
  const [mapAreas, setMapAreas]     = useState<MapArea[]>([]);
  const [loadingMap, setLoadingMap] = useState(false);

  const [booking, setBooking]         = useState(false);
  const [successData, setSuccessData] = useState<{ password: string; pcName: string; cost?: number } | null>(null);

  const [serverPackages, setServerPackages]     = useState<ServerPackage[]>([]);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);

  // Отложенные параметры (если клубы ещё не загружены при входе)
  const [pendingCafeId, setPendingCafeId]       = useState<string | null>(null);
  const [pendingResetStep, setPendingResetStep] = useState<string>('club');
  const [pendingPcName, setPendingPcName]       = useState<string | null>(null);

  useEffect(() => {
    const validTimes = buildTimeOptions(date);
    if (validTimes.length > 0 && !validTimes.find(t => t.value === time)) {
      setTime(validTimes[0].value);
    }
  }, [date]);

  const lastTimestamp = useRef<number | undefined>(undefined);
  useFocusEffect(
    useCallback(() => {
      const t = route.params?._t;
      if (t !== undefined && t !== lastTimestamp.current) {
        lastTimestamp.current = t;
        setStep('club');
        setSelectedClub(null);
        setSelectedPc(null);
        setPcs([]);
        setSuccessData(null);

        const passedCafeId  = route.params?.cafeId;
        const passedDate    = route.params?.date;
        const passedTime    = route.params?.time;
        const passedMins    = route.params?.mins;
        const passedPcName  = route.params?.pcName;
        const resetStep     = route.params?._resetStep ?? 'club';

        if (passedDate) setDate(passedDate);
        if (passedTime) setTime(passedTime);
        if (passedMins) setMins(passedMins);

        if (passedCafeId && clubs.length > 0) {
          const found = clubs.find(c => String(c.icafe_id) === String(passedCafeId));
          if (found) {
            setSelectedClub(found);
            setStep(resetStep === 'pcs' ? 'pcs' : 'params');
            if (resetStep === 'pcs') setPendingPcName(passedPcName ?? null);
          }
        } else if (passedCafeId) {
          setPendingCafeId(passedCafeId);
          setPendingResetStep(resetStep);
          setPendingPcName(passedPcName ?? null);
        } else if (resetStep === 'club') {
          setStep('club');
        }
      }
    }, [route.params?._t]),
  );

  // Загрузка клубов при монтировании
  useEffect(() => {
    fetchClubsForBooking()
      .then(data => {
        setClubs(data);
        const passedCafeId = route.params?.cafeId ?? pendingCafeId;
        if (passedCafeId && data.length > 0) {
          const found = data.find(c => String(c.icafe_id) === String(passedCafeId));
          if (found) {
            setSelectedClub(found);
            const resetStep = pendingResetStep || (route.params?._resetStep ?? 'params');
            setStep(resetStep === 'pcs' ? 'pcs' : 'params');
          }
          setPendingCafeId(null);
        }
      })
      .finally(() => setLoadingClubs(false));
  }, []);

  // Загрузка цен и пакетов при выборе клуба
  useEffect(() => {
    if (!selectedClub || !user?.member_id) return;
    fetchPrices(selectedClub.icafe_id, user.member_id)
      .then(setPrices)
      .catch(() => {});
    fetchServerPackages(selectedClub.icafe_id)
      .then(setServerPackages)
      .catch(() => {});
  }, [selectedClub, user]);

  const loadMapStructure = useCallback(async () => {
    if (!selectedClub) return;
    setLoadingMap(true);
    try {
      const { areas, pcs: mapPcs } = await fetchMapData(selectedClub.icafe_id);
      setMapAreas(areas);
      setMapData(mapPcs);
    } catch {
      setMapData([]);
      setMapAreas([]);
    } finally {
      setLoadingMap(false);
    }
  }, [selectedClub]);

  const loadPcs = useCallback(async () => {
    if (!selectedClub) return;
    setLoadingPcs(true);
    setPcs([]);
    setSelectedPc(null);
    try {
      const result = await fetchAvailablePcs(selectedClub.icafe_id, date, time, mins);
      setPcs(result);
    } catch (e: any) {
      handleApiError(e?.response?.data?.code ?? 1, 'Не удалось загрузить список ПК');
    } finally {
      setLoadingPcs(false);
    }
  }, [selectedClub, date, time, mins]);

  useEffect(() => {
    if (step === 'pcs') {
      loadPcs();
      loadMapStructure();
    }
  }, [step]);

  // Автовыбор ПК по имени после загрузки
  useEffect(() => {
    if (pendingPcName && pcs.length > 0) {
      const found = pcs.find(pc => pc.pc_name.toLowerCase() === pendingPcName.toLowerCase() && !pc.is_using);
      if (found) setSelectedPc(found);
      setPendingPcName(null);
    }
  }, [pcs, pendingPcName]);

  const pcGroups = pcs.reduce<Record<string, PC[]>>((acc, pc) => {
    const zone = pc.pc_area_name || pc.pc_group_name || 'Основной зал';
    if (!acc[zone]) acc[zone] = [];
    acc[zone].push(pc);
    return acc;
  }, {});

  const matchedPriceObj  = prices.find(p => p.duration === mins && (selectedPc ? p.price_name === selectedPc.price_name : true));
  const rawPrice         = matchedPriceObj?.total_price || prices.find(p => p.duration === mins)?.total_price;
  const estimatedPrice   = (() => {
    if (selectedPc && selectedDuration) {
      const zone = ZONE_MAP[selectedPc.pc_area_name] ?? selectedPc.pc_area_name;
      const pkg  = serverPackages.find(p => p.value === selectedDuration && p.zone === zone);
      if (pkg) return pkg.price;
    }
    return rawPrice !== undefined ? parseFloat(String(rawPrice)) : undefined;
  })();

  const handleBook = async () => {
    if (!selectedPc || !selectedClub || !user) return;
    setBooking(true);
    try {
      const randKey = generateRandKey();
      const key     = generateBookingKey(
        String(selectedClub.icafe_id),
        selectedPc.pc_name,
        user.member_account,
        user.member_id,
        date, time, mins, randKey,
      );
      const result: BookingResult = await createBooking({
        icafe_id:       String(selectedClub.icafe_id),
        pc_name:        selectedPc.pc_name,
        member_account: user.member_account,
        member_id:      user.member_id,
        start_date:     date,
        start_time:     time,
        mins, rand_key: randKey, key,
      });
      const pwd =
        result?.iCafe_response?.data?.booking_password ||
        result?.booking_password ||
        result?.data?.booking_password;
      if (!pwd) {
        throw new Error(
          result?.message || result?.iCafe_response?.message ||
          'У вас уже есть активная бронь или выбранное время занято.',
        );
      }
      const cost = result?.booking_cost || result?.iCafe_response?.data?.cost || estimatedPrice;
      setRecentBooking({
        cafeId:      String(selectedClub.icafe_id),
        cafeAddress: selectedClub.address,
        pcName:      selectedPc.pc_name,
        startDate:   date,
        startTime:   time,
        mins,
        password:    String(pwd),
        timestamp:   Date.now(),
        account:     user.member_account,
      });
      setSuccessData({ password: String(pwd), pcName: selectedPc.pc_name, cost });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      const code = (e as any)?.response?.data?.code;
      if (code === 600 || msg.includes('600') || msg.toLowerCase().includes('occupied')) {
        handleApiError(600);
      } else {
        handleApiError(code ?? 1, msg || 'Ошибка бронирования');
      }
    } finally {
      setBooking(false);
    }
  };

  // ─── Шаг 1: Клуб ──────────────────────────────────────────────────────────
  const renderClubStep = () => (
    <ScrollView style={st.content} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={st.sectionTitle}>ВЫБЕРИТЕ КЛУБ</Text>
      {loadingClubs ? (
        <ActivityIndicator color="#FFCC00" style={{ marginTop: 40 }} />
      ) : clubs.length === 0 ? (
        <Text style={st.emptyText}>Клубы не найдены</Text>
      ) : (
        clubs.map(club => (
          <TouchableOpacity
            key={String(club.icafe_id)}
            style={st.clubCard}
            onPress={() => { setSelectedClub(club); setStep('params'); }}
            activeOpacity={0.8}
          >
            <View style={st.clubIconWrap}><BookingIcon size={22} color="#FFCC00" strokeWidth={2} /></View>
            <View style={{ flex: 1 }}>
              <Text style={st.clubAddress}>{club.address}</Text>
              <Text style={st.clubId}>ID: {club.icafe_id}</Text>
            </View>
            <ArrowRightIcon size={18} color="#555" strokeWidth={2} />
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );

  // ─── Шаг 2: Параметры ─────────────────────────────────────────────────────
  const renderParamsStep = () => {
    const dateLabel     = dateOptions.find(d => d.value === date)?.label ?? date;
    const durationLabel = durationOptions.find(d => d.value === mins)?.label
      ?? (serverPackages.find(p => p.value === mins)?.label ?? `${mins} мин`);
    return (
      <ScrollView style={st.content} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={st.sectionTitle}>ПАРАМЕТРЫ БРОНИРОВАНИЯ</Text>
        <View style={st.clubBadge}>
          <BookingIcon size={16} color="#FFCC00" strokeWidth={2} />
          <Text style={st.clubBadgeText}>{selectedClub?.address}</Text>
        </View>
        <Text style={st.fieldLabel}>ДАТА И ВРЕМЯ</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          <TouchableOpacity style={[st.selector, { flex: 1 }]} onPress={() => setShowDatePicker(true)} activeOpacity={0.8}>
            <Text style={st.selectorValue}>{dateLabel}</Text>
            <ChevronDownIcon size={16} color="#FFCC00" strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity style={[st.selector, { flex: 0.8 }]} onPress={() => setShowTimePicker(true)} activeOpacity={0.8}>
            <Text style={st.selectorValue}>{time}</Text>
            <ChevronDownIcon size={16} color="#FFCC00" strokeWidth={2} />
          </TouchableOpacity>
        </View>
        <Text style={st.fieldLabel}>ГОТОВЫЕ ПАКЕТЫ (ВЫГОДНО)</Text>
        {serverPackages.length > 0 && (() => {
          const durations = [...new Set(serverPackages.map(p => p.value))].sort((a, b) => a - b);
          return (
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              {durations.map(dur => {
                const hours       = dur / 60;
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
                      {zonesForDur.map(pkg => {
                        const zoneStyle = PKG_ZONE_STYLES[pkg.zone] ?? PKG_ZONE_STYLES.default;
                        const zoneName  = PKG_ZONE_NAMES[pkg.zone]  ?? pkg.zone;
                        return (
                          <View key={pkg.id} style={st.pkgZoneRow}>
                            <Text style={[st.pkgZoneRowName, { color: zoneStyle.accent }]} numberOfLines={1}>
                              {zoneName}
                            </Text>
                            <View style={st.pkgZonePriceWrap}>
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
        })()}
        <Text style={st.fieldLabel}>ИЛИ СТАНДАРТНОЕ ВРЕМЯ</Text>
        <TouchableOpacity style={st.selector} onPress={() => setShowDurationPicker(true)} activeOpacity={0.8}>
          <Text style={st.selectorValue}>{durationLabel}</Text>
          <ChevronDownIcon size={16} color="#FFCC00" strokeWidth={2} />
        </TouchableOpacity>
        <View style={st.balanceHint}>
          <MoneyIcon size={14} color="#FFCC00" />
          <Text style={st.balanceHintText}>Баланс: {parseFloat(user?.balance || '0').toFixed(2)} ₽</Text>
        </View>
        <TouchableOpacity
          style={st.nextBtn}
          onPress={() => { setSelectedDuration(null); setStep('pcs'); }}
          activeOpacity={0.85}
        >
          <Text style={st.nextBtnText}>Выбрать ПК</Text>
          <ArrowRightIcon size={18} color="#000" strokeWidth={2.5} />
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
            <RefreshIcon size={16} color="#FFCC00" strokeWidth={2} />
            <Text style={st.retryText}>Повторить</Text>
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
              {zonePcs.map(pc => {
                const isSelected = selectedPc?.pc_name === pc.pc_name;
                const isBusy     = pc.is_using;
                return (
                  <TouchableOpacity
                    key={pc.pc_name}
                    style={[st.pcCard, isBusy && st.pcCardBusy, isSelected && st.pcCardSelected]}
                    onPress={() => !isBusy && setSelectedPc(isSelected ? null : pc)}
                    activeOpacity={isBusy ? 1 : 0.75}
                    disabled={isBusy}
                  >
                    <Text style={[st.pcName, isBusy && st.pcNameBusy, isSelected && st.pcNameSelected]}>
                      {pc.pc_name}
                    </Text>
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

  // ─── Шаг 3: Карта ─────────────────────────────────────────────────────────
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

    const VB_W = 700; const PAD = 8; const GAP = 8; const BG = '#0D1117';
    const mapW = Math.min(SCREEN_W - 32, 500);

    const ZONE_COLORS: Record<string, { border: string; fill: string; text: string }> = {
      BootCamp: { border: '#9333EA', fill: 'rgba(147,51,234,0.13)', text: '#9333EA' },
      GameZone: { border: 'transparent', fill: 'rgba(34,197,94,0.11)', text: '#16A34A' },
      VIP:      { border: '#CA8A04', fill: 'rgba(202,138,4,0.13)', text: '#CA8A04' },
    };

    const BC_X = PAD, BC_Y = PAD, BC_W = 230, BC_H = 430;
    const VIP_W = 300, VIP_H = 148, VIP_X = VB_W - PAD - 300, VIP_Y = PAD;
    const GZ_W = 300, GZ_H = 158, GZ_X = VIP_X, GZ_Y = VIP_Y + VIP_H + GAP;
    const BOTTOM_Y = BC_Y + BC_H + GAP, BOTTOM_H = 200;
    const TOI_W = 130, TOI_X = VB_W - PAD - TOI_W;
    const KAS_X = PAD, KAS_W = TOI_X - KAS_X - GAP;
    const C_KAS = '#4B5563', C_TOI = '#2563EB';
    const VB_H = BOTTOM_Y + BOTTOM_H + PAD;
    const mapH = (mapW / VB_W) * VB_H;
    const sx = mapW / VB_W, sy = mapH / VB_H;
    const PC_W = 60, PC_H = 60;

    const getPcData    = (name: string) => pcs.find(p => p.pc_name === name);
    const isSel        = (name: string) => selectedPc?.pc_name === name;
    const isBusyPc     = (name: string) => getPcData(name)?.is_using ?? false;
    const isUnavailPc  = (name: string) => !getPcData(name);
    const handlePcPress = (name: string) => {
      const pc = getPcData(name);
      if (!pc || pc.is_using) return;
      setSelectedPc(isSel(name) ? null : pc);
    };

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
      for (let i = 0; i < areaPcs.length; i += zone.perRow) rows.push(areaPcs.slice(i, i + zone.perRow));
      const rowCount = rows.length;
      const startY   = zone.y + (zone.h - (rowCount * PC_H + (rowCount - 1) * GAP_PC + 30)) / 2;
      return rows.flatMap((row, rowIdx) => {
        const rowW   = row.length * PC_W + (row.length - 1) * GAP_PC;
        const startX = zone.x + (zone.w - rowW) / 2;
        return row.map((pc, colIdx) => ({
          name: pc.pc_name,
          x: startX + colIdx * (PC_W + GAP_PC),
          y: startY + rowIdx * (PC_H + GAP_PC),
        }));
      });
    });

    const DoorIcon = (key: string, x: number, y: number, color: string) => (
      <G key={key} transform={`translate(${x}, ${y})`}>
        <Rect x="-15" y="-15" width="30" height="30" fill={BG} />
        <Path d="M-10 13 L-10 -11 C-10 -12.1 -9.1 -13 -8 -13 L8 -13 C9.1 -13 10 -12.1 10 -11 L10 13"
          fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <Path d="M-10 13 L-10 -11 L4 -8 L4 13 Z" fill={color} fillOpacity="0.25" stroke={color} strokeWidth="1.5" />
        <Circle cx="2" cy="2" r="2.5" fill={color} />
      </G>
    );

    return (
      <>
        <MapLegend />
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={{ width: mapW, height: mapH, alignSelf: 'center', marginBottom: 20 }}>
            <Svg width={mapW} height={mapH} viewBox={`0 0 ${VB_W} ${VB_H}`}>
              <Rect x={0} y={0} width={VB_W} height={VB_H} fill={BG} rx={14} />
              <Rect x={2} y={2} width={VB_W - 4} height={VB_H - 4} fill="none" stroke="#334155" strokeWidth="1.5" rx={14} />

              <Rect x={BC_X} y={BC_Y} width={BC_W} height={BC_H} fill={ZONE_COLORS.BootCamp.fill} stroke={ZONE_COLORS.BootCamp.border} strokeWidth="2.5" rx={8} />
              <SvgText x={BC_X + BC_W / 2} y={BC_Y + BC_H - 14} fill={ZONE_COLORS.BootCamp.text} fontSize="15" fontWeight="bold" textAnchor="middle" opacity="0.8">BOOTCAMP</SvgText>

              <Rect x={VIP_X} y={VIP_Y} width={VIP_W} height={VIP_H} fill={ZONE_COLORS.VIP.fill} stroke={ZONE_COLORS.VIP.border} strokeWidth="2.5" rx={8} />
              <SvgText x={VIP_X + VIP_W / 2} y={VIP_Y + VIP_H - 14} fill={ZONE_COLORS.VIP.text} fontSize="15" fontWeight="bold" textAnchor="middle" opacity="0.8">VIP</SvgText>

              <Rect x={GZ_X} y={GZ_Y} width={GZ_W} height={GZ_H} fill={ZONE_COLORS.GameZone.fill} rx={8} />
              <SvgText x={GZ_X + GZ_W / 2} y={GZ_Y + GZ_H - 14} fill={ZONE_COLORS.GameZone.text} fontSize="15" fontWeight="bold" textAnchor="middle" opacity="0.8">GAMEZONE</SvgText>

              <Rect x={KAS_X} y={BOTTOM_Y} width={KAS_W} height={BOTTOM_H} fill="rgba(55,65,81,0.3)" stroke={C_KAS} strokeWidth="2.5" rx={8} />
              <SvgText x={KAS_X + KAS_W / 2} y={BOTTOM_Y + BOTTOM_H / 2 + 8} fill={C_KAS} fontSize="20" fontWeight="bold" textAnchor="middle" opacity="0.8">КАССА</SvgText>

              <Rect x={TOI_X} y={BOTTOM_Y} width={TOI_W} height={BOTTOM_H} fill="rgba(30,58,138,0.3)" stroke={C_TOI} strokeWidth="2.5" rx={8} />
              <SvgText x={TOI_X + TOI_W / 2} y={BOTTOM_Y + BOTTOM_H / 2 + 8} fill={C_TOI} fontSize="17" fontWeight="bold" textAnchor="middle" opacity="0.8">ТУАЛЕТ</SvgText>

              {DoorIcon('door-bc',  BC_X + BC_W,       BC_Y + Math.round(BC_H * 0.75),   ZONE_COLORS.BootCamp.border)}
              {DoorIcon('door-vip', VIP_X,              VIP_Y + Math.round(VIP_H * 0.48), ZONE_COLORS.VIP.border)}
              {DoorIcon('door-kas', KAS_X + KAS_W / 2, BOTTOM_Y,                          C_KAS)}
              {DoorIcon('door-toi', TOI_X + TOI_W / 2, BOTTOM_Y,                          C_TOI)}

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
                    <SvgText x={x + PC_W / 2} y={sel || busy ? y + PC_H / 2 - 4 : y + PC_H / 2 + 6}
                      fill={sel ? '#000' : busy ? '#FFFFFF' : '#CCC'}
                      fontSize="13" fontWeight="bold" textAnchor="middle">{name}</SvgText>
                    {sel && (
                      <Path d={`M${x + PC_W/2 - 7} ${y + PC_H/2 + 8} L${x + PC_W/2 - 2} ${y + PC_H/2 + 14} L${x + PC_W/2 + 8} ${y + PC_H/2 + 4}`}
                        stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    )}
                    {busy && (
                      <G>
                        <Rect x={x + PC_W/2 - 5} y={y + PC_H/2 + 8} width={10} height={8} rx={1.5} fill="none" stroke="#FFFFFF" strokeWidth="1.5" />
                        <Path d={`M${x+PC_W/2-3} ${y+PC_H/2+8} L${x+PC_W/2-3} ${y+PC_H/2+4} C${x+PC_W/2-3} ${y+PC_H/2+1} ${x+PC_W/2+3} ${y+PC_H/2+1} ${x+PC_W/2+3} ${y+PC_H/2+4} L${x+PC_W/2+3} ${y+PC_H/2+8}`}
                          fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
                      </G>
                    )}
                  </G>
                );
              })}
            </Svg>

            {pcsLayout.map(({ name, x, y }) => {
              const busy    = isBusyPc(name);
              const unavail = isUnavailPc(name);
              return (
                <TouchableOpacity
                  key={`t-${name}`}
                  style={{ position: 'absolute', left: x * sx, top: y * sy, width: PC_W * sx, height: PC_H * sy }}
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

  // ─── Рендер ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={st.container} edges={['top']}>
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

      {step === 'club'   && renderClubStep()}
      {step === 'params' && renderParamsStep()}
      {step === 'pcs' && (
        <View style={{ flex: 1 }}>
          <View style={st.tabBar}>
            <TouchableOpacity style={[st.tab, activeTab === 'list' && st.tabActive]} onPress={() => setActiveTab('list')} activeOpacity={0.8}>
              <ListIcon size={14} color={activeTab === 'list' ? '#000' : '#555'} />
              <Text style={[st.tabText, activeTab === 'list' && st.tabTextActive]}>Список</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[st.tab, activeTab === 'map' && st.tabActive]} onPress={() => setActiveTab('map')} activeOpacity={0.8}>
              <MapIcon size={14} color={activeTab === 'map' ? '#000' : '#555'} />
              <Text style={[st.tabText, activeTab === 'map' && st.tabTextActive]}>Карта</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={st.content} contentContainerStyle={{ paddingBottom: selectedPc ? 100 : 40 }}>
            <View style={st.paramsBar}>
              <View style={st.paramChip}><Text style={st.paramChipText}>{date.split('-').reverse().join('.')}</Text></View>
              <View style={st.paramChip}><Text style={st.paramChipText}>{time}</Text></View>
              <View style={st.paramChip}><Text style={st.paramChipText}>{mins} мин</Text></View>
              <TouchableOpacity onPress={() => setStep('params')}><Text style={st.changeParamsText}>Изменить</Text></TouchableOpacity>
            </View>
            {activeTab === 'list' ? renderPcList() : renderPcMap()}
          </ScrollView>

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

      {successData && (
        <SuccessModal
          visible
          password={successData.password}
          pcName={successData.pcName}
          date={date} time={time} mins={mins}
          cost={successData.cost}
          onClose={() => { setSuccessData(null); navigation.goBack(); }}
        />
      )}
    </SafeAreaView>
  );
}

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
  pcCardBusy: { backgroundColor: '#991B1B', borderColor: '#EF4444' },
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
  pkgZoneCard: { flex: 1, backgroundColor: '#0D0D0D', borderRadius: 16, borderWidth: 1, borderColor: '#1A1A1A', padding: 14 },
  pkgZoneCardTitle: { color: '#FFCC00', fontSize: 18, fontWeight: '900', marginBottom: 6 },
  pkgZoneRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  pkgZoneRowName: { fontSize: 11, fontWeight: '800', flex: 1, marginRight: 6 },
  pkgZonePriceWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#333333', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, gap: 4 },
  pkgZoneRowPrice: { color: '#fff', fontSize: 12, fontWeight: '900' },
  pkgZoneRowPer: { color: '#555', fontSize: 10, fontWeight: '600' },
});


