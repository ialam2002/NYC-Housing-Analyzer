import { AppHeader } from "@/components/common/app-header";
import { FavoritesActionToast } from "@/components/common/favorites-action-toast";
import { Providers } from "@/app/(app)/providers";

export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <Providers>
      <div className="min-h-screen bg-muted/40">
        <AppHeader />
        <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
        <FavoritesActionToast />
      </div>
    </Providers>
  );
}

