"use client";

import { useId, useMemo } from "react";

import { getSunPosition } from "@/lib/solar";
import { localNoonUtc } from "@/lib/time";

const WIDTH = 900;
const HEIGHT = 340;
const PAD_LEFT = 46;
const PAD_RIGHT = 18;
const PAD_TOP = 18;
const PAD_BOTTOM = 30;
const SAMPLES = 192;
const DAY_MS = 86_400_000;
const PLOT_WIDTH = WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_HEIGHT = HEIGHT - PAD_TOP - PAD_BOTTOM;

const TWILIGHT_BANDS = [
  { key: "golden", from: 0, to: 6, color: "#3c3260" },
  { key: "civil", from: -6, to: 0, color: "#2f2f6b" },
  { key: "nautical", from: -12, to: -6, color: "#181c4a" },
  { key: "astronomical", from: -18, to: -12, color: "#0b0e2a" },
] as const;

type SunPathProps = {
  dateKey: string;
  timeZone: string;
  latitude: number;
  longitude: number;
  /** Current instant, or null when the selected date is not today. */
  now: Date | null;
};

/**
 * Plots the sun's altitude across the local day. Twilight zones are horizontal
 * bands, so polar day and polar night read correctly: the curve simply never
 * crosses the horizon line.
 */
export function SunPath({
  dateKey,
  timeZone,
  latitude,
  longitude,
  now,
}: SunPathProps) {
  const gradientId = useId();

  const chart = useMemo(() => {
    const noon = localNoonUtc(dateKey, timeZone);
    const dayStart = noon.getTime() - DAY_MS / 2;
    const dayEnd = dayStart + DAY_MS;

    const samples = Array.from({ length: SAMPLES + 1 }, (_, index) => {
      const t = dayStart + (index / SAMPLES) * DAY_MS;
      return {
        t,
        altitude: getSunPosition(new Date(t), latitude, longitude).altitude,
      };
    });

    const altitudes = samples.map((sample) => sample.altitude);
    const maxAltitude = Math.max(...altitudes);
    const minAltitude = Math.min(...altitudes);
    const top = Math.min(90, Math.max(maxAltitude + 8, 14));
    const bottom = Math.max(-90, Math.min(minAltitude - 8, -22));

    const xFor = (t: number) => PAD_LEFT + ((t - dayStart) / DAY_MS) * PLOT_WIDTH;
    const yFor = (altitude: number) =>
      PAD_TOP +
      ((top - Math.min(top, Math.max(bottom, altitude))) / (top - bottom)) *
        PLOT_HEIGHT;

    const curve = samples
      .map(
        (sample, index) =>
          `${index === 0 ? "M" : "L"} ${xFor(sample.t).toFixed(2)} ${yFor(sample.altitude).toFixed(2)}`,
      )
      .join(" ");

    const horizonY = yFor(0);
    const daylightArea = [
      curve,
      `L ${xFor(dayEnd).toFixed(2)} ${horizonY.toFixed(2)}`,
      `L ${xFor(dayStart).toFixed(2)} ${horizonY.toFixed(2)}`,
      "Z",
    ].join(" ");

    const bands = TWILIGHT_BANDS.map((band) => {
      const yTop = yFor(band.to);
      const yBottom = yFor(band.from);
      return { ...band, y: yTop, height: Math.max(0, yBottom - yTop) };
    });

    const nightBand = {
      y: yFor(-18),
      height: Math.max(0, yFor(bottom) - yFor(-18)),
    };

    const hourTicks = [0, 3, 6, 9, 12, 15, 18, 21, 24].map((hour) => ({
      hour,
      x: xFor(dayStart + (hour / 24) * DAY_MS),
    }));

    const altitudeTicks = [60, 30, -6, -18]
      .filter((altitude) => altitude < top - 4 && altitude > bottom + 4)
      .map((altitude) => ({ altitude, y: yFor(altitude) }));

    const withinDay =
      now !== null && now.getTime() >= dayStart && now.getTime() <= dayEnd;
    const nowAltitude = withinDay
      ? getSunPosition(now, latitude, longitude).altitude
      : null;
    const nowPoint =
      withinDay && nowAltitude !== null
        ? { x: xFor(now.getTime()), y: yFor(nowAltitude), altitude: nowAltitude }
        : null;

    return {
      curve,
      daylightArea,
      horizonY,
      hourTicks,
      altitudeTicks,
      bands,
      nightBand,
      nowPoint,
      maxAltitude,
    };
  }, [dateKey, timeZone, latitude, longitude, now]);

  return (
    <figure className="w-full">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Sun altitude across the day. The sun peaks ${chart.maxAltitude.toFixed(0)} degrees above the horizon.`}
      >
        <defs>
          <linearGradient id={`${gradientId}-day`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#facc15" stopOpacity="0.45" />
            <stop offset="60%" stopColor="#fb923c" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#fb923c" stopOpacity="0.04" />
          </linearGradient>
          <clipPath id={`${gradientId}-plot`}>
            <rect
              x={PAD_LEFT}
              y={PAD_TOP}
              width={PLOT_WIDTH}
              height={PLOT_HEIGHT}
            />
          </clipPath>
          <clipPath id={`${gradientId}-above-horizon`}>
            <rect
              x={PAD_LEFT}
              y={PAD_TOP}
              width={PLOT_WIDTH}
              height={Math.max(0, chart.horizonY - PAD_TOP)}
            />
          </clipPath>
        </defs>

        <g clipPath={`url(#${gradientId}-plot)`}>
          <rect
            x={PAD_LEFT}
            y={chart.nightBand.y}
            width={PLOT_WIDTH}
            height={chart.nightBand.height}
            fill="#04050f"
          />
          {chart.bands.map((band) => (
            <rect
              key={band.key}
              x={PAD_LEFT}
              y={band.y}
              width={PLOT_WIDTH}
              height={band.height}
              fill={band.color}
            />
          ))}

          <g clipPath={`url(#${gradientId}-above-horizon)`}>
            <path d={chart.daylightArea} fill={`url(#${gradientId}-day)`} />
          </g>

          {chart.hourTicks.map((tick) => (
            <line
              key={tick.hour}
              x1={tick.x}
              x2={tick.x}
              y1={PAD_TOP}
              y2={PAD_TOP + PLOT_HEIGHT}
              stroke="#ffffff"
              strokeOpacity={0.07}
            />
          ))}

          <path
            d={chart.curve}
            fill="none"
            stroke="#fde68a"
            strokeOpacity={0.9}
            strokeWidth={2.5}
            strokeLinecap="round"
          />

          {chart.nowPoint ? (
            <g>
              <line
                x1={chart.nowPoint.x}
                x2={chart.nowPoint.x}
                y1={PAD_TOP}
                y2={PAD_TOP + PLOT_HEIGHT}
                stroke="#ffffff"
                strokeOpacity={0.35}
                strokeDasharray="4 5"
              />
              <circle
                cx={chart.nowPoint.x}
                cy={chart.nowPoint.y}
                r={14}
                fill={chart.nowPoint.altitude >= 0 ? "#fbbf24" : "#c7d2fe"}
                opacity={0.25}
              />
              <circle
                cx={chart.nowPoint.x}
                cy={chart.nowPoint.y}
                r={6.5}
                fill={chart.nowPoint.altitude >= 0 ? "#fcd34d" : "#e0e7ff"}
                stroke="#0b1020"
                strokeWidth={1.5}
              />
            </g>
          ) : null}
        </g>

        <line
          x1={PAD_LEFT}
          x2={WIDTH - PAD_RIGHT}
          y1={chart.horizonY}
          y2={chart.horizonY}
          stroke="#fef3c7"
          strokeOpacity={0.55}
          strokeWidth={1.5}
        />
        <text
          x={PAD_LEFT - 8}
          y={chart.horizonY + 4}
          textAnchor="end"
          fill="#fef3c7"
          fillOpacity={0.75}
          fontSize={13}
        >
          0°
        </text>

        {chart.altitudeTicks.map((tick) => (
          <text
            key={tick.altitude}
            x={PAD_LEFT - 8}
            y={tick.y + 4}
            textAnchor="end"
            fill="#ffffff"
            fillOpacity={0.35}
            fontSize={12}
          >
            {tick.altitude}°
          </text>
        ))}

        {chart.hourTicks.map((tick) => (
          <text
            key={tick.hour}
            x={tick.x}
            y={HEIGHT - 8}
            textAnchor={
              tick.hour === 0 ? "start" : tick.hour === 24 ? "end" : "middle"
            }
            fill="#ffffff"
            fillOpacity={0.45}
            fontSize={13}
          >
            {tick.hour === 24
              ? "24:00"
              : `${String(tick.hour).padStart(2, "0")}:00`}
          </text>
        ))}
      </svg>

      <figcaption className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-white/55">
        <LegendSwatch color="#fcd34d" label="Sun altitude" />
        <LegendSwatch color="#3c3260" label="Golden hour" />
        <LegendSwatch color="#2f2f6b" label="Civil twilight" />
        <LegendSwatch color="#181c4a" label="Nautical twilight" />
        <LegendSwatch color="#0b0e2a" label="Astronomical twilight" />
      </figcaption>
    </figure>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span
        aria-hidden
        className="size-2.5 rounded-full ring-1 ring-white/25"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}
