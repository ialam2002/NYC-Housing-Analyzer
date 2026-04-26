"use client";

import { signIn, signOut, useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";

export function AuthControls() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <Button disabled variant="outline" size="sm">
        Checking auth...
      </Button>
    );
  }

  if (!session?.user) {
    return (
      <Button variant="outline" size="sm" onClick={() => signIn()}>
        Sign in
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden max-w-44 truncate text-xs text-muted-foreground sm:block">{session.user.email}</span>
      <Button variant="ghost" size="sm" onClick={() => signOut()}>
        Sign out
      </Button>
    </div>
  );
}

