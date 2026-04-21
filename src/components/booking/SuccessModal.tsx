import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { CheckIcon } from './BookingIcons';

interface SuccessModalProps {
  visible: boolean;
  password: string;
  pcName: string;
  date: string;
  time: string;
  mins: number;
  cost?: number;
  onClose: () => void;
}

export function SuccessModal({ visible, password, pcName, date, time, mins, cost, onClose }: SuccessModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={st.backdrop}>
        <View style={st.card}>
          <View style={st.iconWrap}>
            <CheckIcon size={36} color="#000" />
          </View>
          <Text style={st.title}>Бронирование подтверждено!</Text>
          <View style={st.infoCard}>
            <View style={st.infoRow}><Text style={st.infoLabel}>Компьютер</Text><Text style={st.infoValue}>{pcName}</Text></View>
            <View style={st.infoRow}><Text style={st.infoLabel}>Дата</Text><Text style={st.infoValue}>{date.split('-').reverse().join('.')}</Text></View>
            <View style={st.infoRow}><Text style={st.infoLabel}>Время</Text><Text style={st.infoValue}>{time}</Text></View>
            <View style={st.infoRow}><Text style={st.infoLabel}>Длительность</Text><Text style={st.infoValue}>{mins} мин</Text></View>
            {cost !== undefined && (
              <View style={st.infoRow}>
                <Text style={st.infoLabel}>Стоимость</Text>
                <Text style={[st.infoValue, { color: '#FFCC00' }]}>{cost.toFixed(2)} ₽</Text>
              </View>
            )}
          </View>
          <View style={st.passwordWrap}>
            <Text style={st.passwordLabel}>КОД ДЛЯ ПК</Text>
            <Text style={st.password}>{password}</Text>
          </View>
          <TouchableOpacity style={st.btn} onPress={onClose} activeOpacity={0.85}>
            <Text style={st.btnText}>Готово</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  backdrop:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card:          { width: '100%', backgroundColor: '#0D0D0D', borderRadius: 24, borderWidth: 1, borderColor: '#1A1A1A', padding: 24, alignItems: 'center' },
  iconWrap:      { width: 64, height: 64, borderRadius: 20, backgroundColor: '#FFCC00', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title:         { color: '#fff', fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 20 },
  infoCard:      { width: '100%', backgroundColor: '#111', borderRadius: 14, padding: 16, marginBottom: 16, gap: 10 },
  infoRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel:     { color: '#555', fontSize: 12, fontWeight: '600' },
  infoValue:     { color: '#fff', fontSize: 13, fontWeight: '700' },
  passwordWrap:  { width: '100%', backgroundColor: '#1A1100', borderRadius: 14, borderWidth: 1, borderColor: '#FFCC00', padding: 16, alignItems: 'center', marginBottom: 20 },
  passwordLabel: { color: '#FFCC00', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 6 },
  password:      { color: '#FFCC00', fontSize: 28, fontWeight: '900', letterSpacing: 4 },
  btn:           { width: '100%', backgroundColor: '#FFCC00', borderRadius: 14, padding: 16, alignItems: 'center' },
  btnText:       { color: '#000', fontWeight: '900', fontSize: 15 },
});
