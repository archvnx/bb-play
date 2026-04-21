import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { EditIcon } from '../ui/Icons';

interface InfoRowProps {
  label: string;
  value: string;
}

export function InfoRow({ label, value }: InfoRowProps) {
  return (
    <View style={st.row}>
      <Text style={st.label}>{label}</Text>
      <Text style={st.value} numberOfLines={1}>{value || '—'}</Text>
    </View>
  );
}

interface EditableRowProps {
  label: string;
  displayValue: string;
  onPress: () => void;
}

export function EditableRow({ label, displayValue, onPress }: EditableRowProps) {
  return (
    <TouchableOpacity style={st.row} onPress={onPress} activeOpacity={0.7}>
      <Text style={st.label}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'flex-end' }}>
        <Text style={[st.value, { flex: 0, maxWidth: 180 }]} numberOfLines={1}>{displayValue}</Text>
        <EditIcon size={15} color="#FFCC00" strokeWidth={2} />
      </View>
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  row:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#111' },
  label: { color: '#555', fontSize: 14, flexShrink: 0 },
  value: { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1, textAlign: 'right', marginLeft: 16 },
});
