import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../../store/useAuthStore';
import { useBookingStore } from '../../store/useBookingStore';
import { refreshUser } from '../../services/authService';
import { fetchClubs } from '../../services/clubsService';
import { getActiveBookings, fetchSpecialOffers, fetchRooms } from '../../services/bookingService';
import { getWheelStatus, getStreak } from '../../services/backendService';
import { WheelCard } from '../../components/home/WheelCard';
import { FortuneWheelModal } from '../../components/home/FortuneWheelModal';
import { StreakModal } from '../../components/home/StreakModal';
import type { WheelStatus, SpinResult, StreakInfo } from '../../types/backend';
import { ArrowRightIcon, ControllerIcon, BookingIcon } from '../../components/ui/Icons';
import { formatDate, formatTime, getNearestBookingTime } from '../../utils/dateUtils';
import { extractStreet, getZoneAccent, getZoneFromBooking, findPassword } from '../../utils/bookingUtils';
import { PKG_ZONE_NAMES } from '../../constants/config';
import { Club, ActiveBooking, RoomFromApi, SpecialOffer } from '../../types';
import { handleApiError } from '../../services/errorHandler';
import Svg, { Path } from 'react-native-svg';

// ─── Фиксированный размер всех карточек в горизонтальном скролле ────────────
const CARD_SIZE = 171;

// ─── Встроенные SVG Иконки ───────────────────────────────────────────────────
const FireIcon = ({ size = 24, color = "#FF6B35" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
  </Svg>
);

// ─── Компонент ────────────────────────────────────────────────────────────────
type NavigationProp = ReturnType<typeof useNavigation<any>>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, updateUser, favoriteClubId } = useAuthStore();
  const { bookings, loadLocalBookings, isInitialLoaded, setIsInitialLoaded, hasJustBooked, clearJustBookedFlag } = useBookingStore();

  const [clubs, setClubs] = useState<Club[]>([]);
  const [rooms, setRooms] = useState<RoomFromApi[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [serverBookings, setServerBookings] = useState<ActiveBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [serverBookingsFailed, setServerBookingsFailed] = useState(false);
  const serverBookingsFailedRef = useRef(false);
  const [offers, setOffers] = useState<SpecialOffer[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);

  const [wheelStatus, setWheelStatus] = useState<WheelStatus | null>(null);
  const [wheelLoading, setWheelLoading] = useState(false);
  const [wheelModalOpen, setWheelModalOpen] = useState(false);
  const [streakModalOpen, setStreakModalOpen] = useState(false);
  const [streak, setStreak] = useState<StreakInfo | null>(null);

  // AbortController для запроса активных броней —
  // отменяем при уходе с экрана, чтобы не блокировать iCafeCloud сессию
  const bookingsAbortRef = useRef<AbortController | null>(null);

  // Группируем offers по длительности (макс. 2 пакета, сортировка по возрастанию)
  const { grouped, durations } = useMemo(() => {
    const grouped: Record<number, SpecialOffer[]> = {};
    offers.forEach(o => {
      const d = Number(o.duration);
      if (!grouped[d]) grouped[d] = [];
      grouped[d].push(o);
    });
    const durations = Object.keys(grouped).map(Number).sort((a, b) => a - b).slice(0, 2);
    return { grouped, durations };
  }, [offers]);

  // Пакеты есть?
  const hasPkgs = durations.length > 0;

  useFocusEffect(useCallback(() => {
    // Обновляем брони только если только что сделали бронь —
    // не при каждом переключении вкладок
    if (useBookingStore.getState().hasJustBooked) {
      clearJustBookedFlag();
      loadLocalBookings();
      setTimeout(() => loadServerBookings(), 500);
    }
  }, []));

  const handleSpinDone = (result: SpinResult) => {
    if (user?.member_id) {
      getWheelStatus(user.member_id).then(setWheelStatus).catch(() => {});
    }
  };

  useEffect(() => { loadLocalBookings(); }, []);

  useEffect(() => {
    if (!isInitialLoaded && user?.member_id) {
      loadData(true);
      setIsInitialLoaded(true);
    }
  }, [user?.member_id, isInitialLoaded]);

  useEffect(() => {
    if (clubs.length > 0 && isInitialLoaded) {
      const club = clubs.find(c => String(c.icafe_id) === favoriteClubId) ?? clubs[0] ?? null;
      if (club) loadOffers(club);
    }
  }, [favoriteClubId]);

  const loadData = async (showLoader = true, delayMs = 0) => {
    if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));
    if (showLoader) setRefreshing(true);
    serverBookingsFailedRef.current = false;
    setServerBookingsFailed(false);
    // Wheel и streak грузим один раз при открытии / pull-to-refresh
    if (user?.member_id) {
      setWheelLoading(true);
      Promise.all([getWheelStatus(user.member_id), getStreak(user.member_id)])
        .then(([ws, st]) => { setWheelStatus(ws); setStreak(st); })
        .catch(() => {})
        .finally(() => setWheelLoading(false));
    }
    try {
      // Запросы последовательно — чтобы не перегружать iCafeCloud сессию аккаунта
      if (user?.member_id && user?.icafe_id) {
        try { const freshUser = await refreshUser(user.member_id, user.icafe_id); updateUser(freshUser); } catch {}
      }
      const clubsData = await fetchClubs();
      setClubs(clubsData);
      const mainClub = clubsData.find(c => String(c.icafe_id) === favoriteClubId) ?? clubsData[0] ?? null;
      if (mainClub) {
        // Небольшая задержка между запросами к iCafeCloud
        await loadOffers(mainClub);
        fetchRooms(mainClub.icafe_id).then(setRooms).catch(() => {});
      }
    } catch (e: any) {
      handleApiError(e?.response?.data?.code ?? 1, e?.message);
    } finally {
      setRefreshing(false);
      loadLocalBookings();
    }
    // Active bookings запрашиваем последним — после остальных
    setTimeout(() => loadServerBookings(), 500);
  };

  const loadServerBookings = async () => {
    const account = user?.member_account || user?.account;
    if (!account) return;
    if (serverBookingsFailedRef.current) return;

    // Отменяем предыдущий запрос если он ещё висит
    bookingsAbortRef.current?.abort();
    const controller = new AbortController();
    bookingsAbortRef.current = controller;

    setBookingsLoading(true);
    try {
      const result = await getActiveBookings(account, controller.signal);
      if (!controller.signal.aborted) setServerBookings(result);
    } catch (e: any) {
      if (!controller.signal.aborted) {
        serverBookingsFailedRef.current = true;
        setServerBookingsFailed(true);
        setServerBookings([]);
      }
    } finally {
      if (!controller.signal.aborted) setBookingsLoading(false);
    }
  };

  // Отменяем запрос активных броней при уходе с экрана
  useEffect(() => {
    return () => { bookingsAbortRef.current?.abort(); };
  }, []);

  const loadOffers = async (club: Club) => {
    setOffersLoading(true);
    try { setOffers(await fetchSpecialOffers(club.icafe_id)); }
    catch { setOffers([]); }
    finally { setOffersLoading(false); }
  };

  const handleCancelPress = () =>
    Alert.alert('Отмена брони', 'Для отмены брони обратитесь к администратору клуба.');

  const handleWheelPress = () => setWheelModalOpen(true);

  const nearestClub = clubs.find(c => String(c.icafe_id) === favoriteClubId) ?? clubs[0] ?? null;
  const currentAccount = user?.member_account || user?.account;
  const lastBooking = bookings.find(b => b.account === currentAccount) ?? null;

  const handleNearestClubPress = () => {
    if (!nearestClub) return;
    navigation.navigate('Booking', { cafeId: String(nearestClub.icafe_id), _resetStep: 'club', _t: Date.now() });
  };

  const handleLastBookingPress = () => {
    const { date, time } = getNearestBookingTime();
    if (lastBooking) {
      navigation.navigate('Booking', {
        cafeId: lastBooking.cafeId, date, time, mins: lastBooking.mins,
        pcName: lastBooking.pcName, _resetStep: 'pcs', _t: Date.now(),
      });
    } else {
      navigation.navigate('Booking', { _resetStep: 'club', _t: Date.now() });
    }
  };

  const handleOfferPress = (dur: number, productId: string) => {
    if (!nearestClub) return;
    const { date, time } = getNearestBookingTime();
    navigation.navigate('Booking', {
      cafeId: String(nearestClub.icafe_id), date, time, mins: dur,
      productId, _resetStep: 'pcs', _t: Date.now(),
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor="#FFCC00" />
        }
      >

        {/* ── Шапка ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greet}>Привет,</Text>
            <Text style={styles.name}>{user?.first_name || user?.account || 'Гость'}!</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} activeOpacity={0.8}>
            {user?.photo && user.photo.length > 10 ? (
              <Image source={{ uri: user.photo }} style={styles.avatarPlaceholder} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {(user?.first_name || user?.account || 'U').slice(0, 1).toUpperCase()}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Баланс ── */}
        <View style={styles.balanceRow}>
          <View style={styles.balanceCard}>
            <View style={styles.balTopRow}>
              <View>
                <Text style={styles.balLabel}>ВАШ БАЛАНС</Text>
                <Text style={styles.balValue}>{user?.balance || '0'} ₽</Text>
              </View>
              <View style={styles.bonusBadge}><Text style={styles.bonusText}>+{user?.bonus || '0'} Б</Text></View>
            </View>
            <TouchableOpacity
              style={[styles.actionBtn, { marginTop: 12 }]}
              onPress={() => navigation.navigate('Booking', { _resetStep: 'club', _t: Date.now() })}
              activeOpacity={0.85}
            >
              <BookingIcon size={18} color="#000" />
              <Text style={styles.actionBtnText}>ЗАБРОНИРОВАТЬ ПК</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Быстрое бронирование ── */}
        <Text style={styles.sectionTitle}>БЫСТРОЕ БРОНИРОВАНИЕ</Text>
        <View style={styles.quickAccessRow}>
          <TouchableOpacity style={styles.qaCard} activeOpacity={0.8} onPress={handleNearestClubPress}>
            <View style={styles.qaIconWrap}><BookingIcon size={18} color="#FFCC00" /></View>
            <Text style={styles.qaLabel}>Ближайший клуб</Text>
            <Text style={styles.qaValue} numberOfLines={1}>
              {nearestClub ? nearestClub.address : 'Загрузка...'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.qaCard} activeOpacity={0.8} onPress={handleLastBookingPress}>
            <View style={styles.qaIconWrap}><ControllerIcon size={18} color="#FFCC00" /></View>
            <Text style={styles.qaLabel}>Последняя бронь</Text>
            {lastBooking ? (
              <Text style={styles.qaValue} numberOfLines={2}>
                {extractStreet(lastBooking.cafeAddress)}{'\n'}{lastBooking.startTime} · {lastBooking.pcName}
              </Text>
            ) : (
              <Text style={styles.qaValue}>Нет данных</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ══════════════════════════════════════════════════════════════════════
            СПЕЦИАЛЬНЫЕ ПРЕДЛОЖЕНИЯ — горизонтальный скролл с квадратными картами
        ═══════════════════════════════════════════════════════════════════════ */}
        <Text style={styles.sectionTitle}>СПЕЦИАЛЬНЫЕ ПРЕДЛОЖЕНИЯ</Text>
        <View style={styles.horizontalScrollWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScrollContent}
          >

            {/* Пока пакеты грузятся — только спиннер */}
            {offersLoading && (
              <View style={styles.loadingWrapPkg}>
                <ActivityIndicator color="#FFCC00" />
              </View>
            )}

            {!offersLoading && (
              <>
                {/* ── 1. Стрик скидок ── */}
                {streak !== null && (
                  <TouchableOpacity
                    style={[styles.streakCard, { width: CARD_SIZE, height: CARD_SIZE }]}
                    activeOpacity={0.8}
                    onPress={() => setStreakModalOpen(true)}
                  >
                    <View style={styles.streakHeader}>
                      <View style={styles.streakIconWrap}>
                        <FireIcon size={24} color={streak.currentStreak > 0 ? "#FF6B35" : "#555"} />
                      </View>
                      {streak.discountPct > 0 && (
                        <View style={styles.discBadge}>
                          <Text style={styles.discBadgeText}>-{streak.discountPct}%</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.streakContent}>
                      <Text style={styles.streakLabel}>СЕРИЯ БРОНЕЙ</Text>
                      <Text style={styles.streakDays}>
                        {streak.currentStreak}{' '}
                        <Text style={styles.streakDaysSub}>
                          {streak.currentStreak === 1 ? 'день' : streak.currentStreak < 5 ? 'дня' : 'дней'}
                        </Text>
                      </Text>
                    </View>
                    <View style={styles.streakFooter}>
                      <Text style={styles.streakHint}>
                        {streak.nextTierDays != null && streak.currentStreak < streak.nextTierDays
                          ? `Ещё ${streak.nextTierDays - streak.currentStreak}дн. до ${streak.nextTierDiscount}%`
                          : 'Максимальная скидка!'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}

                {/* ── 2. Колесо фортуны ── */}
                <WheelCard
                  status={wheelStatus}
                  loading={wheelLoading && !wheelStatus}
                  onPress={handleWheelPress}
                  size={CARD_SIZE}
                />
                {durations.map(dur => {
                  const zones = grouped[dur];
                  const hours = dur / 60;

                  return (
                    <TouchableOpacity
                      key={dur}
                      style={[styles.pkgCard, { width: CARD_SIZE, height: CARD_SIZE }]}
                      activeOpacity={0.75}
                      onPress={() => handleOfferPress(dur, zones[0].product_id)}
                    >
                      <Text style={styles.pkgTitle} numberOfLines={1} ellipsizeMode="tail">
                        {hours} {hours === 1 ? 'час' : hours < 5 ? 'часа' : 'часов'}
                      </Text>

                      <View style={styles.pkgZones}>
                        {zones.map((offer, idx) => {
                          const accent = getZoneAccent(offer.group_name);
                          const zoneName = PKG_ZONE_NAMES[offer.group_name] ?? offer.group_name;
                          return (
                            <View key={`${offer.product_id}_${idx}`} style={styles.pkgZoneRow}>
                              <Text style={[styles.pkgZoneName, { color: accent }]} numberOfLines={1} ellipsizeMode="tail">
                                {zoneName || 'PC'}
                              </Text>
                              <View style={styles.pkgPriceWrap}>
                                <Text style={styles.pkgPrice} numberOfLines={1} ellipsizeMode="tail">
                                  {parseFloat(offer.total_price).toFixed(0)} ₽
                                </Text>
                                <Text style={styles.pkgPer} numberOfLines={1} ellipsizeMode="tail">{offer.price_per_hour} ₽/ч</Text>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </>
            )}

          </ScrollView>
        </View>

        {/* ── Активные брони ── */}
        {(serverBookings.length > 0 || bookingsLoading || serverBookingsFailed) && (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>АКТИВНЫЕ БРОНИ</Text>
              {bookingsLoading && <ActivityIndicator size="small" color="#FFCC00" />}
            </View>

            {/* Серверные брони */}
            {!serverBookingsFailed && serverBookings.map((b, index) => {
              const password = findPassword(b, bookings);
              const zone = getZoneFromBooking(b.product_pc_name, b.product_description, rooms);
              const startStr = b.product_available_date_local_from;
              const endStr = b.product_available_date_local_to;
              const endTime = endStr ? `${formatDate(endStr)} ${formatTime(endStr)}` : '';
              return (
                <View key={b.member_offer_id} style={styles.activeBookingCard}>
                  <View style={styles.activeBookingHeader}>
                    <BookingIcon size={20} color="#FFCC00" />
                    <Text style={styles.activeBookingTitle}>
                      {index === 0 ? 'БЛИЖАЙШАЯ БРОНЬ' : 'БРОНЬ'}
                    </Text>
                    {zone && (
                      <View style={styles.zoneBadge}>
                        <Text style={styles.zoneText}>{zone}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.activeBookingContent}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.activeBookingLabel}>Компьютер:</Text>
                      <Text style={styles.activeBookingValue}>{b.product_pc_name}</Text>
                      <Text style={[styles.activeBookingLabel, { marginTop: 8 }]}>Начало:</Text>
                      <Text style={styles.activeBookingValue}>{formatDate(startStr)} {formatTime(startStr)}</Text>
                      {endTime && (
                        <>
                          <Text style={[styles.activeBookingLabel, { marginTop: 8 }]}>Конец:</Text>
                          <Text style={styles.activeBookingValue}>{endTime}</Text>
                        </>
                      )}
                    </View>
                    {password && (
                      <View style={styles.activeBookingCodeWrap}>
                        <Text style={styles.activeBookingCodeLabel}>КОД ДЛЯ ПК</Text>
                        <Text style={styles.activeBookingCode}>{password}</Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelPress} activeOpacity={0.8}>
                    <Text style={styles.cancelBtnText}>Отменить бронь</Text>
                  </TouchableOpacity>
                </View>
              );
            })}

            {/* Локальные брони — фолбэк если сервер упал */}
            {serverBookingsFailed && bookings
              .filter(b => b.account === currentAccount)
              .map((b, index) => (
                <View key={b.pcName + b.startTime} style={styles.activeBookingCard}>
                  <View style={styles.activeBookingHeader}>
                    <BookingIcon size={20} color="#FFCC00" />
                    <Text style={styles.activeBookingTitle}>
                      {index === 0 ? 'БЛИЖАЙШАЯ БРОНЬ' : 'БРОНЬ'}
                    </Text>
                  </View>
                  <View style={styles.activeBookingContent}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.activeBookingLabel}>Компьютер:</Text>
                      <Text style={styles.activeBookingValue}>{b.pcName}</Text>
                      <Text style={[styles.activeBookingLabel, { marginTop: 8 }]}>Начало:</Text>
                      <Text style={styles.activeBookingValue}>{b.startTime}</Text>
                    </View>
                    {b.password && (
                      <View style={styles.activeBookingCodeWrap}>
                        <Text style={styles.activeBookingCodeLabel}>КОД ДЛЯ ПК</Text>
                        <Text style={styles.activeBookingCode}>{b.password}</Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelPress} activeOpacity={0.8}>
                    <Text style={styles.cancelBtnText}>Отменить бронь</Text>
                  </TouchableOpacity>
                </View>
              ))
            }
          </>
        )}

      </ScrollView>

      {user?.member_id && (
        <FortuneWheelModal
          visible={wheelModalOpen}
          status={wheelStatus}
          memberId={user.member_id}
          onClose={() => setWheelModalOpen(false)}
          onSpinDone={handleSpinDone}
        />
      )}

      <StreakModal
        visible={streakModalOpen}
        streak={streak}
        onClose={() => setStreakModalOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scroll: { paddingVertical: 20, paddingBottom: 40 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingHorizontal: 20 },
  balanceRow: { flexDirection: 'row', alignItems: 'stretch', marginBottom: 24, gap: 10, paddingHorizontal: 20 },
  sectionTitle: { color: '#444', fontSize: 12, fontWeight: '800', letterSpacing: 2, marginBottom: 15, paddingHorizontal: 20 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15, paddingHorizontal: 20 },
  quickAccessRow: { flexDirection: 'row', gap: 12, marginBottom: 30, paddingHorizontal: 20 },

  greet: { color: '#444', fontSize: 16, fontWeight: '600' },
  name: { color: '#fff', fontSize: 28, fontWeight: '900' },
  avatarPlaceholder: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FFCC00' },
  avatarText: { color: '#FFCC00', fontWeight: '800', fontSize: 20 },

  balanceCard: { flex: 1, backgroundColor: '#FFCC00', borderRadius: 24, padding: 20 },
  balTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  balLabel: { color: '#000', fontSize: 11, fontWeight: '800', opacity: 0.55, letterSpacing: 1 },
  balValue: { color: '#000', fontSize: 32, fontWeight: '900' },
  bonusBadge: { backgroundColor: '#000', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  bonusText: { color: '#FFCC00', fontWeight: '800', fontSize: 13 },
  actionBtn: { backgroundColor: '#fff', borderRadius: 12, paddingVertical: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  actionBtnText: { color: '#000', fontWeight: '900', fontSize: 13 },

  qaCard: { flex: 1, backgroundColor: '#0D0D0D', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#1A1A1A' },
  qaIconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#1A1100', alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#FFCC00' },
  qaLabel: { color: '#777', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  qaValue: { color: '#fff', fontSize: 13, fontWeight: '800' },

  horizontalScrollWrapper: { marginHorizontal: -20, marginBottom: 30 },
  horizontalScrollContent: { paddingHorizontal: 20, gap: 12, paddingBottom: 10, alignItems: 'stretch' },

  loadingWrapPkg: { width: CARD_SIZE, height: CARD_SIZE, justifyContent: 'center', alignItems: 'center' },

  streakCard: {
    backgroundColor: '#0D0D0D',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1A1A1A',
    padding: 16,
    justifyContent: 'space-between',
  },
  streakHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  streakIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center' },
  discBadge: { backgroundColor: '#FF6B35', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  discBadgeText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  streakContent: { gap: 2, flex: 1, justifyContent: 'center', marginTop: 12, alignItems: 'center' },
  streakLabel: { color: '#FF6B35', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, textAlign: 'center' },
  streakDays: { color: '#fff', fontSize: 24, fontWeight: '900', textAlign: 'center' },
  streakDaysSub: { fontSize: 12, color: '#888', fontWeight: '600' },
  streakFooter: { backgroundColor: '#1A1A1A', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  streakHint: { color: '#bbb', fontSize: 10, fontWeight: '700' },

  pkgCard: {
    backgroundColor: '#0D0D0D',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1A1A1A',
    padding: 14,
  },
  pkgTitle: {
    color: '#FFCC00',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 6,
  },
  pkgZones: {
    gap: 6,
    marginTop: 4,
  },
  pkgZoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  pkgZoneName: {
    fontSize: 11,
    fontWeight: '800',
    flex: 1,
    marginRight: 6,
  },
  pkgPriceWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 4,
  },
  pkgPrice: { color: '#fff', fontSize: 12, fontWeight: '900' },
  pkgPer: { color: '#555', fontSize: 10, fontWeight: '600' },

  activeBookingCard: { backgroundColor: '#111', borderRadius: 20, borderWidth: 1, borderColor: '#FFCC00', padding: 20, marginBottom: 20, marginHorizontal: 20 },
  activeBookingHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  activeBookingTitle: { color: '#FFCC00', fontSize: 14, fontWeight: '900', letterSpacing: 1.5, flex: 1 },
  zoneBadge: { backgroundColor: '#1A1100', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#FFCC0055' },
  zoneText: { color: '#FFCC00', fontSize: 10, fontWeight: '700' },
  activeBookingContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  activeBookingLabel: { color: '#777', fontSize: 11, fontWeight: '700', marginBottom: 2 },
  activeBookingValue: { color: '#fff', fontSize: 16, fontWeight: '800' },
  activeBookingCodeWrap: { backgroundColor: '#FFCC00', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center' },
  activeBookingCodeLabel: { color: '#000', fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 2 },
  activeBookingCode: { color: '#000', fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  cancelBtn: { backgroundColor: '#FF3B30', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { color: '#fff', fontWeight: '900', fontSize: 14 },
});