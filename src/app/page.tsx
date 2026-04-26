import Link from "next/link";

import type { Metadata } from "next";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "RentWise NYC — NYC Housing Intelligence Platform",
  description:
    "Evaluate NYC apartments before signing. Compare transit, complaints, amenities, violations, and building condition in one RentWise Score dashboard.",
};

export default function HomePage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-12 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">RentWise NYC</h1>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <Link className="hover:text-foreground" href="/search">
            Search
          </Link>
          <Link className="hover:text-foreground" href="/favorites">
            Favorites
          </Link>
        </div>
      </header>

      <main className="grid flex-1 items-center gap-8 md:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-6">
          <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Housing Intelligence Platform</p>
          <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Evaluate NYC rentals before you sign the lease.
          </h2>
          <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
            Compare complaints, transit convenience, building condition, and nearby amenities in one score-backed
            dashboard.
          </p>
          <form action="/search" className="flex w-full max-w-xl flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row">
            <input
              type="text"
              name="q"
              placeholder="Search address or neighborhood"
              className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              Explore
            </button>
          </form>
        </section>

        <section className="rounded-xl border bg-card p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">MVP metrics</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MetricCard label="Transit" value="0-100" />
            <MetricCard label="Complaints" value="311" />
            <MetricCard label="Amenities" value="Nearby" />
            <MetricCard label="Building" value="HPD + DOB" />
          </div>
        </section>
      </main>

      <section className="my-16 space-y-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">Featured Neighborhoods</h2>
          <p className="text-sm text-muted-foreground">Explore popular NYC neighborhoods with RentWise Intelligence</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <NeighborhoodCard
            name="Upper West Side, Manhattan"
            avgRent={3200}
            avgScore={76}
            transit={82}
            amenities={89}
            neighborhoods="9,521"
          />
          <NeighborhoodCard
            name="Williamsburg, Brooklyn"
            avgRent={2850}
            avgScore={74}
            transit={78}
            amenities={85}
            neighborhoods="8,234"
          />
          <NeighborhoodCard
            name="Long Island City, Queens"
            avgRent={2600}
            avgScore={72}
            transit={75}
            amenities={82}
            neighborhoods="6,891"
          />
          <NeighborhoodCard
            name="Park Slope, Brooklyn"
            avgRent={3400}
            avgScore={79}
            transit={81}
            amenities={88}
            neighborhoods="7,456"
          />
        </div>
      </section>

      <section className="mb-12 space-y-6 rounded-2xl border bg-card/50 p-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">Always Compare Before Signing</h2>
          <p className="max-w-2xl text-base text-muted-foreground">
            RentWise combines public datasets to give you the full picture: transit, complaints, amenities, and
            building condition. Make informed decisions about your next apartment.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <FeatureCard
            icon="📊"
            title="RentWise Score"
            description="Weighted score combining transit, complaints, amenities, and building condition."
          />
          <FeatureCard
            icon="🗽"
            title="311 Complaints"
            description="Real noise, heat, rodents, sanitation data from NYC Open Data."
          />
          <FeatureCard
            icon="🚇"
            title="Transit Access"
            description="Walking distance to subway stations with train lines and frequency."
          />
        </div>
        <div className="pt-4">
          <Link href="/search" className={buttonVariants({ size: "lg" })}>
            Start Exploring →
          </Link>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}

function NeighborhoodCard({
  name,
  avgRent,
  avgScore,
  transit,
  amenities,
  neighborhoods,
}: {
  name: string;
  avgRent: number;
  avgScore: number;
  transit: number;
  amenities: number;
  neighborhoods: string;
}) {
  return (
    <Link
      href={`/search?q=${encodeURIComponent(name.split(",")[0])}`}
      className="group rounded-lg border bg-card p-5 transition-all hover:border-primary/50 hover:bg-card/80"
    >
      <h3 className="text-sm font-semibold group-hover:text-primary">{name}</h3>
      <p className="mt-3 flex items-baseline gap-2 text-lg font-semibold">
        ${avgRent.toLocaleString()}
        <span className="text-xs text-muted-foreground">avg/month</span>
      </p>
      <div className="mt-4 space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">RentWise Score</span>
          <span className="font-semibold">{avgScore}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Transit</span>
          <span className="font-semibold">{transit}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Amenities</span>
          <span className="font-semibold">{amenities}</span>
        </div>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">{neighborhoods} properties tracked</p>
    </Link>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="space-y-2 rounded-lg bg-background/50 p-4">
      <p className="text-2xl">{icon}</p>
      <h4 className="text-sm font-semibold">{title}</h4>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

