import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  TouchableWithoutFeedback, Keyboard, Image, ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/useAuthStore';
import { loginUser } from '../../services/authService';

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) return;
    setLoading(true);
    setError('');
    try {
      const user = await loginUser(username, password);
      setAuth(user, password.trim());
    } catch (e: any) {
      setError(e.message || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Лого */}
          <View style={styles.logoWrap}>
            <Image
              source={require('../../../assets/logo.png')}
              style={styles.logoImg}
              resizeMode="contain"
            />
            <Text style={styles.logoText}>
              BLACKBEARS <Text style={styles.logoAccent}>PLAY</Text>
            </Text>
          </View>

          {/* Заголовок */}
          <Text style={styles.title}>Вход</Text>

          {/* Поля */}
          <View style={styles.form}>
            <View style={styles.inputWrap}>
              <Text style={styles.label}>Логин</Text>
              <TextInput
                style={styles.input}
                placeholder="Введите логин"
                placeholderTextColor="#444"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputWrap}>
              <Text style={styles.label}>Пароль</Text>
              <TextInput
                style={styles.input}
                placeholder="Введите пароль"
                placeholderTextColor="#444"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.btn, (!username || !password || loading) && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loading || !username || !password}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#000" />
                : <Text style={styles.btnText}>ВОЙТИ</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() => navigation.navigate('Register')}
            >
              <Text style={styles.linkText}>
                Нет аккаунта? <Text style={styles.linkAccent}>Зарегистрироваться</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 40 },

  logoWrap: { alignItems: 'center', marginBottom: 36 },
  logoImg: { width: 90, height: 90, marginBottom: 12 },
  logoText: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: 3 },
  logoAccent: { color: '#FFCC00' },

  title: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 28 },

  form: { gap: 4 },
  inputWrap: { marginBottom: 16 },
  label: { color: '#888', fontSize: 12, fontWeight: '600', marginBottom: 8, letterSpacing: 1 },
  input: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: '#fff',
  },

  error: { color: '#FF4444', fontSize: 14, marginBottom: 8, textAlign: 'center' },

  btn: {
    backgroundColor: '#FFCC00',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { backgroundColor: '#333' },
  btnText: { color: '#000', fontWeight: '900', fontSize: 15, letterSpacing: 1.5 },

  linkBtn: { marginTop: 20, alignItems: 'center' },
  linkText: { color: '#666', fontSize: 14 },
  linkAccent: { color: '#FFCC00', fontWeight: '700' },
});