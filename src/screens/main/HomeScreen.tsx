import React, { useState, useCallback, useEffect } from 'react';
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
import { ArrowRightIcon, ControllerIcon, BookingIcon } from '../../components/ui/Icons';
import {
  formatDate, formatTime, calcLocalEndTime, getNearestBookingTime,
} from '../../utils/dateUtils';
import {
  extractStreet, getZoneAccent, getZoneFromBooking, findPassword,
} from '../../utils/bookingUtils';
import { Club } from '../../types';
import { ActiveBooking, RoomFromApi, SpecialOffer } from '../../types';
import { handleApiError } from '../../services/errorHandler';

type NavigationProp = ReturnType<typeof useNavigation<any>>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, updateUser, favoriteClubId } = useAuthStore();
  const { bookings, loadLocalBookings, isInitialLoaded, setIsInitialLoaded } = useBookingStore();

  const [clubs, setClubs]                   = useState<Club[]>([]);
  const [rooms, setRooms]                   = useState<RoomFromApi[]>([]);
  const [refreshing, setRefreshing]         = useState(false);
  const [serverBookings, setServerBookings] = useState<ActiveBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [offers, setOffers]                 = useState<SpecialOffer[]>([]);
  const [offersLoading, setOffersLoading]   = useState(false);

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

  const loadData = async (showLoader = true) => {
    if (showLoader) setRefreshing(true);
    try {
      if (user?.member_id && user?.icafe_id) {
        try {
          const freshUser = await refreshUser(user.member_id, user.icafe_id);
          updateUser(freshUser);
        } catch {
          // Обновление профиля некритично — молча пропускаем
        }
      }

      const clubsData = await fetchClubs();
      setClubs(clubsData);

      const mainClub = clubsData.find(c => String(c.icafe_id) === favoriteClubId) ?? clubsData[0] ?? null;
      if (mainClub) {
        loadOffers(mainClub);
        fetchRooms(mainClub.icafe_id)
          .then(setRooms)
          .catch(() => {});
      }
    } catch (e: any) {
      handleApiError(e?.response?.data?.code ?? 1, e?.message);
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

  const loadOffers = async (club: Club) => {
    setOffersLoading(true);
    try {
          const result = await fetchSpecialOffers(club.icafe_id);
              setOffers(result);
    } catch (e: any) {
          setOffers([]);
    } finally {
      setOffersLoading(false);
    }
  };

  const handleCancelPress = () => {
    Alert.alert('Отмена брони', 'Для отмены брони обратитесь к администратору клуба.');
  };

  const nearestClub    = clubs.find(c => String(c.icafe_id) === favoriteClubId) ?? clubs[0] ?? null;
  const currentAccount = user?.member_account || user?.account;

  const activeLocalBookings = bookings.filter(b =>
    b.timestamp + b.mins * 60000 > Date.now() && b.account === currentAccount,
  );
  const showLocal  = serverBookings.length === 0 && !bookingsLoading && activeLocalBookings.length > 0;
  const lastBooking = bookings.find(b => b.account === currentAccount) ?? null;

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
        date, time,
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
      date, time, mins: dur,
      _resetStep: 'pcs',
      _t: Date.now(),
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
            <BookingIcon size={18} color="#000" />
            <Text style={styles.actionBtnText}>ЗАБРОНИРОВАТЬ ПК</Text>
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
                  const grouped: Record<number, SpecialOffer[]> = {};
                  offers.forEach(o => {
                    const d = Number(o.duration);
                    if (!grouped[d]) grouped[d] = [];
                    grouped[d].push(o);
                  });
                  const durations = Object.keys(grouped).map(Number).sort((a, b) => a - b).slice(0, 2);
                  return (
                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
                      {durations.map(dur => {
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
              const password  = findPassword(b, bookings);
              const zone      = getZoneFromBooking(b.product_pc_name, b.product_description, rooms);
              const startStr  = b.product_available_date_local_from;
              const endStr    = b.product_available_date_local_to;
              const endTime   = endStr ? `${formatDate(endStr)} ${formatTime(endStr)}` : '';
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
          const zone      = getZoneFromBooking(b.pcName, '', rooms);
          const endTime   = calcLocalEndTime(b.startDate, b.startTime, b.mins);
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
