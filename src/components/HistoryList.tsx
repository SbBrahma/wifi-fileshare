/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { usePeerShare } from '../context/PeerShareContext';
import { 
  Download, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  ExternalLink,
  FileText,
  Video,
  Image as ImageIcon,
  Music,
  Archive,
  Code2,
  File
} from 'lucide-react';
import { formatBytes, getFileTypeCategory } from '../utils';

export const HistoryList: React.FC = () => {
  const { transfersHistory, clearHistory } = usePeerShare();

  const getFileIcon = (mimeType: string, fileName: string) => {
    const category = getFileTypeCategory(mimeType, fileName);
    const cn = "w-4 h-4 text-neutral-500 dark:text-neutral-400";
    
    switch (category) {
      case 'image':
        return <ImageIcon className="w-4 h-4 text-emerald-500" />;
      case 'video':
        return <Video className="w-4 h-4 text-sky-500" />;
      case 'audio':
        return <Music className="w-4 h-4 text-indigo-500" />;
      case 'document':
        return <FileText className="w-4 h-4 text-amber-500" />;
      case 'archive':
        return <Archive className="w-4 h-4 text-orange-500" />;
      case 'code':
        return <Code2 className="w-4 h-4 text-purple-500" />;
      default:
        return <File className={cn} />;
    }
  };

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Just now';
    
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (transfersHistory.length === 0) return null;

  return (
    <div id="transfers-history-card" className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-white/20 dark:border-slate-800/40 backdrop-blur-xl shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          Transfer History ({transfersHistory.length})
        </h3>
        
        <button
          id="clear-history-action"
          onClick={clearHistory}
          className="p-1 px-2.5 rounded-lg text-[11px] font-semibold text-rose-600 hover:text-white bg-rose-500/10 hover:bg-rose-600 dark:text-rose-400 border border-rose-500/15 cursor-pointer flex items-center gap-1 transition-all active:scale-95"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear All</span>
        </button>
      </div>

      <div id="history-items-container" className="flex flex-col gap-2.5 max-h-[350px] overflow-y-auto pr-1">
        {transfersHistory.map((item) => {
          const isCompleted = item.status === 'completed';
          const isReceive = item.direction === 'receive';
          
          return (
            <div 
              key={item.id} 
              id={`history-row-${item.id}`}
              className="p-3 rounded-xl bg-neutral-50/50 hover:bg-neutral-100/40 dark:bg-slate-950/20 dark:hover:bg-slate-950/30 border border-neutral-150/40 dark:border-slate-850/40 flex items-center justify-between gap-3 group transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-neutral-200/40 dark:border-slate-800/60 shadow-xs flex items-center justify-center">
                  {getFileIcon(item.fileType, item.fileName)}
                </div>
                
                <div className="min-w-0">
                  <h4 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 truncate" title={item.fileName}>
                    {item.fileName}
                  </h4>
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-neutral-400 dark:text-neutral-500 font-mono mt-0.5 leading-none">
                    <span>{formatBytes(item.fileSize)}</span>
                    <span>•</span>
                    <span>{isReceive ? 'Received' : 'Sent'}</span>
                    <span>•</span>
                    <span>{formatTime(item.timestamp)}</span>
                    {item.error && (
                      <>
                        <span>•</span>
                        <span className="text-rose-500 font-semibold">{item.error}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {isCompleted ? (
                  isReceive && item.blobUrl ? (
                    <a
                      id={`download-link-history-${item.id}`}
                      href={item.blobUrl}
                      download={item.fileName}
                      className="p-1.5 text-xs text-emerald-600 hover:text-white hover:bg-emerald-500 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/15 rounded-lg flex items-center gap-1 cursor-pointer transition-all hover:shadow-xs active:scale-95"
                      title="Download received file"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-semibold hidden sm:inline">Download</span>
                    </a>
                  ) : (
                    <span className="p-1 px-2 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/15 rounded-lg">
                      Success
                    </span>
                  )
                ) : (
                  <span className="p-1 px-2 text-[10px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/15 rounded-lg flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    <span>Failed</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
