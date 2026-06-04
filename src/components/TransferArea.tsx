/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { usePeerShare } from '../context/PeerShareContext';
import { 
  FileUp, 
  UploadCloud, 
  Smartphone, 
  Laptop, 
  Tablet, 
  AlertCircle, 
  CloudLightning,
  XCircle,
  HelpCircle
} from 'lucide-react';

export const TransferArea: React.FC = () => {
  const { sendFiles, connectedDevices, disconnectDevice } = usePeerShare();
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      sendFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      sendFiles(e.target.files);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'desktop':
        return <Laptop className="w-5 h-5 text-sky-500" />;
      case 'mobile':
        return <Smartphone className="w-5 h-5 text-emerald-500" />;
      case 'tablet':
        return <Tablet className="w-5 h-5 text-indigo-500" />;
      default:
        return <HelpCircle className="w-5 h-5 text-neutral-400" />;
    }
  };

  return (
    <div id="transfer-area-container" className="flex flex-col gap-5 h-full">
      {/* Connected Devices Grid Panel */}
      <div id="connected-devices-card" className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-white/20 dark:border-slate-800/40 backdrop-blur-xl shadow-xs">
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Connected Peer Devices
        </h3>
        
        {connectedDevices.length === 0 ? (
          <div id="no-devices-indicator" className="py-4 px-3 text-center rounded-xl bg-neutral-50/50 dark:bg-slate-950/20 border border-dashed border-neutral-250/50 dark:border-slate-800/60 text-xs text-neutral-400 dark:text-neutral-500 flex flex-col items-center gap-1.5 matches-win11">
            <CloudLightning className="w-6 h-6 text-neutral-300 dark:text-neutral-700 animate-pulse" />
            <span>Discoverable to other devices on this network. Setup sharing to proceed!</span>
          </div>
        ) : (
          <div id="devices-listing-grid" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {connectedDevices.map((dev) => (
              <div 
                key={dev.id} 
                id={`peer-device-${dev.id}`}
                className="p-3.5 rounded-xl bg-neutral-100/50 hover:bg-neutral-100 dark:bg-slate-950/25 dark:hover:bg-slate-950/40 border border-neutral-200/50 dark:border-slate-800/60 flex items-center justify-between gap-3 group transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-neutral-200/40 dark:border-slate-800/60 shadow-xs">
                    {getDeviceIcon(dev.deviceType)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate pr-2">
                      {dev.name}
                    </h4>
                    <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono mt-0.5 uppercase">
                      {dev.os} • {dev.browser}
                    </p>
                  </div>
                </div>

                <button
                  id={`disconnect-btn-${dev.id}`}
                  onClick={() => disconnectDevice(dev.id)}
                  className="p-1 px-1.5 text-[10px] font-semibold text-rose-600 hover:text-rose-100 bg-rose-500/10 hover:bg-rose-600 rounded-lg dark:text-rose-400 border border-rose-500/15 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer active:scale-95"
                  title="Disconnect peer"
                >
                  Disconnect
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Drag & Drop Zone */}
      <div 
        id="drag-dropzone-frame"
        className="flex-1"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        <input 
          id="file-selector-hidden-input"
          ref={fileInputRef}
          type="file" 
          multiple 
          onChange={handleChange} 
          className="hidden" 
        />

        <div 
          id="dropzone-area"
          onClick={onButtonClick}
          className={`h-full min-h-[200px] md:min-h-[290px] p-6 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center transition-all duration-300 relative cursor-pointer select-none overflow-hidden ${
            isDragActive 
              ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-500/10 scale-[1.01]' 
              : 'border-neutral-250 hover:border-sky-400 dark:border-slate-850 bg-white/70 hover:bg-neutral-50/40 dark:bg-slate-900/60 dark:hover:bg-slate-900/90 backdrop-blur-xl'
          }`}
        >
          {/* Subtle background glow when active */}
          <div className={`absolute w-44 h-44 bg-sky-500/10 dark:bg-sky-400/10 blur-3xl rounded-full pointer-events-none transition-transform duration-500 ${isDragActive ? 'scale-150' : ''}`} />

          <div className="relative z-1 pointer-events-none flex flex-col items-center gap-4 max-w-sm">
            <div className={`p-4 rounded-full bg-neutral-100 dark:bg-slate-800/80 border border-neutral-200/40 dark:border-slate-700/40 shadow-xs transition-transform duration-300 ${isDragActive ? 'rotate-12 scale-110' : ''}`}>
              <UploadCloud className={`w-10 h-10 ${isDragActive ? 'text-sky-500 animate-pulse' : 'text-neutral-400 dark:text-neutral-500'}`} />
            </div>

            <div>
              <h3 className="text-base font-bold text-neutral-800 dark:text-neutral-100 heading-font">
                {isDragActive ? 'Drop your files here!' : 'Drag & Drop Files'}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-[280px]">
                or click to browse your desktop, documents, videos, and images
              </p>
            </div>

            {connectedDevices.length === 0 && (
              <div id="no-peer-warning-tag" className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-medium animate-pulse">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Pair a device first to start transferring</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
