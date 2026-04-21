import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBookingFlow } from '../../hooks/useBookingFlow';
import { BookingClubStep }   from '../../components/booking/BookingClubStep';
import { BookingParamsStep } from '../../components/booking/BookingParamsStep';
import { PcListView }        from '../../components/booking/PcListView';
import { PcMapView }         from '../../components/booking/PcMapView';
import { SuccessModal }      from '../../components/booking/SuccessModal';
import { BookingIcon, ChevronDownIcon } from '../../components/ui/Icons';
import { ListIcon, MapIcon }            from '../../components/booking/BookingIcons';

export default function BookingScreen() {
  const flow = useBookingFlow();
  const {
    step, setStep,
    activeTab, setActiveTab,
    selectedPc, booking, handleBook,
    successData, setSuccessData,
    estimatedPrice,
    date, time, mins,
    navigation,
  } = flow;

  return (
    <SafeAreaView style={st.container} edges={['top']}>

      {/* ── Шапка ── */}
      <View style={st.header}>
        {step !== 'club' && (
          <TouchableOpacity
            style={st.backBtn}
            onPress={() => setStep(step === 'pcs' ? 'params' : 'club')}
            activeOpacity={0.8}
          >
            <ChevronDownIcon size={20} color="#FFCC00" strokeWidth={2.5} />
          </TouchableOpacity>
        )}
        <Text style={st.headerTitle}>
          {step === 'club' ? 'Бронирование' : step === 'params' ? 'Параметры' : 'Выбор ПК'}
        </Text>
        <View style={st.spacer} />
      </View>

      {step === 'club'   && <BookingClubStep   flow={flow} />}
      {step === 'params' && <BookingParamsStep flow={flow} />}

      {step === 'pcs' && (
        <View style={st.flex}>
          <View style={st.tabBar}>
            <TouchableOpacity style={[st.tab, activeTab === 'list' && st.tabActive]} onPress={() => setActiveTab('list')} activeOpacity={0.8}>
              <ListIcon size={14} color={activeTab === 'list' ? '#000' : '#555'} />
              <Text style={[st.tabText, activeTab === 'list' && st.tabTextActive]}>Список</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[st.tab, activeTab === 'map' && st.tabActive]} onPress={() => setActiveTab('map')} activeOpacity={0.8}>
              <MapIcon size={14} color={activeTab === 'map' ? '#000' : '#555'} />
              <Text style={[st.tabText, activeTab === 'map' && st.tabTextActive]}>Карта</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={st.content} contentContainerStyle={{ paddingBottom: selectedPc ? 100 : 40 }}>
            <View style={st.paramsBar}>
              <View style={st.paramChip}><Text style={st.paramChipText}>{date.split('-').reverse().join('.')}</Text></View>
              <View style={st.paramChip}><Text style={st.paramChipText}>{time}</Text></View>
              <View style={st.paramChip}><Text style={st.paramChipText}>{mins} мин</Text></View>
              <TouchableOpacity onPress={() => setStep('params')}>
                <Text style={st.changeParamsText}>Изменить</Text>
              </TouchableOpacity>
            </View>
            {activeTab === 'list' ? <PcListView flow={flow} /> : <PcMapView flow={flow} />}
          </ScrollView>

          {selectedPc && (
            <View style={st.footer}>
              <View style={st.footerInfo}>
                <Text style={st.footerPc}>{selectedPc.pc_name}</Text>
                <Text style={st.footerPrice}>
                  {estimatedPrice !== undefined ? `${estimatedPrice.toFixed(2)} ₽` : 'Цена уточняется'}
                </Text>
              </View>
              <TouchableOpacity style={st.bookBtn} onPress={handleBook} activeOpacity={0.85} disabled={booking}>
                {booking
                  ? <ActivityIndicator color="#000" size="small" />
                  : <><BookingIcon size={18} color="#000" strokeWidth={2.5} /><Text style={st.bookBtnText}>Забронировать</Text></>
                }
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {successData && (
        <SuccessModal
          visible
          password={successData.password}
          pcName={successData.pcName}
          date={date} time={time} mins={mins}
          cost={successData.cost}
          onClose={() => { setSuccessData(null); navigation.goBack(); }}
        />
      )}
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#000' },
  flex:             { flex: 1 },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#111' },
  headerTitle:      { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  backBtn:          { width: 36, height: 36, borderRadius: 10, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '90deg' }] },
  spacer:           { width: 36 },
  content:          { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  tabBar:           { flexDirection: 'row', marginHorizontal: 16, marginTop: 12, marginBottom: 4, backgroundColor: '#0D0D0D', borderRadius: 12, padding: 4, gap: 4 },
  tab:              { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 9 },
  tabActive:        { backgroundColor: '#FFCC00' },
  tabText:          { color: '#555', fontSize: 13, fontWeight: '700' },
  tabTextActive:    { color: '#000' },
  paramsBar:        { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  paramChip:        { backgroundColor: '#111', borderRadius: 8, borderWidth: 1, borderColor: '#1A1A1A', paddingHorizontal: 10, paddingVertical: 5 },
  paramChipText:    { color: '#CCC', fontSize: 12, fontWeight: '600' },
  changeParamsText: { color: '#FFCC00', fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' },
  footer:           { flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 24, backgroundColor: '#000', borderTopWidth: 1, borderTopColor: '#111', gap: 12 },
  footerInfo:       { flex: 1 },
  footerPc:         { color: '#fff', fontSize: 16, fontWeight: '900' },
  footerPrice:      { color: '#555', fontSize: 12, marginTop: 2 },
  bookBtn:          { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFCC00', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20 },
  bookBtnText:      { color: '#000', fontWeight: '900', fontSize: 15 },
});
