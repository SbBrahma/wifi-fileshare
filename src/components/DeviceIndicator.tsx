/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { usePeerShare } from '../context/PeerShareContext';
import { 
  Laptop, 
  Smartphone, 
  Tablet, 
  HelpCircle, 
  Edit2, 
  Check, 
  X,
  Wifi, 
  Network
} from 'lucide-react';
import { getLocalDeviceInfo } from '../utils';

export const DeviceIndicator: React.FC = () => {
  const { peerId, peerName, connectionStatus, connectedDevices, updateDeviceName } = usePeerShare();
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(peerName);
  
  const deviceInfo = getLocalDeviceInfo();

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'desktop':
        return <Laptop id="laptop-icon" className="w-6 h-6 md:w-8 md:h-8 text-sky-500" />;
      case 'mobile':
        return <Smartphone id="phone-icon" className="w-6 h-6 md:w-8 md:h-8 text-emerald-500" />;
      case 'tablet':
        return <Tablet id="tablet-icon" className="w-6 h-6 md:w-8 md:h-8 text-indigo-500" />;
      default:
        return <HelpCircle id="unknown-device-icon" className="w-6 h-6 md:w-8 md:h-8 text-gray-500" />;
    }
  };

  const handleSave = () => {
    const trimmed = tempName.trim();
    if (trimmed && trimmed !== peerName) {
      updateDeviceName(trimmed);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempName(peerName);
    setIsEditing(false);
  };

  const activePeersCount = connectedDevices.length;

  return (
    <div 
      id="device-indicator-panel" 
      className="p-4 md:p-5 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-white/20 dark:border-slate-800/40 backdrop-blur-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
    >
      <div className="flex items-center gap-3.5">
        <div id="self-device-icon-frame" className="p-2.5 rounded-xl bg-neutral-100/80 dark:bg-slate-800/60 border border-neutral-200/30 dark:border-slate-700/40 shadow-xs flex items-center justify-center">
          {getDeviceIcon(deviceInfo.deviceType)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {isEditing ? (
              <div id="rename-form" className="flex items-center gap-1.5 w-full max-w-xs">
                <input
                  id="rename-input"
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave();
                    if (e.key === 'Escape') handleCancel();
                  }}
                  className="px-2.5 py-1 text-sm rounded-lg bg-white dark:bg-slate-800 border border-neutral-300 dark:border-slate-700 text-neutral-800 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 w-full font-medium"
                  maxLength={25}
                  autoFocus
                />
                <button
                  id="save-rename-btn"
                  onClick={handleSave}
                  className="p-1 rounded-md text-emerald-600 dark:text-emerald-400 hover:bg-neutral-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  id="cancel-rename-btn"
                  onClick={handleCancel}
                  className="p-1 rounded-md text-rose-600 dark:text-rose-400 hover:bg-neutral-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div id="name-display" className="flex items-center gap-1.5 max-w-full">
                <span className="font-semibold text-neutral-800 dark:text-neutral-100 truncate text-base md:text-lg">
                  {peerName}
                </span>
                <button
                  id="start-rename-btn"
                  onClick={() => {
                    setTempName(peerName);
                    setIsEditing(true);
                  }}
                  className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-150/40 dark:hover:bg-slate-800/40 rounded-md transition-colors cursor-pointer"
                  title="Rename device"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 text-xs text-neutral-500 dark:text-neutral-400 font-mono">
            <span>{deviceInfo.os}</span>
            <span className="text-neutral-300 dark:text-neutral-700">•</span>
            <span>{deviceInfo.browser}</span>
            <span className="text-neutral-300 dark:text-neutral-700">•</span>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span>
              <span>{peerId ? peerId.replace('wifishare-', '').toUpperCase() : '------'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div id="service-status-pill" className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-100 dark:bg-slate-800/50 border border-neutral-200/40 dark:border-slate-800/60 font-medium">
          <Network className="w-3.5 h-3.5 text-sky-500" />
          <span className="text-xs text-neutral-600 dark:text-neutral-300 font-mono">
            WebRTC Direct
          </span>
        </div>

        <div id="connections-status-pill" className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-100 dark:bg-slate-800/50 border border-neutral-200/40 dark:border-slate-800/60 font-medium">
          <Wifi className={`w-3.5 h-3.5 ${activePeersCount > 0 ? 'text-emerald-500 animate-pulse' : 'text-neutral-400'}`} />
          <span className="text-xs text-neutral-600 dark:text-neutral-300 font-mono">
            {activePeersCount === 1 
              ? '1 Connected Device'
              : `${activePeersCount} Connected Devices`
            }
          </span>
        </div>
      </div>
    </div>
  );
};
