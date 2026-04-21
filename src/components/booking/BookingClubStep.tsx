import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { BookingIcon, ArrowRightIcon } from '../ui/Icons';
import type { useBookingFlow } from '../../hooks/useBookingFlow';

interface Props {
  flow: ReturnType<typeof useBookingFlow>;
}

export function BookingClubStep({ flow }: Props) {
  const { clubs, loadingClubs, setSelectedClub, setStep } = flow;

  return (
    <ScrollView style={st.content} contentContainerStyle={st.contentContainer}>
      <Text style={st.sectionTitle}>ВЫБЕРИТЕ КЛУБ</Text>
      {loadingClubs ? (
        <ActivityIndicator color="#FFCC00" style={st.loader} />
      ) : clubs.length === 0 ? (
        <Text style={st.emptyText}>Клубы не найдены</Text>
      ) : (
        clubs.map(club => (
          <TouchableOpacity
            key={String(club.icafe_id)}
            style={st.clubCard}
            onPress={() => { setSelectedClub(club); setStep('params'); }}
            activeOpacity={0.8}
          >
            <View style={st.clubIconWrap}>
              <BookingIcon size={22} color="#FFCC00" strokeWidth={2} />
            </View>
            <View style={st.clubInfo}>
              <Text style={st.clubAddress}>{club.address}</Text>
              <Text style={st.clubId}>ID: {club.icafe_id}</Text>
            </View>
            <ArrowRightIcon size={18} color="#555" strokeWidth={2} />
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  content:          { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  contentContainer: { paddingBottom: 40 },
  sectionTitle:     { color: '#555', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 16 },
  loader:           { marginTop: 40 },
  emptyText:        { color: '#444', fontSize: 14, textAlign: 'center', marginTop: 40 },
  clubCard:         { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#0D0D0D', borderRadius: 16, borderWidth: 1, borderColor: '#1A1A1A', padding: 16, marginBottom: 10 },
  clubIconWrap:     { width: 44, height: 44, borderRadius: 12, backgroundColor: '#1A1100', borderWidth: 1, borderColor: '#FFCC00', alignItems: 'center', justifyContent: 'center' },
  clubInfo:         { flex: 1 },
  clubAddress:      { color: '#fff', fontSize: 14, fontWeight: '700' },
  clubId:           { color: '#444', fontSize: 11, marginTop: 2 },
});
