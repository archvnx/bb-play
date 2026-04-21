import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import { ZONE_MAP } from "../constants/config";
import {
  createBooking,
  fetchAvailablePcs,
  fetchClubsForBooking,
  fetchMapData,
  fetchPrices,
  fetchServerPackages,
} from "../services/bookingService";
import { handleApiError } from "../services/errorHandler";
import { useAuthStore } from "../store/useAuthStore";
import { useBookingStore } from "../store/useBookingStore";
import type {
  BookingResult,
  CafeBooking,
  MapArea,
  MapPC,
  PC,
  Price,
  ServerPackage,
} from "../types";
import { generateBookingKey, generateRandKey } from "../utils/bookingUtils";
import {
  buildDateOptions,
  buildDurationOptions,
  buildTimeOptions,
} from "../utils/dateUtils";
import { logger } from "../utils/logger";

export type BookingStep = "club" | "params" | "pcs";

export interface SuccessData {
  password: string;
  pcName: string;
  cost?: number;
}

export function useBookingFlow() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuthStore();
  const { addBooking } = useBookingStore();

  const dateOptions = buildDateOptions();
  const durationOptions = buildDurationOptions();

  // ─── Шаги ─────────────────────────────────────────────────────────────────
  const [step, setStep] = useState<BookingStep>("club");

  // ─── Клубы ────────────────────────────────────────────────────────────────
  const [clubs, setClubs] = useState<CafeBooking[]>([]);
  const [loadingClubs, setLoadingClubs] = useState(true);
  const [selectedClub, setSelectedClub] = useState<CafeBooking | null>(null);

  // ─── Дата / время / длительность ──────────────────────────────────────────
  const [date, setDate] = useState(dateOptions[0].value);
  const [time, setTime] = useState("00:00");
  const [mins, setMins] = useState<number>(60);

  // ─── Пикеры ───────────────────────────────────────────────────────────────
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);

  // ─── ПК ───────────────────────────────────────────────────────────────────
  const [pcs, setPcs] = useState<PC[]>([]);
  const [loadingPcs, setLoadingPcs] = useState(false);
  const [selectedPc, setSelectedPc] = useState<PC | null>(null);
  const [prices, setPrices] = useState<Price[]>([]);

  // ─── Карта ────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"list" | "map">("list");
  const [mapData, setMapData] = useState<MapPC[]>([]);
  const [mapAreas, setMapAreas] = useState<MapArea[]>([]);
  const [loadingMap, setLoadingMap] = useState(false);

  // ─── Бронирование ─────────────────────────────────────────────────────────
  const [booking, setBooking] = useState(false);
  const [successData, setSuccessData] = useState<SuccessData | null>(null);

  // ─── Пакеты ───────────────────────────────────────────────────────────────
  const [serverPackages, setServerPackages] = useState<ServerPackage[]>([]);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);

  // ─── Отложенные параметры из роута ────────────────────────────────────────
  const [pendingCafeId, setPendingCafeId] = useState<string | null>(null);
  const [pendingResetStep, setPendingResetStep] = useState<string>("club");
  const [pendingPcName, setPendingPcName] = useState<string | null>(null);
  /**
   * product_id пакета, пришедший из роута (напр. с HomeScreen).
   * Хранится до тех пор, пока не загрузятся serverPackages —
   * тогда резолвится в selectedDuration.
   */
  const [pendingProductId, setPendingProductId] = useState<string | null>(null);

  // Инициализация времени и мин из роута
  useEffect(() => {
    const timeOptions = buildTimeOptions(dateOptions[0].value);
    setTime(timeOptions.length > 0 ? timeOptions[0].value : "00:00");
    if (route.params?.mins) setMins(route.params.mins);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Сброс времени при смене даты
  useEffect(() => {
    const validTimes = buildTimeOptions(date);
    if (validTimes.length > 0 && !validTimes.find((t) => t.value === time)) {
      setTime(validTimes[0].value);
    }
  }, [date]);

  const lastTimestamp = useRef<number | undefined>(undefined);

  const resetFlow = useCallback(() => {
    setStep("club");
    setSelectedClub(null);
    setSelectedPc(null);
    setPcs([]);
    setSuccessData(null);
  }, []);

  // Реакция на навигационные параметры при фокусе экрана
  useFocusEffect(
    useCallback(() => {
      const t = route.params?._t;
      if (t === undefined || t === lastTimestamp.current) return;
      lastTimestamp.current = t;
      resetFlow();

      const passedCafeId = route.params?.cafeId;
      const passedDate = route.params?.date;
      const passedTime = route.params?.time;
      const passedMins = route.params?.mins;
      const passedPcName = route.params?.pcName;
      const passedProductId = route.params?.productId ?? null;
      const resetStep = route.params?._resetStep ?? "club";

      if (passedDate) setDate(passedDate);
      if (passedTime) setTime(passedTime);
      if (passedMins) setMins(passedMins);
      // Сохраняем product_id — он будет разрешён в selectedDuration
      // как только загрузятся serverPackages (см. useEffect ниже)
      setPendingProductId(passedProductId);

      if (passedCafeId && clubs.length > 0) {
        const found = clubs.find(
          (c) => String(c.icafe_id) === String(passedCafeId),
        );
        if (found) {
          setSelectedClub(found);
          setStep(resetStep === "pcs" ? "pcs" : "params");
          if (resetStep === "pcs") setPendingPcName(passedPcName ?? null);
        }
      } else if (passedCafeId) {
        setPendingCafeId(passedCafeId);
        setPendingResetStep(resetStep);
        setPendingPcName(passedPcName ?? null);
      }
    }, [route.params?._t, clubs, resetFlow]),
  );

  // Загрузка клубов при монтировании
  useEffect(() => {
    fetchClubsForBooking()
      .then((data) => {
        setClubs(data);
        const cafeId = route.params?.cafeId ?? pendingCafeId;
        if (cafeId && data.length > 0) {
          const found = data.find((c) => String(c.icafe_id) === String(cafeId));
          if (found) {
            setSelectedClub(found);
            const rs =
              pendingResetStep || (route.params?._resetStep ?? "params");
            setStep(rs === "pcs" ? "pcs" : "params");
          }
          setPendingCafeId(null);
        }
      })
      .catch((e) => logger.error("useBookingFlow", "fetchClubs failed", e))
      .finally(() => setLoadingClubs(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Загрузка цен и пакетов при выборе клуба
  useEffect(() => {
    if (!selectedClub || !user?.member_id) return;
    fetchPrices(selectedClub.icafe_id, user.member_id)
      .then(setPrices)
      .catch((e) => logger.error("useBookingFlow", "fetchPrices failed", e));
    fetchServerPackages(selectedClub.icafe_id)
      .then(setServerPackages)
      .catch((e) =>
        logger.error("useBookingFlow", "fetchServerPackages failed", e),
      );
  }, [selectedClub, user]);

  const loadMapStructure = useCallback(async () => {
    if (!selectedClub) return;
    setLoadingMap(true);
    try {
      const { areas, pcs: mapPcs } = await fetchMapData(selectedClub.icafe_id);
      setMapAreas(areas);
      setMapData(mapPcs);
    } catch (e) {
      logger.error("useBookingFlow", "fetchMapData failed", e);
      setMapData([]);
      setMapAreas([]);
    } finally {
      setLoadingMap(false);
    }
  }, [selectedClub]);

  const loadPcs = useCallback(async () => {
    if (!selectedClub) return;
    setLoadingPcs(true);
    setPcs([]);
    setSelectedPc(null);
    try {
      const selectedPkg = selectedDuration
        ? serverPackages.find((p) => p.value === selectedDuration)
        : undefined;
      const result = await fetchAvailablePcs(
        selectedClub.icafe_id,
        date,
        time,
        mins,
        selectedPkg?.label,
      );
      setPcs(result);
    } catch (e: any) {
      handleApiError(
        e?.response?.data?.code ?? 1,
        "Не удалось загрузить список ПК",
      );
    } finally {
      setLoadingPcs(false);
    }
  }, [selectedClub, date, time, mins, selectedDuration, serverPackages]);

  // Загрузка ПК и схемы при переходе на шаг 3
  useEffect(() => {
    if (step === "pcs") {
      loadPcs();
      loadMapStructure();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, loadPcs, loadMapStructure]);

  // Автовыбор ПК по имени после загрузки
  useEffect(() => {
    if (!pendingPcName || pcs.length === 0) return;
    const found = pcs.find(
      (pc) =>
        pc.pc_name.toLowerCase() === pendingPcName.toLowerCase() &&
        !pc.is_using,
    );
    if (found) setSelectedPc(found);
    setPendingPcName(null);
  }, [pcs, pendingPcName]);

  // Резолвим pendingProductId → selectedDuration как только пакеты загрузились.
  // После этого, если мы уже на шаге 'pcs', перезагружаем список ПК с правильным
  // priceName — это устраняет race condition при переходе с HomeScreen.
  useEffect(() => {
    if (!pendingProductId || serverPackages.length === 0) return;
    const pkg = serverPackages.find((p) => p.id === pendingProductId);
    if (pkg) {
      setSelectedDuration(pkg.value);
      // Если уже на шаге ПК — перезагрузить с правильным priceName
      if (step === "pcs") loadPcs();
    }
    setPendingProductId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverPackages, pendingProductId, step, loadPcs]);

  // ─── Вычисляемые значения ──────────────────────────────────────────────────
  /** Нормализует название зоны: сначала ищет в ZONE_MAP, иначе приводит к верхнему регистру */
  const normalizeZone = (z: string) => ZONE_MAP[z] ?? z.toUpperCase();

  const pcGroups = pcs.reduce<Record<string, PC[]>>((acc, pc) => {
    const zone = pc.pc_area_name || pc.pc_group_name || "Основной зал";
    (acc[zone] ??= []).push(pc);
    return acc;
  }, {});

  const estimatedPrice = (() => {
    if (selectedPc && selectedDuration) {
      const zone = normalizeZone(selectedPc.pc_area_name);
      const pkg = serverPackages.find(
        (p) => p.value === selectedDuration && normalizeZone(p.zone) === zone,
      );
      if (pkg) return pkg.price;
    }
    const matched = prices.find(
      (p) =>
        p.duration === mins &&
        (selectedPc ? p.price_name === selectedPc.price_name : true),
    );
    const rawPrice =
      matched?.total_price ??
      prices.find((p) => p.duration === mins)?.total_price;
    return rawPrice !== undefined ? parseFloat(String(rawPrice)) : undefined;
  })();

  // ─── Создание брони ───────────────────────────────────────────────────────
  const handleBook = async () => {
    if (!selectedPc || !selectedClub || !user) return;
    setBooking(true);
    try {
      const randKey = generateRandKey();
      const key = generateBookingKey(
        String(selectedClub.icafe_id),
        selectedPc.pc_name,
        user.member_account,
        user.member_id,
        date,
        time,
        mins,
        randKey,
      );
      // Ищем выбранный пакет с учётом нормализации зоны
      const zone = normalizeZone(selectedPc.pc_area_name);
      const selectedPkg = selectedDuration
        ? serverPackages.find(
            (p) =>
              p.value === selectedDuration && normalizeZone(p.zone) === zone,
          )
        : undefined;

      const bookingPayload = {
        icafe_id: String(selectedClub.icafe_id),
        pc_name: selectedPc.pc_name,
        member_account: user.member_account,
        member_id: user.member_id,
        start_date: date,
        start_time: time,
        mins,
        rand_key: randKey,
        key,
        // Бэкенд определяет пакетную ветку именно по priceName,
        // product_id оставляем как доп. поле на случай будущей поддержки
        priceName: selectedPkg?.label,
        product_id: selectedPkg?.id,
      };
      const result: BookingResult = await createBooking(bookingPayload);

      const pwd =
        result?.iCafe_response?.data?.booking_password ||
        result?.booking_password ||
        result?.data?.booking_password;
      if (!pwd) {
        throw new Error(
          result?.message ||
            result?.iCafe_response?.message ||
            "У вас уже есть активная бронь или выбранное время занято.",
        );
      }
      const cost =
        result?.booking_cost ||
        result?.iCafe_response?.data?.cost ||
        estimatedPrice;
      addBooking({
        cafeId: String(selectedClub.icafe_id),
        cafeAddress: selectedClub.address,
        pcName: selectedPc.pc_name,
        startDate: date,
        startTime: time,
        mins,
        password: String(pwd),
        timestamp: Date.now(),
        account: user.member_account,
      });
      setSuccessData({
        password: String(pwd),
        pcName: selectedPc.pc_name,
        cost,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      const code = (e as any)?.response?.data?.code;
      if (
        code === 600 ||
        msg.includes("600") ||
        msg.toLowerCase().includes("occupied")
      ) {
        handleApiError(600);
      } else {
        handleApiError(code ?? 1, msg || "Ошибка бронирования");
      }
    } finally {
      setBooking(false);
    }
  };

  return {
    // Навигация
    navigation,
    // Шаги
    step,
    setStep,
    // Клубы
    clubs,
    loadingClubs,
    selectedClub,
    setSelectedClub,
    // Дата / время
    date,
    setDate,
    time,
    setTime,
    mins,
    setMins,
    dateOptions,
    timeOptions: buildTimeOptions(date),
    durationOptions,
    // Пикеры
    showDatePicker,
    setShowDatePicker,
    showTimePicker,
    setShowTimePicker,
    showDurationPicker,
    setShowDurationPicker,
    // ПК
    pcs,
    loadingPcs,
    selectedPc,
    setSelectedPc,
    prices,
    // Карта
    activeTab,
    setActiveTab,
    mapData,
    mapAreas,
    loadingMap,
    // Бронирование
    booking,
    successData,
    setSuccessData,
    // Пакеты
    serverPackages,
    selectedDuration,
    setSelectedDuration,
    // Вычисляемые
    pcGroups,
    estimatedPrice,
    // Действия
    handleBook,
    loadPcs,
    // Пользователь
    user,
  };
}