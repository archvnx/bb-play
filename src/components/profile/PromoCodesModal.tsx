import React from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  FlatList, ActivityIndicator, Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { PromoCode } from '../../types/backend';

// ─── Цвета по типу приза ──────────────────────────────────────────────────────
const COLOR: Record<string, string> = {
  free_mins:        '#22C55E',
  topup_bonus:      '#3B82F6',
  booking_discount: '#FFCC00',
};

const LABEL: Record<string, string> = {
  free_mins:        'БЕСПЛАТНЫЕ МИНУТЫ',
  topup_bonus:      'БОНУС К ПОПОЛНЕНИЮ',
  booking_discount: 'СКИДКА НА БРОНЬ',
};

const USAGE_NOTE: Record<string, string> = {
  free_mins:        'Укажи промокод при оформлении брони',
  topup_bonus:      'Укажи промокод при пополнении баланса',
  booking_discount: 'Укажи промокод при оформлении брони',
};

// ─── Хелперы ──────────────────────────────────────────────────────────────────
function daysLeft(expiresAt: string): number {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000));
}

function pluralDays(n: number): string {
  if (n === 1) return '1 день';
  if (n < 5)  return `${n} дня`;
  return `${n} дней`;
}

// ─── Карточка промокода ───────────────────────────────────────────────────────
function PromoCard({ promo }: { promo: PromoCode }) {
  const color = COLOR[promo.prizeType] ?? '#FFCC00';
  const left  = daysLeft(promo.expiresAt);

  const handleCopy = () => {
    Clipboard.setString(promo.code);
    Alert.alert('Скопировано', `Промокод ${promo.code} скопирован в буфер`);
  };

  return (
    <View style={[s.card, { borderColor: color + '33' }]}>

      {/* Шапка карточки */}
      <View style={s.cardHeader}>
        <View style={[s.typeBadge, { backgroundColor: color + '18', borderColor: color + '44' }]}>
          <Text style={[s.typeText, { color }]}>
            {LABEL[promo.prizeType] ?? promo.prizeLabel.toUpperCase()}
          </Text>
        </View>
        <View style={s.expBadge}>
          <Text style={s.expText}>{pluralDays(left)}</Text>
        </View>
      </View>

      {/* Значение приза */}
      <Text style={s.prizeValue}>
        +{promo.prizeValue}{' '}
        <Text style={s.prizeUnit}>{promo.prizeUnit}</Text>
      </Text>

      {/* Код */}
      <TouchableOpacity
        style={[s.codeRow, { borderColor: color + '44' }]}
        onPress={handleCopy}
        activeOpacity={0.7}
      >
        <Text style={[s.code, { color }]}>{promo.code}</Text>
        <Text style={s.copyHint}>нажмите чтобы скопировать</Text>
      </TouchableOpacity>

      {/* Инструкция */}
      <Text style={s.note}>{USAGE_NOTE[promo.prizeType] ?? ''}</Text>

    </View>
  );
}

// ─── Основной компонент ───────────────────────────────────────────────────────
interface Props {
  visible:  boolean;
  codes:    PromoCode[];
  loading:  boolean;
  onClose:  () => void;
}

export function PromoCodesModal({ visible, codes, loading, onClose }: Props) {

  const renderContent = () => {
    if (loading) {
      return <ActivityIndicator color="#FFCC00" style={{ marginTop: 60 }} />;
    }

    if (codes.length === 0) {
      return (
        <View style={s.emptyWrap}>
          <Text style={s.emptyTitle}>Нет промокодов</Text>
          <Text style={s.emptySubtitle}>
            Крути колесо фортуны на главном экране каждый день - там можно выиграть промокод
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={codes}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => <PromoCard promo={item} />}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={s.safe} edges={['top']}>

        {/* Шапка */}
        <View style={s.header}>
          <Text style={s.headerTitle}>Мои промокоды</Text>
          <TouchableOpacity onPress={onClose} style={s.closeBtn} activeOpacity={0.7}>
            <Text style={s.closeBtnText}>Закрыть</Text>
          </TouchableOpacity>
        </View>

        {/* Контент */}
        <View style={s.content}>
          {renderContent()}
        </View>

      </SafeAreaView>
    </Modal>
  );
}

// ─── Стили ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#000',
  },

  // Шапка
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  closeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
  },
  closeBtnText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '700',
  },

  content: {
    flex: 1,
  },

  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 10,
  },

  // Карточка
  card: {
    backgroundColor: '#0D0D0D',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeBadge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  typeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  expBadge: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  expText: {
    color: '#666',
    fontSize: 11,
    fontWeight: '700',
  },
  prizeValue: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
  },
  prizeUnit: {
    color: '#888',
    fontSize: 14,
    fontWeight: '700',
  },
  codeRow: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingVertical: 12,
    alignItems: 'center',
    gap: 2,
  },
  code: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 3,
  },
  copyHint: {
    color: '#333',
    fontSize: 10,
    fontWeight: '600',
  },
  note: {
    color: '#444',
    fontSize: 11,
    lineHeight: 16,
  },

  // Пустой список
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 8,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#444',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 19,
  },
});
