/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { usePeerShare } from '../context/PeerShareContext';
import { 
  QrCode, 
  Link, 
  Copy, 
  Check, 
  ArrowRight, 
  Wifi, 
  Smartphone, 
  Sparkles,
  Info
} from 'lucide-react';
import QRCode from 'qrcode';

export const ShareCard: React.FC = () => {
  const { joinCode, connectToPeer, connectionStatus, errorMessage } = usePeerShare();
  const [copied, setCopied] = useState(false);
  const [targetCode, setTargetCode] = useState('');
  const [isFormConnecting, setIsFormConnecting] = useState(false);
  const [formError, setFormError] = useState('');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Construct direct join share URL
  const shareUrl = `${window.location.origin}${window.location.pathname}#join=${joinCode}`;

  useEffect(() => {
    if (canvasRef.current && joinCode) {
      QRCode.toCanvas(canvasRef.current, shareUrl, {
        width: 150,
        margin: 1.5,
        color: {
          dark: '#0f172a',  // deep slate-900
          light: '#ffffff'  // white background
        }
      }, (err) => {
        if (err) console.error("Failed to generate QR Code canvas", err);
      });
    }
  }, [joinCode, shareUrl]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleManualConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = targetCode.trim().toLowerCase();
    
    if (cleanCode.length !== 6) {
      setFormError("Join code must be exactly 6 characters.");
      return;
    }

    if (cleanCode === joinCode) {
      setFormError("You cannot connect to yourself!");
      return;
    }

    setFormError('');
    setIsFormConnecting(true);

    const success = await connectToPeer(cleanCode);
    setIsFormConnecting(false);
    
    if (success) {
      setTargetCode('');
    } else {
      setFormError("Device not found. Make sure the other tab is open on the same website!");
    }
  };

  return (
    <div 
      id="share-card-container" 
      className="p-5 md:p-6 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-white/20 dark:border-slate-800/40 backdrop-blur-xl shadow-xs flex flex-col justify-between h-full gap-5"
    >
      <div>
        <div className="flex items-center gap-2 mb-2">
          <QrCode className="w-5.5 h-5.5 text-sky-500" />
          <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100 heading-font">
            Connect Devices
          </h2>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed mb-4">
          Scan this QR code with your mobile (Android/iOS) or copy the share link to pair and start real-time file sharing instantly.
        </p>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-6 py-1 bg-neutral-50/50 dark:bg-slate-950/20 p-4 rounded-xl border border-neutral-100 dark:border-slate-900/50">
        {/* QR Code Canvas */}
        <div id="qr-code-canvas-frame" className="relative group p-1.5 bg-white rounded-lg shadow-sm border border-neutral-200/40 dark:border-neutral-800 flex items-center justify-center shrink-0">
          <canvas ref={canvasRef} id="qr-canvas" className="w-[120px] h-[120px] md:w-[130px] md:h-[130px]" />
          <div className="absolute inset-0 bg-sky-500/5 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
            <Smartphone className="w-8 h-8 text-sky-500 drop-shadow-sm animate-bounce" />
          </div>
        </div>

        {/* Links & Quick Copy ID */}
        <div className="flex-1 w-full flex flex-col gap-3 min-w-0">
          <div>
            <span className="text-tiny uppercase font-bold tracking-wider text-neutral-400 dark:text-neutral-500 block mb-1">
              Direct Connection Code
            </span>
            <div className="flex items-center gap-2">
              <span id="numeric-join-code" className="text-xl md:text-2xl font-mono font-extrabold tracking-widest text-sky-600 dark:text-sky-400 select-all">
                {joinCode.toUpperCase()}
              </span>
              <div className="px-2 py-0.5 rounded-md bg-sky-500/10 dark:bg-sky-400/10 border border-sky-500/15 text-[10px] font-semibold text-sky-600 dark:text-sky-300 flex items-center gap-0.5">
                <Sparkles className="w-3 h-3 text-sky-500" />
                6-digit code
              </div>
            </div>
          </div>

          <div>
            <span className="text-tiny uppercase font-bold tracking-wider text-neutral-400 dark:text-neutral-500 block mb-1">
              Shareable Direct URL
            </span>
            <div className="flex items-center gap-1.5 w-full">
              <div className="px-2.5 py-1.5 text-xs font-mono rounded-lg bg-neutral-100 dark:bg-slate-850 text-neutral-600 dark:text-neutral-400 border border-neutral-200/40 dark:border-slate-800/40 truncate flex-1 flex items-center gap-2">
                <Link className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
                <span className="truncate">{shareUrl}</span>
              </div>
              <button
                id="copy-link-btn"
                onClick={handleCopyLink}
                className={`p-2 rounded-lg border cursor-pointer transition-all flex items-center justify-center shrink-0 active:scale-95 ${
                  copied 
                    ? 'bg-emerald-50 border-emerald-300 dark:bg-emerald-900/20 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400' 
                    : 'bg-white hover:bg-neutral-50 dark:bg-slate-850 dark:hover:bg-slate-800 border-neutral-200/60 dark:border-slate-800/60 text-neutral-500 dark:text-neutral-300'
                }`}
                title="Copy direct share link"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="border-t border-neutral-200/40 dark:border-slate-800/40 my-1"></div>
        
        {/* Manual Connection Input Form */}
        <form onSubmit={handleManualConnect} className="mt-4">
          <span className="text-tiny uppercase font-bold tracking-wider text-neutral-400 dark:text-neutral-500 block mb-2">
            Establish Peer Connection
          </span>
          <div className="flex items-center gap-2">
            <input
              id="peer-code-input"
              type="text"
              placeholder="Enter friend's 6-digit code"
              value={targetCode}
              onChange={(e) => {
                setTargetCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6));
                setFormError('');
              }}
              className="px-3.5 py-2 text-sm rounded-xl bg-white dark:bg-slate-850 border border-neutral-200/60 dark:border-slate-800/60 text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500/50 w-full uppercase font-mono tracking-wider"
              maxLength={6}
            />
            <button
              id="peer-connect-submit"
              type="submit"
              disabled={isFormConnecting || targetCode.length !== 6}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-sky-500 hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-700 text-white transition-all shadow-xs shrink-0 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95"
            >
              {isFormConnecting ? (
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
              ) : (
                <>
                  <span>Connect</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {formError && (
            <p className="text-xs text-rose-500 mt-2 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-rose-500"></span>
              {formError}
            </p>
          )}

          {errorMessage && !formError && (
            <p className="text-xs text-rose-400 mt-2 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-rose-500"></span>
              {errorMessage}
            </p>
          )}
        </form>
      </div>
    </div>
  );
};
