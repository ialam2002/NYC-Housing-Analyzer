import Link from "next/link";

import { AuthControls } from "@/components/common/auth-controls";
import { FavoritesCountBadge } from "@/components/common/favorites-count-badge";

const NAV_ITEMS = [
  { href: "/search", label: "Search" },
  { href: "/favorites", label: "Favorites" },
];

export function AppHeader() {
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          RentWise NYC
        </Link>
        <div className="flex items-center gap-4">
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} className="flex items-center gap-1.5 transition-colors hover:text-foreground">
                <span>{item.label}</span>
                {item.href === "/favorites" ? <FavoritesCountBadge /> : null}
              </Link>
            ))}
          </nav>
          <AuthControls />
        </div>
      </div>
    </header>
  );
}

