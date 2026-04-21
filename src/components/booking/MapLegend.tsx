import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function MapLegend() {
  return (
    <View style={st.legend}>
      <View style={st.legendItem}>
        <View style={[st.legendDot, { backgroundColor: '#1A1A1A', borderColor: '#2A2A2A' }]} />
        <Text style={st.legendText}>Свободен</Text>
      </View>
      <View style={st.legendItem}>
        <View style={[st.legendDot, { backgroundColor: '#FFCC00' }]} />
        <Text style={st.legendText}>Выбран</Text>
      </View>
      <View style={st.legendItem}>
        <View style={[st.legendDot, { backgroundColor: '#991B1B', borderColor: '#EF4444' }]} />
        <Text style={st.legendText}>Занят</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  legend:     { flexDirection: 'row', gap: 16, paddingVertical: 8, paddingHorizontal: 4, marginBottom: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:  { width: 12, height: 12, borderRadius: 4, borderWidth: 1, borderColor: 'transparent' },
  legendText: { color: '#555', fontSize: 11, fontWeight: '600' },
});
