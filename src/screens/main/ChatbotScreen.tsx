import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, Keyboard, ScrollView, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/useAuthStore';

const TAG = '[ChatbotScreen]';
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  error?: boolean;
}

const QUICK_QUESTIONS = [
  'Как забронировать ПК?',
  'Какие тарифы?',
  'Как пополнить баланс?',
  'Адреса клубов',
  'Как отменить бронь?',
  'Что такое бонусы и баллы?',
  'Как изменить данные профиля?',
  'Как выбрать избранный клуб?',
];

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  return (
    <View style={[bubbleSt.wrap, isUser ? bubbleSt.wrapUser : bubbleSt.wrapBot]}>
      {!isUser && (
            <Image
        source={require('../../../assets/logo.png')}
        style={bubbleSt.avatarImg}
        resizeMode="contain"
      />
      )}
      <View style={[
        bubbleSt.bubble,
        isUser ? bubbleSt.bubbleUser : bubbleSt.bubbleBot,
        msg.error && bubbleSt.bubbleError,
      ]}>
        <Text style={[bubbleSt.text, isUser ? bubbleSt.textUser : bubbleSt.textBot]}>
          {msg.content}
        </Text>
      </View>
    </View>
  );
}

const bubbleSt = StyleSheet.create({
  wrap:        { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  wrapUser:    { justifyContent: 'flex-end' },
  wrapBot:     { justifyContent: 'flex-start' },
  avatar:    { width: 32, height: 32, borderRadius: 16, overflow: 'hidden', marginRight: 8, marginBottom: 2 },
  avatarImg: { width: 32, height: 32 },
  avatarText:  { fontSize: 16 },
  bubble:      { maxWidth: '75%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleUser:  { backgroundColor: '#FFCC00', borderBottomRightRadius: 4 },
  bubbleBot:   { backgroundColor: '#111', borderWidth: 1, borderColor: '#1E1E1E', borderBottomLeftRadius: 4 },
  bubbleError: { borderColor: '#3A1010', backgroundColor: '#1A0808' },
  text:        { fontSize: 15, lineHeight: 22 },
  textUser:    { color: '#000', fontWeight: '600' },
  textBot:     { color: '#DDD' },
});

export default function ChatbotScreen() {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: `Привет${user?.first_name ? ', ' + user.first_name : ''}! 👋\nЯ помогу с вопросами по BlackBears Play.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showQuick, setShowQuick] = useState(true);
  const listRef = useRef<FlatList>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setInput('');
    Keyboard.dismiss();

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: trimmed };
    const currentMessages = [...messages, userMsg];
    setMessages(currentMessages);
    setLoading(true);
    scrollToBottom();

    try {
      const res = await fetch(`${BACKEND_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: currentMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      const botReply = data.content || data.reply;

      if (!res.ok || !botReply) {
        throw new Error(data.error || 'Пустой ответ от нейросети');
      }

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: botReply,
      }]);
    } catch (e: any) {
      console.error(`${TAG} ❌`, e.message);
      setMessages(prev => [...prev, {
        id: 'err-' + Date.now(),
        role: 'assistant',
        content: 'Ошибка связи с сервером. Попробуйте позже.',
        error: true,
      }]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }, [messages, loading, scrollToBottom]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Шапка */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              source={require('../../../assets/logo.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <View>
              <Text style={styles.headerTitle}>Чат-бот</Text>
              <Text style={styles.headerSub}>BlackBears Play</Text>
            </View>
          </View>
          {!showQuick && (
            <TouchableOpacity onPress={() => setShowQuick(true)} style={styles.showQuickBtn}>
              <Text style={styles.showQuickText}>Вопросы ↑</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Список сообщений */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={m => m.id}
          renderItem={({ item }) => <MessageBubble msg={item} />}
          contentContainerStyle={styles.list}
          ListFooterComponent={
            loading ? (
              <View style={styles.typingWrap}>
                <Image
                  source={require('../../../assets/logo.png')}
                  style={styles.typingAvatar}
                  resizeMode="contain"
                />
                <View style={styles.typingBubble}>
                  <ActivityIndicator color="#FFCC00" size="small" />
                </View>
              </View>
            ) : null
          }
        />

        {/* Частые вопросы */}
        {showQuick && (
          <View style={styles.quickWrap}>
            <View style={styles.quickLabelRow}>
              <Text style={styles.quickLabel}>Частые вопросы</Text>
              <TouchableOpacity onPress={() => setShowQuick(false)}>
                <Text style={styles.quickHide}>Свернуть ↓</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.quickRow}>
                {QUICK_QUESTIONS.map(q => (
                  <TouchableOpacity
                    key={q}
                    style={styles.quickChip}
                    onPress={() => sendMessage(q)}
                  >
                    <Text style={styles.quickText}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Поле ввода */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Напишите вопрос..."
            placeholderTextColor="#444"
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            onPress={() => sendMessage(input)}
            disabled={!input.trim() || loading}
          >
            <Text style={styles.sendIcon}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: '#000' },
  container:       { flex: 1 },

  // Шапка
  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#111' },
  headerLeft:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerLogo:      { width: 36, height: 36, borderRadius: 8 },
  headerTitle:     { color: '#fff', fontSize: 18, fontWeight: '900' },
  headerSub:       { color: '#444', fontSize: 11 },
  showQuickBtn:    { backgroundColor: '#111', borderRadius: 10, borderWidth: 1, borderColor: '#1E1E1E', paddingHorizontal: 10, paddingVertical: 5 },
  showQuickText:   { color: '#888', fontSize: 11, fontWeight: '700' },

  // Список
  list:            { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  typingWrap:      { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 8 },
  typingAvatar: { width: 32, height: 32, borderRadius: 16, overflow: 'hidden', marginRight: 8 },
  typingBubble:    { backgroundColor: '#111', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: '#1E1E1E' },

  // Подсказки
  quickWrap:       { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6, borderTopWidth: 1, borderTopColor: '#111' },
  quickLabelRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  quickLabel:      { color: '#444', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  quickHide:       { color: '#444', fontSize: 11, fontWeight: '700' },
  quickRow:        { flexDirection: 'row', gap: 6, paddingBottom: 2 },
  quickChip:       { backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: '#1E1E1E', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 6 },
  quickText:       { color: '#888', fontSize: 12 },

  // Инпут
  inputRow:        { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8, borderTopWidth: 1, borderTopColor: '#111', gap: 8 },
  input:           { flex: 1, backgroundColor: '#0D0D0D', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, color: '#fff', fontSize: 15, maxHeight: 100, borderWidth: 1, borderColor: '#1E1E1E' },
  sendBtn:         { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFCC00', justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: '#1A1A1A' },
  sendIcon:        { color: '#000', fontSize: 18, fontWeight: '900' },
});