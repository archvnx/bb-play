import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { CheckIcon } from './BookingIcons';

export interface PickerOption<T = string | number> {
  label: string;
  value: T;
}

interface PickerModalProps<T> {
  visible: boolean;
  title: string;
  options: PickerOption<T>[];
  selected: T;
  onSelect: (v: T) => void;
  onClose: () => void;
}

export function PickerModal<T extends string | number>({
  visible, title, options, selected, onSelect, onClose,
}: PickerModalProps<T>) {
  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={st.backdrop}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={st.sheet}>
          <View style={st.handle} />
          <Text style={st.title}>{title}</Text>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 340 }}>
            {options.length === 0 ? (
              <Text style={{ color: '#888', textAlign: 'center', marginTop: 20 }}>Нет доступного времени</Text>
            ) : (
              options.map(opt => {
                const isActive = opt.value === selected;
                return (
                  <TouchableOpacity
                    key={String(opt.value)}
                    style={[st.row, isActive && st.rowActive]}
                    onPress={() => { onSelect(opt.value); onClose(); }}
                    activeOpacity={0.75}
                  >
                    <Text style={[st.rowText, isActive && st.rowTextActive]}>{opt.label}</Text>
                    {isActive && <CheckIcon size={18} color="#000" />}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  backdrop:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet:         { backgroundColor: '#111', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  handle:        { width: 40, height: 4, borderRadius: 2, backgroundColor: '#333', alignSelf: 'center', marginBottom: 16 },
  title:         { color: '#555', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 12, textAlign: 'center' },
  row:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 8, borderRadius: 10, marginBottom: 2 },
  rowActive:     { backgroundColor: '#FFCC00' },
  rowText:       { color: '#CCC', fontSize: 15, fontWeight: '600' },
  rowTextActive: { color: '#000', fontWeight: '800' },
});
