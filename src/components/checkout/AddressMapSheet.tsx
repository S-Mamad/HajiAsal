"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { Crosshair, MagnifyingGlass, MapPin } from "@phosphor-icons/react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { LocationChipPicker } from "@/components/checkout/LocationChipPicker";
import { formatAddressLine } from "@/lib/address-meta";
import {
  formatPhoneInput,
  isValidIranMobile,
  normalizePhoneInput,
} from "@/lib/auth/phone-mask";
import { isGeoServiceUnavailable } from "@/lib/geo/tiles";
import { cn } from "@/lib/utils";
import iranLocations from "@/data/iran-locations.json";

type SearchItem = {
  title: string;
  address: string;
  lat: number | null;
  lng: number | null;
};

type LocationEntry = { province: string; cities: string[] };

const LocationPickerMap = dynamic(
  () =>
    import("@/components/checkout/LocationPickerMap").then(
      (m) => m.LocationPickerMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-surface-muted text-sm text-secondary">
        در حال بارگذاری نقشه...
      </div>
    ),
  },
);

export type NewAddressPayload = {
  province: string;
  city: string;
  address: string;
  postalCode: string;
  label: string | null;
  lat: number | null;
  lng: number | null;
  plaque: string;
  unit: string;
  receiverName: string;
  receiverPhone: string;
  isDefault: boolean;
};

interface AddressMapSheetProps {
  open: boolean;
  onClose: () => void;
  onSaved: (payload: NewAddressPayload) => Promise<void> | void;
  defaultReceiverName?: string;
  defaultReceiverPhone?: string;
}

const YAZD = { lat: 31.8974, lng: 54.3569 };

const fieldClass =
  "w-full rounded-xl border border-border bg-white px-3.5 text-[13.5px] text-primary outline-none placeholder:text-dim transition focus:border-gold/50 focus:ring-2 focus:ring-gold/20";

function FieldSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-[13px] font-semibold text-primary">{title}</h3>
      {children}
    </section>
  );
}

function CompactField({
  label,
  error,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
}) {
  return (
    <label className="block min-w-0">
      {label ? (
        <span className="mb-1.5 block text-[13px] font-medium text-secondary">
          {label}
        </span>
      ) : null}
      <input className={cn("h-11", fieldClass, className)} {...props} />
      {error ? (
        <span className="mt-1 block text-[12px] text-red-500">{error}</span>
      ) : null}
    </label>
  );
}

function CompactArea({
  label,
  error,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
}) {
  return (
    <label className="block min-w-0">
      {label ? (
        <span className="mb-1.5 block text-[13px] font-medium text-secondary">
          {label}
        </span>
      ) : null}
      <textarea
        rows={3}
        className={cn(
          "min-h-[88px] resize-none py-2.5 leading-relaxed",
          fieldClass,
          className,
        )}
        {...props}
      />
      {error ? (
        <span className="mt-1 block text-[12px] text-red-500">{error}</span>
      ) : null}
    </label>
  );
}

export function AddressMapSheet({
  open,
  onClose,
  onSaved,
  defaultReceiverName = "",
  defaultReceiverPhone = "",
}: AddressMapSheetProps) {
  const [phase, setPhase] = useState<"map" | "form" | "manual">("map");
  const [lat, setLat] = useState(YAZD.lat);
  const [lng, setLng] = useState(YAZD.lng);
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [streetHint, setStreetHint] = useState("");
  const [manualStreet, setManualStreet] = useState("");
  const [capsuleText, setCapsuleText] = useState("موقعیت را روی نقشه تنظیم کنید");
  const [postalCode, setPostalCode] = useState("");
  const [plaque, setPlaque] = useState("");
  const [unit, setUnit] = useState("");
  const [receiverName, setReceiverName] = useState(defaultReceiverName);
  const [receiverPhone, setReceiverPhone] = useState(defaultReceiverPhone);
  const [busy, setBusy] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [error, setError] = useState("");
  const [geoUnavailable, setGeoUnavailable] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [searchItems, setSearchItems] = useState<SearchItem[]>([]);
  const [searchBusy, setSearchBusy] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coordsRef = useRef({ lat, lng });
  coordsRef.current = { lat, lng };

  const cities =
    (iranLocations as LocationEntry[]).find((l) => l.province === province)
      ?.cities ?? [];

  useEffect(() => {
    if (!open) return;
    setPhase("map");
    setError("");
    setFieldErrors({});
    setSearchTerm("");
    setSearchItems([]);
    setPlaque("");
    setUnit("");
    setManualStreet("");
    setCapsuleText("موقعیت را روی نقشه تنظیم کنید");
    setProvince("");
    setCity("");
    setStreetHint("");
    setGeoUnavailable(false);
    setReceiverName(defaultReceiverName);
    setReceiverPhone(defaultReceiverPhone);
    const draft = (() => {
      try {
        return localStorage.getItem("hajiasal-address-draft");
      } catch {
        return null;
      }
    })();
    if (draft) {
      try {
        const d = JSON.parse(draft) as {
          plaque?: string;
          unit?: string;
          receiverName?: string;
          receiverPhone?: string;
        };
        if (d.plaque) setPlaque(d.plaque);
        if (d.unit) setUnit(d.unit);
        if (d.receiverName) setReceiverName(d.receiverName);
        if (d.receiverPhone) setReceiverPhone(d.receiverPhone);
      } catch {
        /* ignore */
      }
    }
  }, [open, defaultReceiverName, defaultReceiverPhone]);

  useEffect(() => {
    if (!open || (phase !== "form" && phase !== "manual")) return;
    try {
      localStorage.setItem(
        "hajiasal-address-draft",
        JSON.stringify({ plaque, unit, receiverName, receiverPhone }),
      );
    } catch {
      /* private mode / quota */
    }
  }, [plaque, unit, receiverName, receiverPhone, open, phase]);

  useEffect(() => {
    if (!open || phase !== "map") return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const term = searchTerm.trim();
    if (term.length < 2) {
      setSearchItems([]);
      return;
    }
    searchTimer.current = setTimeout(() => {
      void (async () => {
        setSearchBusy(true);
        try {
          const res = await fetch(
            `/api/geo/search?term=${encodeURIComponent(term)}&lat=${coordsRef.current.lat}&lng=${coordsRef.current.lng}`,
            { credentials: "include" },
          );
          const data = (await res.json().catch(() => ({}))) as {
            success?: boolean;
            error?: string;
            items?: SearchItem[];
          };
          if (!res.ok || !data.success) {
            if (isGeoServiceUnavailable(res.status, String(data.error ?? ""))) {
              setGeoUnavailable(true);
            }
            setSearchItems([]);
            return;
          }
          setSearchItems(data.items ?? []);
        } catch {
          setSearchItems([]);
        } finally {
          setSearchBusy(false);
        }
      })();
    }, 400);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [searchTerm, open, phase]);

  const reverse = useCallback(async (nextLat: number, nextLng: number) => {
    setGeocoding(true);
    setError("");
    const started = Date.now();
    try {
      const res = await fetch(
        `/api/geo/reverse?lat=${nextLat}&lng=${nextLng}`,
        { credentials: "include" },
      );
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
        province?: string;
        city?: string;
        formattedAddress?: string;
        neighbourhood?: string;
        postalCode?: string;
      };
      if (!res.ok || !data.success) {
        const msg = String(data.error ?? "تشخیص آدرس ناموفق بود");
        setError(msg);
        setCapsuleText("آدرس تشخیص داده نشد");
        if (isGeoServiceUnavailable(res.status, msg)) {
          setGeoUnavailable(true);
        }
        return false;
      }
      setGeoUnavailable(false);
      const nextProvince = String(data.province || "");
      const nextCity = String(data.city || "");
      const nextStreet = String(data.formattedAddress || data.neighbourhood || "");
      setProvince(nextProvince);
      setCity(nextCity);
      setStreetHint(nextStreet);
      if (data.postalCode) {
        setPostalCode(String(data.postalCode).replace(/\D/g, "").slice(0, 10));
      }
      if (!nextProvince.trim() || !nextCity.trim()) {
        setError("آدرس کامل تشخیص داده نشد؛ ورود دستی را امتحان کنید");
        setCapsuleText("آدرس ناقص از نقشه");
        return false;
      }
      const capsule = [nextCity || nextProvince, nextStreet]
        .filter(Boolean)
        .join("، ");
      setCapsuleText(capsule || "موقعیت انتخاب شد");
      return true;
    } catch {
      setError("ارتباط با نقشه برقرار نشد");
      setCapsuleText("خطا در اتصال به نشان");
      setGeoUnavailable(true);
      return false;
    } finally {
      const elapsed = Date.now() - started;
      const wait = Math.max(0, 1000 - elapsed);
      window.setTimeout(() => setGeocoding(false), wait);
    }
  }, []);

  // Probe reverse geocode for the capsule. Keep the map visible even if Neshan
  // is down; tiles are independent and manual entry stays a footer action.
  useEffect(() => {
    if (!open || phase !== "map") return;
    let cancelled = false;
    void (async () => {
      await reverse(coordsRef.current.lat, coordsRef.current.lng);
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [open, phase, reverse]);

  const handleMapSettle = useCallback(
    (nextLat: number, nextLng: number) => {
      setLat(nextLat);
      setLng(nextLng);
      if (geoTimer.current) clearTimeout(geoTimer.current);
      geoTimer.current = setTimeout(() => {
        void reverse(nextLat, nextLng);
      }, 120);
    },
    [reverse],
  );

  const confirmLocation = async () => {
    setBusy(true);
    try {
      const ok = await reverse(lat, lng);
      if (ok) setPhase("form");
      else setPhase("manual");
    } finally {
      setBusy(false);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError("موقعیت‌یاب در این دستگاه در دسترس نیست");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nextLat = pos.coords.latitude;
        const nextLng = pos.coords.longitude;
        setLat(nextLat);
        setLng(nextLng);
        setBusy(false);
        void reverse(nextLat, nextLng);
      },
      () => {
        setError("دسترسی به موقعیت رد شد");
        setBusy(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const submit = async () => {
    const errs: Record<string, string> = {};
    const street =
      phase === "manual"
        ? manualStreet.trim()
        : streetHint || `${province} ${city}`;

    if (phase === "manual") {
      if (!province.trim()) errs.province = "استان را انتخاب کنید";
      if (!city.trim()) errs.city = "شهر را انتخاب کنید";
      if (street.length < 8) errs.street = "آدرس خیابان را کامل‌تر وارد کنید";
    } else if (!province.trim() || !city.trim()) {
      errs.geo = "موقعیت روی نقشه را دوباره تأیید کنید";
    }
    if (!plaque.trim()) errs.plaque = "پلاک را وارد کنید";
    if (!receiverName.trim() || receiverName.trim().length < 2) {
      errs.receiverName = "نام گیرنده را وارد کنید";
    }
    if (!isValidIranMobile(receiverPhone)) {
      errs.receiverPhone = "شماره موبایل معتبر نیست";
    }
    if (postalCode.length !== 10 || postalCode === "0000000000") {
      errs.postalCode = "کد پستی ۱۰ رقمی معتبر وارد کنید";
    }
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setBusy(true);
    try {
      await onSaved({
        province,
        city,
        address: formatAddressLine({
          street,
          plaque,
          unit,
        }),
        postalCode,
        label: null,
        lat: phase === "manual" ? null : lat,
        lng: phase === "manual" ? null : lng,
        plaque,
        unit,
        receiverName: receiverName.trim(),
        receiverPhone: normalizePhoneInput(receiverPhone),
        isDefault: true,
      });
      localStorage.removeItem("hajiasal-address-draft");
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message.trim() : "";
      setError(
        msg && /[\u0600-\u06FF]/.test(msg) ? msg : "ذخیره آدرس ناموفق بود",
      );
    } finally {
      setBusy(false);
    }
  };

  const detailFields = (
    <div className="space-y-5 py-1">
      {phase === "form" ? (
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface-muted/70 p-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-dim text-gold">
            <Icon icon={MapPin} size={18} weight="fill" />
          </div>
          <div className="min-w-0 pt-0.5">
            <p className="text-[13.5px] font-semibold text-primary">
              {city}
              {province ? `، ${province}` : ""}
            </p>
            {streetHint ? (
              <p className="mt-1 text-[12.5px] leading-relaxed text-secondary">
                {streetHint}
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <FieldSection title="محل ارسال">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <LocationChipPicker
              label="استان"
              placeholder="انتخاب استان"
              options={(iranLocations as LocationEntry[]).map((l) => l.province)}
              value={province}
              onChange={(next) => {
                setProvince(next);
                setCity("");
              }}
              searchPlaceholder="جستجوی استان"
              error={fieldErrors.province}
            />
            <LocationChipPicker
              label="شهر"
              placeholder="انتخاب شهر"
              options={cities}
              value={city}
              onChange={setCity}
              disabled={!province}
              searchPlaceholder="جستجوی شهر"
              emptyHint={province ? "شهری پیدا نشد" : "اول استان را انتخاب کنید"}
              error={fieldErrors.city}
            />
          </div>
          <CompactArea
            label="خیابان و جزئیات آدرس"
            value={manualStreet}
            onChange={(e) => setManualStreet(e.target.value)}
            placeholder="خیابان، کوچه، پلاک اگر مشخص است"
            error={fieldErrors.street}
          />
        </FieldSection>
      )}
      {fieldErrors.geo ? (
        <p className="text-[12px] text-red-500">{fieldErrors.geo}</p>
      ) : null}
      <FieldSection title="پلاک و واحد">
        <div className="grid grid-cols-2 gap-3">
          <CompactField
            label="پلاک"
            value={plaque}
            onChange={(e) => setPlaque(e.target.value)}
            error={fieldErrors.plaque}
          />
          <CompactField
            label="واحد"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
          />
        </div>
      </FieldSection>
      <FieldSection title="گیرنده">
        <CompactField
          label="نام گیرنده"
          value={receiverName}
          onChange={(e) => setReceiverName(e.target.value)}
          error={fieldErrors.receiverName}
        />
        <CompactField
          label="موبایل گیرنده"
          dir="ltr"
          inputMode="numeric"
          value={receiverPhone}
          onChange={(e) => setReceiverPhone(formatPhoneInput(e.target.value))}
          error={fieldErrors.receiverPhone}
        />
        <CompactField
          label="کد پستی"
          dir="ltr"
          inputMode="numeric"
          value={postalCode}
          onChange={(e) =>
            setPostalCode(e.target.value.replace(/\D/g, "").slice(0, 10))
          }
          error={fieldErrors.postalCode}
          className="tabular-nums tracking-wide"
          placeholder="۱۰ رقم"
        />
      </FieldSection>
      <button
        type="button"
        className="text-[13px] font-medium text-gold transition hover:text-gold-bright"
        onClick={() => setPhase("map")}
      >
        {phase === "form" ? "تغییر موقعیت روی نقشه" : "بازگشت به نقشه"}
      </button>
      {error ? <p className="text-[13px] text-red-500">{error}</p> : null}
    </div>
  );

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={
        phase === "map"
          ? "انتخاب موقعیت روی نقشه"
          : phase === "manual"
            ? "ورود دستی آدرس"
            : "پلاک و واحد"
      }
      flush={phase === "map"}
      aboveDock={false}
      bodyClassName={phase !== "map" ? "px-4 pb-5 pt-1" : undefined}
      className={cn(
        phase === "map" && "max-h-[100dvh] rounded-none sm:max-h-[96dvh] sm:rounded-2xl",
      )}
      footer={
        phase === "map" ? (
          <div className="flex flex-col gap-2">
            {geoUnavailable ? (
              <Button
                type="button"
                className="w-full"
                onClick={() => {
                  setError("");
                  setPhase("manual");
                }}
              >
                ورود دستی آدرس
              </Button>
            ) : (
              <Button
                type="button"
                className={cn(
                  "relative w-full overflow-hidden",
                  geocoding && "pointer-events-none",
                )}
                disabled={busy || geocoding}
                onClick={() => void confirmLocation()}
              >
                {geocoding ? (
                  <span className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                ) : null}
                <span className="relative">
                  {geocoding
                    ? "در حال تشخیص آدرس..."
                    : busy
                      ? "لطفاً صبر کنید..."
                      : "تأیید موقعیت"}
                </span>
              </Button>
            )}
            <div className="flex items-center justify-between gap-3 px-0.5">
              {!geoUnavailable ? (
                <button
                  type="button"
                  className="inline-flex h-9 items-center gap-1.5 text-[12.5px] text-secondary disabled:opacity-50"
                  onClick={useMyLocation}
                  disabled={busy || geocoding}
                >
                  <Icon icon={Crosshair} size={15} />
                  موقعیت من
                </button>
              ) : (
                <button
                  type="button"
                  className="inline-flex h-9 items-center text-[12.5px] text-secondary disabled:opacity-50"
                  onClick={() => void confirmLocation()}
                  disabled={busy || geocoding}
                >
                  تلاش دوباره با نقشه
                </button>
              )}
              {!geoUnavailable ? (
                <button
                  type="button"
                  className="h-9 text-[12.5px] text-secondary"
                  onClick={() => {
                    setError("");
                    setPhase("manual");
                  }}
                >
                  ورود دستی
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <Button
            type="button"
            className="w-full"
            disabled={busy}
            onClick={() => void submit()}
          >
            {busy ? "در حال ذخیره..." : "ذخیره آدرس"}
          </Button>
        )
      }
    >
      {phase === "map" ? (
        <div className="relative h-[min(78dvh,640px)] min-h-[320px] w-full bg-[#ece8e0]">
          <div className="absolute inset-x-3 top-3 z-[1000] space-y-1.5">
            <div className="relative">
              <Icon
                icon={MagnifyingGlass}
                size={15}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-dim"
              />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="جستجوی محله یا خیابان"
                disabled={geoUnavailable}
                className="h-10 w-full rounded-full border border-black/[0.06] bg-white/95 py-0 pr-9 pl-3 text-[13px] text-primary shadow-[0_8px_24px_-16px_rgb(28_25_23/0.45)] outline-none placeholder:text-dim focus:border-gold/35 disabled:opacity-60"
              />
            </div>
            {searchBusy ? (
              <p className="rounded-full bg-white/95 px-3 py-1.5 text-center text-[11px] text-secondary shadow-sm">
                در حال جستجو...
              </p>
            ) : null}
            {searchItems.length > 0 ? (
              <ul className="max-h-36 overflow-y-auto rounded-2xl border border-black/[0.06] bg-white/95 shadow-lg">
                {searchItems.map((item, idx) => (
                  <li key={`${item.title}-${idx}`}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-right hover:bg-surface-muted"
                      onClick={() => {
                        if (item.lat == null || item.lng == null) return;
                        setLat(item.lat);
                        setLng(item.lng);
                        setSearchTerm(item.title || item.address);
                        setSearchItems([]);
                        void reverse(item.lat, item.lng);
                      }}
                    >
                      <span className="block text-[13px] text-primary">
                        {item.title || "موقعیت"}
                      </span>
                      {item.address ? (
                        <span className="block text-[11px] text-secondary">
                          {item.address}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {error ? (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-[11px] text-red-700">
                {error}
                {geoUnavailable
                  ? " می‌توانید آدرس را دستی وارد کنید."
                  : null}
              </p>
            ) : null}
          </div>

          <div className="pointer-events-none absolute inset-x-8 top-[3.65rem] z-[1000] flex justify-center">
            <div className="inline-flex max-w-[92%] items-center gap-1.5 truncate rounded-full bg-white/95 px-3 py-1.5 text-[11.5px] font-medium text-primary shadow-[0_8px_20px_-12px_rgb(28_25_23/0.4)]">
              <Icon icon={MapPin} size={12} weight="fill" className="shrink-0 text-gold" />
              <span className="truncate">
                {geocoding ? "در حال خواندن آدرس..." : capsuleText}
              </span>
            </div>
          </div>

          {open ? (
            <LocationPickerMap
              lat={lat}
              lng={lng}
              onChange={(nextLat, nextLng) => {
                setLat(nextLat);
                setLng(nextLng);
              }}
              onDragEnd={handleMapSettle}
              className="h-full w-full"
            />
          ) : null}
        </div>
      ) : (
        detailFields
      )}
    </BottomSheet>
  );
}
