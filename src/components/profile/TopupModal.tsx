import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { topupBalance } from '../../services/authService';
import { User } from '../../types';
import { modalStyles } from './EditModal';

const TOPUP_AMOUNTS = [100, 200, 300, 500, 1000, 2000];

interface TopupModalProps {
  visible: boolean;
  user: User;
  onClose: () => void;
  onSuccess: (newBalance: number, newBonus: number) => void;
}

export function TopupModal({ visible, user, onClose, onSuccess }: TopupModalProps) {
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
      <KeyboardAvoidingView style={modalStyles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={modalStyles.backdrop} activeOpacity={1} onPress={handleClose} />
        <View style={modalStyles.sheet}>
          <View style={modalStyles.handle} />
          <Text style={modalStyles.title}>Пополнение баланса</Text>
          <Text style={modalStyles.subtitle}>Выберите сумму или введите свою</Text>
          <View style={st.grid}>
            {TOPUP_AMOUNTS.map((a) => (
              <TouchableOpacity
                key={a}
                style={[st.chip, selected === a && st.chipActive]}
                onPress={() => { setSelected(a === selected ? null : a); setCustom(''); setError(''); }}
              >
                <Text style={[st.chipText, selected === a && st.chipTextActive]}>{a} ₽</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={[modalStyles.input, error ? modalStyles.inputError : null]}
            value={custom}
            onChangeText={(v) => { setCustom(v.replace(/\D/g, '')); setSelected(null); setError(''); }}
            keyboardType="numeric" placeholder="Сумма в рублях" placeholderTextColor="#333"
          />
          {error ? <Text style={modalStyles.error}>{error}</Text> : null}
          <View style={modalStyles.btnRow}>
            <TouchableOpacity style={modalStyles.cancelBtn} onPress={handleClose}>
              <Text style={modalStyles.cancelText}>Отмена</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modalStyles.confirmBtn, (!amount || loading) && modalStyles.confirmBtnDisabled]}
              onPress={handleTopup} disabled={loading || !amount}
            >
              {loading ? <ActivityIndicator color="#000" /> : <Text style={modalStyles.confirmText}>Пополнить</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const st = StyleSheet.create({
  grid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  chip:          { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10, borderWidth: 1, borderColor: '#222', backgroundColor: '#111' },
  chipActive:    { backgroundColor: '#FFCC00', borderColor: '#FFCC00' },
  chipText:      { color: '#888', fontSize: 15, fontWeight: '700' },
  chipTextActive: { color: '#000' },
});
