import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, Image, StyleSheet, ActivityIndicator,
  RefreshControl, TouchableOpacity, Linking, Modal, Dimensions,
  LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getVkNews } from '../../services/newsService';
import { VK_GROUP_ID } from '../../constants/config';
import { NewsItem } from '../../types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const now  = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 3600)  return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

interface NewsCardProps {
  item: NewsItem;
  onImagePress: (url: string) => void;
}

function NewsCard({ item, onImagePress }: NewsCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isLongText = item.text && item.text.length > 200;

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  return (
    <View style={styles.card}>
      {item.images && item.images.length > 0 && (
        <View style={styles.imageGrid}>
          {item.images.length === 1 ? (
            <TouchableOpacity activeOpacity={0.9} onPress={() => onImagePress(item.images![0])} style={styles.imageContainer}>
              <Image source={{ uri: item.images[0] }} style={styles.cardImage} resizeMode="cover" />
            </TouchableOpacity>
          ) : item.images.length === 2 ? (
            <View style={styles.imageRow}>
              {item.images.map((img, i) => (
                <TouchableOpacity key={i} activeOpacity={0.9} onPress={() => onImagePress(img)} style={styles.imageHalf}>
                  <Image source={{ uri: img }} style={styles.cardImage} resizeMode="cover" />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <>
              <TouchableOpacity activeOpacity={0.9} onPress={() => onImagePress(item.images![0])} style={styles.imageContainer}>
                <Image source={{ uri: item.images[0] }} style={styles.cardImage} resizeMode="cover" />
              </TouchableOpacity>
              <View style={styles.imageRow}>
                {item.images.slice(1).map((img, i) => (
                  <TouchableOpacity key={i} activeOpacity={0.9} onPress={() => onImagePress(img)} style={styles.imageHalf}>
                    <Image source={{ uri: img }} style={styles.cardImage} resizeMode="cover" />
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>
      )}

      <View style={styles.cardHeader}>
        <Image source={require('../../../assets/logo.png')} style={styles.avatarPlaceholder} />
        <View>
          <Text style={styles.cardAuthor}>BlackBears Play</Text>
          <Text style={styles.cardDate}>{formatDate(item.date)}</Text>
        </View>
      </View>

      {item.text ? (
        <View style={styles.textBlock}>
          {expanded || !isLongText ? (
            <Text selectable style={styles.cardText}>{item.text}</Text>
          ) : (
            <Text style={styles.cardText} numberOfLines={5}>{item.text}</Text>
          )}
          {isLongText && (
            <TouchableOpacity onPress={toggleExpand} style={styles.moreBtn} activeOpacity={0.7}>
              <Text style={styles.moreBtnText}>{expanded ? 'Свернуть ↑' : 'Подробнее ↓'}</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}

      {item.poll && (
        <View style={styles.pollContainer}>
          <Text style={styles.pollTitle}>📊 {item.poll.question}</Text>
          {item.poll.answers.map((ans, idx) => (
            <View key={idx} style={styles.pollAnswer}>
              <View style={[styles.pollProgress, { width: `${ans.rate}%` }]} />
              <Text style={styles.pollAnswerText}>{ans.text}</Text>
              <Text style={styles.pollRate}>{Math.round(ans.rate)}%</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.cardFooter}>
        <TouchableOpacity
          style={styles.vkBtn}
          onPress={() => Linking.openURL(`https://vk.com/wall-${VK_GROUP_ID}_${item.id}`)}
        >
          <Text style={styles.vkBtnText}>ОТКРЫТЬ В ВК</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function NewsScreen() {
  const [news, setNews]           = useState<NewsItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedImg, setSelectedImg] = useState<string | null>(null);

  const fetchNews = async () => {
    try {
      const data = await getVkNews();
      setNews(data);
    } catch (err) {
      // error silenced in release build
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchNews(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchNews(); }, []);

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#FFCC00" /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>НОВОСТИ</Text>
        <Text style={styles.headerSub}>СЕТЬ КЛУБОВ BLACKBEARS PLAY</Text>
      </View>

      <FlatList
        data={news}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <NewsCard item={item} onImagePress={setSelectedImg} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFCC00" />}
      />

      <Modal visible={!!selectedImg} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelectedImg(null)}>
          {selectedImg && <Image source={{ uri: selectedImg }} style={styles.fullImage} resizeMode="contain" />}
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  imageGrid: { width: '100%' },
  imageRow: { flexDirection: 'row', gap: 2 },
  imageHalf: { flex: 1, height: 200, backgroundColor: '#080808' },
  container: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#111' },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: 2 },
  headerSub: { color: '#444', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginTop: 4 },
  list: { padding: 16, paddingBottom: 100 },
  card: { backgroundColor: '#111', borderRadius: 20, marginBottom: 20, borderWidth: 1, borderColor: '#1A1A1A', overflow: 'hidden' },
  imageContainer: { width: '100%', height: 370, backgroundColor: '#080808' },
  cardImage: { width: '100%', height: '100%' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 10 },
  avatarPlaceholder: { width: 36, height: 36, borderRadius: 8 },
  cardAuthor: { color: '#fff', fontSize: 14, fontWeight: '800' },
  cardDate: { color: '#444', fontSize: 11 },
  textBlock: { paddingHorizontal: 16, paddingBottom: 16 },
  cardText: { color: '#BBB', fontSize: 14, lineHeight: 21 },
  moreBtn: { marginTop: 10, alignItems: 'center' },
  moreBtnText: { color: '#FFCC00', fontSize: 14, fontWeight: '700' },
  pollContainer: { paddingHorizontal: 16, paddingBottom: 20 },
  pollTitle: { color: '#fff', fontWeight: '800', marginBottom: 12, fontSize: 14 },
  pollAnswer: { height: 40, backgroundColor: '#1A1A1A', borderRadius: 8, justifyContent: 'center', marginBottom: 6, overflow: 'hidden', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' },
  pollProgress: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#222', borderRadius: 8 },
  pollAnswerText: { flex: 1, color: '#DDD', fontSize: 13, fontWeight: '600' },
  pollRate: { color: '#FFCC00', fontWeight: '800', fontSize: 12 },
  cardFooter: { padding: 16, paddingTop: 0 },
  vkBtn: { backgroundColor: '#4C75A3', borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  vkBtnText: { color: '#000', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  fullImage: { width: SCREEN_W, height: SCREEN_H },
});
