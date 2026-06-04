/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'unknown';

export interface PeerDevice {
  id: string;
  name: string;
  deviceType: DeviceType;
  os: string;
  browser: string;
  isSelf: boolean;
  connectedAt?: number;
}

export type TransferStatus = 'pending' | 'connecting' | 'transferring' | 'completed' | 'failed' | 'cancelled';

export interface FileTransfer {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  direction: 'send' | 'receive';
  status: TransferStatus;
  progress: number; // 0 to 100
  bytesTransferred: number;
  speed: number;    // bytes/sec
  eta: number;      // seconds remaining
  error?: string;
  blobUrl?: string; // only for received after completion
  peerId: string;   // the other peer's ID
  peerName?: string;
  timestamp: number;
}

export interface TransferSpeedMetrics {
  lastBytesTransferred: number;
  lastTimestamp: number;
  speeds: number[]; // dynamic window for rolling average
}

// WebRTC Data Channel Packet Protocol Types
export type PacketType = 'system' | 'file-header' | 'file-chunk' | 'file-cancel' | 'file-ack' | 'chat';

export interface SystemPacket {
  type: 'system';
  deviceInfo: Omit<PeerDevice, 'isSelf' | 'id'>;
}

export interface FileHeaderPacket {
  type: 'file-header';
  transferId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  totalChunks: number;
}

export interface FileChunkPacket {
  type: 'file-chunk';
  transferId: string;
  chunkIndex: number;
  // Use string representation or direct buffer. Standard PeerJS supports sending typed arrays directly.
  // To keep typing clean, we can send chunk metadata as a separate envelope or as part of the data stream.
  data: ArrayBuffer | Uint8Array;
}

// Ack packet to confirm chunk received or complete file success.
// Aids in flow control to prevent buffer overflows backpressure.
export interface FileAckPacket {
  type: 'file-ack';
  transferId: string;
  chunkIndex: number;
  receivedBytes: number;
  status: 'ok' | 'complete' | 'error';
}

export interface FileCancelPacket {
  type: 'file-cancel';
  transferId: string;
  reason?: string;
}

export interface ChatPacket {
  type: 'chat';
  text: string;
  timestamp: number;
}

export type DataPacket = SystemPacket | FileHeaderPacket | FileChunkPacket | FileAckPacket | FileCancelPacket | ChatPacket;
