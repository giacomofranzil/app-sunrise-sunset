/**
 * Solar position and sun event times.
 *
 * Implements the low-precision astronomical algorithms from the Astronomical
 * Almanac (as popularised by NOAA's solar calculator): accurate to well under a
 * minute for sunrise/sunset at temperate latitudes, which is far better than the
 * resolution anyone reads off a clock.
 */

const RAD = Math.PI / 180;
const DAY_MS = 86_400_000;
const J1970 = 2_440_588;
const J2000 = 2_451_545;
/** Obliquity of the ecliptic. */
const OBLIQUITY = RAD * 23.4397;
/** Fractional Julian day offset that anchors the "solar day" search. */
const J0 = 0.0009;

function toJulian(date: Date): number {
  return date.valueOf() / DAY_MS - 0.5 + J1970;
}

function fromJulian(julian: number): Date {
  return new Date((julian + 0.5 - J1970) * DAY_MS);
}

function toDays(date: Date): number {
  return toJulian(date) - J2000;
}

function solarMeanAnomaly(days: number): number {
  return RAD * (357.5291 + 0.98560028 * days);
}

function eclipticLongitude(meanAnomaly: number): number {
  const center =
    RAD *
    (1.9148 * Math.sin(meanAnomaly) +
      0.02 * Math.sin(2 * meanAnomaly) +
      0.0003 * Math.sin(3 * meanAnomaly));
  const perihelion = RAD * 102.9372;
  return meanAnomaly + center + perihelion + Math.PI;
}

function declination(eclipticLng: number): number {
  return Math.asin(Math.sin(OBLIQUITY) * Math.sin(eclipticLng));
}

function rightAscension(eclipticLng: number): number {
  return Math.atan2(
    Math.sin(eclipticLng) * Math.cos(OBLIQUITY),
    Math.cos(eclipticLng),
  );
}

function siderealTime(days: number, westLng: number): number {
  return RAD * (280.16 + 360.9856235 * days) - westLng;
}

function altitude(hourAngle: number, phi: number, dec: number): number {
  return Math.asin(
    Math.sin(phi) * Math.sin(dec) +
      Math.cos(phi) * Math.cos(dec) * Math.cos(hourAngle),
  );
}

function azimuth(hourAngle: number, phi: number, dec: number): number {
  return Math.atan2(
    Math.sin(hourAngle),
    Math.cos(hourAngle) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi),
  );
}

export type SunPosition = {
  /** Degrees above the horizon; negative when the sun has set. */
  altitude: number;
  /** Degrees clockwise from north. */
  azimuth: number;
};

export function getSunPosition(
  date: Date,
  latitude: number,
  longitude: number,
): SunPosition {
  const westLng = RAD * -longitude;
  const phi = RAD * latitude;
  const days = toDays(date);
  const meanAnomaly = solarMeanAnomaly(days);
  const eclipticLng = eclipticLongitude(meanAnomaly);
  const dec = declination(eclipticLng);
  const hourAngle =
    siderealTime(days, westLng) - rightAscension(eclipticLng);

  return {
    altitude: altitude(hourAngle, phi, dec) / RAD,
    azimuth: (azimuth(hourAngle, phi, dec) / RAD + 180) % 360,
  };
}

function julianCycle(days: number, westLng: number): number {
  return Math.round(days - J0 - westLng / (2 * Math.PI));
}

function approxTransit(ht: number, westLng: number, cycle: number): number {
  return J0 + (ht + westLng) / (2 * Math.PI) + cycle;
}

function solarTransitJulian(
  approx: number,
  meanAnomaly: number,
  eclipticLng: number,
): number {
  return (
    J2000 +
    approx +
    0.0053 * Math.sin(meanAnomaly) -
    0.0069 * Math.sin(2 * eclipticLng)
  );
}

function hourAngleForAltitude(
  h: number,
  phi: number,
  dec: number,
): number | null {
  const cosH =
    (Math.sin(h) - Math.sin(phi) * Math.sin(dec)) /
    (Math.cos(phi) * Math.cos(dec));
  if (cosH > 1 || cosH < -1) return null;
  return Math.acos(cosH);
}

/**
 * Sun altitudes (in degrees) that define each named moment. Sunrise/sunset use
 * -0.833° to account for atmospheric refraction and the sun's angular radius.
 */
const EVENT_ANGLES = {
  nightEnd: -18,
  nauticalDawn: -12,
  dawn: -6,
  blueHourEnd: -4,
  sunrise: -0.833,
  goldenHourEnd: 6,
  goldenHourStart: 6,
  sunset: -0.833,
  blueHourStart: -4,
  dusk: -6,
  nauticalDusk: -12,
  nightStart: -18,
} as const;

export type SunTimes = {
  /** Astronomical dawn: the first hint of light. */
  nightEnd: Date | null;
  nauticalDawn: Date | null;
  /** Civil dawn. */
  dawn: Date | null;
  blueHourEnd: Date | null;
  sunrise: Date | null;
  /** End of the morning golden hour. */
  goldenHourEnd: Date | null;
  solarNoon: Date;
  /** Start of the evening golden hour. */
  goldenHourStart: Date | null;
  sunset: Date | null;
  blueHourStart: Date | null;
  /** Civil dusk. */
  dusk: Date | null;
  nauticalDusk: Date | null;
  /** Astronomical dusk: the last hint of light. */
  nightStart: Date | null;
  /** Daylight in milliseconds, or null during polar day/night. */
  dayLengthMs: number | null;
  /** True when the sun stays above the sunrise angle for the whole day. */
  polarDay: boolean;
  /** True when the sun never reaches the sunrise angle. */
  polarNight: boolean;
};

/**
 * Sun times for the solar day containing `reference`.
 *
 * Pass a timestamp near local noon at the observed coordinates — see
 * `localNoonUtc` — so that the returned events belong to the intended calendar
 * date rather than the one that happens to be current in UTC.
 */
export function getSunTimes(
  reference: Date,
  latitude: number,
  longitude: number,
): SunTimes {
  const westLng = RAD * -longitude;
  const phi = RAD * latitude;
  const days = toDays(reference);
  const cycle = julianCycle(days, westLng);
  const approxNoon = approxTransit(0, westLng, cycle);
  const meanAnomaly = solarMeanAnomaly(approxNoon);
  const eclipticLng = eclipticLongitude(meanAnomaly);
  const dec = declination(eclipticLng);
  const julianNoon = solarTransitJulian(approxNoon, meanAnomaly, eclipticLng);
  const solarNoon = fromJulian(julianNoon);

  const noonAltitude = altitude(0, phi, dec) / RAD;

  const setJulian = (angleDeg: number): number | null => {
    const w = hourAngleForAltitude(angleDeg * RAD, phi, dec);
    if (w === null) return null;
    return solarTransitJulian(
      approxTransit(w, westLng, cycle),
      meanAnomaly,
      eclipticLng,
    );
  };

  const rise = (angleDeg: number): Date | null => {
    const set = setJulian(angleDeg);
    if (set === null) return null;
    return fromJulian(julianNoon - (set - julianNoon));
  };

  const set = (angleDeg: number): Date | null => {
    const julian = setJulian(angleDeg);
    return julian === null ? null : fromJulian(julian);
  };

  const sunrise = rise(EVENT_ANGLES.sunrise);
  const sunset = set(EVENT_ANGLES.sunset);
  const sunUp = sunrise === null && noonAltitude > EVENT_ANGLES.sunrise;

  return {
    nightEnd: rise(EVENT_ANGLES.nightEnd),
    nauticalDawn: rise(EVENT_ANGLES.nauticalDawn),
    dawn: rise(EVENT_ANGLES.dawn),
    blueHourEnd: rise(EVENT_ANGLES.blueHourEnd),
    sunrise,
    goldenHourEnd: rise(EVENT_ANGLES.goldenHourEnd),
    solarNoon,
    goldenHourStart: set(EVENT_ANGLES.goldenHourStart),
    sunset,
    blueHourStart: set(EVENT_ANGLES.blueHourStart),
    dusk: set(EVENT_ANGLES.dusk),
    nauticalDusk: set(EVENT_ANGLES.nauticalDusk),
    nightStart: set(EVENT_ANGLES.nightStart),
    dayLengthMs:
      sunrise && sunset
        ? sunset.getTime() - sunrise.getTime()
        : sunUp
          ? DAY_MS
          : null,
    polarDay: sunUp,
    polarNight: sunrise === null && !sunUp,
  };
}
