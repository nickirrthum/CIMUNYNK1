import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-zinc-50 overflow-hidden font-sans">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — fixed overlay on mobile, static on desktop */}
      <div className={`fixed inset-y-0 left-0 z-30 transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:flex md:flex-col md:shrink-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-[#0A0A0B] shrink-0 border-b border-white/[0.06]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-white/60 hover:text-white transition-colors p-0.5"
            aria-label="Abrir menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center shrink-0">
              <span className="text-white text-[9px] font-bold tracking-tight">FC</span>
            </div>
            <span className="text-white font-semibold text-sm tracking-tight">Fluxo de Caixa</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 py-4 md:px-8 md:py-8">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
