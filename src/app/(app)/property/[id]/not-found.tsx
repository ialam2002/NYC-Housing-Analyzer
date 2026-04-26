import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function PropertyNotFound() {
  return (
    <section className="mx-auto max-w-xl rounded-lg border bg-card p-8 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Property Not Found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The listing may have been removed or the URL is invalid.
      </p>
      <div className="mt-5 flex items-center justify-center gap-2">
        <Link href="/search" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Back to Search
        </Link>
      </div>
    </section>
  );
}

