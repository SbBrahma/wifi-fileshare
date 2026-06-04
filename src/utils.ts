/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DeviceType, PeerDevice } from './types';

// Helper to format bytes into readable scale
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Helper to format transfer speeds
export function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec === 0) return '0 B/s';
  return formatBytes(bytesPerSec, 1) + '/s';
}

// Helper to format ETA
export function formatETA(seconds: number): string {
  if (seconds === Infinity || isNaN(seconds) || seconds < 0) return 'Calculating...';
  if (seconds === 0) return '0s';
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.ceil(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

// Human-like device names for peer identification
const ADJECTIVES = [
  'Radiant', 'Stellar', 'Quantum', 'Nebula', 'Swift', 'Frost', 'Aurora', 
  'Solar', 'Cosmic', 'Vortex', 'Apex', 'Glacier', 'Echo', 'Titan', 'Zephyr'
];

const METALS_MINERALS = [
  'Quartz', 'Amber', 'Copper', 'Basalt', 'Cobalt', 'Sapphire', 'Onyx', 
  'Bronze', 'Silicon', 'Graphite', 'Chrome', 'Nickel', 'Pyrite', 'Tanzanite'
];

export function generateRandomDeviceName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const mat = METALS_MINERALS[Math.floor(Math.random() * METALS_MINERALS.length)];
  return `${adj} ${mat}`;
}

// Browser & OS detection
export function getLocalDeviceInfo(): Omit<PeerDevice, 'isSelf' | 'id'> {
  const ua = navigator.userAgent;
  let os = 'Unknown OS';
  let deviceType: DeviceType = 'desktop';
  let browser = 'Unknown Browser';

  // OS Detection
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/macintosh/i.test(ua)) os = 'macOS';
  else if (/android/i.test(ua)) {
    os = 'Android';
    deviceType = 'mobile';
  } else if (/iphone|ipad|ipod/i.test(ua)) {
    os = 'iOS';
    deviceType = /ipad/i.test(ua) ? 'tablet' : 'mobile';
  } else if (/linux/i.test(ua)) os = 'Linux';

  // Refine tablet/mobile detection
  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    deviceType = 'tablet';
  } else if (/mobile/i.test(ua) && os !== 'iOS' && os !== 'Android') {
    deviceType = 'mobile';
  }

  // Browser Detection
  if (/edg/i.test(ua)) browser = 'Edge';
  else if (/chrome/i.test(ua) && !/chromium/i.test(ua)) browser = 'Chrome';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/firefox/i.test(ua)) browser = 'Firefox';
  else if (/opr/i.test(ua)) browser = 'Opera';

  // Retrieve or create a persistent device name
  let name = localStorage.getItem('wifi_share_peer_name');
  if (!name) {
    name = `${generateRandomDeviceName()} (${os})`;
    localStorage.setItem('wifi_share_peer_name', name);
  }

  return {
    name,
    deviceType,
    os,
    browser,
  };
}

// Check safe chunk size (usually WebRTC handles sizing: 16KB is highly safe)
export const CHUNK_SIZE = 16380; // 16KB standard safe packet size

// Determine general file type category
export function getFileTypeCategory(mimeType: string, fileName: string): 'image' | 'video' | 'audio' | 'document' | 'archive' | 'code' | 'other' {
  const mime = mimeType.toLowerCase();
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (
    mime.includes('pdf') || 
    mime.includes('word') || 
    mime.includes('excel') || 
    mime.includes('powerpoint') || 
    mime.includes('office') ||
    ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt', 'txt', 'rtf', 'odt'].includes(ext)
  ) {
    return 'document';
  }
  if (
    mime.includes('zip') || 
    mime.includes('tar') || 
    mime.includes('rar') || 
    mime.includes('gzip') ||
    ['zip', 'rar', 'tar', 'gz', '7z', 'bz2'].includes(ext)
  ) {
    return 'archive';
  }
  if (
    mime.includes('javascript') || 
    mime.includes('typescript') || 
    mime.includes('json') || 
    mime.includes('html') || 
    mime.includes('css') || 
    mime.includes('xml') ||
    ['js', 'ts', 'tsx', 'jsx', 'json', 'html', 'css', 'py', 'go', 'cpp', 'c', 'cs', 'java', 'sh', 'md', 'yaml', 'yml'].includes(ext)
  ) {
    return 'code';
  }

  return 'other';
}
