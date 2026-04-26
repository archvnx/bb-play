import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../store/useAuthStore';
import { updateProfile, refreshUser } from '../../services/authService';
import { fetchClubs } from '../../services/clubsService';
import { Club } from '../../types';
import { CameraIcon, WalletIcon, RefreshIcon, LogoutIcon, EditIcon } from '../../components/ui/Icons';
import { formatPhone } from '../../utils/phoneFormat';
import { birthdayToDisplay } from '../../utils/profileUtils';
import * as ImageManipulator from 'expo-image-manipulator';
import { Avatar } from '../../components/profile/Avatar';
import { InfoRow, EditableRow } from '../../components/profile/ProfileRows';
import { EditModal, EditField } from '../../components/profile/EditModal';
import { TopupModal } from '../../components/profile/TopupModal';
import { FavoriteClubModal } from '../../components/profile/FavoriteClubModal';
import { handleApiError } from '../../services/errorHandler';
// ─── Новые компоненты (добавляем к существующему) ─────────────────────────────
import { StreakMeter } from '../../components/home/StreakMeter';
import { PromoCodesModal } from '../../components/profile/PromoCodesModal';
import { BookingHistoryModal } from '../../components/profile/BookingHistoryModal';
import { getStreak, getMyPromoCodes, getBookingStats } from '../../services/backendService';
import type { StreakInfo, PromoCode, BookingStats } from '../../types/backend';

export default function ProfileScreen() {
  const { user, logout, updateUser, setAuth, favoriteClubId, setFavoriteClub } = useAuthStore();

  // ─── Оригинальный стейт — без изменений ────────────────────────────────────
  const [refreshing, setRefreshing]               = useState(false);
  const [editField, setEditField]                 = useState<EditField | null>(null);
  const [editModalVisible, setEditModalVisible]   = useState(false);
  const [topupModalVisible, setTopupModalVisible] = useState(false);
  const [clubModalVisible, setClubModalVisible]   = useState(false);
  const [uploadingAvatar, setUploadingAvatar]     = useState(false);
  const [clubs, setClubs]                         = useState<Club[]>([]);

  // ─── Новый стейт ─────────────────────────────────────────────────────────────
  const [streak, setStreak]         = useState<StreakInfo | null>(null);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [stats, setStats]           = useState<BookingStats | null>(null);
  const [extraLoading, setExtraLoading] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [promoModalVisible, setPromoModalVisible] = useState(false);

  // Оригинальный useEffect — без изменений
  useEffect(() => {
    fetchClubs().then(setClubs).catch(() => {});
  }, []);

  // Загружаем стрик + промокоды при каждом фокусе экрана
  useFocusEffect(useCallback(() => {
    if (!user?.member_id) return;
    setExtraLoading(true);
    Promise.all([
      getStreak(user.member_id),
      getMyPromoCodes(user.member_id),
      getBookingStats(user.member_id),
    ]).then(([st, codes, s]) => {
      setStreak(st);
      setPromoCodes(codes);
      setStats(s);
    }).catch(() => {}).finally(() => setExtraLoading(false));
  }, [user?.member_id]));

  if (!user) return null;

  const balance      = parseFloat(user.balance || '0');
  const bonus        = parseFloat(user.bonus   || '0');
  const points       = parseInt(user.points    || '0');
  const favoriteClub = clubs.find((c) => String(c.icafe_id) === favoriteClubId) ?? clubs[0] ?? null;

  // ─── Оригинальные хендлеры — без изменений ──────────────────────────────────
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const fresh = await refreshUser(user.member_id, user.icafe_id);
      setAuth(fresh);
    } catch (e: any) { handleApiError(e?.response?.data?.code ?? 1, e?.message); }
    finally { setRefreshing(false); }
  };

  const openEdit = (field: EditField) => { setEditField(field); setEditModalVisible(true); };

  const handleSaved = async (field: EditField, value: string) => {
    try {
      await updateProfile(user, { [field]: value });
      updateUser({ [field]: value } as any);
    } catch (e: any) { handleApiError(e?.response?.data?.code ?? 1, e?.message || 'Не удалось сохранить'); }
  };

  const handleLogout = () => {
    Alert.alert('Выход', 'Уверены, что хотите выйти?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Выйти', style: 'destructive', onPress: logout },
    ]);
  };

  const handleChangeAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1, base64: false,
      });
      if (!result.canceled && result.assets[0].uri) {
        setUploadingAvatar(true);
        const manipulated = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 200, height: 200 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );
        const base64Img = `data:image/jpeg;base64,${manipulated.base64}`;
        await updateProfile(user, { photo: base64Img });
        updateUser({ photo: base64Img } as any);
        Alert.alert('Успех', 'Фото профиля обновлено!');
      }
    } catch { handleApiError(1, 'Не удалось обновить аватарку'); }
    finally { setUploadingAvatar(false); }
  };

  const getFieldValue = (field: EditField): string => {
    if (field === 'first_name') return user.first_name;
    if (field === 'phone')      return user.phone;
    if (field === 'email')      return user.email;
    if (field === 'birthday')   return user.birthday && user.birthday !== '0000-00-00' ? user.birthday : '';
    return '';
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* ── Аватар (оригинал) ── */}
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.8} onPress={handleChangeAvatar} disabled={uploadingAvatar}>
            {uploadingAvatar ? (
              <View style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: '#1A1A1A', borderWidth: 3, borderColor: '#FFCC00', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator color="#FFCC00" />
              </View>
            ) : (
              <>
                <Avatar photo={user.photo} name={user.member_account} />
                <View style={styles.photoHint}><CameraIcon size={13} color="#FFCC00" strokeWidth={2} /></View>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.username}>{user.first_name || user.member_account}</Text>
          <Text style={styles.handle}>@{user.member_account}</Text>
        </View>

        {/* ── Баланс + StreakMeter ── */}
        <View style={styles.balanceRow}>
          <View style={styles.balanceCard}>
            <View style={styles.balanceTopRow}>
              <View style={styles.balanceItem}>
                <Text style={styles.balLabel}>БАЛАНС</Text>
                <Text style={styles.balValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
                  {balance.toFixed(2)} ₽
                </Text>
              </View>
              <View style={[styles.balanceItem, styles.balanceItemRight]}>
                <Text style={styles.bonLabel}>БОНУСЫ</Text>
                <Text style={styles.bonValue}>+{bonus.toFixed(2)}</Text>
              </View>
            </View>
            {points > 0 && (
              <View style={styles.pointsRow}>
                <Text style={styles.pointsLabel}>БАЛЛЫ</Text>
                <Text style={styles.pointsValue}>{points}</Text>
              </View>
            )}
            <View style={[styles.balActions, { marginTop: 8 }]}>
              <TouchableOpacity style={styles.topupBtn} onPress={() => setTopupModalVisible(true)} activeOpacity={0.85}>
                <WalletIcon size={18} color="#000" strokeWidth={2} />
                <Text style={styles.topupText}>Пополнить</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh} disabled={refreshing} activeOpacity={0.8}>
                {refreshing ? <ActivityIndicator color="#FFCC00" size="small" /> : <RefreshIcon size={20} color="#FFCC00" strokeWidth={2} />}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Скидка на бронь ── */}
        <View style={styles.streakCard}>
          <StreakMeter streak={streak} theme="dark" />
        </View>

        {/* ── История броней ── */}
        <TouchableOpacity
          style={styles.yellowBtn}
          onPress={() => setHistoryModalVisible(true)}
          activeOpacity={0.8}
        >
          <View style={{ flex: 1 }}>
          <Text style={styles.yellowBtnTitle}>История броней</Text>
          </View>
          <Text style={styles.yellowBtnArrow}>›</Text>
        </TouchableOpacity>

        {/* ── Промокоды ── */}
        <TouchableOpacity
          style={styles.yellowBtn}
          onPress={() => setPromoModalVisible(true)}
          activeOpacity={0.8}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.yellowBtnTitle}>Мои промокоды</Text>
          </View>
          <Text style={styles.yellowBtnArrow}>›</Text>
        </TouchableOpacity>

        {/* ── Избранный клуб (оригинал) ── */}
        <Text style={styles.sectionTitle}>ИЗБРАННЫЙ КЛУБ</Text>
        <TouchableOpacity style={styles.favoriteClubCard} onPress={() => setClubModalVisible(true)} activeOpacity={0.8}>
          <View style={{ flex: 1 }}>
            <Text style={styles.favoriteClubLabel}>
              {favoriteClub ? favoriteClub.address : clubs.length === 0 ? 'Загрузка...' : 'Не выбран'}
            </Text>
            {favoriteClub && <Text style={styles.favoriteClubSub}>ID: {favoriteClub.icafe_id}</Text>}
          </View>
          <EditIcon size={15} color="#FFCC00" strokeWidth={2} />
        </TouchableOpacity>

        {/* ── Данные аккаунта (оригинал) ── */}
        <Text style={styles.sectionTitle}>ДАННЫЕ АККАУНТА</Text>
        <View style={styles.card}>
          <EditableRow label="Имя"           displayValue={user.first_name || '—'}                               onPress={() => openEdit('first_name')} />
          <EditableRow label="Телефон"       displayValue={formatPhone(user.phone) || '—'}                       onPress={() => openEdit('phone')} />
          <EditableRow label="Email"         displayValue={user.email || '—'}                                    onPress={() => openEdit('email')} />
          <EditableRow label="Пароль"        displayValue="••••••••"                                             onPress={() => openEdit('password')} />
          <EditableRow label="Дата рождения" displayValue={birthdayToDisplay(user.birthday) || '—'}              onPress={() => openEdit('birthday')} />
        </View>

        {/* ── Информация (оригинал) ── */}
        <Text style={styles.sectionTitle}>ИНФОРМАЦИЯ</Text>
        <View style={styles.card}>
          <InfoRow label="Логин"      value={user.member_account} />
          <InfoRow label="ID Клиента" value={user.member_id} />
        </View>

        {/* ── Выход (оригинал) ── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <LogoutIcon size={18} color="#FF4444" strokeWidth={2} />
          <Text style={styles.logoutText}>Выйти из аккаунта</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Оригинальные модалки — без изменений */}
      <EditModal
        visible={editModalVisible}
        field={editField}
        currentValue={editField ? getFieldValue(editField) : ''}
        username={user.member_account}
        onClose={() => { setEditModalVisible(false); setEditField(null); }}
        onSaved={handleSaved}
      />
      <TopupModal
        visible={topupModalVisible}
        user={user}
        onClose={() => setTopupModalVisible(false)}
        onSuccess={(newBalance: number, newBonus: number) => {
          updateUser({ balance: String(newBalance), bonus: String(newBonus ?? user?.bonus ?? 0) } as any);
          Alert.alert('Готово', `Баланс пополнен!\nТекущий баланс: ${newBalance.toFixed(2)} ₽`);
        }}
      />
      <FavoriteClubModal
        visible={clubModalVisible}
        clubs={clubs}
        currentId={favoriteClubId}
        onSelect={setFavoriteClub}
        onClose={() => setClubModalVisible(false)}
      />
      {user?.member_id && (
        <BookingHistoryModal
          visible={historyModalVisible}
          memberId={user.member_id}
          onClose={() => setHistoryModalVisible(false)}
        />
      )}
      <PromoCodesModal
        visible={promoModalVisible}
        codes={promoCodes}
        loading={extraLoading && promoCodes.length === 0}
        onClose={() => setPromoModalVisible(false)}
      />
    </SafeAreaView>
  );
}

// ─── Стили ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Оригинальные стили (без изменений) ──
  safe:               { flex: 1, backgroundColor: '#000' },
  container:          { flex: 1, backgroundColor: '#000' },
  content:            { paddingTop: 20, paddingHorizontal: 20, paddingBottom: 40 },
  header:             { alignItems: 'center', marginBottom: 28 },
  photoHint:          { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#1A1A1A', borderRadius: 12, width: 26, height: 26, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  username:           { color: '#fff', fontSize: 22, fontWeight: '900', marginTop: 12 },
  handle:             { color: '#444', fontSize: 13, marginTop: 4 },
  balanceTopRow:      { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  balanceItem:        { flex: 1 },
  balanceItemRight:   { alignItems: 'flex-end' },
  balLabel:           { color: '#555', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 4 },
  balValue:           { color: '#FFCC00', fontSize: 34, fontWeight: '900' },
  bonLabel:           { color: '#555', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 4 },
  bonValue:           { color: '#00CC66', fontSize: 22, fontWeight: '800' },
  pointsRow:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#111', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16 },
  pointsLabel:        { color: '#555', fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  pointsValue:        { color: '#fff', fontSize: 16, fontWeight: '800' },
  balActions:         { flexDirection: 'row', gap: 10 },
  topupBtn:           { flex: 1, backgroundColor: '#FFCC00', borderRadius: 12, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  topupText:          { color: '#000', fontWeight: '900', fontSize: 15 },
  refreshBtn:         { width: 50, backgroundColor: '#1A1A1A', borderRadius: 12, borderWidth: 1, borderColor: '#222', alignItems: 'center', justifyContent: 'center' },
  sectionTitle:       { color: '#444', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 10 },
  card:               { backgroundColor: '#0D0D0D', borderRadius: 16, borderWidth: 1, borderColor: '#1A1A1A', paddingHorizontal: 16, marginBottom: 20 },
  favoriteClubCard:   { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#0D0D0D', borderRadius: 16, borderWidth: 1, borderColor: '#1A1A1A', padding: 16, marginBottom: 20 },
  favoriteClubLabel:  { color: '#fff', fontSize: 14, fontWeight: '700' },
  favoriteClubSub:    { color: '#555', fontSize: 11, marginTop: 2 },
  logoutBtn:          { padding: 18, borderRadius: 14, borderWidth: 1, borderColor: '#2A0A0A', backgroundColor: '#0D0000', alignItems: 'center', marginTop: 4, flexDirection: 'row', justifyContent: 'center', gap: 10 },
  logoutText:         { color: '#FF4444', fontWeight: '700', fontSize: 15 },

  // ── Новые стили ──
  balanceRow:       { marginBottom: 8 },
  balanceCard:      { flex: 1, backgroundColor: '#0D0D0D', borderRadius: 18, borderWidth: 1, borderColor: '#1A1A1A', padding: 18 },
  meterWrap:        { backgroundColor: '#0D0D0D', borderRadius: 16, borderWidth: 1, borderColor: '#1A1A1A', paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  // Виджет скидки на бронь
  streakCard:       { backgroundColor: '#0D0D0D', borderRadius: 16, borderWidth: 1, borderColor: '#1A1A1A', paddingVertical: 14, paddingHorizontal: 16, marginTop: 6, marginBottom: 20 },
  // Жёлтые кнопки истории и промокодов
  yellowBtn:        { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0D0D0D', borderRadius: 16, borderWidth: 1, borderColor: '#1A1A1A', paddingHorizontal: 16, paddingVertical: 14, marginBottom: 12 },
  yellowBtnTitle:   { color: '#fff', fontSize: 15, fontWeight: '800', marginBottom: 2 },
  yellowBtnSub:     { color: '#555', fontSize: 12, fontWeight: '600' },
  yellowBtnArrow:   { color: '#FFCC00', fontSize: 24, fontWeight: '300', marginLeft: 8 },
  // Кнопка истории
  historyBtn:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0D0D0D', borderRadius: 16, borderWidth: 1, borderColor: '#1A1A1A', paddingHorizontal: 16, paddingVertical: 14, marginBottom: 20 },
  historyBtnTitle:  { color: '#fff', fontSize: 15, fontWeight: '800', marginBottom: 2 },
  historyBtnSub:    { color: '#555', fontSize: 12, fontWeight: '600' },
  historyBtnArrow:  { color: '#444', fontSize: 24, fontWeight: '300', marginLeft: 8 },
  // Старые стили статистики (оставляем на случай использования в другом месте)
  statsCard:        { backgroundColor: '#0D0D0D', borderRadius: 14, borderWidth: 1, borderColor: '#1A1A1A', padding: 16, marginBottom: 20 },
  statsRow:         { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  statItem:         { flex: 1, alignItems: 'center' },
  statVal:          { color: '#FFCC00', fontSize: 22, fontWeight: '900' },
  statLabel:        { color: '#555', fontSize: 10, fontWeight: '600', textAlign: 'center', marginTop: 2 },
  statDivider:      { width: 1, height: 36, backgroundColor: '#1A1A1A' },
  statFav:          { color: '#444', fontSize: 11, textAlign: 'center' },
});