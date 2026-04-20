import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Modal, KeyboardAvoidingView,
  Platform, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../store/useAuthStore';
import { updateProfile, refreshUser, verifyPassword, topupBalance } from '../../services/authService';
import { fetchClubs, Club } from '../../services/clubsService';
import {
  CameraIcon, EditIcon, WalletIcon, RefreshIcon, LogoutIcon, BookingIcon,
} from '../../components/ui/Icons';
import { formatPhone, cleanPhone, isPhoneValid } from '../../utils/phoneFormat';
import * as ImageManipulator from 'expo-image-manipulator';
// ─── Форматирование даты рождения ─────────────────────────────────────────────
function formatBirthday(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
}

function birthdayToServer(display: string): string {
  const parts = display.split('.');
  if (parts.length === 3 && parts[2].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return display;
}

function birthdayToDisplay(server: string): string {
  if (!server || server === '0000-00-00') return '';
  const parts = server.split('-');
  if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
  return server;
}

// ─── Аватар ───────────────────────────────────────────────────────────────────
function Avatar({ photo, name }: { photo?: string; name: string }) {
  const initials = name?.slice(0, 2).toUpperCase() || '??';
  if (photo && photo.length > 10) {
    return (
      <Image
        source={{ uri: photo }}
        style={avatarSt.img}
        key={photo.slice(0, 50)} // форсирует ре-рендер при смене фото
      />
    );
  }
  return (
    <View style={avatarSt.wrap}>
      <Text style={avatarSt.text}>{initials}</Text>
    </View>
  );
}
const avatarSt = StyleSheet.create({
  img:  { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: '#FFCC00' },
  wrap: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#1A1A1A', borderWidth: 3, borderColor: '#FFCC00', justifyContent: 'center', alignItems: 'center' },
  text: { color: '#FFCC00', fontSize: 32, fontWeight: '900' },
});

function maskPhone(phone: string): string {
  if (!phone) return '—';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return phone;
  return phone.slice(0, 6) + '•'.repeat(Math.max(0, phone.length - 6));
}

// ─── InfoRow ──────────────────────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={rowSt.row}>
      <Text style={rowSt.label}>{label}</Text>
      <Text style={rowSt.value} numberOfLines={1}>{value || '—'}</Text>
    </View>
  );
}
const rowSt = StyleSheet.create({
  row:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#111' },
  label: { color: '#555', fontSize: 14, flexShrink: 0 },
  value: { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1, textAlign: 'right', marginLeft: 16 },
});

// ─── EditableRow ──────────────────────────────────────────────────────────────
function EditableRow({ label, displayValue, onPress }: { label: string; displayValue: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={rowSt.row} onPress={onPress} activeOpacity={0.7}>
      <Text style={rowSt.label}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'flex-end' }}>
        <Text style={[rowSt.value, { flex: 0, maxWidth: 180 }]} numberOfLines={1}>{displayValue}</Text>
        <EditIcon size={15} color="#FFCC00" strokeWidth={2} />
      </View>
    </TouchableOpacity>
  );
}

// ─── EditModal ────────────────────────────────────────────────────────────────
type EditField = 'first_name' | 'phone' | 'email' | 'password' | 'birthday';

function EditModal({ visible, field, currentValue, username, onClose, onSaved }: any) {
  const [step, setStep] = useState<'verify' | 'edit'>('verify');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newValue, setNewValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reset = () => { setStep('verify'); setCurrentPassword(''); setNewValue(''); setError(''); };
  const handleClose = () => { reset(); onClose(); };

  const handleVerify = async () => {
    if (!currentPassword.trim()) { setError('Введите текущий пароль'); return; }
    setLoading(true); setError('');
    try {
      const ok = await verifyPassword(username, currentPassword.trim());
      if (!ok) { setError('Неверный пароль'); return; }
      if (field === 'birthday') {
        setNewValue(birthdayToDisplay(currentValue));
      } else {
        setNewValue(field === 'phone' ? formatPhone(currentValue) : currentValue);
      }
      setStep('edit');
    } catch {
      setError('Ошибка проверки. Попробуйте снова.');
    } finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!field) return;
    if (!newValue.trim()) { setError('Поле не может быть пустым'); return; }
    if (field === 'password' && newValue.trim().length < 4) { setError('Пароль минимум 4 символа'); return; }
    if (field === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newValue.trim())) {
      setError('Укажите корректный email'); return;
    }
    if (field === 'phone' && !isPhoneValid(newValue)) {
      setError('Введите корректный номер (+7 и 10 цифр)'); return;
    }
   if (field === 'birthday') {
  const digits = newValue.replace(/\D/g, '');
  if (digits.length !== 8) { setError('Введите полную дату: ДД.ММ.ГГГГ'); return; }
  
  const day   = parseInt(digits.slice(0, 2));
  const month = parseInt(digits.slice(2, 4));
  const year  = parseInt(digits.slice(4, 8));
  const currentYear = new Date().getFullYear();

  if (month < 1 || month > 12) { setError('Некорректный месяц'); return; }
  if (day < 1 || day > 31)     { setError('Некорректный день'); return; }
  if (year < 1900 || year > currentYear) { 
    setError(`Год должен быть от 1900 до ${currentYear}`); return; 
  }

  // Проверка реальной даты
  const dateObj = new Date(year, month - 1, day);
  if (
    dateObj.getFullYear() !== year ||
    dateObj.getMonth() !== month - 1 ||
    dateObj.getDate() !== day
  ) {
    setError('Такой даты не существует'); return;
  }
}

    let valToSend = field === 'phone' ? cleanPhone(newValue) : newValue.trim();
    if (field === 'birthday') valToSend = birthdayToServer(newValue.trim());

    if (field !== 'password' && field !== 'birthday' && valToSend === cleanPhone(currentValue)) {
      setError('Новое значение совпадает с текущим'); return;
    }

    setLoading(true); setError('');
    try {
      onSaved(field, valToSend);
      reset();
      onClose();
    } catch (e: any) {
      setError(e.message || 'Ошибка сохранения');
    } finally { setLoading(false); }
  };

  if (!field) return null;
  const isPassword = field === 'password';
  const isPhone    = field === 'phone';
  const isEmail    = field === 'email';
  const isDate     = field === 'birthday';

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <KeyboardAvoidingView style={modalSt.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={modalSt.backdrop} activeOpacity={1} onPress={handleClose} />
        <View style={modalSt.sheet}>
          <View style={modalSt.handle} />
          {step === 'verify' ? (
            <>
              <Text style={modalSt.title}>Подтверждение</Text>
              <Text style={modalSt.subtitle}>Введите текущий пароль для изменения данных</Text>
              <TextInput
                style={[modalSt.input, error ? modalSt.inputError : null]}
                value={currentPassword}
                onChangeText={(v) => { setCurrentPassword(v); setError(''); }}
                secureTextEntry placeholder="Ваш пароль" placeholderTextColor="#333" autoFocus
              />
              {error ? <Text style={modalSt.error}>{error}</Text> : null}
              <View style={modalSt.btnRow}>
                <TouchableOpacity style={modalSt.cancelBtn} onPress={handleClose}>
                  <Text style={modalSt.cancelText}>Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity style={modalSt.confirmBtn} onPress={handleVerify} disabled={loading}>
                  {loading ? <ActivityIndicator color="#000" size="small" /> : <Text style={modalSt.confirmText}>Далее</Text>}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={modalSt.title}>Новое значение</Text>
              <TextInput
                style={[modalSt.input, error ? modalSt.inputError : null]}
                value={newValue}
                onChangeText={(v) => {
                  if (isDate) setNewValue(formatBirthday(v));
                  else setNewValue(isPhone ? formatPhone(v) : v);
                  setError('');
                }}
                maxLength={isPhone ? 18 : isDate ? 10 : 50}
                secureTextEntry={isPassword}
                keyboardType={isPhone ? 'phone-pad' : isDate ? 'numeric' : isEmail ? 'email-address' : 'default'}
                placeholder={isPhone ? '+7 (999) 999-99-99' : isDate ? 'ДД.ММ.ГГГГ' : 'Новое значение'}
                placeholderTextColor="#333" autoCapitalize="none" autoFocus
              />
              {error ? <Text style={modalSt.error}>{error}</Text> : null}
              <View style={modalSt.btnRow}>
                <TouchableOpacity style={modalSt.cancelBtn} onPress={handleClose}>
                  <Text style={modalSt.cancelText}>Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity style={modalSt.confirmBtn} onPress={handleSave} disabled={loading}>
                  {loading ? <ActivityIndicator color="#000" size="small" /> : <Text style={modalSt.confirmText}>Сохранить</Text>}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── TopupModal ───────────────────────────────────────────────────────────────
const TOPUP_AMOUNTS = [100, 200, 300, 500, 1000, 2000];

function TopupModal({ visible, onClose, onSuccess, user }: any) {
  const [selected, setSelected] = useState<number | null>(null);
  const [custom, setCustom] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const amount = selected !== null ? selected : (parseInt(custom) || 0);

  const handleTopup = async () => {
    if (!amount || amount < 10) { setError('Минимальная сумма — 10 ₽'); return; }
    setLoading(true); setError('');
    try {
      const { newBalance, newBonus } = await topupBalance(user, amount);
      onSuccess(newBalance, newBonus ?? 0);
      setSelected(null); setCustom(''); onClose();
    } catch (e: any) {
      setError(e.message || 'Ошибка пополнения');
    } finally { setLoading(false); }
  };

  const handleClose = () => { setSelected(null); setCustom(''); setError(''); onClose(); };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <KeyboardAvoidingView style={modalSt.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={modalSt.backdrop} activeOpacity={1} onPress={handleClose} />
        <View style={modalSt.sheet}>
          <View style={modalSt.handle} />
          <Text style={modalSt.title}>Пополнение баланса</Text>
          <Text style={modalSt.subtitle}>Выберите сумму или введите свою</Text>
          <View style={topupSt.grid}>
            {TOPUP_AMOUNTS.map((a) => (
              <TouchableOpacity
                key={a}
                style={[topupSt.chip, selected === a && topupSt.chipActive]}
                onPress={() => { setSelected(a === selected ? null : a); setCustom(''); setError(''); }}
              >
                <Text style={[topupSt.chipText, selected === a && topupSt.chipTextActive]}>{a} ₽</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={[modalSt.input, error ? modalSt.inputError : null]}
            value={custom}
            onChangeText={(v) => { setCustom(v.replace(/\D/g, '')); setSelected(null); setError(''); }}
            keyboardType="numeric" placeholder="Сумма в рублях" placeholderTextColor="#333"
          />
          {error ? <Text style={modalSt.error}>{error}</Text> : null}
          <View style={modalSt.btnRow}>
            <TouchableOpacity style={modalSt.cancelBtn} onPress={handleClose}>
              <Text style={modalSt.cancelText}>Отмена</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modalSt.confirmBtn, (!amount || loading) && modalSt.confirmBtnDisabled]}
              onPress={handleTopup} disabled={loading || !amount}
            >
              {loading ? <ActivityIndicator color="#000" /> : <Text style={modalSt.confirmText}>Пополнить</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── FavoriteClubModal ────────────────────────────────────────────────────────
function FavoriteClubModal({ visible, clubs, currentId, onSelect, onClose }: {
  visible: boolean;
  clubs: Club[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={modalSt.overlay}>
        <TouchableOpacity style={modalSt.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={modalSt.sheet}>
          <View style={modalSt.handle} />
          <Text style={modalSt.title}>Избранный клуб</Text>
          <Text style={modalSt.subtitle}>Спецпредложения будут загружаться для выбранного клуба</Text>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 340 }}>
            {clubs.map((club) => {
              const isActive = String(club.icafe_id) === currentId;
              return (
                <TouchableOpacity
                  key={club.icafe_id}
                  style={[clubPickSt.row, isActive && clubPickSt.rowActive]}
                  onPress={() => { onSelect(String(club.icafe_id)); onClose(); }}
                  activeOpacity={0.75}
                >
                  <View style={clubPickSt.iconWrap}>
                    <BookingIcon size={16} color={isActive ? '#FFCC00' : '#ffffff'} />
                  </View>
                  <Text style={[clubPickSt.address, isActive && clubPickSt.addressActive]} numberOfLines={2}>
                    {club.address}
                  </Text>
                  {isActive && (
                    <View style={clubPickSt.checkWrap}>
                      <Text style={clubPickSt.check}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const clubPickSt = StyleSheet.create({
  row:         { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, marginBottom: 8, backgroundColor: '#111', borderWidth: 1, borderColor: '#1A1A1A' },
  rowActive:   { backgroundColor: '#FFCC00', borderColor: '#FFCC00' },
  iconWrap:    { width: 32, height: 32, borderRadius: 8, backgroundColor: '#1A1100', alignItems: 'center', justifyContent: 'center' },
  address:     { color: '#fff', fontSize: 13, fontWeight: '600', flex: 1 },
  addressActive: { color: '#000' },
  checkWrap:   { width: 24, height: 24, borderRadius: 12, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  check:       { color: '#FFCC00', fontSize: 14, fontWeight: '900' },
});

// ─── Стили модалок ────────────────────────────────────────────────────────────
const topupSt = StyleSheet.create({
  grid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  chip:          { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10, borderWidth: 1, borderColor: '#222', backgroundColor: '#111' },
  chipActive:    { backgroundColor: '#FFCC00', borderColor: '#FFCC00' },
  chipText:      { color: '#888', fontSize: 15, fontWeight: '700' },
  chipTextActive:{ color: '#000' },
});

const modalSt = StyleSheet.create({
  overlay:            { flex: 1, justifyContent: 'flex-end' },
  backdrop:           { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet:              { backgroundColor: '#0D0D0D', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, borderTopWidth: 1, borderColor: '#1A1A1A' },
  handle:             { width: 40, height: 4, backgroundColor: '#222', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  title:              { color: '#fff', fontSize: 20, fontWeight: '900', marginBottom: 6 },
  subtitle:           { color: '#555', fontSize: 13, marginBottom: 20, lineHeight: 20 },
  input:              { backgroundColor: '#111', borderWidth: 1, borderColor: '#222', borderRadius: 12, padding: 14, fontSize: 15, color: '#fff', marginBottom: 12 },
  inputError:         { borderColor: '#FF4444' },
  error:              { color: '#FF6B6B', fontSize: 13, marginBottom: 12 },
  btnRow:             { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn:          { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#222', alignItems: 'center' },
  cancelText:         { color: '#666', fontWeight: '600', fontSize: 15 },
  confirmBtn:         { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#FFCC00', alignItems: 'center' },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmText:        { color: '#000', fontWeight: '900', fontSize: 15 },
});

// ─── ProfileScreen ────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { user, logout, updateUser, setAuth, favoriteClubId, setFavoriteClub } = useAuthStore();
  const [refreshing, setRefreshing]         = useState(false);
  const [editField, setEditField]           = useState<EditField | null>(null);
  const [editModalVisible, setEditModalVisible]   = useState(false);
  const [topupModalVisible, setTopupModalVisible] = useState(false);
  const [clubModalVisible, setClubModalVisible]   = useState(false);
  const [uploadingAvatar, setUploadingAvatar]     = useState(false);
  const [clubs, setClubs]                   = useState<Club[]>([]);

  useEffect(() => {
    fetchClubs().then(setClubs).catch(() => {});
  }, []);

  if (!user) return null;

  const balance = parseFloat(user.balance || '0');
  const bonus   = parseFloat(user.bonus   || '0');
  const points  = parseInt(user.points    || '0');

  const favoriteClub = clubs.find((c) => String(c.icafe_id) === favoriteClubId) ?? clubs[0] ?? null;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const fresh = await refreshUser(user.member_id, user.icafe_id);
      setAuth(fresh);
    } catch (e: any) { Alert.alert('Ошибка', e.message); }
    finally { setRefreshing(false); }
  };

  const openEdit = (field: EditField) => { setEditField(field); setEditModalVisible(true); };

  const handleSaved = async (field: EditField, value: string) => {
    try {
      await updateProfile(user, { [field]: value });
      updateUser({ [field]: value } as any);
    } catch (e: any) { Alert.alert('Ошибка', e.message || 'Не удалось сохранить'); }
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
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
      base64: false, // base64 получим после ресайза
    });

    if (!result.canceled && result.assets[0].uri) {
      setUploadingAvatar(true);

      // Уменьшаем до 200x200 пикселей
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
  } catch {
    Alert.alert('Ошибка', 'Не удалось обновить аватарку');
  } finally {
    setUploadingAvatar(false);
  }
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

        {/* ── Аватар ── */}
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.8} onPress={handleChangeAvatar} disabled={uploadingAvatar}>
            {uploadingAvatar ? (
              <View style={avatarSt.wrap}><ActivityIndicator color="#FFCC00" /></View>
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

        {/* ── Баланс ── */}
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
          <View style={styles.balActions}>
            <TouchableOpacity style={styles.topupBtn} onPress={() => setTopupModalVisible(true)} activeOpacity={0.85}>
              <WalletIcon size={18} color="#000" strokeWidth={2} />
              <Text style={styles.topupText}>Пополнить</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh} disabled={refreshing} activeOpacity={0.8}>
              {refreshing
                ? <ActivityIndicator color="#FFCC00" size="small" />
                : <RefreshIcon size={20} color="#FFCC00" strokeWidth={2} />
              }
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Избранный клуб ── */}
        <Text style={styles.sectionTitle}>ИЗБРАННЫЙ КЛУБ</Text>
        <TouchableOpacity style={styles.favoriteClubCard} onPress={() => setClubModalVisible(true)} activeOpacity={0.8}>
          <View style={{ flex: 1 }}>
            <Text style={styles.favoriteClubLabel}>
              {favoriteClub ? favoriteClub.address : clubs.length === 0 ? 'Загрузка...' : 'Не выбран'}
            </Text>
            {favoriteClub && (
              <Text style={styles.favoriteClubSub}>ID: {favoriteClub.icafe_id}</Text>
            )}
          </View>
          <EditIcon size={15} color="#FFCC00" strokeWidth={2} />
        </TouchableOpacity>

        {/* ── Данные аккаунта ── */}
        <Text style={styles.sectionTitle}>ДАННЫЕ АККАУНТА</Text>
        <View style={styles.card}>
          <EditableRow label="Имя"            displayValue={user.first_name || '—'}                                      onPress={() => openEdit('first_name')} />
          <EditableRow label="Телефон"        displayValue={formatPhone(user.phone) || '—'}                              onPress={() => openEdit('phone')} />
          <EditableRow label="Email"          displayValue={user.email || '—'}                                           onPress={() => openEdit('email')} />
          <EditableRow label="Пароль"         displayValue="••••••••"                                                     onPress={() => openEdit('password')} />
          <EditableRow label="Дата рождения"  displayValue={birthdayToDisplay(user.birthday) || '—'}                     onPress={() => openEdit('birthday')} />
        </View>

        {/* ── Информация ── */}
        <Text style={styles.sectionTitle}>ИНФОРМАЦИЯ</Text>
        <View style={styles.card}>
          <InfoRow label="Логин"      value={user.member_account} />
          <InfoRow label="ID Клиента" value={user.member_id} />
        </View>

        {/* ── Выход ── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <LogoutIcon size={18} color="#FF4444" strokeWidth={2} />
          <Text style={styles.logoutText}>Выйти из аккаунта</Text>
        </TouchableOpacity>
      </ScrollView>

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
    </SafeAreaView>
  );
}

// ─── Стили ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:               { flex: 1, backgroundColor: '#000' },
  container:          { flex: 1, backgroundColor: '#000' },
  content:            { paddingTop: 20, paddingHorizontal: 20, paddingBottom: 40 },
  header:             { alignItems: 'center', marginBottom: 28 },
  photoHint:          { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#1A1A1A', borderRadius: 12, width: 26, height: 26, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  username:           { color: '#fff', fontSize: 22, fontWeight: '900', marginTop: 12 },
  handle:             { color: '#444', fontSize: 13, marginTop: 4 },
  balanceCard:        { backgroundColor: '#0D0D0D', borderRadius: 18, borderWidth: 1, borderColor: '#1A1A1A', padding: 18, marginBottom: 24 },
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
  favoriteClubCard:   { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#0D0D0D', borderRadius: 16, borderWidth: 1, borderColor: '#FFCC00', padding: 16, marginBottom: 20 },
  favoriteClubIcon:   { width: 44, height: 44, borderRadius: 12, backgroundColor: '#1A1100', borderWidth: 1, borderColor: '#FFCC00', alignItems: 'center', justifyContent: 'center' },
  favoriteClubLabel:  { color: '#fff', fontSize: 14, fontWeight: '700' },
  favoriteClubSub:    { color: '#555', fontSize: 11, marginTop: 2 },
  logoutBtn:          { padding: 18, borderRadius: 14, borderWidth: 1, borderColor: '#2A0A0A', backgroundColor: '#0D0000', alignItems: 'center', marginTop: 4, flexDirection: 'row', justifyContent: 'center', gap: 10 },
  logoutText:         { color: '#FF4444', fontWeight: '700', fontSize: 15 },
});