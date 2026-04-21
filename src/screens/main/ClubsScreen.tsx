import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { fetchClubs } from '../../services/clubsService';
import { BookingIcon } from '../../components/ui/Icons';
import { Club } from '../../types';

export default function ClubsScreen() {
  const navigation = useNavigation<any>();
  const [clubs, setClubs]     = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClubs()
      .then(setClubs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      <View style={st.header}>
        <Text style={st.title}>КЛУБЫ</Text>
      </View>
      {loading ? (
        <ActivityIndicator color="#FFCC00" style={st.loader} />
      ) : (
        <FlatList
          data={clubs}
          keyExtractor={item => item.icafe_id.toString()}
          contentContainerStyle={st.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={st.card}
              onPress={() => navigation.navigate('Booking', {
                cafeId: String(item.icafe_id),
                _resetStep: 'params',
                _t: Date.now(),
              })}
              activeOpacity={0.8}
            >
              <View style={st.iconWrap}>
                <BookingIcon size={20} color="#FFCC00" strokeWidth={2} />
              </View>
              <View style={st.cardInfo}>
                <Text style={st.address}>{item.address}</Text>
                <Text style={st.id}>ID: {item.icafe_id}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header:    { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#111' },
  title:     { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  loader:    { marginTop: 40 },
  list:      { padding: 16 },
  card:      { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#0D0D0D', borderRadius: 16, borderWidth: 1, borderColor: '#1A1A1A', padding: 16, marginBottom: 10 },
  iconWrap:  { width: 44, height: 44, borderRadius: 12, backgroundColor: '#1A1100', borderWidth: 1, borderColor: '#FFCC00', alignItems: 'center', justifyContent: 'center' },
  cardInfo:  { flex: 1 },
  address:   { color: '#fff', fontSize: 14, fontWeight: '700' },
  id:        { color: '#444', fontSize: 11, marginTop: 2 },
});
