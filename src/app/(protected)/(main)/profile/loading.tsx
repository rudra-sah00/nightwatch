export default function ProfileLoading() {
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-12 w-full animate-pulse">
      {/* Profile card - avatar + name/email fields */}
      <section className="bg-card border border-border rounded-xl shadow-sm p-6 md:p-8 flex flex-col items-center md:items-start md:flex-row gap-6 md:gap-8 min-h-[320px]">
        <div className="w-48 h-48 md:w-56 md:h-56 bg-muted rounded-xl shrink-0" />
        <div className="flex-1 space-y-6 w-full pt-4">
          <div className="h-10 w-48 bg-muted rounded" />
          <div className="h-8 w-64 bg-muted rounded" />
          <div className="space-y-2">
            <div className="h-4 w-20 bg-muted rounded" />
            <div className="h-8 w-full max-w-sm bg-muted rounded" />
          </div>
        </div>
      </section>

      {/* Preferences section */}
      <section className="bg-card border border-border rounded-xl shadow-sm p-8 space-y-6">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-12 w-full bg-muted rounded" />
        <div className="h-12 w-full bg-muted rounded" />
        <div className="h-12 w-full bg-muted rounded" />
      </section>

      {/* Security section */}
      <section className="bg-card border border-border rounded-xl shadow-sm p-8 space-y-6">
        <div className="h-8 w-56 bg-muted rounded" />
        <div className="space-y-4 max-w-2xl">
          <div className="space-y-2">
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="h-10 w-full bg-muted rounded" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-28 bg-muted rounded" />
            <div className="h-10 w-full bg-muted rounded" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-36 bg-muted rounded" />
            <div className="h-10 w-full bg-muted rounded" />
          </div>
        </div>
      </section>
    </main>
  );
}
