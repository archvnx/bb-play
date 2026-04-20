import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../../store/useAuthStore';
import { useBookingStore, LocalBooking } from '../../store/useBookingStore';
import { refreshUser } from '../../services/authService';
import { fetchClubs, Club } from '../../services/clubsService';
import { getActiveBookings, ActiveBooking } from '../../services/bookingService';
import { get } from '../../api/apiClient';
import { ArrowRightIcon, ControllerIcon, BookingIcon } from '../../components/ui/Icons';

interface SpecialOffer {
  product_id: number | string;
  product_name: string;
  total_price: string;
  duration: string;
  group_name: string;
  price_per_hour?: number;
}

function formatDate(dateStr: string): string {
  const d = dateStr.slice(0, 10).split('-');
  return `${d[2]}.${d[1]}.${d[0]}`;
}

function formatTime(dateStr: string): string {
  return dateStr.slice(11, 16);
}

/** Время окончания для локальной брони (startDate + startTime + mins) */
function calcLocalEndTime(startDate: string, startTime: string, mins: number): string {
  const [h, m] = startTime.split(':').map(Number);
  const start = new Date(`${startDate}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
  if (isNaN(start.getTime())) return '';
  const end = new Date(start.getTime() + mins * 60000);
  const dd = String(end.getDate()).padStart(2, '0');
  const mo = String(end.getMonth() + 1).padStart(2, '0');
  const yyyy = end.getFullYear();
  return `${dd}.${mo}.${yyyy} ${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
}

function extractStreet(address: string): string {
  const parts = address.split(',');
  return parts.length >= 2 ? parts[1].trim() : address;
}

/** Ближайшее доступное время для бронирования (следующий получасовой слот) */
function getNearestBookingTime(): { date: string; time: string } {
  const now = new Date();
  const mins = now.getMinutes();
  const nextMins = mins < 30 ? 30 : 60;
  const offset = nextMins - mins;
  const next = new Date(now.getTime() + offset * 60000);
  const date = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
  const time = `${String(next.getHours()).padStart(2, '0')}:${String(next.getMinutes()).padStart(2, '0')}`;
  return { date, time };
}

const ZONE_STYLES: Record<string, { accent: string }> = {
  BC:      { accent: '#ffffff' },
  GZ:      { accent: '#ffffff' },
  VP:      { accent: '#ffffff' },
  default: { accent: '#FFCC00' },
};

function getZoneAccent(zoneName: string): string {
  const z = zoneName?.toUpperCase();
  if (z?.includes('BC') || z?.includes('BOOT')) return ZONE_STYLES.BC.accent;
  if (z?.includes('VIP') || z?.includes('VP')) return ZONE_STYLES.VP.accent;
  if (z?.includes('GZ') || z?.includes('GAME')) return ZONE_STYLES.GZ.accent;
  return ZONE_STYLES.default.accent;
}

function findPassword(serverBooking: ActiveBooking, localBookings: LocalBooking[]): string | null {
  const serverPc = serverBooking.product_pc_name.toLowerCase();
  const serverDate = serverBooking.product_available_date_local_from.slice(0, 10);
  const serverTime = serverBooking.product_available_date_local_from.slice(11, 16);
  const match = localBookings.find((b) =>
    b.pcName.toLowerCase() === serverPc &&
    b.startDate === serverDate &&
    b.startTime === serverTime
  );
  return match?.password ?? null;
}

function getZoneFromBooking(pcName: string, description: string, rooms: any[]): string | null {
  if (rooms && rooms.length > 0) {
    for (const room of rooms) {
      const foundPc = (room.pcs_list || []).find((pc: any) => pc.pc_name.toLowerCase() === pcName.toLowerCase());
      if (foundPc && room.area_name) return room.area_name;
    }
  }
  const desc = description?.split('@')[0]?.trim();
  if (desc && !desc.toLowerCase().startsWith('почасовая') && !desc.toLowerCase().startsWith('повременн')) {
    return desc;
  }
  return null;
}

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user, updateUser } = useAuthStore();
  const { favoriteClubId } = useAuthStore();
  const { bookings, loadLocalBookings, isInitialLoaded, setIsInitialLoaded } = useBookingStore();

  const [clubs, setClubs] = useState<Club[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [serverBookings, setServerBookings] = useState<ActiveBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [offers, setOffers] = useState<SpecialOffer[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);

  useEffect(() => { loadLocalBookings(); }, []);

  useEffect(() => {
    if (!isInitialLoaded && user?.member_id) {
      loadData(true);
      setIsInitialLoaded(true);
    }
  }, [user?.member_id, isInitialLoaded]);

  useEffect(() => {
  if (clubs.length > 0 && isInitialLoaded) {
    const club = clubs.find((c) => String(c.icafe_id) === favoriteClubId) ?? clubs[0] ?? null;
    if (club) loadOffers(club);
  }
}, [favoriteClubId]);


  const loadData = async (showLoader = true) => {
    if (showLoader) setRefreshing(true);
    try {
      if (user?.member_id && user?.icafe_id) {
        try {
          const freshUser = await refreshUser(user.member_id, user.icafe_id);
          updateUser(freshUser);
        } catch (err) {
          console.warn('[HomeScreen] Ошибка обновления профиля:', err);
        }
      }
      const clubsData = await fetchClubs();
      setClubs(clubsData);
      const mainClub = clubsData.find((c) => String(c.icafe_id) === favoriteClubId) ?? clubsData?.[0] ?? null;

      if (mainClub) {
        loadOffers(mainClub);
        get('/struct-rooms-icafe', { cafeId: mainClub.icafe_id })
          .then((res: any) => setRooms(res?.rooms ?? (Array.isArray(res) ? res : [])))
          .catch(() => {});
}
    } catch (e) {
      console.error('[HomeScreen loadData] Error:', e);
    } finally {
      setRefreshing(false);
      loadLocalBookings();
    }
    loadServerBookings();
  };

  const loadServerBookings = async () => {
    const account = user?.member_account || user?.account;
    if (!account) return;
    setBookingsLoading(true);
    try {
      const result = await getActiveBookings(account);
      setServerBookings(result);
    } catch {
      setServerBookings([]);
    } finally {
      setBookingsLoading(false);
    }
  };

  const loadOffers = async (club?: Club) => {
    if (!club) return;
    setOffersLoading(true);
    try {
      const data: any = await get(`/api/v2/cafe/${club.icafe_id}/products`);
      const rawProducts: any[] = Array.isArray(data)
        ? data
        : (data?.items || data?.products || data?.data || []);

      const seen = new Set<string>();
      const unique = rawProducts.filter((p: any) => {
        const id = String(p.product_id);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });

      const parseName = (raw: string) => raw?.split('<<<')[0]?.trim() ?? raw;
      const parseZone = (raw: string) => {
        const p = raw?.split('<<<');
        return p?.length && p.length > 1 ? p[p.length - 1]?.trim() : '';
      };
      const parseDurationFromName = (name: string): number => {
        const h = name.match(/(\d+)\s*(час|часа|часов)/i);
        if (h) return parseInt(h[1], 10) * 60;
        const m = name.match(/(\d+)\s*мин/i);
        if (m) return parseInt(m[1], 10);
        return 0;
      };

      const validProducts: SpecialOffer[] = unique
        .filter((p: any) => p.product_enable_client !== 0)
        .map((p: any, idx: number) => {
          const raw: string = p.product_name ?? '';
          const name = parseName(raw);
          const zone = parseZone(raw);
          const durationMins = parseDurationFromName(name);
          const totalPrice = parseFloat(p.product_cost ?? p.product_price ?? '0');
          const pricePerHour = durationMins > 0 ? Math.round(totalPrice / (durationMins / 60)) : 0;
          return {
            product_id: p.product_id != null ? `${p.product_id}` : `idx_${idx}`,
            product_name: name,
            total_price: String(totalPrice),
            duration: String(durationMins),
            group_name: zone,
            price_per_hour: pricePerHour,
          };
        })
        .filter((p) => Number(p.duration) > 0 && Number(p.total_price) > 0);

      setOffers(validProducts.slice(0, 10));
    } catch (e) {
      setOffers([]);
    } finally {
      setOffersLoading(false);
    }
  };

  const handleCancelPress = () => {
    Alert.alert('Отмена брони', 'Для отмены брони обратитесь к администратору клуба.');
  };

  const nearestClub = clubs.find((c) => String(c.icafe_id) === favoriteClubId) ?? clubs[0] ?? null;
  const currentAccount = user?.member_account || user?.account;
  const activeLocalBookings = bookings.filter((b) =>
    b.timestamp + b.mins * 60000 > Date.now() &&
    b.account === currentAccount
  );
  const showLocal = serverBookings.length === 0 && !bookingsLoading && activeLocalBookings.length > 0;
  const lastBooking = bookings.find((b) => b.account === currentAccount) ?? null;

  const handleNearestClubPress = () => {
    if (!nearestClub) return;
    navigation.navigate('Booking', {
      cafeId: String(nearestClub.icafe_id),
      _resetStep: 'club',
      _t: Date.now(),
    });
  };

  const handleLastBookingPress = () => {
    const { date, time } = getNearestBookingTime();
    if (lastBooking) {
      navigation.navigate('Booking', {
        cafeId: lastBooking.cafeId,
        date,
        time,
        mins: lastBooking.mins,
        pcName: lastBooking.pcName,
        _resetStep: 'pcs',
        _t: Date.now(),
      });
    } else {
      navigation.navigate('Booking', { _resetStep: 'club', _t: Date.now() });
    }
  };

  const handleOfferPress = (dur: number) => {
    if (!nearestClub) return;
    const { date, time } = getNearestBookingTime();
    navigation.navigate('Booking', {
      cafeId: String(nearestClub.icafe_id),
      date,
      time,
      mins: dur,
      _resetStep: 'pcs',
      _t: Date.now(),
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor="#FFCC00" />}
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
                <Text style={styles.avatarText}>{(user?.first_name || user?.account || 'U').slice(0, 1).toUpperCase()}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Баланс ── */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceRow}>
            <View>
              <Text style={styles.balLabel}>ВАШ БАЛАНС</Text>
              <Text style={styles.balValue}>{user?.balance || '0'} ₽</Text>
            </View>
            <View style={styles.bonusBadge}>
              <Text style={styles.bonusText}>+{user?.bonus || '0'} Б</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Booking', { _resetStep: 'club', _t: Date.now() })}
            activeOpacity={0.85}
          >
            <BookingIcon size={18} color="#000" /><Text style={styles.actionBtnText}>ЗАБРОНИРОВАТЬ ПК</Text>
          </TouchableOpacity>
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

        {/* ── Спецпредложения ── */}
        {(offers.length > 0 || offersLoading) && (
          <>
            <Text style={styles.sectionTitle}>СПЕЦИАЛЬНЫЕ ПРЕДЛОЖЕНИЯ</Text>
            {offersLoading
              ? <ActivityIndicator color="#FFCC00" style={{ marginBottom: 16 }} />
              : (() => {
                  const grouped: Record<number, typeof offers> = {};
                  offers.forEach(o => {
                    const d = Number(o.duration);
                    if (!grouped[d]) grouped[d] = [];
                    grouped[d].push(o);
                  });
                  const durations = Object.keys(grouped).map(Number).sort((a, b) => a - b).slice(0, 2);
                  return (
                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
                      {durations.map((dur) => {
                        const zones = grouped[dur];
                        const hours = dur / 60;
                        return (
                          <TouchableOpacity
                            key={dur}
                            style={styles.offerPkgCard}
                            activeOpacity={0.8}
                            onPress={() => handleOfferPress(dur)}
                          >
                            <Text style={styles.offerPkgTitle}>
                              {hours} {hours === 1 ? 'час' : hours < 5 ? 'часа' : 'часов'}
                            </Text>
                            <View style={{ gap: 6, marginTop: 4 }}>
                              {zones.map((offer, idx) => {
                                const accent = getZoneAccent(offer.group_name);
                                return (
                                  <View key={`${offer.product_id}_${idx}`} style={styles.offerPkgZoneRow}>
                                    <Text style={[styles.offerPkgZoneName, { color: accent }]} numberOfLines={1}>
                                      {offer.group_name || 'PC'}
                                    </Text>
                                    <View style={styles.offerPkgPriceWrap}>
                                      <Text style={styles.offerPkgPrice}>
                                        {parseFloat(offer.total_price).toFixed(0)} ₽
                                      </Text>
                                      <Text style={styles.offerPkgPerHour}>
                                        {offer.price_per_hour} ₽/ч
                                      </Text>
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
                })()
            }
          </>
        )}

        {/* ── Активные брони (сервер) ── */}
        {(serverBookings.length > 0 || bookingsLoading) && (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>АКТИВНЫЕ БРОНИ</Text>
              {bookingsLoading && <ActivityIndicator size="small" color="#FFCC00" />}
            </View>
            {serverBookings.map((b, index) => {
              const password = findPassword(b, bookings);
              const zone = getZoneFromBooking(b.product_pc_name, b.product_description, rooms);
              const startStr = b.product_available_date_local_from;
              const endStr = b.product_available_date_local_to;
              const endTime = endStr ? `${formatDate(endStr)} ${formatTime(endStr)}` : '';
              const cardTitle = index === 0 ? 'БЛИЖАЙШАЯ БРОНЬ' : 'БРОНЬ';
              return (
                <View key={b.member_offer_id} style={styles.activeBookingCard}>
                  <View style={styles.activeBookingHeader}>
                    <BookingIcon size={20} color="#FFCC00" />
                    <Text style={styles.activeBookingTitle}>{cardTitle}</Text>
                    {zone && <View style={styles.zoneBadge}><Text style={styles.zoneText}>{zone}</Text></View>}
                  </View>
                  <View style={styles.activeBookingContent}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.activeBookingLabel}>Компьютер:</Text>
                      <Text style={styles.activeBookingValue}>{b.product_pc_name}</Text>
                      <Text style={[styles.activeBookingLabel, { marginTop: 8 }]}>Начало:</Text>
                      <Text style={styles.activeBookingValue}>{formatDate(startStr)} {formatTime(startStr)}</Text>
                      {endTime ? (
                        <>
                          <Text style={[styles.activeBookingLabel, { marginTop: 8 }]}>Конец:</Text>
                          <Text style={styles.activeBookingValue}>{endTime}</Text>
                        </>
                      ) : null}
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
          </>
        )}

        {/* ── Активные брони (локальные) ── */}
        {showLocal && activeLocalBookings.map((b, index) => {
          const zone = getZoneFromBooking(b.pcName, '', rooms);
          const endTime = calcLocalEndTime(b.startDate, b.startTime, b.mins);
          const cardTitle = index === 0 ? 'БЛИЖАЙШАЯ БРОНЬ' : 'БРОНЬ';
          return (
            <View key={b.id} style={styles.activeBookingCard}>
              <View style={styles.activeBookingHeader}>
                <BookingIcon size={20} color="#FFCC00" />
                <Text style={styles.activeBookingTitle}>{cardTitle}</Text>
                {zone && <View style={styles.zoneBadge}><Text style={styles.zoneText}>{zone}</Text></View>}
              </View>
              <View style={styles.activeBookingContent}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activeBookingLabel}>Компьютер:</Text>
                  <Text style={styles.activeBookingValue}>{b.pcName}</Text>
                  <Text style={[styles.activeBookingLabel, { marginTop: 8 }]}>Начало:</Text>
                  <Text style={styles.activeBookingValue}>{formatDate(b.startDate)} {b.startTime}</Text>
                  {endTime ? (
                    <>
                      <Text style={[styles.activeBookingLabel, { marginTop: 8 }]}>Конец:</Text>
                      <Text style={styles.activeBookingValue}>{endTime}</Text>
                    </>
                  ) : null}
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
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scroll: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  greet: { color: '#444', fontSize: 16, fontWeight: '600' },
  name: { color: '#fff', fontSize: 28, fontWeight: '900' },
  avatarPlaceholder: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FFCC00' },
  avatarText: { color: '#FFCC00', fontWeight: '800', fontSize: 20 },
  balanceCard: { backgroundColor: '#FFCC00', borderRadius: 24, padding: 24, marginBottom: 24 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  balLabel: { color: '#000', fontSize: 12, fontWeight: '800', opacity: 0.6, letterSpacing: 1 },
  balValue: { color: '#000', fontSize: 36, fontWeight: '900' },
  bonusBadge: { backgroundColor: '#000', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  bonusText: { color: '#FFCC00', fontWeight: '800', fontSize: 14 },
  actionBtn: { backgroundColor: '#fff', borderRadius: 14, paddingVertical: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  actionBtnText: { color: '#000', fontWeight: '900', fontSize: 15 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 },
  sectionTitle: { color: '#444', fontSize: 12, fontWeight: '800', letterSpacing: 2, marginBottom: 15, textTransform: 'uppercase' },
  quickAccessRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  qaCard: { flex: 1, backgroundColor: '#0D0D0D', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#1A1A1A' },
  qaIconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#1A1100', alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#FFCC00' },
  qaLabel: { color: '#777', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  qaValue: { color: '#fff', fontSize: 13, fontWeight: '800' },
  offerPkgCard: { flex: 1, backgroundColor: '#0D0D0D', borderRadius: 16, borderWidth: 1, borderColor: '#1A1A1A', padding: 14 },
  offerPkgTitle: { color: '#FFCC00', fontSize: 18, fontWeight: '900', marginBottom: 6 },
  offerPkgZoneRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  offerPkgZoneName: { fontSize: 11, fontWeight: '800', flex: 1, marginRight: 6 },
  offerPkgPriceWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#333', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, gap: 4 },
  offerPkgPrice: { color: '#fff', fontSize: 12, fontWeight: '900' },
  offerPkgPerHour: { color: '#555', fontSize: 10, fontWeight: '600' },
  activeBookingCard: { backgroundColor: '#111', borderRadius: 20, borderWidth: 1, borderColor: '#FFCC00', padding: 20, marginBottom: 30 },
  activeBookingHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  activeBookingTitle: { color: '#FFCC00', fontSize: 14, fontWeight: '900', letterSpacing: 1.5, flex: 1 },
  zoneBadge: { backgroundColor: '#1A1100', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#FFCC0055' },
  zoneText: { color: '#FFCC00', fontSize: 10, fontWeight: '700' },
  activeBookingContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  activeBookingLabel: { color: '#777', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 },
  activeBookingValue: { color: '#fff', fontSize: 16, fontWeight: '800' },
  activeBookingCodeWrap: { backgroundColor: '#FFCC00', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center' },
  activeBookingCodeLabel: { color: '#000', fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 2 },
  activeBookingCode: { color: '#000', fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  cancelBtn: { backgroundColor: '#FF3B30', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 0.5 },
});