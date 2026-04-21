import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Club } from '../../types';
import { BookingIcon } from '../ui/Icons';
import { modalStyles } from './EditModal';

interface FavoriteClubModalProps {
  visible: boolean;
  clubs: Club[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export function FavoriteClubModal({ visible, clubs, currentId, onSelect, onClose }: FavoriteClubModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={modalStyles.overlay}>
        <TouchableOpacity style={modalStyles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={modalStyles.sheet}>
          <View style={modalStyles.handle} />
          <Text style={modalStyles.title}>Избранный клуб</Text>
          <Text style={modalStyles.subtitle}>Спецпредложения будут загружаться для выбранного клуба</Text>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 340 }}>
            {clubs.map((club) => {
              const isActive = String(club.icafe_id) === currentId;
              return (
                <TouchableOpacity
                  key={club.icafe_id}
                  style={[st.row, isActive && st.rowActive]}
                  onPress={() => { onSelect(String(club.icafe_id)); onClose(); }}
                  activeOpacity={0.75}
                >
                  <View style={st.iconWrap}>
                    <BookingIcon size={16} color={isActive ? '#FFCC00' : '#ffffff'} />
                  </View>
                  <Text style={[st.address, isActive && st.addressActive]} numberOfLines={2}>
                    {club.address}
                  </Text>
                  {isActive && (
                    <View style={st.checkWrap}>
                      <Text style={st.check}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  row:           { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, marginBottom: 8, backgroundColor: '#111', borderWidth: 1, borderColor: '#1A1A1A' },
  rowActive:     { backgroundColor: '#FFCC00', borderColor: '#FFCC00' },
  iconWrap:      { width: 32, height: 32, borderRadius: 8, backgroundColor: '#1A1100', alignItems: 'center', justifyContent: 'center' },
  address:       { color: '#fff', fontSize: 13, fontWeight: '600', flex: 1 },
  addressActive: { color: '#000' },
  checkWrap:     { width: 24, height: 24, borderRadius: 12, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  check:         { color: '#FFCC00', fontSize: 14, fontWeight: '900' },
});
