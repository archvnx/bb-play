import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { BookingIcon, ChevronDownIcon, ArrowRightIcon } from '../ui/Icons';
import { MoneyIcon } from './BookingIcons';
import { PickerModal } from './PickerModal';
import { PKG_ZONE_STYLES, PKG_ZONE_NAMES } from '../../constants/config';
import type { useBookingFlow } from '../../hooks/useBookingFlow';

interface Props {
  flow: ReturnType<typeof useBookingFlow>;
}

export function BookingParamsStep({ flow }: Props) {
  const {
    selectedClub, user,
    date, setDate, dateOptions,
    time, setTime, timeOptions,
    mins, setMins, durationOptions,
    showDatePicker, setShowDatePicker,
    showTimePicker, setShowTimePicker,
    showDurationPicker, setShowDurationPicker,
    serverPackages, setSelectedDuration, setStep,
  } = flow;

  const dateLabel     = dateOptions.find(d => d.value === date)?.label ?? date;
  const durationLabel = durationOptions.find(d => d.value === mins)?.label
    ?? serverPackages.find(p => p.value === mins)?.label
    ?? `${mins} мин`;

  const durations = [...new Set(serverPackages.map(p => p.value))].sort((a, b) => a - b);

  return (
    <ScrollView style={st.content} contentContainerStyle={st.contentContainer}>
      <Text style={st.sectionTitle}>ПАРАМЕТРЫ БРОНИРОВАНИЯ</Text>

      <View style={st.clubBadge}>
        <BookingIcon size={16} color="#FFCC00" strokeWidth={2} />
        <Text style={st.clubBadgeText}>{selectedClub?.address}</Text>
      </View>

      <Text style={st.fieldLabel}>ДАТА И ВРЕМЯ</Text>
      <View style={st.row}>
        <TouchableOpacity style={[st.selector, st.selectorFlex]} onPress={() => setShowDatePicker(true)} activeOpacity={0.8}>
          <Text style={st.selectorValue}>{dateLabel}</Text>
          <ChevronDownIcon size={16} color="#FFCC00" strokeWidth={2} />
        </TouchableOpacity>
        <TouchableOpacity style={[st.selector, st.selectorTime]} onPress={() => setShowTimePicker(true)} activeOpacity={0.8}>
          <Text style={st.selectorValue}>{time}</Text>
          <ChevronDownIcon size={16} color="#FFCC00" strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {durations.length > 0 && (
        <>
          <Text style={st.fieldLabel}>ГОТОВЫЕ ПАКЕТЫ (ВЫГОДНО)</Text>
          <View style={st.row}>
            {durations.map(dur => {
              const hours       = dur / 60;
              const zonesForDur = serverPackages.filter(p => p.value === dur);
              return (
                <TouchableOpacity
                  key={dur}
                  style={st.pkgCard}
                  onPress={() => { setSelectedDuration(dur); setMins(dur); setStep('pcs'); }}
                  activeOpacity={0.75}
                >
                  <Text style={st.pkgTitle}>
                    {hours} {hours === 1 ? 'час' : hours < 5 ? 'часа' : 'часов'}
                  </Text>
                  <View style={st.pkgZones}>
                    {zonesForDur.map(pkg => {
                      const zoneStyle = PKG_ZONE_STYLES[pkg.zone] ?? PKG_ZONE_STYLES.default;
                      const zoneName  = PKG_ZONE_NAMES[pkg.zone] ?? pkg.zone;
                      return (
                        <View key={pkg.id} style={st.pkgZoneRow}>
                          <Text style={[st.pkgZoneName, { color: zoneStyle.accent }]} numberOfLines={1}>
                            {zoneName}
                          </Text>
                          <View style={st.pkgPriceWrap}>
                            <Text style={st.pkgPrice}>{pkg.price} ₽</Text>
                            <Text style={st.pkgPer}>{pkg.pricePerHour} ₽/ч</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      <Text style={st.fieldLabel}>ИЛИ СТАНДАРТНОЕ ВРЕМЯ</Text>
      <TouchableOpacity style={st.selector} onPress={() => setShowDurationPicker(true)} activeOpacity={0.8}>
        <Text style={st.selectorValue}>{durationLabel}</Text>
        <ChevronDownIcon size={16} color="#FFCC00" strokeWidth={2} />
      </TouchableOpacity>

      <View style={st.balanceHint}>
        <MoneyIcon size={14} color="#FFCC00" />
        <Text style={st.balanceHintText}>
          Баланс: {parseFloat(user?.balance || '0').toFixed(2)} ₽
        </Text>
      </View>

      <TouchableOpacity
        style={st.nextBtn}
        onPress={() => { setSelectedDuration(null); setStep('pcs'); }}
        activeOpacity={0.85}
      >
        <Text style={st.nextBtnText}>Выбрать ПК</Text>
        <ArrowRightIcon size={18} color="#000" strokeWidth={2.5} />
      </TouchableOpacity>

      <PickerModal visible={showDatePicker} title="ДАТА" options={dateOptions} selected={date} onSelect={setDate} onClose={() => setShowDatePicker(false)} />
      <PickerModal visible={showTimePicker} title="ВРЕМЯ" options={timeOptions} selected={time} onSelect={setTime} onClose={() => setShowTimePicker(false)} />
      <PickerModal visible={showDurationPicker} title="ДЛИТЕЛЬНОСТЬ" options={durationOptions} selected={mins} onSelect={(v: number) => { setMins(v); setSelectedDuration(null); }} onClose={() => setShowDurationPicker(false)} />
    </ScrollView>
  );
}

const st = StyleSheet.create({
  content:          { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  contentContainer: { paddingBottom: 40 },
  sectionTitle:     { color: '#555', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 16 },
  clubBadge:        { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1A1100', borderRadius: 10, borderWidth: 1, borderColor: '#FFCC00', padding: 10, marginBottom: 18 },
  clubBadgeText:    { color: '#FFCC00', fontSize: 13, fontWeight: '700' },
  fieldLabel:       { color: '#555', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 6, marginTop: 14 },
  row:              { flexDirection: 'row', gap: 10, marginBottom: 16 },
  selector:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0D0D0D', borderRadius: 12, borderWidth: 1, borderColor: '#1A1A1A', padding: 14 },
  selectorFlex:     { flex: 1 },
  selectorTime:     { flex: 0.8 },
  selectorValue:    { color: '#fff', fontSize: 15, fontWeight: '700' },
  balanceHint:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20, marginBottom: 4 },
  balanceHintText:  { color: '#FFCC00', fontSize: 13, fontWeight: '700' },
  nextBtn:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FFCC00', borderRadius: 14, padding: 16, marginTop: 24 },
  nextBtnText:      { color: '#000', fontWeight: '900', fontSize: 15 },
  pkgCard:          { flex: 1, backgroundColor: '#0D0D0D', borderRadius: 16, borderWidth: 1, borderColor: '#1A1A1A', padding: 14 },
  pkgTitle:         { color: '#FFCC00', fontSize: 18, fontWeight: '900', marginBottom: 6 },
  pkgZones:         { gap: 6, marginTop: 4 },
  pkgZoneRow:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  pkgZoneName:      { fontSize: 11, fontWeight: '800', flex: 1, marginRight: 6 },
  pkgPriceWrap:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#333', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, gap: 4 },
  pkgPrice:         { color: '#fff', fontSize: 12, fontWeight: '900' },
  pkgPer:           { color: '#555', fontSize: 10, fontWeight: '600' },
});
