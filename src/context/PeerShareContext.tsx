/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Peer, DataConnection } from 'peerjs';
import confetti from 'canvas-confetti';
import { 
  PeerDevice, 
  FileTransfer, 
  DataPacket, 
  FileHeaderPacket, 
  FileChunkPacket, 
  FileAckPacket, 
  FileCancelPacket, 
  SystemPacket,
  ChatPacket,
  TransferSpeedMetrics
} from '../types';
import { getLocalDeviceInfo, CHUNK_SIZE } from '../utils';

interface PeerShareContextType {
  peerId: string;
  peerName: string;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  connectedDevices: PeerDevice[];
  activeTransfers: Record<string, FileTransfer>;
  transfersHistory: FileTransfer[];
  chatMessages: Array<{ senderId: string; senderName: string; isSelf: boolean; text: string; timestamp: number }>;
  errorMessage: string;
  joinCode: string;
  connectToPeer: (targetCode: string) => Promise<boolean>;
  disconnectDevice: (targetPeerId: string) => void;
  sendFiles: (files: FileList | File[]) => void;
  cancelTransfer: (transferId: string, direction: 'send' | 'receive') => void;
  clearHistory: () => void;
  updateDeviceName: (newName: string) => void;
  sendChatMessage: (text: string) => void;
}

const PeerShareContext = createContext<PeerShareContextType | undefined>(undefined);

// Generate random 6 character alphanumeric code
function generateRandomCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const PeerShareProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [peerId, setPeerId] = useState<string>('');
  const [peerName, setPeerName] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [connectedDevices, setConnectedDevices] = useState<PeerDevice[]>([]);
  const [activeTransfers, setActiveTransfers] = useState<Record<string, FileTransfer>>({});
  const [transfersHistory, setTransfersHistory] = useState<FileTransfer[]>([]);
  const [chatMessages, setChatMessages] = useState<Array<{ senderId: string; senderName: string; isSelf: boolean; text: string; timestamp: number }>>([]);
  const [joinCode, setJoinCode] = useState<string>('');

  const peerInstanceRef = useRef<Peer | null>(null);
  const connectionsMapRef = useRef<Map<string, DataConnection>>(new Map());
  
  // Keep track of speed metrics during transfer
  const speedMetricsRef = useRef<Record<string, TransferSpeedMetrics>>({});
  
  // Storing chunks currently being gathered for receiving files
  // Key: transferId, Value: Array of ArrayBuffers
  const receivedChunksRef = useRef<Record<string, Array<ArrayBuffer | Uint8Array>>>({});

  // Active files being read on sender side (stores the File objects so we can read chunk by chunk)
  const sourceFilesRef = useRef<Record<string, File>>({});

  // Active files being sent currently
  // Key: transferId, Value: { currentChunkIndex: number, totalChunks: number }
  const activeSendsRef = useRef<Record<string, { currentChunkIndex: number; totalChunks: number }>>({});

  // Load name and history on start
  useEffect(() => {
    const info = getLocalDeviceInfo();
    setPeerName(info.name);

    // Read history from localStorage
    const savedHistory = localStorage.getItem('wifi_share_history');
    if (savedHistory) {
      try {
        setTransfersHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse transfers history", e);
      }
    }
  }, []);

  // Initialize PeerJS
  useEffect(() => {
    let activePeer: Peer | null = null;

    const initializePeerInstance = (suffix: string) => {
      if (activePeer) {
        try {
          activePeer.destroy();
        } catch (e) {
          console.error('Error destroying previous peer instance:', e);
        }
        activePeer = null;
      }

      const localId = `wifishare-${suffix}`;
      setPeerId(localId);
      setJoinCode(suffix);
      setConnectionStatus('connecting');

      const peer = new Peer(localId, {
        host: '0.peerjs.com',
        port: 443,
        secure: true,
        debug: 0, // Disable internal PeerJS logging to prevent automated console alerts on handled retries
      });

      activePeer = peer;
      peerInstanceRef.current = peer;

      peer.on('open', (id) => {
        console.log('Peer open with ID:', id);
        setConnectionStatus('connected');
        
        // Check if hash contains auto-join code
        const hash = window.location.hash;
        const joinMatch = hash.match(/#join=([a-z0-9]{6})/i);
        if (joinMatch && joinMatch[1]) {
          const joinSuffix = joinMatch[1];
          if (joinSuffix !== suffix) {
            console.log(`Auto-joining peer wifishare-${joinSuffix}`);
            connectToPeer(joinSuffix);
          }
        }
      });

      peer.on('connection', (conn) => {
        console.log('Incoming connection from:', conn.peer);
        setupConnectionListeners(conn);
      });

      peer.on('error', (err) => {
        // If ID already taken, generate new one next time and try again without reloading
        if (err.type === 'unavailable-id') {
          console.warn(`ID ${localId} is taken. Re-trying with a fresh ID...`);
          const freshSuffix = generateRandomCode();
          sessionStorage.setItem('wifi_share_peer_id_suffix', freshSuffix);
          
          if (activePeer) {
            try {
              activePeer.destroy();
            } catch (e) {
              console.error('Error destroying peer on collision:', e);
            }
            activePeer = null;
          }
          peerInstanceRef.current = null;
          
          // Small delay before trying again to let cleanup complete
          setTimeout(() => {
            initializePeerInstance(freshSuffix);
          }, 300);
        } else {
          console.error('Peer error occurred:', err);
          setErrorMessage(err.message || 'Error connecting to signaling server');
          setConnectionStatus('error');
        }
      });

      peer.on('disconnected', () => {
        console.log('Peer disconnected from signaling server, reconnecting...');
        if (activePeer === peer && !peer.destroyed) {
          peer.reconnect();
        }
      });
    };

    const initialIdSuffix = sessionStorage.getItem('wifi_share_peer_id_suffix') || generateRandomCode();
    sessionStorage.setItem('wifi_share_peer_id_suffix', initialIdSuffix);
    initializePeerInstance(initialIdSuffix);

    return () => {
      if (activePeer) {
        try {
          activePeer.destroy();
        } catch (e) {
          console.error('Error destroying peer on unmount:', e);
        }
      }
    };
  }, []);

  // Setup connection event listeners
  const setupConnectionListeners = (conn: DataConnection) => {
    const peerId = conn.peer;
    connectionsMapRef.current.set(peerId, conn);

    conn.on('open', () => {
      console.log('Data channel open with:', peerId);
      
      // Send self system package to other peer
      const selfInfo = getLocalDeviceInfo();
      const sysPacket: SystemPacket = {
        type: 'system',
        deviceInfo: {
          name: selfInfo.name,
          deviceType: selfInfo.deviceType,
          os: selfInfo.os,
          browser: selfInfo.browser
        }
      };
      
      try {
        conn.send(sysPacket);
      } catch (err) {
        console.error("Failed sending system packet", err);
      }

      // Add to connected devices state
      setConnectedDevices(prev => {
        // Avoid duplicate additions
        const existing = prev.find(d => d.id === peerId);
        if (existing) return prev;
        
        return [...prev, {
          id: peerId,
          name: 'Connecting Device...',
          deviceType: 'unknown',
          os: 'Unknown',
          browser: 'Unknown',
          isSelf: false,
          connectedAt: Date.now()
        }];
      });
    });

    conn.on('data', (raw: any) => {
      const packet = raw as DataPacket;
      handleDataPacket(conn, packet);
    });

    conn.on('close', () => {
      console.log('Data channel closed for:', peerId);
      handlePeerDisconnect(peerId);
    });

    conn.on('error', (err) => {
      console.error('Data connection error:', err);
      handlePeerDisconnect(peerId);
    });
  };

  // Process received Webrtc DataPacket
  const handleDataPacket = (conn: DataConnection, packet: DataPacket) => {
    const otherPeerId = conn.peer;

    switch (packet.type) {
      case 'system': {
        const info = packet.deviceInfo;
        setConnectedDevices(prev => prev.map(dev => {
          if (dev.id === otherPeerId) {
            return {
              ...dev,
              name: info.name,
              deviceType: info.deviceType,
              os: info.os,
              browser: info.browser
            };
          }
          return dev;
        }));
        break;
      }

      case 'file-header': {
        const header = packet as FileHeaderPacket;
        console.log(`Received file-header for ${header.fileName} (${header.fileSize} B)`);
        
        // Setup state for new incoming transfer
        const otherDev = connectedDevices.find(d => d.id === otherPeerId);

        const newReceivedTransfer: FileTransfer = {
          id: header.transferId,
          fileName: header.fileName,
          fileSize: header.fileSize,
          fileType: header.fileType,
          direction: 'receive',
          status: 'transferring',
          progress: 0,
          bytesTransferred: 0,
          speed: 0,
          eta: 0,
          peerId: otherPeerId,
          peerName: otherDev?.name || 'Remote Peer',
          timestamp: Date.now()
        };

        // Initialize empty chunk buffer
        receivedChunksRef.current[header.transferId] = new Array(header.totalChunks);
        
        // Initialize speed metrics
        speedMetricsRef.current[header.transferId] = {
          lastBytesTransferred: 0,
          lastTimestamp: Date.now(),
          speeds: []
        };

        setActiveTransfers(prev => ({
          ...prev,
          [header.transferId]: newReceivedTransfer
        }));

        // Send back an ack for index -1 (acknowledges header is ready)
        const headerAck: FileAckPacket = {
          type: 'file-ack',
          transferId: header.transferId,
          chunkIndex: -1,
          receivedBytes: 0,
          status: 'ok'
        };
        conn.send(headerAck);
        break;
      }

      case 'file-chunk': {
        const chunk = packet as FileChunkPacket;
        const transferId = chunk.transferId;
        const transfer = activeTransfers[transferId];
        
        // If transfer state was removed or cancelled, ignore
        if (!receivedChunksRef.current[transferId]) {
          // Send cancel warning
          const cancelPkt: FileCancelPacket = {
            type: 'file-cancel',
            transferId
          };
          conn.send(cancelPkt);
          return;
        }

        const bufferArray = receivedChunksRef.current[transferId];
        bufferArray[chunk.chunkIndex] = chunk.data;

        // Calculate progress & metrics
        const totalChunks = bufferArray.length;
        const index = chunk.chunkIndex;
        
        // Calculate bytes received
        // Note: each chunk except the last is CHUNK_SIZE bytes
        let completedChunks = 0;
        let receivedBytes = 0;

        for (let i = 0; i < totalChunks; i++) {
          if (bufferArray[i]) {
            completedChunks++;
            receivedBytes += bufferArray[i].byteLength || (bufferArray[i] as any).length || 0;
          }
        }

        const isFinished = completedChunks === totalChunks;
        const progress = Math.round((completedChunks / totalChunks) * 100);

        // Update metrics & speeds
        const metrics = speedMetricsRef.current[transferId];
        const now = Date.now();
        let speed = 0;
        let eta = 0;

        if (metrics) {
          const deltaSec = (now - metrics.lastTimestamp) / 1000;
          if (deltaSec >= 0.5) { // Calculate rolling speed every half second
            const bytesAdded = receivedBytes - metrics.lastBytesTransferred;
            const currentSecSpeed = bytesAdded / deltaSec;
            
            metrics.speeds.push(currentSecSpeed);
            if (metrics.speeds.length > 5) metrics.speeds.shift(); // 2.5s window
            
            speed = metrics.speeds.reduce((a, b) => a + b, 0) / metrics.speeds.length;
            metrics.lastBytesTransferred = receivedBytes;
            metrics.lastTimestamp = now;

            const remainingBytes = (activeTransfers[transferId]?.fileSize || 0) - receivedBytes;
            eta = speed > 0 ? remainingBytes / speed : 0;
          } else {
            // Keep previous speeds but update visual bytes
            const currentTransfer = activeTransfers[transferId];
            speed = currentTransfer ? currentTransfer.speed : 0;
            eta = currentTransfer ? currentTransfer.eta : 0;
          }
        }

        // Send Ack packet
        const chunkAck: FileAckPacket = {
          type: 'file-ack',
          transferId,
          chunkIndex: index,
          receivedBytes,
          status: isFinished ? 'complete' : 'ok'
        };
        
        try {
          conn.send(chunkAck);
        } catch (e) {
          console.error("Failed to send ack", e);
        }

        if (isFinished) {
          // Create the file blob and release memory
          const fullArray = receivedChunksRef.current[transferId];
          const fileTransferInfo = activeTransfers[transferId];
          
          if (fileTransferInfo) {
            const blob = new Blob(fullArray, { type: fileTransferInfo.fileType });
            const blobUrl = URL.createObjectURL(blob);
            
            const completedTransfer: FileTransfer = {
              ...fileTransferInfo,
              status: 'completed',
              progress: 100,
              bytesTransferred: fileTransferInfo.fileSize,
              speed: 0,
              eta: 0,
              blobUrl
            };

            // Remove active received and speed metrics
            delete receivedChunksRef.current[transferId];
            delete speedMetricsRef.current[transferId];

            // Remove from active list
            setActiveTransfers(prev => {
              const updated = { ...prev };
              delete updated[transferId];
              return updated;
            });

            // Put in history
            setTransfersHistory(prev => {
              const updated = [completedTransfer, ...prev];
              localStorage.setItem('wifi_share_history', JSON.stringify(updated));
              return updated;
            });

            // CELEBRATION! Confetti!
            try {
              confetti({
                particleCount: 80,
                spread: 60,
                origin: { y: 0.6 }
              });
            } catch (e) {
              console.error(e);
            }
          }
        } else {
          // Update active transfers state
          setActiveTransfers(prev => {
            if (!prev[transferId]) return prev;
            return {
              ...prev,
              [transferId]: {
                ...prev[transferId],
                progress,
                bytesTransferred: receivedBytes,
                speed,
                eta
              }
            };
          });
        }
        break;
      }

      case 'file-ack': {
        const ack = packet as FileAckPacket;
        const transferId = ack.transferId;
        const sendInfo = activeSendsRef.current[transferId];

        if (!sendInfo) return; // Discard or cancelled

        const sourceFile = sourceFilesRef.current[transferId];
        if (!sourceFile) return;

        if (ack.status === 'complete' || ack.chunkIndex === sendInfo.totalChunks - 1) {
          // Sending complete!
          const activeItem = activeTransfers[transferId];
          if (activeItem) {
            const completedTransfer: FileTransfer = {
              ...activeItem,
              status: 'completed',
              progress: 100,
              bytesTransferred: activeItem.fileSize,
              speed: 0,
              eta: 0
            };

            // Cleanup refs
            delete activeSendsRef.current[transferId];
            delete sourceFilesRef.current[transferId];
            delete speedMetricsRef.current[transferId];

            // Remove from active
            setActiveTransfers(prev => {
              const updated = { ...prev };
              delete updated[transferId];
              return updated;
            });

            // Write to history
            setTransfersHistory(prev => {
              const updated = [completedTransfer, ...prev];
              localStorage.setItem('wifi_share_history', JSON.stringify(updated));
              return updated;
            });
            
            // Subtle Confetti
            try {
              confetti({
                particleCount: 50,
                spread: 40,
                origin: { y: 0.8 }
              });
            } catch (e) {}
          }
        } else {
          // Ready to send the next chunk!
          const nextIndex = ack.chunkIndex + 1;
          sendInfo.currentChunkIndex = nextIndex;
          
          sendChunk(otherPeerId, transferId, nextIndex);
        }
        break;
      }

      case 'file-cancel': {
        const cancel = packet as FileCancelPacket;
        const transferId = cancel.transferId;
        handleCancelledTransfer(transferId, 'remote');
        break;
      }

      case 'chat': {
        const chat = packet as ChatPacket;
        const devDetails = connectedDevices.find(d => d.id === otherPeerId);

        setChatMessages(prev => [
          ...prev, 
          {
            senderId: otherPeerId,
            senderName: devDetails?.name || 'Remote Peer',
            isSelf: false,
            text: chat.text,
            timestamp: chat.timestamp
          }
        ]);
        break;
      }
    }
  };

  // Triggered when a chunk ACK permits the next chunk to launch!
  const sendChunk = (receiverId: string, transferId: string, chunkIndex: number) => {
    const conn = connectionsMapRef.current.get(receiverId);
    if (!conn) return;

    const file = sourceFilesRef.current[transferId];
    if (!file) return;

    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    
    const startByte = chunkIndex * CHUNK_SIZE;
    const endByte = Math.min(file.size, startByte + CHUNK_SIZE);

    const blobSlice = file.slice(startByte, endByte);
    const fileReader = new FileReader();

    fileReader.onload = () => {
      const arrayBuffer = fileReader.result as ArrayBuffer;
      const progress = Math.round(((chunkIndex) / totalChunks) * 100);

      // Speed metrics rolling calculator
      const metrics = speedMetricsRef.current[transferId];
      const now = Date.now();
      let speed = 0;
      let eta = 0;

      if (metrics) {
        const deltaSec = (now - metrics.lastTimestamp) / 1000;
        const bytesSent = startByte;

        if (deltaSec >= 0.5) {
          const bytesAdded = bytesSent - metrics.lastBytesTransferred;
          const currentSecSpeed = bytesAdded / deltaSec;

          metrics.speeds.push(currentSecSpeed);
          if (metrics.speeds.length > 5) metrics.speeds.shift();

          speed = metrics.speeds.reduce((a, b) => a + b, 0) / metrics.speeds.length;
          metrics.lastBytesTransferred = bytesSent;
          metrics.lastTimestamp = now;

          const remainingBytes = file.size - bytesSent;
          eta = speed > 0 ? remainingBytes / speed : 0;
        } else {
          const currentTransfer = activeTransfers[transferId];
          speed = currentTransfer ? currentTransfer.speed : 0;
          eta = currentTransfer ? currentTransfer.eta : 0;
        }
      }

      const chunkPacket: FileChunkPacket = {
        type: 'file-chunk',
        transferId,
        chunkIndex,
        data: arrayBuffer
      };

      try {
        conn.send(chunkPacket);
      } catch (e) {
        console.error("WebRTC send chunk error", e);
        handleCancelledTransfer(transferId, 'self', 'Connection lost');
        return;
      }

      // Update transfer visual state on screen
      setActiveTransfers(prev => {
        if (!prev[transferId]) return prev;
        return {
          ...prev,
          [transferId]: {
            ...prev[transferId],
            progress,
            bytesTransferred: startByte,
            speed,
            eta
          }
        };
      });
    };

    fileReader.onerror = (e) => {
      console.error("FileReader failed to slice file", e);
      handleCancelledTransfer(transferId, 'self', 'Error reading file');
    };

    fileReader.readAsArrayBuffer(blobSlice);
  };

  const handleCancelledTransfer = (transferId: string, initiator: 'remote' | 'self', extraErr?: string) => {
    // Collect metadata
    const activeItem = activeTransfers[transferId];
    if (!activeItem) return;

    const failedTransfer: FileTransfer = {
      ...activeItem,
      status: 'failed',
      error: initiator === 'remote' ? 'Cancelled by receiver' : (extraErr || 'Cancelled')
    };

    // Cleanup active refs
    delete activeSendsRef.current[transferId];
    delete sourceFilesRef.current[transferId];
    delete receivedChunksRef.current[transferId];
    delete speedMetricsRef.current[transferId];

    // Remove from active
    setActiveTransfers(prev => {
      const updated = { ...prev };
      delete updated[transferId];
      return updated;
    });

    // Save failed state to history
    setTransfersHistory(prev => {
      const updated = [failedTransfer, ...prev];
      localStorage.setItem('wifi_share_history', JSON.stringify(updated));
      return updated;
    });
  };

  const handlePeerDisconnect = (pId: string) => {
    connectionsMapRef.current.delete(pId);
    
    setConnectedDevices(prev => prev.filter(d => d.id !== pId));

    // Cancel any transfers active for this peer
    Object.keys(activeTransfers).forEach(transferId => {
      const t = activeTransfers[transferId];
      if (t && t.peerId === pId) {
        handleCancelledTransfer(transferId, 'remote', 'Device disconnected');
      }
    });
  };

  // Connect to peer manually
  const connectToPeer = async (targetCode: string): Promise<boolean> => {
    const canonicalId = `wifishare-${targetCode.trim().toLowerCase()}`;
    
    if (canonicalId === peerId) {
      setErrorMessage("You cannot connect to yourself!");
      return false;
    }

    if (!peerInstanceRef.current) {
      setErrorMessage("Local sharer not initialized.");
      return false;
    }

    if (connectionsMapRef.current.has(canonicalId)) {
      setErrorMessage("Already connected to this device.");
      return true;
    }

    setConnectionStatus('connecting');

    try {
      const conn = peerInstanceRef.current.connect(canonicalId, {
        reliable: true,
      });

      setupConnectionListeners(conn);
      setConnectionStatus('connected');
      return true;
    } catch (err) {
      console.error("Error creating peer connection", err);
      setErrorMessage("Failed to establish P2P handshakes.");
      setConnectionStatus('error');
      return false;
    }
  };

  // Disconnect from peer
  const disconnectDevice = (targetPeerId: string) => {
    const conn = connectionsMapRef.current.get(targetPeerId);
    if (conn) {
      conn.close();
      handlePeerDisconnect(targetPeerId);
    }
  };

  // Send a batch of files to all connected devices
  const sendFiles = (files: FileList | File[]) => {
    if (connectedDevices.length === 0) {
      setErrorMessage("No devices connected. Send sharing link or QR to initiate!");
      return;
    }

    const fileList = Array.from(files);

    fileList.forEach(file => {
      connectedDevices.forEach(device => {
        const transferId = generateRandomCode();
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

        const newSendTransfer: FileTransfer = {
          id: transferId,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          direction: 'send',
          status: 'connecting',
          progress: 0,
          bytesTransferred: 0,
          speed: 0,
          eta: 0,
          peerId: device.id,
          peerName: device.name,
          timestamp: Date.now()
        };

        // Initialize state refs
        sourceFilesRef.current[transferId] = file;
        activeSendsRef.current[transferId] = {
          currentChunkIndex: -1,
          totalChunks
        };
        speedMetricsRef.current[transferId] = {
          lastBytesTransferred: 0,
          lastTimestamp: Date.now(),
          speeds: []
        };

        setActiveTransfers(prev => ({
          ...prev,
          [transferId]: newSendTransfer
        }));

        // Send file-header packet to signal receiver
        const headerPacket: FileHeaderPacket = {
          type: 'file-header',
          transferId,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          totalChunks
        };

        const conn = connectionsMapRef.current.get(device.id);
        if (conn) {
          try {
            conn.send(headerPacket);
          } catch (e) {
            console.error("Failed to send header packet", e);
            handleCancelledTransfer(transferId, 'self', 'Link interrupted');
          }
        }
      });
    });
  };

  // Cancel an ongoing transfer
  const cancelTransfer = (transferId: string, direction: 'send' | 'receive') => {
    const transfer = activeTransfers[transferId];
    if (!transfer) return;

    // Send cancellation message to peer
    const conn = connectionsMapRef.current.get(transfer.peerId);
    if (conn) {
      const cancelPkt: FileCancelPacket = {
        type: 'file-cancel',
        transferId
      };
      try {
        conn.send(cancelPkt);
      } catch (e) {
        console.error(e);
      }
    }

    handleCancelledTransfer(transferId, 'self');
  };

  // Clear completed list
  const clearHistory = () => {
    transfersHistory.forEach(item => {
      if (item.blobUrl) {
         URL.revokeObjectURL(item.blobUrl);
      }
    });
    setTransfersHistory([]);
    localStorage.removeItem('wifi_share_history');
  };

  // Update own custom device name
  const updateDeviceName = (newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    setPeerName(trimmed);
    localStorage.setItem('wifi_share_peer_name', trimmed);

    // Notify all connected devices
    const selfInfo = getLocalDeviceInfo();
    const sysPacket: SystemPacket = {
      type: 'system',
      deviceInfo: {
        name: trimmed,
        deviceType: selfInfo.deviceType,
        os: selfInfo.os,
        browser: selfInfo.browser
      }
    };

    connectionsMapRef.current.forEach(conn => {
      try {
        conn.send(sysPacket);
      } catch (e) {
        console.error(e);
      }
    });

    setConnectedDevices(prev => prev.map(dev => {
      if (dev.isSelf) {
        return { ...dev, name: trimmed };
      }
      return dev;
    }));
  };

  // Send simple text messaging
  const sendChatMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const timestamp = Date.now();
    
    // Add to self messages list
    setChatMessages(prev => [
      ...prev,
      {
        senderId: peerId,
        senderName: peerName,
        isSelf: true,
        text: trimmed,
        timestamp
      }
    ]);

    // Send to all channels
    const chatPacket: ChatPacket = {
      type: 'chat',
      text: trimmed,
      timestamp
    };

    connectionsMapRef.current.forEach(conn => {
      try {
        conn.send(chatPacket);
      } catch (e) {
        console.error(e);
      }
    });
  };

  return (
    <PeerShareContext.Provider value={{
      peerId,
      peerName,
      connectionStatus,
      connectedDevices,
      activeTransfers,
      transfersHistory,
      chatMessages,
      errorMessage,
      joinCode,
      connectToPeer,
      disconnectDevice,
      sendFiles,
      cancelTransfer,
      clearHistory,
      updateDeviceName,
      sendChatMessage
    }}>
      {children}
    </PeerShareContext.Provider>
  );
};

export const usePeerShare = () => {
  const context = useContext(PeerShareContext);
  if (context === undefined) {
    throw new Error('usePeerShare must be used inside a PeerShareProvider');
  }
  return context;
};
