import React from 'react';
import {
  View, Text, TouchableOpacity, Modal,
} from 'react-native';
import { User } from '../../types';
import { modalStyles } from './EditModal';

interface TopupModalProps {
  visible: boolean;
  user: User;
  onClose: () => void;
  onSuccess: (newBalance: number, newBonus: number) => void;
}

export function TopupModal({ visible, onClose }: TopupModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={modalStyles.overlay}>
        <TouchableOpacity style={modalStyles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={modalStyles.sheet}>
          <View style={modalStyles.handle} />
          <Text style={modalStyles.title}>Пополнение баланса</Text>
          <Text style={[modalStyles.subtitle, { textAlign: 'center', lineHeight: 22, marginTop: 12 }]}>
            Пополнение баланса через приложение{'\n'}временно недоступно.{'\n\n'}
            Пожалуйста, обратитесь к администратору клуба.
          </Text>
          <View style={[modalStyles.btnRow, { marginTop: 24 }]}>
            <TouchableOpacity style={[modalStyles.confirmBtn, { flex: 1 }]} onPress={onClose}>
              <Text style={modalStyles.confirmText}>Закрыть</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
