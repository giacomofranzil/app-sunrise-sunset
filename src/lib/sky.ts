export type SkyPhase = {
  id: string;
  label: string;
  /** One-line explanation of what the light looks like right now. */
  blurb: string;
  /** Tailwind classes for the phase pill. */
  pill: string;
  /** CSS gradient used behind the hero card. */
  gradient: string;
};

/**
 * Named daylight phase for a sun altitude, in degrees. `rising` only changes the
 * wording (morning vs. evening), never the thresholds.
 */
export function skyPhase(altitudeDeg: number, rising: boolean): SkyPhase {
  if (altitudeDeg >= 12) {
    return {
      id: "day",
      label: "Daylight",
      blurb: "The sun is high — hard shadows and neutral colour.",
      pill: "bg-sky-400/15 text-sky-100 ring-sky-300/30",
      gradient:
        "linear-gradient(160deg, #1e4d8c 0%, #2f7fc4 45%, #7cc0e8 100%)",
    };
  }
  if (altitudeDeg >= 6) {
    return {
      id: "low-sun",
      label: rising ? "Late morning light" : "Afternoon light",
      blurb: "Soft directional light, just before the golden hour.",
      pill: "bg-amber-300/15 text-amber-100 ring-amber-200/30",
      gradient:
        "linear-gradient(160deg, #23508c 0%, #4a86bd 45%, #b6d8ec 100%)",
    };
  }
  if (altitudeDeg >= 0) {
    return {
      id: "golden",
      label: rising ? "Morning golden hour" : "Evening golden hour",
      blurb: "Warm, low-angle light. The best hour of the day for photos.",
      pill: "bg-orange-300/20 text-orange-100 ring-orange-200/30",
      gradient:
        "linear-gradient(160deg, #40306b 0%, #b2553f 55%, #f0a35c 100%)",
    };
  }
  if (altitudeDeg >= -4) {
    return {
      id: "civil-bright",
      label: rising ? "Sunrise is imminent" : "Just after sunset",
      blurb: "The sun is below the horizon but the sky is still lit.",
      pill: "bg-rose-300/20 text-rose-100 ring-rose-200/30",
      gradient:
        "linear-gradient(160deg, #2b2455 0%, #7d3f63 55%, #d9765f 100%)",
    };
  }
  if (altitudeDeg >= -6) {
    return {
      id: "blue-hour",
      label: "Blue hour",
      blurb: "Deep even blue, bright enough to shoot without a tripod.",
      pill: "bg-indigo-300/20 text-indigo-100 ring-indigo-200/30",
      gradient:
        "linear-gradient(160deg, #171a3d 0%, #3b3a76 55%, #7b6ba6 100%)",
    };
  }
  if (altitudeDeg >= -12) {
    return {
      id: "nautical",
      label: "Nautical twilight",
      blurb: "The horizon is still visible at sea; brighter stars are out.",
      pill: "bg-indigo-400/20 text-indigo-100 ring-indigo-300/30",
      gradient:
        "linear-gradient(160deg, #0d1030 0%, #1f2356 55%, #48477f 100%)",
    };
  }
  if (altitudeDeg >= -18) {
    return {
      id: "astronomical",
      label: "Astronomical twilight",
      blurb: "Almost fully dark — faint glow low in the sky.",
      pill: "bg-slate-400/15 text-slate-100 ring-slate-300/25",
      gradient:
        "linear-gradient(160deg, #070920 0%, #12143a 55%, #24265c 100%)",
    };
  }
  return {
    id: "night",
    label: "Night",
    blurb: "No trace of sunlight. Full darkness for astronomy.",
    pill: "bg-slate-500/15 text-slate-200 ring-slate-400/25",
    gradient: "linear-gradient(160deg, #04050f 0%, #0a0c24 55%, #151740 100%)",
  };
}
