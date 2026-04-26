import React, { useEffect, useState, useCallback } from 'react';
import {
  Modal, View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getBookingHistory, getBookingStats } from '../../services/backendService';
import type { BookingHistoryItem, BookingStats } from '../../types/backend';

// ─── Хелперы ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  // dateStr: 'YYYY-MM-DD'
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
}

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} мин`;
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} мин`;
}

function getZoneColor(zone: string | null): string {
  if (!zone) return '#555';
  const z = zone.toLowerCase();
  if (z.includes('boot') || z.includes('bc')) return '#00BFFF';
  if (z.includes('vip')) return '#FFCC00';
  return '#00CC66';
}

// ─── Компонент строки статистики ──────────────────────────────────────────────

function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Компонент карточки брони ─────────────────────────────────────────────────

function HistoryCard({ item }: { item: BookingHistoryItem }) {
  const zoneColor = getZoneColor(item.zone);
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardLeft}>
          <Text style={styles.cardDate}>{formatDate(item.startDate)}</Text>
          <Text style={styles.cardTime}>{item.startTime}</Text>
        </View>
        <View style={styles.cardRight}>
          {item.zone ? (
            <View style={[styles.zoneBadge, { borderColor: zoneColor + '55', backgroundColor: zoneColor + '18' }]}>
              <Text style={[styles.zoneText, { color: zoneColor }]}>{item.zone.toUpperCase()}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardRow}>
          <Text style={styles.cardRowLabel}>Компьютер</Text>
          <Text style={styles.cardRowValue}>{item.pcName}</Text>
        </View>
        <View style={styles.cardRow}>
          <Text style={styles.cardRowLabel}>Длительность</Text>
          <Text style={styles.cardRowValue}>{formatDuration(item.durationMins)}</Text>
        </View>
        {item.cafeAddress ? (
          <View style={styles.cardRow}>
            <Text style={styles.cardRowLabel}>Клуб</Text>
            <Text style={styles.cardRowValue} numberOfLines={1}>{item.cafeAddress}</Text>
          </View>
        ) : null}
        {item.cost ? (
          <View style={styles.cardRow}>
            <Text style={styles.cardRowLabel}>Стоимость</Text>
            <Text style={[styles.cardRowValue, styles.cardCost]}>{parseFloat(item.cost).toFixed(0)} ₽</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

// ─── Главный компонент ────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  memberId: string;
  onClose: () => void;
}

type Tab = 'history' | 'stats';

export function BookingHistoryModal({ visible, memberId, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('history');

  const [history, setHistory] = useState<BookingHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyHasMore, setHistoryHasMore] = useState(true);
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false);

  const [stats, setStats] = useState<BookingStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const PAGE_LIMIT = 20;

  const loadHistory = useCallback(async (page: number, reset = false) => {
    if (page === 1) setHistoryLoading(true);
    else setHistoryLoadingMore(true);

    try {
      const data = await getBookingHistory(memberId, page, PAGE_LIMIT);
      setHistory(prev => reset ? data : [...prev, ...data]);
      setHistoryHasMore(data.length === PAGE_LIMIT);
      setHistoryPage(page);
    } catch {
      // молчим — пустой список покажет "ничего не найдено"
    } finally {
      setHistoryLoading(false);
      setHistoryLoadingMore(false);
    }
  }, [memberId]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await getBookingStats(memberId);
      setStats(data);
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    if (!visible || !memberId) return;
    setTab('history');
    setHistory([]);
    setHistoryPage(1);
    setHistoryHasMore(true);
    loadHistory(1, true);
    loadStats();
  }, [visible, memberId]);

  const handleLoadMore = () => {
    if (historyLoadingMore || !historyHasMore) return;
    loadHistory(historyPage + 1);
  };

  // ── Рендер вкладки истории ─────────────────────────────────────────────────

  const renderHistory = () => {
    if (historyLoading) {
      return <ActivityIndicator color="#FFCC00" style={{ marginTop: 60 }} />;
    }

    if (history.length === 0) {
      return (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Ничего не найдено</Text>
          <Text style={styles.emptySubtitle}>За последние 90 дней броней не было</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={history}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => <HistoryCard item={item} />}
        contentContainerStyle={styles.listContent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          historyLoadingMore
            ? <ActivityIndicator color="#FFCC00" style={{ marginVertical: 16 }} />
            : null
        }
        showsVerticalScrollIndicator={false}
      />
    );
  };

  // ── Рендер вкладки статистики ──────────────────────────────────────────────

  const renderStats = () => {
    if (statsLoading) {
      return <ActivityIndicator color="#FFCC00" style={{ marginTop: 60 }} />;
    }

    if (!stats || stats.totalBookings === 0) {
      return (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Нет данных</Text>
          <Text style={styles.emptySubtitle}>За последние 90 дней броней не было</Text>
        </View>
      );
    }

    return (
      <ScrollView contentContainerStyle={styles.statsContent} showsVerticalScrollIndicator={false}>

        {/* Основные числа */}
        <View style={styles.statsGrid}>
          <StatItem label="броней" value={stats.totalBookings} />
          <View style={styles.statDivider} />
          <StatItem label="часов в клубе" value={stats.totalHours} />
          <View style={styles.statDivider} />
          <StatItem label="в этом месяце" value={stats.bookingsThisMonth} />
        </View>

        {/* Доп. инфо */}
        {(stats.totalSpent && parseFloat(stats.totalSpent) > 0) ? (
          <View style={styles.statsRow}>
            <Text style={styles.statsRowLabel}>Потрачено</Text>
            <Text style={styles.statsRowValue}>{parseFloat(stats.totalSpent).toFixed(0)} ₽</Text>
          </View>
        ) : null}

        {stats.favoriteZone ? (
          <View style={styles.statsRow}>
            <Text style={styles.statsRowLabel}>Любимая зона</Text>
            <Text style={[styles.statsRowValue, { color: getZoneColor(stats.favoriteZone) }]}>
              {stats.favoriteZone}
            </Text>
          </View>
        ) : null}

        {stats.favoritePc ? (
          <View style={styles.statsRow}>
            <Text style={styles.statsRowLabel}>Любимый ПК</Text>
            <Text style={styles.statsRowValue}>{stats.favoritePc}</Text>
          </View>
        ) : null}



      </ScrollView>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top']}>

        {/* Шапка */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>История броней</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <Text style={styles.closeBtnText}>Закрыть</Text>
          </TouchableOpacity>
        </View>

        {/* Табы */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, tab === 'history' && styles.tabActive]}
            onPress={() => setTab('history')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, tab === 'history' && styles.tabTextActive]}>История</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'stats' && styles.tabActive]}
            onPress={() => setTab('stats')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, tab === 'stats' && styles.tabTextActive]}>Статистика</Text>
          </TouchableOpacity>
        </View>

        {/* Контент */}
        <View style={styles.content}>
          {tab === 'history' ? renderHistory() : renderStats()}
        </View>

      </SafeAreaView>
    </Modal>
  );
}

// ─── Стили ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
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

  // Табы
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#0D0D0D',
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  tabActive: {
    backgroundColor: '#FFCC00',
    borderColor: '#FFCC00',
  },
  tabText: {
    color: '#555',
    fontSize: 13,
    fontWeight: '800',
  },
  tabTextActive: {
    color: '#000',
  },

  content: {
    flex: 1,
  },

  // История
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
    gap: 10,
  },

  // Карточка брони
  card: {
    backgroundColor: '#0D0D0D',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1A1A1A',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  cardDate: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  cardTime: {
    color: '#555',
    fontSize: 12,
    fontWeight: '600',
  },
  cardRight: {},
  zoneBadge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  zoneText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardBody: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardRowLabel: {
    color: '#555',
    fontSize: 12,
    fontWeight: '600',
  },
  cardRowValue: {
    color: '#ccc',
    fontSize: 13,
    fontWeight: '700',
    maxWidth: '60%',
    textAlign: 'right',
  },
  cardCost: {
    color: '#FFCC00',
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
  },

  // Статистика
  statsContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D0D0D',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1A1A1A',
    paddingVertical: 20,
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    color: '#FFCC00',
    fontSize: 26,
    fontWeight: '900',
  },
  statLabel: {
    color: '#555',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#1A1A1A',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0D0D0D',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1A1A1A',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  statsRowLabel: {
    color: '#555',
    fontSize: 13,
    fontWeight: '700',
  },
  statsRowValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
});