export default function LibraryPage() {
  return (
    <main className="min-h-full bg-background pb-32">
      {/* Hero Header */}
      <div className="mb-12 bg-neo-orange relative overflow-hidden rounded-2xl">
        <div className="absolute -top-10 -right-10 w-64 h-64 border-[4px] border-border rounded-full opacity-20" />
        <div className="absolute top-10 left-1/4 w-24 h-24 bg-neo-red border-[4px] border-border opacity-30 rotate-12" />

        <div className="container mx-auto px-6 py-12 md:px-10 relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <div>
              <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter text-foreground font-headline uppercase leading-none mb-4">
                MY
                <br />
                <span className="bg-background text-foreground px-4 inline-block border-[4px] border-border -rotate-1 ml-2 mt-2">
                  LIBRARY
                </span>
              </h1>
              <p className="font-headline font-bold uppercase tracking-widest text-foreground bg-background inline-block px-4 py-2 border-[3px] border-border">
                All your content in one place
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 md:px-10">
        <div className="flex flex-col items-center justify-center py-24">
          <p className="text-sm text-foreground/30 font-headline uppercase tracking-widest">
            Coming soon
          </p>
        </div>
      </div>
    </main>
  );
}
