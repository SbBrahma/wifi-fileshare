/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { usePeerShare } from '../context/PeerShareContext';
import { FileTransfer } from '../types';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  X, 
  Zap, 
  Clock, 
  FileText,
  Video,
  Image as ImageIcon,
  Music,
  Archive,
  Code2,
  File
} from 'lucide-react';
import { formatBytes, formatSpeed, formatETA, getFileTypeCategory } from '../utils';

export const TransfersList: React.FC = () => {
  const { activeTransfers, cancelTransfer } = usePeerShare();

  const getFileIcon = (mimeType: string, fileName: string) => {
    const category = getFileTypeCategory(mimeType, fileName);
    const cn = "w-5 h-5 text-neutral-500 dark:text-neutral-400";
    
    switch (category) {
      case 'image':
        return <ImageIcon className="w-5 h-5 text-emerald-500" />;
      case 'video':
        return <Video className="w-5 h-5 text-sky-500" />;
      case 'audio':
        return <Music className="w-5 h-5 text-indigo-500" />;
      case 'document':
        return <FileText className="w-5 h-5 text-amber-500" />;
      case 'archive':
        return <Archive className="w-5 h-5 text-orange-500" />;
      case 'code':
        return <Code2 className="w-5 h-5 text-purple-500" />;
      default:
        return <File className={cn} />;
    }
  };

  const transfersArray = Object.values(activeTransfers) as FileTransfer[];

  if (transfersArray.length === 0) return null;

  return (
    <div id="active-transfers-panel" className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-white/20 dark:border-slate-800/40 backdrop-blur-xl shadow-xs">
      <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
        Active File Transfers ({transfersArray.length})
      </h3>

      <div id="transfers-items-container" className="flex flex-col gap-4">
        {transfersArray.map((transfer) => {
          const isSend = transfer.direction === 'send';
          
          return (
            <div 
              key={transfer.id} 
              id={`transfer-card-${transfer.id}`}
              className="p-4 rounded-xl bg-neutral-50/65 dark:bg-slate-950/20 border border-neutral-200/40 dark:border-slate-800/50 flex flex-col gap-3"
            >
              {/* Header: file info and cancel action */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-neutral-200/50 dark:border-slate-800/60 shadow-xs">
                    {getFileIcon(transfer.fileType, transfer.fileName)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-neutral-800 dark:text-neutral-100 truncate pr-1" title={transfer.fileName}>
                      {transfer.fileName}
                    </h4>
                    <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5 flex items-center gap-1">
                      <span>{formatBytes(transfer.fileSize)}</span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5">
                        {isSend ? (
                          <>
                            <ArrowUpRight className="w-3 h-3 text-sky-500" />
                            <span>Sending to {transfer.peerName}</span>
                          </>
                        ) : (
                          <>
                            <ArrowDownLeft className="w-3 h-3 text-emerald-500" />
                            <span>Receiving from {transfer.peerName}</span>
                          </>
                        )}
                      </span>
                    </p>
                  </div>
                </div>

                <button
                  id={`cancel-transfer-btn-${transfer.id}`}
                  onClick={() => cancelTransfer(transfer.id, transfer.direction)}
                  className="p-1 rounded-md text-neutral-400 hover:text-rose-500 dark:hover:text-rose-405 hover:bg-neutral-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                  title="Cancel item"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Progress Indicator and statistics */}
              <div>
                <div className="flex justify-between items-center text-[10px] text-neutral-500 dark:text-neutral-400 font-mono mb-1.5">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-0.5 font-bold">
                      <Zap className="w-3 h-3 text-amber-500" />
                      {formatSpeed(transfer.speed)}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Clock className="w-3 h-3 text-sky-500" />
                      {formatETA(transfer.eta)}
                    </span>
                  </div>
                  <span className="font-bold text-sky-500">
                    {transfer.progress}%
                  </span>
                </div>

                {/* Animated progress bar tray */}
                <div className="w-full h-1.5 bg-neutral-200 dark:bg-slate-800 rounded-full overflow-hidden relative">
                  <div 
                    id={`active-progress-bar-${transfer.id}`}
                    style={{ width: `${transfer.progress}%` }}
                    className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full transition-all duration-300 ease-out" 
                  />
                </div>
                
                <div className="flex justify-end text-[9px] text-neutral-450 dark:text-neutral-500 font-mono mt-1">
                  <span>{formatBytes(transfer.bytesTransferred)} of {formatBytes(transfer.fileSize)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
