import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CheckIcon, LockIcon } from './BookingIcons';
import { RefreshIcon } from '../ui/Icons';
import type { useBookingFlow } from '../../hooks/useBookingFlow';

interface Props {
  flow: ReturnType<typeof useBookingFlow>;
}

export function PcListView({ flow }: Props) {
  const { pcs, loadingPcs, selectedPc, setSelectedPc, pcGroups, loadPcs } = flow;

  if (loadingPcs) {
    return (
      <View style={st.centered}>
        <ActivityIndicator color="#FFCC00" size="large" />
        <Text style={[st.emptyText, st.loaderText]}>Загрузка ПК...</Text>
      </View>
    );
  }

  if (pcs.length === 0) {
    return (
      <View style={st.emptyWrap}>
        <Text style={st.emptyText}>ПК не найдены</Text>
        <TouchableOpacity style={st.retryBtn} onPress={loadPcs} activeOpacity={0.8}>
          <RefreshIcon size={16} color="#FFCC00" strokeWidth={2} />
          <Text style={st.retryText}>Повторить</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      {Object.entries(pcGroups).map(([zone, zonePcs]) => (
        <View key={zone}>
          <Text style={st.zoneTitle}>{zone.toUpperCase()}</Text>
          <View style={st.pcGrid}>
            {zonePcs.map(pc => {
              const isSelected = selectedPc?.pc_name === pc.pc_name;
              const isBusy     = pc.is_using;
              return (
                <TouchableOpacity
                  key={pc.pc_name}
                  style={[st.pcCard, isBusy && st.pcCardBusy, isSelected && st.pcCardSelected]}
                  onPress={() => !isBusy && setSelectedPc(isSelected ? null : pc)}
                  activeOpacity={isBusy ? 1 : 0.75}
                  disabled={isBusy}
                >
                  <Text style={[st.pcName, isBusy && st.pcNameBusy, isSelected && st.pcNameSelected]}>
                    {pc.pc_name}
                  </Text>
                  {isBusy    && <LockIcon  size={12} color="#FFFFFF" />}
                  {isSelected && <CheckIcon size={12} color="#000" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
    </>
  );
}

const st = StyleSheet.create({
  centered:       { padding: 40, alignItems: 'center' },
  loaderText:     { marginTop: 12 },
  emptyWrap:      { alignItems: 'center', paddingTop: 40, gap: 16 },
  emptyText:      { color: '#444', fontSize: 14, textAlign: 'center' },
  retryBtn:       { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#111', borderRadius: 10, borderWidth: 1, borderColor: '#1A1A1A', paddingHorizontal: 16, paddingVertical: 10 },
  retryText:      { color: '#FFCC00', fontSize: 13, fontWeight: '700' },
  zoneTitle:      { color: '#555', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 10, marginTop: 16 },
  pcGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  pcCard:         { width: 90, height: 72, borderRadius: 14, backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center', gap: 5 },
  pcCardBusy:     { backgroundColor: '#991B1B', borderColor: '#EF4444' },
  pcCardSelected: { backgroundColor: '#FFCC00', borderColor: '#FFCC00' },
  pcName:         { color: '#CCC', fontSize: 13, fontWeight: '700' },
  pcNameBusy:     { color: '#FFFFFF' },
  pcNameSelected: { color: '#000' },
});
