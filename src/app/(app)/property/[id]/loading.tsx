export default function PropertyLoading() {
  return (
    <section className="space-y-6">
      <div className="rounded-lg border bg-card p-5">
        <div className="h-6 w-64 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-4 w-80 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded bg-muted" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-40 animate-pulse rounded-lg border bg-card" />
        <div className="h-40 animate-pulse rounded-lg border bg-card" />
        <div className="h-40 animate-pulse rounded-lg border bg-card" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-56 animate-pulse rounded-lg border bg-card" />
        <div className="h-56 animate-pulse rounded-lg border bg-card" />
      </div>
    </section>
  );
}

