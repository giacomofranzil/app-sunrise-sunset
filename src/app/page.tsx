import { SunriseDashboard } from "@/components/sunrise-dashboard";

export default function Home() {
  return (
    <main className="relative flex-1">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(80%_60%_at_50%_0%,rgba(251,191,36,0.16),transparent_60%),radial-gradient(60%_50%_at_10%_20%,rgba(129,140,248,0.14),transparent_60%)]"
      />
      <SunriseDashboard />
    </main>
  );
}
