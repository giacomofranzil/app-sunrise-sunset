import { NextResponse } from "next/server";

import {
  type GeoLocation,
  searchFallbackLocations,
} from "@/lib/locations";

type OpenMeteoResult = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
  country?: string;
  admin1?: string;
};

type OpenMeteoResponse = {
  results?: OpenMeteoResult[];
};

function toGeoLocation(result: OpenMeteoResult): GeoLocation {
  const detail = [result.admin1, result.country].filter(Boolean).join(", ");
  return {
    id: String(result.id),
    name: result.name,
    detail: detail || "—",
    latitude: result.latitude,
    longitude: result.longitude,
    timeZone: result.timezone,
  };
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json({ results: [], source: "none" });
  }

  const endpoint = new URL("https://geocoding-api.open-meteo.com/v1/search");
  endpoint.searchParams.set("name", query);
  endpoint.searchParams.set("count", "8");
  endpoint.searchParams.set("language", "en");
  endpoint.searchParams.set("format", "json");

  try {
    const response = await fetch(endpoint, {
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 3600 },
    });
    if (!response.ok) {
      throw new Error(`Geocoding service returned ${response.status}`);
    }

    const payload = (await response.json()) as OpenMeteoResponse;
    const results = (payload.results ?? [])
      .filter((result) => Boolean(result.timezone))
      .map(toGeoLocation);

    return NextResponse.json({ results, source: "open-meteo" });
  } catch {
    const results = searchFallbackLocations(query);
    return NextResponse.json(
      { results, source: "offline" },
      { status: results.length > 0 ? 200 : 503 },
    );
  }
}
