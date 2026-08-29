"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Command as CommandPrimitive } from "cmdk";
import {
  AlertTriangleIcon,
  CrosshairIcon,
  Loader2Icon,
  MapPinIcon,
  SearchIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  FALLBACK_LOCATIONS,
  formatCoordinates,
  type GeoLocation,
} from "@/lib/locations";

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; results: GeoLocation[]; offline: boolean }
  | { status: "error"; message: string };

type LocationSearchProps = {
  location: GeoLocation;
  onSelect: (location: GeoLocation) => void;
};

export function LocationSearch({ location, onSelect }: LocationSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [state, setState] = useState<SearchState>({ status: "idle" });
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const requestId = useRef(0);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (debounce.current) clearTimeout(debounce.current);
    },
    [],
  );

  const changeQuery = useCallback((value: string) => {
    setQuery(value);
    if (debounce.current) clearTimeout(debounce.current);

    const trimmed = value.trim();
    const id = ++requestId.current;

    if (trimmed.length < 2) {
      setState({ status: "idle" });
      return;
    }

    setState({ status: "loading" });
    debounce.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/geocode?q=${encodeURIComponent(trimmed)}`,
        );
        if (!response.ok) throw new Error("Search is unavailable right now.");
        const payload = (await response.json()) as {
          results: GeoLocation[];
          source: string;
        };
        if (id !== requestId.current) return;
        setState({
          status: "ready",
          results: payload.results,
          offline: payload.source === "offline",
        });
      } catch {
        if (id !== requestId.current) return;
        setState({
          status: "error",
          message: "Could not reach the place search. Check your connection.",
        });
      }
    }, 250);
  }, []);

  const choose = useCallback(
    (next: GeoLocation) => {
      onSelect(next);
      setOpen(false);
      setQuery("");
      setState({ status: "idle" });
      setLocateError(null);
    },
    [onSelect],
  );

  const useMyLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setLocateError("This browser cannot share a location.");
      return;
    }
    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        choose({
          id: `device-${latitude.toFixed(3)}-${longitude.toFixed(3)}`,
          name: "My location",
          detail: formatCoordinates(latitude, longitude),
          latitude,
          longitude,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
        setLocating(false);
      },
      (error) => {
        setLocating(false);
        setLocateError(
          error.code === error.PERMISSION_DENIED
            ? "Location permission denied. Search for a place instead."
            : "Could not get a fix on your location.",
        );
      },
      { timeout: 10_000, maximumAge: 300_000 },
    );
  }, [choose]);

  const suggestions =
    state.status === "ready" ? state.results : FALLBACK_LOCATIONS.slice(0, 6);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-11 w-full justify-start border-white/15 bg-white/5 px-3 text-left text-white hover:bg-white/10 hover:text-white sm:w-72"
          >
            <MapPinIcon className="size-4 shrink-0 text-amber-300" />
            <span className="truncate">{location.name}</span>
            <span className="ml-auto hidden shrink-0 text-xs text-white/50 sm:inline">
              Change
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[min(22rem,calc(100vw-2rem))] p-0"
        >
          <Command shouldFilter={false}>
            <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2.5">
              <SearchIcon className="size-4 shrink-0 opacity-50" />
              <CommandPrimitive.Input
                value={query}
                onValueChange={changeQuery}
                placeholder="Search a city or town…"
                className="w-full bg-transparent text-sm outline-hidden placeholder:text-muted-foreground"
              />
              {state.status === "loading" ? (
                <Loader2Icon className="size-4 shrink-0 animate-spin opacity-60" />
              ) : null}
            </div>
            <CommandList className="max-h-72">
              {state.status === "error" ? (
                <div className="flex items-start gap-2 px-3 py-6 text-sm text-muted-foreground">
                  <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-amber-400" />
                  <span>{state.message}</span>
                </div>
              ) : state.status === "ready" && state.results.length === 0 ? (
                <CommandEmpty className="text-muted-foreground">
                  No place matches “{query.trim()}”.
                </CommandEmpty>
              ) : (
                <CommandGroup
                  heading={
                    state.status === "ready"
                      ? state.offline
                        ? "Offline results"
                        : "Places"
                      : "Popular places"
                  }
                >
                  {suggestions.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={item.id}
                      onSelect={() => choose(item)}
                      className="items-start gap-2.5 py-2"
                    >
                      <MapPinIcon className="mt-0.5 size-4 shrink-0 opacity-60" />
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate font-medium">{item.name}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {item.detail} ·{" "}
                          {formatCoordinates(item.latitude, item.longitude)}
                        </span>
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <div className="flex flex-col items-start gap-1">
        <Button
          variant="ghost"
          onClick={useMyLocation}
          disabled={locating}
          className="h-11 shrink-0 gap-2 text-white/80 hover:bg-white/10 hover:text-white"
        >
          {locating ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <CrosshairIcon className="size-4" />
          )}
          {locating ? "Locating…" : "Use my location"}
        </Button>
        {locateError ? (
          <p role="status" className="text-xs text-amber-300/90">
            {locateError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
