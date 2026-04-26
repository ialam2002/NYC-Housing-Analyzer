import { FavoritesPageClient } from "@/components/feature/favorites-page-client";

export default function FavoritesPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Saved Properties</h1>
      <FavoritesPageClient />
    </section>
  );
}

