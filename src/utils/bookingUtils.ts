import { HOME_ZONE_STYLES } from '../constants/config';
import { ActiveBooking, RoomFromApi } from '../types';
import { LocalBooking } from '../store/useBookingStore';

// ─── Парсинг названий продуктов ───────────────────────────────────────────────
/** «Пакет 2 часа<<<GZ» → «Пакет 2 часа» */
export const parseName = (raw: string): string => raw?.split('<<<')[0]?.trim() ?? raw;

/** «Пакет 2 часа<<<GZ» → «GZ» */
export const parseZone = (raw: string): string => {
  const parts = raw?.split('<<<');
  return parts?.length > 1 ? parts[parts.length - 1]?.trim() ?? '' : '';
};

/** «2 часа» → 120, «30 мин» → 30 */
export const parseDurationFromName = (name: string): number => {
  const h = name.match(/(\d+)\s*(час|часа|часов)/i);
  if (h) return parseInt(h[1], 10) * 60;
  const m = name.match(/(\d+)\s*мин/i);
  if (m) return parseInt(m[1], 10);
  return 0;
};

// ─── Зоны ─────────────────────────────────────────────────────────────────────
export function getZoneAccent(zoneName: string): string {
  const z = zoneName?.toUpperCase();
  if (z?.includes('BC') || z?.includes('BOOT')) return HOME_ZONE_STYLES.BC.accent;
  if (z?.includes('VIP') || z?.includes('VP'))  return HOME_ZONE_STYLES.VP.accent;
  if (z?.includes('GZ') || z?.includes('GAME')) return HOME_ZONE_STYLES.GZ.accent;
  return HOME_ZONE_STYLES.default.accent;
}

/** Определяет название зоны для активной брони по имени ПК или описанию */
export function getZoneFromBooking(
  pcName: string,
  description: string,
  rooms: RoomFromApi[],
): string | null {
  for (const room of rooms) {
    const found = (room.pcs_list ?? []).find(
      pc => pc.pc_name.toLowerCase() === pcName.toLowerCase(),
    );
    if (found && room.area_name) return room.area_name;
  }
  const desc = description?.split('@')[0]?.trim();
  if (
    desc &&
    !desc.toLowerCase().startsWith('почасовая') &&
    !desc.toLowerCase().startsWith('повременн')
  ) {
    return desc;
  }
  return null;
}

/** Ищет пароль от ПК в локальных бронях по совпадению ПК + дата + время */
export function findPassword(
  serverBooking: ActiveBooking,
  localBookings: LocalBooking[],
): string | null {
  const serverPc   = serverBooking.product_pc_name.toLowerCase();
  const serverDate = serverBooking.product_available_date_local_from.slice(0, 10);
  const serverTime = serverBooking.product_available_date_local_from.slice(11, 16);
  const match = localBookings.find(
    b =>
      b.pcName.toLowerCase() === serverPc &&
      b.startDate === serverDate &&
      b.startTime === serverTime,
  );
  return match?.password ?? null;
}

// ─── Адрес ────────────────────────────────────────────────────────────────────
/** «Тамбов, ул. Медвежья, 1» → «ул. Медвежья» */
export function extractStreet(address: string): string {
  const parts = address.split(',');
  return parts.length >= 2 ? parts[1].trim() : address;
}

// ─── MD5 + ключ бронирования ──────────────────────────────────────────────────
function md5(str: string): string {
  /* eslint-disable */
  function safeAdd(x: number, y: number) { const lsw=(x&0xffff)+(y&0xffff);const msw=(x>>16)+(y>>16)+(lsw>>16);return(msw<<16)|(lsw&0xffff); }
  function bitRotateLeft(num: number,cnt: number){return(num<<cnt)|(num>>>(32-cnt));}
  function md5cmn(q:number,a:number,b:number,x:number,s:number,t:number){return safeAdd(bitRotateLeft(safeAdd(safeAdd(a,q),safeAdd(x,t)),s),b);}
  function md5ff(a:number,b:number,c:number,d:number,x:number,s:number,t:number){return md5cmn((b&c)|(~b&d),a,b,x,s,t);}
  function md5gg(a:number,b:number,c:number,d:number,x:number,s:number,t:number){return md5cmn((b&d)|(c&~d),a,b,x,s,t);}
  function md5hh(a:number,b:number,c:number,d:number,x:number,s:number,t:number){return md5cmn(b^c^d,a,b,x,s,t);}
  function md5ii(a:number,b:number,c:number,d:number,x:number,s:number,t:number){return md5cmn(c^(b|~d),a,b,x,s,t);}
  function utf8Encode(s:string){return unescape(encodeURIComponent(s));}
  function str2binl(str:string){const bin:number[]=[];const mask=(1<<8)-1;for(let i=0;i<str.length*8;i+=8){bin[i>>5]|=(str.charCodeAt(i/8)&mask)<<(i%32);}return bin;}
  function binl2hex(b:number[]){const hex='0123456789abcdef';let s='';for(let i=0;i<b.length*4;i++){s+=hex.charAt((b[i>>2]>>((i%4)*8+4))&0xf)+hex.charAt((b[i>>2]>>((i%4)*8))&0xf);}return s;}
  function coreMd5(x:number[],len:number){
    x[len>>5]|=0x80<<(len%32);x[(((len+64)>>>9)<<4)+14]=len;
    let a=1732584193,b=-271733879,c=-1732584194,d=271733878;
    for(let i=0;i<x.length;i+=16){
      const oa=a,ob=b,oc=c,od=d;
      a=md5ff(a,b,c,d,x[i],7,-680876936);d=md5ff(d,a,b,c,x[i+1],12,-389564586);c=md5ff(c,d,a,b,x[i+2],17,606105819);b=md5ff(b,c,d,a,x[i+3],22,-1044525330);
      a=md5ff(a,b,c,d,x[i+4],7,-176418897);d=md5ff(d,a,b,c,x[i+5],12,1200080426);c=md5ff(c,d,a,b,x[i+6],17,-1473231341);b=md5ff(b,c,d,a,x[i+7],22,-45705983);
      a=md5ff(a,b,c,d,x[i+8],7,1770035416);d=md5ff(d,a,b,c,x[i+9],12,-1958414417);c=md5ff(c,d,a,b,x[i+10],17,-42063);b=md5ff(b,c,d,a,x[i+11],22,-1990404162);
      a=md5ff(a,b,c,d,x[i+12],7,1804603682);d=md5ff(d,a,b,c,x[i+13],12,-40341101);c=md5ff(c,d,a,b,x[i+14],17,-1502002290);b=md5ff(b,c,d,a,x[i+15],22,1236535329);
      a=md5gg(a,b,c,d,x[i+1],5,-165796510);d=md5gg(d,a,b,c,x[i+6],9,-1069501632);c=md5gg(c,d,a,b,x[i+11],14,643717713);b=md5gg(b,c,d,a,x[i],20,-373897302);
      a=md5gg(a,b,c,d,x[i+5],5,-701558691);d=md5gg(d,a,b,c,x[i+10],9,38016083);c=md5gg(c,d,a,b,x[i+15],14,-660478335);b=md5gg(b,c,d,a,x[i+4],20,-405537848);
      a=md5gg(a,b,c,d,x[i+9],5,568446438);d=md5gg(d,a,b,c,x[i+14],9,-1019803690);c=md5gg(c,d,a,b,x[i+3],14,-187363961);b=md5gg(b,c,d,a,x[i+8],20,1163531501);
      a=md5gg(a,b,c,d,x[i+13],5,-1444681467);d=md5gg(d,a,b,c,x[i+2],9,-51403784);c=md5gg(c,d,a,b,x[i+7],14,1735328473);b=md5gg(b,c,d,a,x[i+12],20,-1926607734);
      a=md5hh(a,b,c,d,x[i+5],4,-378558);d=md5hh(d,a,b,c,x[i+8],11,-2022574463);c=md5hh(c,d,a,b,x[i+11],16,1839030562);b=md5hh(b,c,d,a,x[i+14],23,-35309556);
      a=md5hh(a,b,c,d,x[i+1],4,-1530992060);d=md5hh(d,a,b,c,x[i+4],11,1272893353);c=md5hh(c,d,a,b,x[i+7],16,-155497632);b=md5hh(b,c,d,a,x[i+10],23,-1094730640);
      a=md5hh(a,b,c,d,x[i+13],4,681279174);d=md5hh(d,a,b,c,x[i],11,-358537222);c=md5hh(c,d,a,b,x[i+3],16,-722521979);b=md5hh(b,c,d,a,x[i+6],23,76029189);
      a=md5hh(a,b,c,d,x[i+9],4,-640364487);d=md5hh(d,a,b,c,x[i+12],11,-421815835);c=md5hh(c,d,a,b,x[i+15],16,530742520);b=md5hh(b,c,d,a,x[i+2],23,-995338651);
      a=md5ii(a,b,c,d,x[i],6,-198630844);d=md5ii(d,a,b,c,x[i+7],10,1126891415);c=md5ii(c,d,a,b,x[i+14],15,-1416354905);b=md5ii(b,c,d,a,x[i+5],21,-57434055);
      a=md5ii(a,b,c,d,x[i+12],6,1700485571);d=md5ii(d,a,b,c,x[i+3],10,-1894986606);c=md5ii(c,d,a,b,x[i+10],15,-1051523);b=md5ii(b,c,d,a,x[i+1],21,-2054922799);
      a=md5ii(a,b,c,d,x[i+8],6,1873313359);d=md5ii(d,a,b,c,x[i+15],10,-30611744);c=md5ii(c,d,a,b,x[i+6],15,-1560198380);b=md5ii(b,c,d,a,x[i+13],21,1309151649);
      a=md5ii(a,b,c,d,x[i+4],6,-145523070);d=md5ii(d,a,b,c,x[i+11],10,-1120210379);c=md5ii(c,d,a,b,x[i+2],15,718787259);b=md5ii(b,c,d,a,x[i+9],21,-343485551);
      a=safeAdd(a,oa);b=safeAdd(b,ob);c=safeAdd(c,oc);d=safeAdd(d,od);
    }
    return[a,b,c,d];
  }
  /* eslint-enable */
  const encoded = utf8Encode(str);
  return binl2hex(coreMd5(str2binl(encoded), encoded.length * 8));
}

export function generateRandKey(): string {
  return String(Math.floor(Math.random() * 89999999999) + 10000000000);
}

export function generateBookingKey(
  icafeId: string,
  pcName: string,
  login: string,
  memberId: string,
  startDate: string,
  startTime: string,
  mins: number,
  randKey: string,
): string {
  return md5(`${icafeId}${pcName}${login}${memberId}${startDate}${startTime}${mins}${randKey}`);
}
