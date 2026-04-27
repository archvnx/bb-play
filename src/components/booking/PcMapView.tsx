import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { ScrollView } from 'react-native';
import Svg, { G, Rect, Text as SvgText, Path } from 'react-native-svg';
import type { useBookingFlow } from '../../hooks/useBookingFlow';
import type { ZoneLayout } from '../../types/backend';
import { MapLegend } from './MapLegend';
import { RefreshIcon } from '../ui/Icons';

interface Props {
  flow: ReturnType<typeof useBookingFlow>;
}

// ─── Константы ────────────────────────────────────────────────────────────────
const PAD     = 12;
const PC_W    = 60;
const PC_H    = 60;
const PC_GAP  = 6;
const LABEL_H = 22;
const BG      = '#0D1117';

const DEFAULT_BORDER = '#334155';
const DEFAULT_FILL   = 'rgba(51,65,85,0.15)';
const DEFAULT_TEXT   = '#94A3B8';

// ─── Вычисление viewBox по зонам с сервера ───────────────────────────────────
function computeViewBox(zones: ZoneLayout[]) {
  if (zones.length === 0) return { vbW: 400, vbH: 300 };
  const vbW = Math.max(...zones.map(z => z.x + z.w)) + PAD;
  const vbH = Math.max(...zones.map(z => z.y + z.h)) + PAD;
  return { vbW, vbH };
}

// ─── Раскладка ПК внутри зоны сеткой ─────────────────────────────────────────
interface PcPos { name: string; x: number; y: number }

function layoutPcsInZone(zone: ZoneLayout, pcNames: string[]): PcPos[] {
  if (pcNames.length === 0 || zone.perRow === 0) return [];

  const perRow = zone.perRow ?? 2;
  const rows: string[][] = [];
  for (let i = 0; i < pcNames.length; i += perRow) {
    rows.push(pcNames.slice(i, i + perRow));
  }
  const totalH  = rows.length * PC_H + (rows.length - 1) * PC_GAP;
  const usableH = zone.h - LABEL_H;
  const startY  = zone.y + LABEL_H + Math.max(0, (usableH - totalH) / 2);

  return rows.flatMap((row, rowIdx) => {
    const rowW   = row.length * PC_W + (row.length - 1) * PC_GAP;
    const startX = zone.x + (zone.w - rowW) / 2;
    return row.map((name, colIdx) => ({
      name,
      x: startX + colIdx * (PC_W + PC_GAP),
      y: startY + rowIdx * (PC_H + PC_GAP),
    }));
  });
}

// ─── Компонент ────────────────────────────────────────────────────────────────
export function PcMapView({ flow }: Props) {
  const { width: screenW } = useWindowDimensions();
  const {
    pcs,
    mapData,
    loadingMap,
    loadingPcs,
    mapLoadFailed,
    zoneLayouts,
    selectedPc,
    setSelectedPc,
    reloadMap,
  } = flow;

  const isLoading = loadingMap || loadingPcs;

  if (isLoading) {
    return (
      <View style={st.centered}>
        <ActivityIndicator color="#FFCC00" size="large" />
        <Text style={[st.emptyText, { marginTop: 12 }]}>Загрузка схемы...</Text>
      </View>
    );
  }

  // ─── Схема не загрузилась — показываем кнопку перезагрузки ───────────────
  if (mapLoadFailed || zoneLayouts.length === 0) {
    return (
      <View style={st.emptyWrap}>
        <Text style={st.emptyText}>
          {mapLoadFailed ? 'Не удалось загрузить схему зала' : 'Схема недоступна'}
        </Text>
        <TouchableOpacity style={st.reloadBtn} onPress={reloadMap} activeOpacity={0.8}>
          <RefreshIcon size={16} color="#FFCC00" strokeWidth={2} />
          <Text style={st.reloadText}>Перезагрузить схему</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Размеры ──────────────────────────────────────────────────────────────
  const { vbW, vbH } = computeViewBox(zoneLayouts);
  const mapW = Math.min(screenW - 32, 500);
  const mapH = (mapW / vbW) * vbH;
  const sx   = mapW / vbW;
  const sy   = mapH / vbH;

  // ─── Раскладка всех ПК ────────────────────────────────────────────────────
  const emptyZones = new Set<string>();
  const pcsLayout: PcPos[] = zoneLayouts.flatMap(zone => {
    const names = mapData
      .filter(p => p.area_name === zone.zoneName)
      .map(p => p.pc_name);
    if (names.length === 0) emptyZones.add(zone.zoneName);
    return layoutPcsInZone(zone, names);
  });

  // ─── Хелперы ──────────────────────────────────────────────────────────────
  const getPcData   = (name: string) => pcs.find(p => p.pc_name === name);
  const isSel       = (name: string) => selectedPc?.pc_name === name;
  const isBusy      = (name: string) => getPcData(name)?.is_using ?? false;
  const isUnavail   = (name: string) => !getPcData(name);
  const handlePress = (name: string) => {
    const pc = getPcData(name);
    if (!pc || pc.is_using) return;
    setSelectedPc(isSel(name) ? null : pc);
  };

  return (
    <>
      <MapLegend />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ width: mapW, height: mapH, alignSelf: 'center', marginBottom: 20 }}>
          <Svg width={mapW} height={mapH} viewBox={`0 0 ${vbW} ${vbH}`}>

            {/* Фон */}
            <Rect x={0} y={0} width={vbW} height={vbH} fill={BG} rx={14} />
            <Rect x={2} y={2} width={vbW - 4} height={vbH - 4}
              fill="none" stroke="#334155" strokeWidth="1.5" rx={14} />

            {/* Зоны */}
            {zoneLayouts.map(zone => {
              const border = zone.colorBorder ?? DEFAULT_BORDER;
              const fill   = zone.colorFill   ?? DEFAULT_FILL;
              const text   = zone.colorText   ?? DEFAULT_TEXT;
              return (
                <G key={zone.zoneName}>
                  <Rect
                    x={zone.x} y={zone.y} width={zone.w} height={zone.h}
                    fill={fill}
                    stroke={border === 'transparent' ? 'none' : border}
                    strokeWidth={2}
                    rx={8}
                  />
                  <SvgText
                    x={zone.x + zone.w / 2}
                    y={emptyZones.has(zone.zoneName)
                      ? zone.y + zone.h / 2 + 7
                      : zone.y + LABEL_H - 6}
                    fill={text}
                    fontSize={emptyZones.has(zone.zoneName) ? 20 : 16}
                    fontWeight="bold"
                    textAnchor="middle"
                    opacity={0.85}
                  >
                    {zone.zoneName.toUpperCase()}
                  </SvgText>
                </G>
              );
            })}

            {/* ПК */}
            {pcsLayout.map(({ name, x, y }) => {
              const sel    = isSel(name);
              const busy   = isBusy(name);
              const unavil = isUnavail(name);
              return (
                <G key={`svg-${name}`} opacity={unavil ? 0.3 : 1}>
                  <Rect
                    x={x} y={y} width={PC_W} height={PC_H}
                    fill={sel ? '#FFCC00' : busy ? '#991B1B' : '#1A1A1A'}
                    stroke={sel ? '#FFCC00' : busy ? '#EF4444' : '#2A2A2A'}
                    strokeWidth={sel ? 2.5 : 2}
                    rx={8}
                  />
                  <SvgText
                    x={x + PC_W / 2}
                    y={sel ? y + PC_H / 2 - 4 : busy ? y + PC_H / 2 - 6 : y + PC_H / 2 + 6}
                    fill={sel ? '#000' : busy ? '#FFF' : '#CCC'}
                    fontSize={13}
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {name}
                  </SvgText>
                  {/* Галочка при выборе */}
                  {sel && (
                    <G>
                      <Rect x={x} y={y + PC_H / 2 + 2} width={PC_W} height={PC_H / 2 - 2}
                        fill="#FFCC00" rx={8} />
                      <SvgText
                        x={x + PC_W / 2} y={y + PC_H - 10}
                        fill="#000" fontSize={16} fontWeight="bold" textAnchor="middle"
                      >✓</SvgText>
                    </G>
                  )}
                  {/* Замок при занятости — внутри карточки по центру */}
                  {busy && (
                    <G transform={`translate(${x + PC_W / 2 - 6}, ${y + PC_H / 2 + 4})`}>
                      <Rect x="1" y="7" width="10" height="7" rx="1.5"
                        stroke="#FFF" strokeWidth="1.5" fill="none" />
                      <Path
                        d="M3.5 7V5C3.5 3.62 4.62 2.5 6 2.5C7.38 2.5 8.5 3.62 8.5 5V7"
                        stroke="#FFF" strokeWidth="1.5" strokeLinecap="round" fill="none"
                      />
                    </G>
                  )}
                </G>
              );
            })}
          </Svg>

          {/* Прозрачные области нажатия поверх SVG */}
          {pcsLayout.map(({ name, x, y }) => {
            const busy   = isBusy(name);
            const unavil = isUnavail(name);
            return (
              <TouchableOpacity
                key={`t-${name}`}
                style={{
                  position: 'absolute',
                  left: x * sx,
                  top: y * sy,
                  width: PC_W * sx,
                  height: PC_H * sy,
                }}
                onPress={() => handlePress(name)}
                activeOpacity={busy || unavil ? 1 : 0.75}
                disabled={busy || unavil}
              />
            );
          })}
        </View>
      </ScrollView>
    </>
  );
}

const st = StyleSheet.create({
  centered:   { padding: 40, alignItems: 'center' },
  emptyWrap:  { alignItems: 'center', paddingTop: 40, gap: 16 },
  emptyText:  { color: '#444', fontSize: 14, textAlign: 'center' },
  reloadBtn:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#111', borderRadius: 10, borderWidth: 1, borderColor: '#1A1A1A', paddingHorizontal: 16, paddingVertical: 10 },
  reloadText: { color: '#FFCC00', fontSize: 13, fontWeight: '700' },
});