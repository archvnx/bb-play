import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, useWindowDimensions } from 'react-native';
import Svg, { Path, Circle, Rect, G, Text as SvgText } from 'react-native-svg';
import { MapLegend } from './MapLegend';
import type { useBookingFlow } from '../../hooks/useBookingFlow';

interface Props {
  flow: ReturnType<typeof useBookingFlow>;
}

// ─── Константы карты ──────────────────────────────────────────────────────────
const VB_W  = 700;
const PAD   =   8;
const GAP   =   8;
const PC_W  =  60;
const PC_H  =  60;
const BG    = '#0D1117';

const ZONE_COLORS: Record<string, { border: string; fill: string; text: string }> = {
  BootCamp: { border: '#9333EA', fill: 'rgba(147,51,234,0.13)', text: '#9333EA' },
  GameZone: { border: 'transparent', fill: 'rgba(34,197,94,0.11)', text: '#16A34A' },
  VIP:      { border: '#CA8A04', fill: 'rgba(202,138,4,0.13)', text: '#CA8A04' },
};

// Предопределённая раскладка зон
const BC_X = PAD,  BC_Y = PAD,   BC_W = 230, BC_H = 430;
const VIP_W = 300, VIP_H = 148,  VIP_X = VB_W - PAD - 300, VIP_Y = PAD;
const GZ_W  = 300, GZ_H = 158,   GZ_X  = VIP_X,            GZ_Y  = VIP_Y + VIP_H + GAP;
const BOTTOM_Y = BC_Y + BC_H + GAP, BOTTOM_H = 200;
const TOI_W = 130, TOI_X = VB_W - PAD - TOI_W;
const KAS_X = PAD, KAS_W = TOI_X - KAS_X - GAP;
const C_KAS = '#4B5563', C_TOI = '#2563EB';
const VB_H  = BOTTOM_Y + BOTTOM_H + PAD;

const ZONE_LAYOUTS: Record<string, { x: number; y: number; w: number; h: number; perRow: number }> = {
  BootCamp: { x: BC_X,  y: BC_Y,  w: BC_W,  h: BC_H,  perRow: 2 },
  VIP:      { x: VIP_X, y: VIP_Y, w: VIP_W, h: VIP_H, perRow: 4 },
  GameZone: { x: GZ_X,  y: GZ_Y,  w: GZ_W,  h: GZ_H,  perRow: 4 },
};

function DoorIcon({ id, cx, cy, color }: { id: string; cx: number; cy: number; color: string }) {
  return (
    <G key={id} transform={`translate(${cx}, ${cy})`}>
      <Rect x="-15" y="-15" width="30" height="30" fill={BG} />
      <Path d="M-10 13 L-10 -11 C-10 -12.1 -9.1 -13 -8 -13 L8 -13 C9.1 -13 10 -12.1 10 -11 L10 13"
        fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d="M-10 13 L-10 -11 L4 -8 L4 13 Z" fill={color} fillOpacity="0.25" stroke={color} strokeWidth="1.5" />
      <Circle cx="2" cy="2" r="2.5" fill={color} />
    </G>
  );
}

export function PcMapView({ flow }: Props) {
  const { width: screenW } = useWindowDimensions();
  const { pcs, mapData, mapAreas, loadingMap, loadingPcs, selectedPc, setSelectedPc } = flow;

  const mapW  = Math.min(screenW - 32, 500);
  const mapH  = (mapW / VB_W) * VB_H;
  const sx    = mapW / VB_W;
  const sy    = mapH / VB_H;

  if (loadingMap || loadingPcs) {
    return (
      <View style={st.centered}>
        <ActivityIndicator color="#FFCC00" size="large" />
        <Text style={[st.emptyText, { marginTop: 12 }]}>Загрузка схемы...</Text>
      </View>
    );
  }

  if (mapAreas.length === 0) {
    return <View style={st.emptyWrap}><Text style={st.emptyText}>Схема недоступна</Text></View>;
  }

  // ─── Раскладка ПК ──────────────────────────────────────────────────────────
  const pcsLayout = Object.entries(ZONE_LAYOUTS).flatMap(([zoneName, zone]) => {
    const areaPcs = mapData.filter(p => p.area_name === zoneName);
    if (areaPcs.length === 0) return [];
    const GAP_PC  = 6;
    const rows: typeof areaPcs[] = [];
    for (let i = 0; i < areaPcs.length; i += zone.perRow) rows.push(areaPcs.slice(i, i + zone.perRow));
    const rowCount = rows.length;
    const startY   = zone.y + (zone.h - (rowCount * PC_H + (rowCount - 1) * GAP_PC + 30)) / 2;
    return rows.flatMap((row, rowIdx) => {
      const rowW   = row.length * PC_W + (row.length - 1) * GAP_PC;
      const startX = zone.x + (zone.w - rowW) / 2;
      return row.map((pc, colIdx) => ({
        name: pc.pc_name,
        x:    startX + colIdx * (PC_W + GAP_PC),
        y:    startY + rowIdx * (PC_H + GAP_PC),
      }));
    });
  });

  const getPcData   = (name: string) => pcs.find(p => p.pc_name === name);
  const isSel       = (name: string) => selectedPc?.pc_name === name;
  const isBusyPc    = (name: string) => getPcData(name)?.is_using ?? false;
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
          <Svg width={mapW} height={mapH} viewBox={`0 0 ${VB_W} ${VB_H}`}>
            {/* Фон */}
            <Rect x={0} y={0} width={VB_W} height={VB_H} fill={BG} rx={14} />
            <Rect x={2} y={2} width={VB_W - 4} height={VB_H - 4} fill="none" stroke="#334155" strokeWidth="1.5" rx={14} />

            {/* Зоны */}
            <Rect x={BC_X}  y={BC_Y}  width={BC_W}  height={BC_H}  fill={ZONE_COLORS.BootCamp.fill} stroke={ZONE_COLORS.BootCamp.border} strokeWidth="2.5" rx={8} />
            <SvgText x={BC_X + BC_W / 2} y={BC_Y + BC_H - 14} fill={ZONE_COLORS.BootCamp.text} fontSize="15" fontWeight="bold" textAnchor="middle" opacity="0.8">BOOTCAMP</SvgText>

            <Rect x={VIP_X} y={VIP_Y} width={VIP_W} height={VIP_H} fill={ZONE_COLORS.VIP.fill} stroke={ZONE_COLORS.VIP.border} strokeWidth="2.5" rx={8} />
            <SvgText x={VIP_X + VIP_W / 2} y={VIP_Y + VIP_H - 14} fill={ZONE_COLORS.VIP.text} fontSize="15" fontWeight="bold" textAnchor="middle" opacity="0.8">VIP</SvgText>

            <Rect x={GZ_X} y={GZ_Y} width={GZ_W} height={GZ_H} fill={ZONE_COLORS.GameZone.fill} rx={8} />
            <SvgText x={GZ_X + GZ_W / 2} y={GZ_Y + GZ_H - 14} fill={ZONE_COLORS.GameZone.text} fontSize="15" fontWeight="bold" textAnchor="middle" opacity="0.8">GAMEZONE</SvgText>

            <Rect x={KAS_X} y={BOTTOM_Y} width={KAS_W} height={BOTTOM_H} fill="rgba(55,65,81,0.3)" stroke={C_KAS} strokeWidth="2.5" rx={8} />
            <SvgText x={KAS_X + KAS_W / 2} y={BOTTOM_Y + BOTTOM_H / 2 + 8} fill={C_KAS} fontSize="20" fontWeight="bold" textAnchor="middle" opacity="0.8">КАССА</SvgText>

            <Rect x={TOI_X} y={BOTTOM_Y} width={TOI_W} height={BOTTOM_H} fill="rgba(30,58,138,0.3)" stroke={C_TOI} strokeWidth="2.5" rx={8} />
            <SvgText x={TOI_X + TOI_W / 2} y={BOTTOM_Y + BOTTOM_H / 2 + 8} fill={C_TOI} fontSize="17" fontWeight="bold" textAnchor="middle" opacity="0.8">ТУАЛЕТ</SvgText>

            {/* Двери */}
            <DoorIcon id="door-bc"  cx={BC_X + BC_W}       cy={BC_Y + Math.round(BC_H * 0.75)}   color={ZONE_COLORS.BootCamp.border} />
            <DoorIcon id="door-vip" cx={VIP_X}              cy={VIP_Y + Math.round(VIP_H * 0.48)} color={ZONE_COLORS.VIP.border} />
            <DoorIcon id="door-kas" cx={KAS_X + KAS_W / 2} cy={BOTTOM_Y}                          color={C_KAS} />
            <DoorIcon id="door-toi" cx={TOI_X + TOI_W / 2} cy={BOTTOM_Y}                          color={C_TOI} />

            {/* ПК */}
            {pcsLayout.map(({ name, x, y }) => {
              const sel    = isSel(name);
              const busy   = isBusyPc(name);
              const unavil = isUnavail(name);
              return (
                <G key={`svg-${name}`} opacity={unavil ? 0.3 : 1}>
                  <Rect x={x} y={y} width={PC_W} height={PC_H}
                    fill={sel ? '#FFCC00' : busy ? '#991B1B' : '#1A1A1A'}
                    stroke={sel ? '#FFCC00' : busy ? '#EF4444' : '#2A2A2A'}
                    strokeWidth={sel ? 2.5 : 2} rx={8} />
                  <SvgText x={x + PC_W / 2} y={sel || busy ? y + PC_H / 2 - 4 : y + PC_H / 2 + 6}
                    fill={sel ? '#000' : busy ? '#FFF' : '#CCC'}
                    fontSize="13" fontWeight="bold" textAnchor="middle">{name}</SvgText>
                  {sel && (
                    <Path d={`M${x+PC_W/2-7} ${y+PC_H/2+8} L${x+PC_W/2-2} ${y+PC_H/2+14} L${x+PC_W/2+8} ${y+PC_H/2+4}`}
                      stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  )}
                  {busy && (
                    <G>
                      <Rect x={x+PC_W/2-5} y={y+PC_H/2+8} width={10} height={8} rx={1.5} fill="none" stroke="#FFF" strokeWidth="1.5" />
                      <Path d={`M${x+PC_W/2-3} ${y+PC_H/2+8} L${x+PC_W/2-3} ${y+PC_H/2+4} C${x+PC_W/2-3} ${y+PC_H/2+1} ${x+PC_W/2+3} ${y+PC_H/2+1} ${x+PC_W/2+3} ${y+PC_H/2+4} L${x+PC_W/2+3} ${y+PC_H/2+8}`}
                        fill="none" stroke="#FFF" strokeWidth="1.5" strokeLinecap="round" />
                    </G>
                  )}
                </G>
              );
            })}
          </Svg>

          {/* Прозрачные области нажатия поверх SVG */}
          {pcsLayout.map(({ name, x, y }) => {
            const busy   = isBusyPc(name);
            const unavil = isUnavail(name);
            return (
              <TouchableOpacity
                key={`t-${name}`}
                style={{ position: 'absolute', left: x * sx, top: y * sy, width: PC_W * sx, height: PC_H * sy }}
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
  centered:  { padding: 40, alignItems: 'center' },
  emptyWrap: { alignItems: 'center', paddingTop: 40 },
  emptyText: { color: '#444', fontSize: 14, textAlign: 'center' },
});
