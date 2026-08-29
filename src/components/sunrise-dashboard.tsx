"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  CompassIcon,
  SunriseIcon,
  SunsetIcon,
  TimerIcon,
} from "lucide-react";

import { EventGrid } from "@/components/event-grid";
import { LocationSearch } from "@/components/location-search";
import { SunPath } from "@/components/sun-path";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DEFAULT_LOCATION,
  formatCoordinates,
  type GeoLocation,
} from "@/lib/locations";
import { skyPhase } from "@/lib/sky";
import { getSunPosition, getSunTimes, type SunTimes } from "@/lib/solar";
import {
  formatClock,
  formatDuration,
  formatLongDate,
  formatSignedDuration,
  localNoonUtc,
  shiftDateKey,
  zoneAbbreviation,
  zoneDateKey,
} from "@/lib/time";

const STORAGE_KEY = "app-sunrise-sunset:location";

function readStoredLocation(): GeoLocation | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GeoLocation>;
    if (
      typeof parsed.name !== "string" ||
      typeof parsed.timeZone !== "string" ||
      typeof parsed.latitude !== "number" ||
      typeof parsed.longitude !== "number"
    ) {
      return null;
    }
    return {
      id: parsed.id ?? `${parsed.latitude},${parsed.longitude}`,
      name: parsed.name,
      detail: parsed.detail ?? "",
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      timeZone: parsed.timeZone,
    };
  } catch {
    return null;
  }
}

const subscribeToNothing = () => () => {};

/**
 * False for the server render and the hydration pass, true afterwards. Lets the
 * dashboard read `localStorage` and the wall clock without a hydration mismatch.
 */
function useIsHydrated(): boolean {
  return useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
}

export function SunriseDashboard() {
  const isHydrated = useIsHydrated();
  const [location, setLocation] = useState<GeoLocation>(() =>
    typeof window === "undefined"
      ? DEFAULT_LOCATION
      : (readStoredLocation() ?? DEFAULT_LOCATION),
  );
  const [now, setNow] = useState<Date>(() => new Date());
  const [pickedDate, setPickedDate] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const selectLocation = useCallback((next: GeoLocation) => {
    setLocation(next);
    setPickedDate(null);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Private browsing modes can refuse writes; the app still works.
    }
  }, []);

  if (!isHydrated) {
    return <DashboardSkeleton />;
  }

  return (
    <DashboardBody
      location={location}
      dateKey={pickedDate ?? zoneDateKey(location.timeZone, now)}
      now={now}
      onDateChange={setPickedDate}
      onResetDate={() => setPickedDate(null)}
      onLocationChange={selectLocation}
    />
  );
}

type DashboardBodyProps = {
  location: GeoLocation;
  dateKey: string;
  now: Date;
  onDateChange: (dateKey: string) => void;
  onResetDate: () => void;
  onLocationChange: (location: GeoLocation) => void;
};

function DashboardBody({
  location,
  dateKey,
  now,
  onDateChange,
  onResetDate,
  onLocationChange,
}: DashboardBodyProps) {
  const { timeZone, latitude, longitude } = location;

  const todayKey = zoneDateKey(timeZone, now);
  const isToday = dateKey === todayKey;

  const times = useMemo(
    () => getSunTimes(localNoonUtc(dateKey, timeZone), latitude, longitude),
    [dateKey, timeZone, latitude, longitude],
  );

  const previousTimes = useMemo(
    () =>
      getSunTimes(
        localNoonUtc(shiftDateKey(dateKey, -1, timeZone), timeZone),
        latitude,
        longitude,
      ),
    [dateKey, timeZone, latitude, longitude],
  );

  const position = useMemo(
    () => getSunPosition(now, latitude, longitude),
    [now, latitude, longitude],
  );

  const phase = useMemo(
    () => skyPhase(position.altitude, position.azimuth < 180),
    [position],
  );

  const dayLengthDelta =
    times.dayLengthMs !== null && previousTimes.dayLengthMs !== null
      ? times.dayLengthMs - previousTimes.dayLengthMs
      : null;

  const nextEvent = useMemo(
    () => (isToday ? findNextEvent(times, now, timeZone, latitude, longitude) : null),
    [isToday, times, now, timeZone, latitude, longitude],
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium tracking-[0.2em] text-amber-300/80 uppercase">
            Sunrise · Sunset
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Where the light is, today
          </h1>
          <p className="max-w-2xl text-sm text-white/60">
            Sunrise, sunset, twilight and golden hour for any place on Earth —
            computed locally from the sun&apos;s position, so it works offline
            once loaded.
          </p>
        </div>
        <LocationSearch location={location} onSelect={onLocationChange} />
      </header>

      <section
        className="relative overflow-hidden rounded-3xl ring-1 ring-white/10"
        style={{ background: phase.gradient }}
      >
        <div className="relative flex flex-col gap-6 bg-slate-950/25 p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold text-white sm:text-2xl">
                {location.name}
              </h2>
              <p className="truncate text-sm text-white/65">
                {[location.detail, formatCoordinates(latitude, longitude)]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${phase.pill}`}
            >
              {phase.label}
            </span>
          </div>

          <DateNavigator
            dateKey={dateKey}
            timeZone={timeZone}
            isToday={isToday}
            onDateChange={onDateChange}
            onResetDate={onResetDate}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <BigTime
              icon={<SunriseIcon className="size-5 text-amber-200" />}
              label="Sunrise"
              value={
                times.polarDay
                  ? "No sunrise"
                  : times.polarNight
                    ? "No sunrise"
                    : formatClock(times.sunrise, timeZone)
              }
              caption={
                times.polarDay
                  ? "The sun is already up"
                  : times.polarNight
                    ? "The sun stays below the horizon"
                    : `Golden hour until ${formatClock(times.goldenHourEnd, timeZone)}`
              }
            />
            <BigTime
              icon={<SunsetIcon className="size-5 text-rose-200" />}
              label="Sunset"
              value={
                times.polarDay || times.polarNight
                  ? "No sunset"
                  : formatClock(times.sunset, timeZone)
              }
              caption={
                times.polarDay
                  ? "Midnight sun — it never sets"
                  : times.polarNight
                    ? "Polar night"
                    : `Golden hour from ${formatClock(times.goldenHourStart, timeZone)}`
              }
            />
          </div>

          <p className="text-sm text-white/70">{phase.blurb}</p>

          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-white/15 sm:grid-cols-4">
            <Stat
              icon={<TimerIcon className="size-4" />}
              label="Day length"
              value={
                times.polarDay
                  ? "24h 00m"
                  : times.polarNight
                    ? "0h 00m"
                    : formatDuration(times.dayLengthMs)
              }
              detail={
                dayLengthDelta === null
                  ? "vs. yesterday unavailable"
                  : `${formatSignedDuration(dayLengthDelta)} vs. yesterday`
              }
            />
            <Stat
              icon={<ClockIcon className="size-4" />}
              label="Local time"
              value={formatClock(now, timeZone, { seconds: true })}
              detail={zoneAbbreviation(timeZone, now)}
            />
            <Stat
              icon={<CompassIcon className="size-4" />}
              label="Sun position"
              value={`${position.altitude.toFixed(1)}°`}
              detail={`${compassPoint(position.azimuth)} · ${position.azimuth.toFixed(0)}° azimuth`}
            />
            <Stat
              icon={<SunriseIcon className="size-4" />}
              label={nextEvent ? nextEvent.label : "Selected day"}
              value={
                nextEvent
                  ? countdown(nextEvent.at.getTime() - now.getTime())
                  : formatLongDate(dateKey, timeZone).split(",")[0]
              }
              detail={
                nextEvent
                  ? `at ${formatClock(nextEvent.at, timeZone)}`
                  : "Pick today to see live countdowns"
              }
            />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-3xl bg-slate-950/45 p-5 ring-1 ring-white/10 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-base font-semibold text-white">
            Sun altitude through the day
          </h3>
          <p className="text-xs text-white/50">
            {formatLongDate(dateKey, timeZone)} · {timeZone.replace(/_/g, " ")}
          </p>
        </div>
        <SunPath
          dateKey={dateKey}
          timeZone={timeZone}
          latitude={latitude}
          longitude={longitude}
          now={isToday ? now : null}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-base font-semibold text-white">
          Every moment of light
        </h3>
        <EventGrid times={times} timeZone={timeZone} />
      </section>

      <footer className="pb-4 text-xs leading-relaxed text-white/40">
        Times are computed in the browser with the standard low-precision solar
        position algorithm and shown in {timeZone.replace(/_/g, " ")}. Sunrise
        and sunset use an altitude of −0.833° to allow for atmospheric
        refraction, so expect agreement with published tables to within a
        minute. Place search is powered by the Open-Meteo geocoding API.
      </footer>
    </div>
  );
}

function DateNavigator({
  dateKey,
  timeZone,
  isToday,
  onDateChange,
  onResetDate,
}: {
  dateKey: string;
  timeZone: string;
  isToday: boolean;
  onDateChange: (dateKey: string) => void;
  onResetDate: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        aria-label="Previous day"
        onClick={() => onDateChange(shiftDateKey(dateKey, -1, timeZone))}
        className="size-9 border-white/20 bg-white/5 text-white hover:bg-white/15 hover:text-white"
      >
        <ChevronLeftIcon className="size-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        aria-label="Next day"
        onClick={() => onDateChange(shiftDateKey(dateKey, 1, timeZone))}
        className="size-9 border-white/20 bg-white/5 text-white hover:bg-white/15 hover:text-white"
      >
        <ChevronRightIcon className="size-4" />
      </Button>
      <p className="px-1 text-sm font-medium text-white">
        {formatLongDate(dateKey, timeZone)}
      </p>
      {!isToday ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={onResetDate}
          className="h-9 text-amber-200 hover:bg-white/10 hover:text-amber-100"
        >
          Back to today
        </Button>
      ) : null}
      <label className="ml-auto flex items-center gap-2 text-xs text-white/50">
        <span className="sr-only sm:not-sr-only">Jump to</span>
        <input
          type="date"
          value={dateKey}
          onChange={(event) => {
            if (event.target.value) onDateChange(event.target.value);
          }}
          className="h-9 rounded-md border border-white/20 bg-white/5 px-2 text-sm text-white [color-scheme:dark]"
        />
      </label>
    </div>
  );
}

function BigTime({
  icon,
  label,
  value,
  caption,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-950/40 p-4 ring-1 ring-white/10">
      <div className="flex items-center gap-2 text-sm text-white/70">
        {icon}
        {label}
      </div>
      <p className="mt-1 font-mono text-4xl font-semibold tracking-tight text-white tabular-nums sm:text-5xl">
        {value}
      </p>
      <p className="mt-1 text-xs text-white/55">{caption}</p>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="bg-slate-950/45 p-4">
      <div className="flex items-center gap-1.5 text-xs text-white/55">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-1 font-mono text-lg text-white tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs text-white/45">{detail}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-32 bg-white/10" />
        <Skeleton className="h-9 w-80 max-w-full bg-white/10" />
        <Skeleton className="h-4 w-full max-w-xl bg-white/10" />
      </div>
      <Skeleton className="h-11 w-72 max-w-full bg-white/10" />
      <Skeleton className="h-96 w-full rounded-3xl bg-white/10" />
      <Skeleton className="h-72 w-full rounded-3xl bg-white/10" />
      <span className="sr-only">Loading sun times…</span>
    </div>
  );
}

type NextEvent = { label: string; at: Date };

function findNextEvent(
  times: SunTimes,
  now: Date,
  timeZone: string,
  latitude: number,
  longitude: number,
): NextEvent | null {
  const candidates: NextEvent[] = [
    { label: "First light in", at: times.nightEnd },
    { label: "Civil dawn in", at: times.dawn },
    { label: "Sunrise in", at: times.sunrise },
    { label: "Solar noon in", at: times.solarNoon },
    { label: "Golden hour in", at: times.goldenHourStart },
    { label: "Sunset in", at: times.sunset },
    { label: "Civil dusk in", at: times.dusk },
    { label: "Last light in", at: times.nightStart },
  ].filter((candidate): candidate is NextEvent => candidate.at instanceof Date);

  const upcoming = candidates
    .filter((candidate) => candidate.at.getTime() > now.getTime())
    .sort((a, b) => a.at.getTime() - b.at.getTime());

  if (upcoming.length > 0) return upcoming[0];

  const tomorrow = getSunTimes(
    localNoonUtc(shiftDateKey(zoneDateKey(timeZone, now), 1, timeZone), timeZone),
    latitude,
    longitude,
  );
  if (tomorrow.sunrise) {
    return { label: "Sunrise in", at: tomorrow.sunrise };
  }
  return null;
}

function countdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`;
}

const COMPASS = [
  "N",
  "NNE",
  "NE",
  "ENE",
  "E",
  "ESE",
  "SE",
  "SSE",
  "S",
  "SSW",
  "SW",
  "WSW",
  "W",
  "WNW",
  "NW",
  "NNW",
];

function compassPoint(azimuth: number): string {
  const index = Math.round((((azimuth % 360) + 360) % 360) / 22.5) % 16;
  return COMPASS[index];
}
