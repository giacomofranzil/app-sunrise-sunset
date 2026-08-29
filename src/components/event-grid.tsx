import type { LucideIcon } from "lucide-react";
import {
  MoonIcon,
  MoonStarIcon,
  SunIcon,
  SunriseIcon,
  SunsetIcon,
  SparklesIcon,
  CloudSunIcon,
} from "lucide-react";

import type { SunTimes } from "@/lib/solar";
import { formatClock } from "@/lib/time";

type EventRow = {
  key: keyof SunTimes;
  label: string;
  hint: string;
  icon: LucideIcon;
  accent: string;
};

const ROWS: EventRow[] = [
  {
    key: "nightEnd",
    label: "First light",
    hint: "Astronomical dawn, sun at −18°",
    icon: MoonStarIcon,
    accent: "text-indigo-300",
  },
  {
    key: "dawn",
    label: "Civil dawn",
    hint: "Bright enough to see outdoors",
    icon: SparklesIcon,
    accent: "text-violet-300",
  },
  {
    key: "sunrise",
    label: "Sunrise",
    hint: "Upper edge clears the horizon",
    icon: SunriseIcon,
    accent: "text-amber-300",
  },
  {
    key: "goldenHourEnd",
    label: "Golden hour ends",
    hint: "Sun climbs past 6°",
    icon: CloudSunIcon,
    accent: "text-orange-200",
  },
  {
    key: "solarNoon",
    label: "Solar noon",
    hint: "Sun at its highest point",
    icon: SunIcon,
    accent: "text-yellow-200",
  },
  {
    key: "goldenHourStart",
    label: "Golden hour begins",
    hint: "Sun drops below 6°",
    icon: CloudSunIcon,
    accent: "text-orange-300",
  },
  {
    key: "sunset",
    label: "Sunset",
    hint: "Upper edge touches the horizon",
    icon: SunsetIcon,
    accent: "text-rose-300",
  },
  {
    key: "dusk",
    label: "Civil dusk",
    hint: "Artificial light becomes necessary",
    icon: SparklesIcon,
    accent: "text-violet-300",
  },
  {
    key: "nightStart",
    label: "Last light",
    hint: "Astronomical dusk, sun at −18°",
    icon: MoonIcon,
    accent: "text-indigo-300",
  },
];

export function EventGrid({
  times,
  timeZone,
}: {
  times: SunTimes;
  timeZone: string;
}) {
  return (
    <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
      {ROWS.map((row) => {
        const value = times[row.key];
        const instant = value instanceof Date ? value : null;
        const Icon = row.icon;
        return (
          <li
            key={row.key}
            className="flex items-center gap-3 bg-slate-950/55 px-4 py-3.5 backdrop-blur-sm"
          >
            <Icon className={`size-5 shrink-0 ${row.accent}`} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
                {row.label}
              </p>
              <p className="truncate text-xs text-white/45">{row.hint}</p>
            </div>
            <p className="shrink-0 font-mono text-base tabular-nums text-white">
              {instant ? formatClock(instant, timeZone) : "—"}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
