import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  TouchableWithoutFeedback, Keyboard, Image, ScrollView, Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { registerUser, loginUser, requestSms, verifySms } from '../../services/authService';
import { useAuthStore } from '../../store/useAuthStore';
import { formatPhone, cleanPhone, isPhoneValid } from '../../utils/phoneFormat';

function FieldError({ msg }: { msg: string }) {
  if (!msg) return null;
  return <Text style={st.fieldError}>{msg}</Text>;
}

function SmsModal({
  visible, memberId, onVerified, onCancel,
}: {
  visible: boolean; memberId: string; onVerified: () => void; onCancel: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    setLoading(true); setError('');
    try { await verifySms(memberId); onVerified(); }
    catch (e: any) { setError(e.message || 'Ошибка верификации'); }
    finally { setLoading(false); }
  };

  const handleResend = async () => {
    setLoading(true); setError('');
    try { await requestSms(memberId); }
    catch { setError('Не удалось отправить SMS повторно'); }
    finally { setLoading(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={smsst.overlay}>
        <View style={smsst.sheet}>
          <View style={smsst.handle} />
          <Text style={smsst.title}>Подтверждение</Text>
          <Text style={smsst.subtitle}>На ваш номер отправлено SMS.{'\n'}Нажмите «Подтвердить» после получения кода.</Text>
          {error ? <Text style={smsst.error}>{error}</Text> : null}
          <TouchableOpacity style={smsst.confirmBtn} onPress={handleVerify} disabled={loading}>
            {loading ? <ActivityIndicator color="#000" size="small" /> : <Text style={smsst.confirmText}>Подтвердить</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={smsst.resendBtn} onPress={handleResend} disabled={loading}>
            <Text style={smsst.resendText}>Отправить SMS повторно</Text>
          </TouchableOpacity>
          <TouchableOpacity style={smsst.cancelBtn} onPress={onCancel}>
            <Text style={smsst.cancelText}>Отмена</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const smsst = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { backgroundColor: '#0D0D0D', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, borderTopWidth: 1, borderColor: '#1A1A1A' },
  handle: { width: 40, height: 4, backgroundColor: '#222', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  title: { color: '#fff', fontSize: 20, fontWeight: '900', marginBottom: 8 },
  subtitle: { color: '#555', fontSize: 14, lineHeight: 22, marginBottom: 20 },
  error: { color: '#FF6B6B', fontSize: 13, marginBottom: 12, textAlign: 'center' },
  confirmBtn: { backgroundColor: '#FFCC00', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 12 },
  confirmText: { color: '#000', fontWeight: '900', fontSize: 15 },
  resendBtn: { padding: 12, alignItems: 'center', marginBottom: 8 },
  resendText: { color: '#FFCC00', fontSize: 14, fontWeight: '600' },
  cancelBtn: { padding: 12, alignItems: 'center' },
  cancelText: { color: '#555', fontSize: 14 },
});

export default function RegisterScreen() {
  const navigation = useNavigation<any>();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [username, setUsername]     = useState('');
  const [firstName, setFirstName]   = useState('');
  const [phone, setPhone]           = useState('');
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading]       = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [smsModalVisible, setSmsModalVisible] = useState(false);
  const [pendingMemberId, setPendingMemberId] = useState('');
  const [pendingPassword, setPendingPassword] = useState('');

  const firstNameRef = useRef<TextInput>(null);
  const phoneRef     = useRef<TextInput>(null);
  const emailRef     = useRef<TextInput>(null);
  const passwordRef  = useRef<TextInput>(null);
  const confirmRef   = useRef<TextInput>(null);

  const phoneValid        = isPhoneValid(phone);
  const emailEntered      = email.trim().length > 0;
  const emailValid        = emailEntered && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const passwordMismatch  = confirmPassword.length > 0 && password !== confirmPassword;

  const isValid =
    username.trim().length >= 3 &&
    phoneValid &&
    emailValid &&
    password.trim().length >= 4 &&
    password === confirmPassword;

  // Фикс тряски: обновляем только при реальном изменении
  const handlePhoneChange = (raw: string) => {
    const formatted = formatPhone(raw);
    if (formatted !== phone) setPhone(formatted);
  };

  const handleRegister = async () => {
    if (!isValid) return;
    Keyboard.dismiss();
    setLoading(true); setGlobalError('');
    try {
      const result = await registerUser(
        username.trim(), password.trim(), cleanPhone(phone), email.trim(), firstName.trim() || undefined,
      );
      if (result.needsVerification && result.member_id) {
        setPendingMemberId(result.member_id);
        setPendingPassword(password.trim());
        try { await requestSms(result.member_id); } catch {}
        setSmsModalVisible(true);
        return;
      }
      const user = await loginUser(username.trim(), password.trim());
      setAuth(user, password.trim());
    } catch (e: any) {
      const msg = e.message || '';
      if (msg.toLowerCase().includes('exists') || msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('account')) {
        setGlobalError('Этот логин уже зарегистрирован');
      } else if (msg.includes('411') || msg.toLowerCase().includes('phone')) {
        setGlobalError('Ошибка телефона: проверьте формат');
      } else if (msg.includes('412') || msg.includes('452') || msg.toLowerCase().includes('email')) {
        setGlobalError('Ошибка email: проверьте формат');
      } else {
        setGlobalError(msg || 'Ошибка регистрации. Попробуйте позже.');
      }
    } finally { setLoading(false); }
  };

  const handleSmsVerified = async () => {
    setSmsModalVisible(false);
    setLoading(true);
    try {
      const user = await loginUser(username.trim(), pendingPassword);
      setAuth(user, pendingPassword);
    } catch (e: any) {
      setGlobalError('Аккаунт подтверждён, но не удалось войти: ' + (e.message || ''));
    } finally { setLoading(false); }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView style={st.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={st.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <View style={st.logoWrap}>
            <Image source={require('../../../assets/logo.png')} style={st.logoImg} resizeMode="contain" />
            <Text style={st.logoText}>BLACKBEARS <Text style={st.logoAccent}>PLAY</Text></Text>
          </View>

          <Text style={st.title}>Регистрация</Text>
          <Text style={st.subtitle}>Создайте аккаунт для бронирования</Text>

          {/* Логин */}
          <View style={st.fieldWrap}>
            <Text style={st.label}>ЛОГИН <Text style={st.required}>*</Text></Text>
            <TextInput
              style={[st.input, username.length > 0 && username.length < 3 && st.inputWarn]}
              placeholder="Минимум 3 символа" placeholderTextColor="#333"
              value={username} onChangeText={(v) => setUsername(v.replace(/\s/g, ''))}
              autoCapitalize="none" autoCorrect={false} returnKeyType="next"
              onSubmitEditing={() => firstNameRef.current?.focus()}
            />
            {username.length > 0 && username.length < 3 && <FieldError msg="Минимум 3 символа" />}
          </View>

          {/* Имя */}
          <View style={st.fieldWrap}>
            <Text style={st.label}>ИМЯ <Text style={st.optional}>— необязательно</Text></Text>
            <TextInput
              ref={firstNameRef} style={st.input}
              placeholder="Как вас зовут?" placeholderTextColor="#333"
              value={firstName} onChangeText={setFirstName}
              returnKeyType="next" onSubmitEditing={() => phoneRef.current?.focus()}
            />
          </View>

          {/* Телефон — всегда +7 */}
          <View style={st.fieldWrap}>
            <Text style={st.label}>ТЕЛЕФОН <Text style={st.required}>*</Text></Text>
            <TextInput
              ref={phoneRef}
              style={[st.input, phone.length > 0 && !phoneValid && st.inputWarn]}
              placeholder="+7 (999) 999-99-99" placeholderTextColor="#333"
              value={phone}
              onChangeText={handlePhoneChange}
              keyboardType="phone-pad" returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
            />
            {phone.length > 0 && !phoneValid && <FieldError msg="Введите корректный номер (+7 и 10 цифр)" />}
          </View>

          {/* Email — с @ и точкой */}
          <View style={st.fieldWrap}>
            <Text style={st.label}>EMAIL <Text style={st.required}>*</Text></Text>
            <TextInput
              ref={emailRef}
              style={[st.input, emailEntered && !emailValid && st.inputWarn]}
              placeholder="you@example.com" placeholderTextColor="#333"
              value={email} onChangeText={setEmail}
              keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
              returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()}
            />
            {emailEntered && !emailValid && (
              <FieldError msg="Укажите корректный email, например: you@mail.ru" />
            )}
          </View>

          {/* Пароль */}
          <View style={st.fieldWrap}>
            <Text style={st.label}>ПАРОЛЬ <Text style={st.required}>*</Text></Text>
            <TextInput
              ref={passwordRef}
              style={[st.input, password.length > 0 && password.length < 4 && st.inputWarn]}
              placeholder="Минимум 4 символа" placeholderTextColor="#333"
              value={password} onChangeText={setPassword}
              secureTextEntry returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
            />
            {password.length > 0 && password.length < 4 && <FieldError msg="Минимум 4 символа" />}
          </View>

          {/* Подтверждение */}
          <View style={st.fieldWrap}>
            <Text style={st.label}>ПОДТВЕРЖДЕНИЕ ПАРОЛЯ <Text style={st.required}>*</Text></Text>
            <TextInput
              ref={confirmRef}
              style={[st.input, passwordMismatch && st.inputError]}
              placeholder="Повторите пароль" placeholderTextColor="#333"
              value={confirmPassword} onChangeText={setConfirmPassword}
              secureTextEntry returnKeyType="done" onSubmitEditing={handleRegister}
            />
            {passwordMismatch && <FieldError msg="Пароли не совпадают" />}
          </View>

          {globalError ? (
            <View style={st.globalError}><Text style={st.globalErrorText}>{globalError}</Text></View>
          ) : null}

          <TouchableOpacity
            style={[st.registerBtn, !isValid && st.registerBtnDisabled]}
            onPress={handleRegister} disabled={!isValid || loading} activeOpacity={0.85}
          >
            {loading ? <ActivityIndicator color="#000" size="small" /> : <Text style={st.registerBtnText}>Создать аккаунт</Text>}
          </TouchableOpacity>

          <View style={st.loginRow}>
            <Text style={st.loginRowText}>Уже есть аккаунт? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.7}>
              <Text style={st.loginLink}>Войти</Text>
            </TouchableOpacity>
          </View>

          <Text style={st.requiredNote}><Text style={st.required}>*</Text> — обязательные поля</Text>

        </ScrollView>

        <SmsModal
          visible={smsModalVisible} memberId={pendingMemberId}
          onVerified={handleSmsVerified} onCancel={() => setSmsModalVisible(false)}
        />
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scroll: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 48 },
  logoWrap: { alignItems: 'center', marginBottom: 32 },
  logoImg: { width: 80, height: 80, marginBottom: 10 },
  logoText: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  logoAccent: { color: '#FFCC00' },
  title: { color: '#fff', fontSize: 26, fontWeight: '900', marginBottom: 6 },
  subtitle: { color: '#444', fontSize: 14, marginBottom: 28 },
  fieldWrap: { marginBottom: 16 },
  label: { color: '#555', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 6 },
  required: { color: '#FFCC00' },
  optional: { color: '#333', fontWeight: '400', letterSpacing: 0 },
  fieldError: { color: '#FF6B6B', fontSize: 11, marginTop: 4 },
  input: { backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: '#1A1A1A', borderRadius: 12, padding: 14, fontSize: 15, color: '#fff' },
  inputWarn: { borderColor: '#FF8800' },
  inputError: { borderColor: '#FF4444' },
  globalError: { backgroundColor: '#1A0000', borderRadius: 10, borderWidth: 1, borderColor: '#3A0000', padding: 12, marginBottom: 16 },
  globalErrorText: { color: '#FF6B6B', fontSize: 13, textAlign: 'center' },
  registerBtn: { backgroundColor: '#FFCC00', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 20 },
  registerBtnDisabled: { opacity: 0.4 },
  registerBtnText: { color: '#000', fontWeight: '900', fontSize: 16 },
  loginRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  loginRowText: { color: '#444', fontSize: 14 },
  loginLink: { color: '#FFCC00', fontSize: 14, fontWeight: '700' },
  requiredNote: { color: '#333', fontSize: 11, textAlign: 'center', marginTop: 16 },
});
