# Sunrise Sunset

A small web app that answers one question well: when does the light change where I am?

For any place on Earth it shows sunrise, sunset, solar noon, the golden hours and
all three twilight bands, plus a chart of the sun's altitude across the whole day
with a live marker for the current moment.

## What it does

- **Sunrise and sunset** for the selected place and date, in that place's own time zone.
- **Twilight detail**: first light (astronomical dawn), nautical dawn, civil dawn, and the matching dusk moments.
- **Golden hour windows** for the morning and the evening.
- **Day length** with the change compared to the previous day, down to the second.
- **A live countdown** to the next solar event when you are looking at today.
- **Sun altitude chart** with twilight zones drawn as bands, so polar day and polar night read correctly — try Tromsø in June or December.
- **Place search** through the Open-Meteo geocoding API, plus a "use my location" button and a small built-in city list as an offline fallback.

The selected place is remembered in `localStorage`.

## Running it locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

The dev server listens on <http://127.0.0.1:43117>.

Other scripts:

```bash
npm run build         # production build
npm start             # serve the production build
npm run lint          # eslint
npm run verify:solar  # print computed times for known places and dates
```

`npm run verify:solar` is a quick sanity check: it prints sunrise, sunset, solar
noon and peak altitude for a handful of places and dates (including both
solstices in Tromsø) so the output can be compared against published tables.

No API keys, no environment variables, no database.

## How the times are calculated

All solar maths runs in the browser in `src/lib/solar.ts`. It uses the standard
low-precision solar position algorithm from the Astronomical Almanac — the same
approach behind NOAA's solar calculator:

1. The sun's mean anomaly and ecliptic longitude are computed for the day.
2. Those give the declination and right ascension.
3. The hour angle at which the sun reaches a given altitude yields the times of
   the corresponding rise and set events, symmetric around solar transit.

Event altitudes:

| Moment | Sun altitude |
| --- | --- |
| Sunrise / sunset | −0.833° (allows for refraction and the sun's radius) |
| Golden hour edge | 6° |
| Civil dawn / dusk | −6° |
| Nautical dawn / dusk | −12° |
| Astronomical dawn / dusk | −18° |

Expect agreement with published tables to within about a minute. When an altitude
is never reached — the midnight sun, or the polar night — the corresponding event
is reported as absent rather than guessed.

Dates are anchored to local noon at the observed coordinates (`src/lib/time.ts`)
so that events always land on the calendar date you picked, including across
daylight-saving transitions.

## Project layout

```
src/
  app/
    api/geocode/route.ts   proxy + offline fallback for place search
    layout.tsx             fonts, metadata, dark shell
    page.tsx               page shell and background wash
  components/
    sunrise-dashboard.tsx  state, date navigation, headline figures
    sun-path.tsx           SVG altitude chart
    event-grid.tsx         the nine named moments
    location-search.tsx    combobox search + geolocation
    ui/                    shadcn/ui primitives
  lib/
    solar.ts               sun position and event times
    time.ts                time-zone-aware date helpers
    sky.ts                 phase naming and hero gradients
    locations.ts           default place and offline city list
```

## Stack

Next.js (App Router), TypeScript, Tailwind CSS v4, shadcn/ui, Lucide icons.
