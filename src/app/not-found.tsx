'use client';

import { ArrowLeft, Home, Search } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f5f0e8] text-[#1a1a1a] selection:bg-[#ffcc00] selection:text-[#1a1a1a] flex items-center justify-center p-6 font-headline overflow-hidden">
      {/* Dynamic Background Patterns */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.05] z-0">
        <div className="absolute top-[10%] left-[5%] w-[30vw] h-[30vw] border-[10vw] border-[#1a1a1a] rounded-full" />
        <div className="absolute bottom-[10%] right-[5%] w-[40vw] h-[40vw] border-[12vw] border-[#1a1a1a] rotate-45" />
      </div>

      <div className="relative z-10 max-w-2xl w-full text-center">
        {/* Massive 404 text with neo-brutal treatment */}
        <div className="relative inline-block mb-12">
          <h1 className="text-[12rem] md:text-[20rem] font-black uppercase tracking-tighter leading-none select-none text-[#1a1a1a] drop-shadow-[10px_10px_0px_#ffcc00] animate-in slide-in-from-bottom-12 duration-500">
            404
          </h1>
          <div className="absolute -bottom-4 right-0 md:right-4 bg-[#e63b2e] text-white px-6 py-2 border-[4px] border-[#1a1a1a] neo-shadow-sm rotate-6 font-black text-xl md:text-2xl uppercase tracking-tighter">
            MISSION FAILED
          </div>
        </div>

        <div className="space-y-6 animate-in fade-in duration-700 delay-300">
          <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tight leading-tight">
            LOST IN THE SECTOR
          </h2>
          <p className="text-lg md:text-xl font-bold uppercase tracking-wide text-[#1a1a1a]/60 max-w-lg mx-auto leading-relaxed">
            THE PAGE YOU ARE LOOKING FOR DOES NOT EXIST OR WAS RELOCATED BY HIGH
            COMMAND.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-12">
            <Button
              asChild
              variant="neo"
              size="none"
              className="px-10 py-5 text-lg tracking-widest"
            >
              <Link href="/">
                <Home className="w-6 h-6 group-hover:scale-110 transition-transform mr-3" />
                ABORT TO HOME
              </Link>
            </Button>

            <Button
              type="button"
              variant="neo-outline"
              size="none"
              onClick={() => window.history.back()}
              className="px-10 py-5 text-lg tracking-widest bg-white"
            >
              <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform mr-3" />
              PREVIOUS SECTOR
            </Button>
          </div>
        </div>

        {/* Humorous search hint */}
        <div className="mt-20 flex items-center justify-center gap-2 text-[#1a1a1a]/30 font-black uppercase tracking-widest text-[10px] md:text-xs">
          <Search className="w-4 h-4" />
          <span>Scanning for signals... No data fragments found.</span>
        </div>
      </div>
    </div>
  );
}
