import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";

import { ComplaintTrendChartCard } from "@/components/feature/complaint-trend-chart-card";
import { FavoriteToggleButton } from "@/components/feature/favorite-toggle-button";
import { PropertyMapCard } from "@/components/feature/property-map-card";
import { authOptions } from "@/server/auth/options";
import { listFavorites } from "@/server/services/favorites.service";
import { getPropertyDashboard } from "@/server/services/property.service";

type PropertyPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PropertyPageProps): Promise<Metadata> {
  const { id } = await params;

  return {
    title: `Property ${id} | RentWise NYC`,
    description: "NYC rental intelligence with transit, complaint, violation, and amenity insights.",
  };
}

export default async function PropertyPage({ params }: PropertyPageProps) {
  const { id } = await params;
  const [dashboard, session] = await Promise.all([getPropertyDashboard(id), getServerSession(authOptions)]);

  if (!dashboard) {
    notFound();
  }

  const favoriteIds =
    session?.user?.id
      ? new Set((await listFavorites(session.user.id)).items.map((item) => item.propertyId))
      : new Set<string>();

  const { property, scoreBreakdown, transit, complaints, violations, amenities } = dashboard;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{property.title}</h1>
          <p className="text-sm text-muted-foreground">
            {property.addressLine1}, {property.neighborhood}, {property.borough} {property.postalCode}
          </p>
          <p className="text-sm text-muted-foreground">
            ${property.rent.toLocaleString()} · {property.bedrooms ?? "-"} bd · {property.bathrooms ?? "-"} ba
            {property.squareFeet ? ` · ${property.squareFeet} sqft` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3 sm:flex-col sm:items-end">
          <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium">
            RentWise Score: {scoreBreakdown?.overall ?? "N/A"}
          </span>
          <FavoriteToggleButton propertyId={property.id} initialIsFavorite={favoriteIds.has(property.id)} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <h2 className="text-sm font-semibold">Score Breakdown</h2>
          {scoreBreakdown ? (
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <span>Transit: {scoreBreakdown.transit}</span>
              <span>Complaints: {scoreBreakdown.complaints}</span>
              <span>Amenities: {scoreBreakdown.amenities}</span>
              <span>Safety: {scoreBreakdown.safety}</span>
              <span>Building: {scoreBreakdown.buildingCondition}</span>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No score snapshot available yet.</p>
          )}
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h2 className="text-sm font-semibold">Transit</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Best walk: {transit.bestWalkingMinutes ?? "N/A"} min · Avg walk: {transit.avgWalkingMinutes ?? "N/A"} min
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {transit.nearestStations.slice(0, 3).map((station) => (
              <li key={station.stationId}>
                {station.name} ({station.lines.join(", ")}) · {station.walkingMinutes} min
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h2 className="text-sm font-semibold">Complaints</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Total: {complaints.total} · Open: {complaints.open}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Noise {complaints.byCategory.NOISE} · Heat/Hot Water {complaints.byCategory.HEAT_HOT_WATER} · Rodents {complaints.byCategory.RODENTS}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PropertyMapCard
          title={property.title}
          latitude={property.latitude}
          longitude={property.longitude}
          stations={transit.nearestStations}
        />
        <ComplaintTrendChartCard trends={complaints.trends} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <h2 className="text-sm font-semibold">Recent Violations</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Total: {violations.total} · Open: {violations.open}
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {violations.recent.length === 0 ? (
              <li className="text-muted-foreground">No violations found.</li>
            ) : (
              violations.recent.slice(0, 5).map((violation) => (
                <li key={violation.id} className="rounded-md bg-muted/50 p-2">
                  <p className="font-medium">
                    {violation.agency} · {violation.severity}
                  </p>
                  <p className="text-xs text-muted-foreground">{violation.description}</p>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h2 className="text-sm font-semibold">Nearby Amenities</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Grocery {amenities.byType.GROCERY} · Pharmacy {amenities.byType.PHARMACY} · Parks {amenities.byType.PARK} · Gyms {amenities.byType.GYM}
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {amenities.nearest.length === 0 ? (
              <li className="text-muted-foreground">No amenities found.</li>
            ) : (
              amenities.nearest.slice(0, 6).map((amenity) => (
                <li key={amenity.id} className="flex items-center justify-between rounded-md bg-muted/50 px-2 py-1">
                  <span>
                    {amenity.name} ({amenity.type})
                  </span>
                  <span className="text-xs text-muted-foreground">{amenity.distanceMeters} m</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}

