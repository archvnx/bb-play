import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { verifyPassword } from '../../services/authService';
import { formatPhone, isPhoneValid } from '../../utils/phoneFormat';
import { formatBirthday, birthdayToDisplay, birthdayToServer } from '../../utils/profileUtils';
import { cleanPhone } from '../../utils/phoneFormat';

export type EditField = 'first_name' | 'phone' | 'email' | 'password' | 'birthday';

interface EditModalProps {
  visible: boolean;
  field: EditField | null;
  currentValue: string;
  username: string;
  onClose: () => void;
  onSaved: (field: EditField, value: string) => void;
}

export function EditModal({ visible, field, currentValue, username, onClose, onSaved }: EditModalProps) {
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
      if (year < 1900 || year > currentYear) { setError(`Год должен быть от 1900 до ${currentYear}`); return; }
      const dateObj = new Date(year, month - 1, day);
      if (
        dateObj.getFullYear() !== year ||
        dateObj.getMonth() !== month - 1 ||
        dateObj.getDate() !== day
      ) { setError('Такой даты не существует'); return; }
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
      <KeyboardAvoidingView style={st.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={st.backdrop} activeOpacity={1} onPress={handleClose} />
        <View style={st.sheet}>
          <View style={st.handle} />
          {step === 'verify' ? (
            <>
              <Text style={st.title}>Подтверждение</Text>
              <Text style={st.subtitle}>Введите текущий пароль для изменения данных</Text>
              <TextInput
                style={[st.input, error ? st.inputError : null]}
                value={currentPassword}
                onChangeText={(v) => { setCurrentPassword(v); setError(''); }}
                secureTextEntry placeholder="Ваш пароль" placeholderTextColor="#333" autoFocus
              />
              {error ? <Text style={st.error}>{error}</Text> : null}
              <View style={st.btnRow}>
                <TouchableOpacity style={st.cancelBtn} onPress={handleClose}>
                  <Text style={st.cancelText}>Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity style={st.confirmBtn} onPress={handleVerify} disabled={loading}>
                  {loading ? <ActivityIndicator color="#000" size="small" /> : <Text style={st.confirmText}>Далее</Text>}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={st.title}>Новое значение</Text>
              <TextInput
                style={[st.input, error ? st.inputError : null]}
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
              {error ? <Text style={st.error}>{error}</Text> : null}
              <View style={st.btnRow}>
                <TouchableOpacity style={st.cancelBtn} onPress={handleClose}>
                  <Text style={st.cancelText}>Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity style={st.confirmBtn} onPress={handleSave} disabled={loading}>
                  {loading ? <ActivityIndicator color="#000" size="small" /> : <Text style={st.confirmText}>Сохранить</Text>}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export const modalStyles = StyleSheet.create({
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

const st = modalStyles;
