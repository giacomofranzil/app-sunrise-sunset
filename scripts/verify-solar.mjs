/**
 * Sanity check for the solar library against published values.
 * Run with: node --experimental-strip-types scripts/verify-solar.mjs
 */
import { getSunTimes, getSunPosition } from "../src/lib/solar.ts";
import { localNoonUtc, formatClock, formatDuration } from "../src/lib/time.ts";

const cases = [
  { name: "Rome", lat: 41.8933, lon: 12.4829, tz: "Europe/Rome", date: "2026-06-21" },
  { name: "Rome", lat: 41.8933, lon: 12.4829, tz: "Europe/Rome", date: "2026-12-21" },
  { name: "London", lat: 51.5085, lon: -0.1257, tz: "Europe/London", date: "2026-03-20" },
  { name: "New York", lat: 40.7143, lon: -74.006, tz: "America/New_York", date: "2026-08-29" },
  { name: "Tromso", lat: 69.6496, lon: 18.956, tz: "Europe/Oslo", date: "2026-06-21" },
  { name: "Tromso", lat: 69.6496, lon: 18.956, tz: "Europe/Oslo", date: "2026-12-21" },
  { name: "Sydney", lat: -33.8679, lon: 151.2073, tz: "Australia/Sydney", date: "2026-12-21" },
];

for (const testCase of cases) {
  const reference = localNoonUtc(testCase.date, testCase.tz);
  const times = getSunTimes(reference, testCase.lat, testCase.lon);
  const noonPosition = getSunPosition(times.solarNoon, testCase.lat, testCase.lon);
  console.log(
    [
      `${testCase.name} ${testCase.date}`.padEnd(24),
      `rise ${formatClock(times.sunrise, testCase.tz)}`,
      `set ${formatClock(times.sunset, testCase.tz)}`,
      `noon ${formatClock(times.solarNoon, testCase.tz)}`,
      `alt ${noonPosition.altitude.toFixed(2)}°`,
      `len ${formatDuration(times.dayLengthMs)}`,
      times.polarDay ? "POLAR DAY" : times.polarNight ? "POLAR NIGHT" : "",
    ].join("  "),
  );
}
