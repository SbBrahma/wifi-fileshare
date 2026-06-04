/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PeerShareProvider, usePeerShare } from './context/PeerShareContext';
import { DeviceIndicator } from './components/DeviceIndicator';
import { ShareCard } from './components/ShareCard';
import { TransferArea } from './components/TransferArea';
import { TransfersList } from './components/TransfersList';
import { HistoryList } from './components/HistoryList';
import { ThemeToggle } from './components/ThemeToggle';
import { 
  Network, 
  ShieldCheck, 
  Share2, 
  FileCheck,
  Zap,
  Github
} from 'lucide-react';

function Dashboard() {
  const { connectionStatus } = usePeerShare();

  return (
    <main id="app-dashboard-frame" className="min-h-screen bg-slate-50 text-neutral-800 dark:bg-slate-950 dark:text-neutral-100 transition-colors duration-300">
      
      {/* Background radial soft ambient glows (Mica/Glass design language) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-15%] w-[50%] h-[40%] bg-sky-500/10 dark:bg-sky-500/5 blur-3xl rounded-full" />
        <div className="absolute top-[20%] right-[-10%] w-[45%] h-[45%] bg-indigo-500/10 dark:bg-indigo-500/5 blur-3xl rounded-full" />
        <div className="absolute bottom-[-10%] left-[20%] w-[45%] h-[40%] bg-emerald-500/5 dark:bg-emerald-500/3 blur-3xl rounded-full" />
      </div>

      <div className="relative z-1 max-w-7xl mx-auto px-4 py-6 md:py-10 flex flex-col gap-6 md:gap-8 min-h-screen">
        
        {/* Header navigation panel */}
        <header id="app-header" className="flex items-center justify-between p-4 md:p-5 rounded-2xl bg-white/60 dark:bg-slate-900/40 border border-white/20 dark:border-slate-800/40 backdrop-blur-xl shadow-xs">
          <div className="flex items-center gap-3">
            <div id="logo-icon-container" className="p-2.5 rounded-xl bg-sky-500 text-white shadow-md shadow-sky-500/20 flex items-center justify-center animate-pulse">
              <Share2 className="w-5 h-5" />
            </div>
            
            <div>
              <h1 className="text-base md:text-lg font-extrabold tracking-tight text-neutral-800 dark:text-neutral-100 flex items-center gap-2 heading-font">
                WiFi File Sharing
              </h1>
              <p className="text-[10px] md:text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                P2P web-share via WebRTC
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </header>

        {/* Local Device Identity Badge */}
        <div className="z-2">
          <DeviceIndicator />
        </div>

        {/* Principal grid workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Share QR Card & Connection setup (left column/top on mobile) */}
          <section id="share-controls-column" className="lg:col-span-5 h-full z-2">
            <ShareCard />
          </section>

          {/* Transfer Dropzone and Connected peer info (right column/bottom on mobile) */}
          <section id="transfer-workspace-column" className="lg:col-span-7 h-full z-2">
            <TransferArea />
          </section>
        </div>

        {/* Dynamic real-time transfers section */}
        <section id="active-transfers-section" className="z-2 flex flex-col gap-6">
          <TransfersList />
          <HistoryList />
        </section>

        {/* Sub-footer features banner */}
        <div id="features-highlights-row" className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 text-center">
          <div className="p-4 rounded-xl bg-white/30 dark:bg-slate-900/20 border border-white/10 dark:border-slate-800/20 backdrop-blur-md flex flex-col items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <h4 className="text-xs font-bold text-neutral-700 dark:text-neutral-350">100% Private & Direct</h4>
            <p className="text-[10px] text-neutral-400 dark:text-neutral-500">File chunk arrays are transferred directly between browser layers without any cloud records.</p>
          </div>
          <div className="p-4 rounded-xl bg-white/30 dark:bg-slate-900/20 border border-white/10 dark:border-slate-800/20 backdrop-blur-md flex flex-col items-center gap-2">
            <Zap className="w-5 h-5 text-sky-500 animate-pulse" />
            <h4 className="text-xs font-bold text-neutral-700 dark:text-neutral-350">Ultra-fast P2P Link</h4>
            <p className="text-[10px] text-neutral-400 dark:text-neutral-500">Leverage structural local area network (LAN/WiFi) speeds directly without cloud transit.</p>
          </div>
          <div className="p-4 rounded-xl bg-white/30 dark:bg-slate-900/20 border border-white/10 dark:border-slate-800/20 backdrop-blur-md flex flex-col items-center gap-2">
            <FileCheck className="w-5 h-5 text-indigo-500" />
            <h4 className="text-xs font-bold text-neutral-700 dark:text-neutral-350">No Installation</h4>
            <p className="text-[10px] text-neutral-400 dark:text-neutral-500">Works in standard Chrome, Safari, and Safari Mobile browsers without helper desktop packages.</p>
          </div>
        </div>

        {/* Bottom standard trademark elements */}
        <footer id="global-footer" className="mt-auto py-6 border-t border-neutral-200/40 dark:border-slate-800/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-400 dark:text-neutral-500">
          <p>© 2026 WiFi File Sharing. Styled with love and Fluent Design framework.</p>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">Documentation</a>
            <span>•</span>
            <a href="#" className="hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">Privacy Principles</a>
            <span>•</span>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span className="text-[10px] font-mono leading-none">P2P Core Active</span>
            </div>
          </div>
        </footer>

      </div>
    </main>
  );
}

export default function App() {
  return (
    <PeerShareProvider>
      <Dashboard />
    </PeerShareProvider>
  );
}
