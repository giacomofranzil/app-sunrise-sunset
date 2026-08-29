export type GeoLocation = {
  id: string;
  name: string;
  /** Region/country line shown under the name, e.g. "Lazio, Italy". */
  detail: string;
  latitude: number;
  longitude: number;
  timeZone: string;
};

export const DEFAULT_LOCATION: GeoLocation = {
  id: "rome-it",
  name: "Rome",
  detail: "Lazio, Italy",
  latitude: 41.8933,
  longitude: 12.4829,
  timeZone: "Europe/Rome",
};

/**
 * Used when the geocoding service is unreachable, so search still returns
 * something useful offline.
 */
export const FALLBACK_LOCATIONS: GeoLocation[] = [
  DEFAULT_LOCATION,
  {
    id: "milan-it",
    name: "Milan",
    detail: "Lombardy, Italy",
    latitude: 45.4643,
    longitude: 9.1895,
    timeZone: "Europe/Rome",
  },
  {
    id: "london-gb",
    name: "London",
    detail: "England, United Kingdom",
    latitude: 51.5085,
    longitude: -0.1257,
    timeZone: "Europe/London",
  },
  {
    id: "paris-fr",
    name: "Paris",
    detail: "Île-de-France, France",
    latitude: 48.8534,
    longitude: 2.3488,
    timeZone: "Europe/Paris",
  },
  {
    id: "new-york-us",
    name: "New York",
    detail: "New York, United States",
    latitude: 40.7143,
    longitude: -74.006,
    timeZone: "America/New_York",
  },
  {
    id: "san-francisco-us",
    name: "San Francisco",
    detail: "California, United States",
    latitude: 37.7749,
    longitude: -122.4194,
    timeZone: "America/Los_Angeles",
  },
  {
    id: "reykjavik-is",
    name: "Reykjavík",
    detail: "Capital Region, Iceland",
    latitude: 64.1355,
    longitude: -21.8954,
    timeZone: "Atlantic/Reykjavik",
  },
  {
    id: "tromso-no",
    name: "Tromsø",
    detail: "Troms, Norway — polar day and night",
    latitude: 69.6496,
    longitude: 18.956,
    timeZone: "Europe/Oslo",
  },
  {
    id: "tokyo-jp",
    name: "Tokyo",
    detail: "Tokyo, Japan",
    latitude: 35.6895,
    longitude: 139.6917,
    timeZone: "Asia/Tokyo",
  },
  {
    id: "sydney-au",
    name: "Sydney",
    detail: "New South Wales, Australia",
    latitude: -33.8679,
    longitude: 151.2073,
    timeZone: "Australia/Sydney",
  },
  {
    id: "nairobi-ke",
    name: "Nairobi",
    detail: "Nairobi, Kenya",
    latitude: -1.2833,
    longitude: 36.8167,
    timeZone: "Africa/Nairobi",
  },
  {
    id: "ushuaia-ar",
    name: "Ushuaia",
    detail: "Tierra del Fuego, Argentina",
    latitude: -54.8072,
    longitude: -68.3044,
    timeZone: "America/Argentina/Ushuaia",
  },
];

export function searchFallbackLocations(query: string): GeoLocation[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return FALLBACK_LOCATIONS.filter(
    (location) =>
      location.name.toLowerCase().includes(needle) ||
      location.detail.toLowerCase().includes(needle),
  ).slice(0, 8);
}

export function formatCoordinates(latitude: number, longitude: number): string {
  const lat = `${Math.abs(latitude).toFixed(2)}°${latitude >= 0 ? "N" : "S"}`;
  const lon = `${Math.abs(longitude).toFixed(2)}°${longitude >= 0 ? "E" : "W"}`;
  return `${lat} ${lon}`;
}
