/**
 * WiFi File Share - Standalone Vanilla JS Client
 * Uses PeerJS for signaling, WebRTC DataChannels for direct local device sharing.
 * Fully modular and simple to understand!
 */

// Global constant config
const CHUNK_SIZE = 16384; // 16KB safe transfer chunk size

// App State
let peer = null;
let peerId = '';
let joinCode = '';
let deviceName = '';
const activeConnections = new Map(); // Key: PeerID, Value: DataConnection
const activeTransfers = new Map();    // Key: TransferID, Value: TransferState
const historicalTransfers = [];      // Array of past transfer objects

// Reusable random adjectives and minerals for peer name generation
const ADJECTIVES = ['Swift', 'Radiant', 'Stellar', 'Deep', 'Glacier', 'Echo', 'Neon', 'Cosmic', 'Solar'];
const MINERALS = ['Quartz', 'Silica', 'Amber', 'Cobalt', 'Sapphire', 'Onyx', 'Bronze', 'Copper', 'Nickel'];

/**
 * Generate a random recognizable name for peer discovery
 */
function generateRandomName() {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const min = MINERALS[Math.floor(Math.random() * MINERALS.length)];
    return `${adj} ${min}`;
}

/**
 * Generate random 6 characters join code suffix
 */
function generateShortCode() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * Parse client system agent information
 */
function getClientSystemInfo() {
    const ua = navigator.userAgent;
    let os = 'Web Devices';
    let browser = 'Unknown Browser';

    if (/windows/i.test(ua)) os = 'Windows';
    else if (/macintosh/i.test(ua)) os = 'macOS';
    else if (/android/i.test(ua)) os = 'Android';
    else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
    else if (/linux/i.test(ua)) os = 'Linux';

    if (/edg/i.test(ua)) browser = 'Edge';
    else if (/chrome/i.test(ua) && !/chromium/i.test(ua)) browser = 'Chrome';
    else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
    else if (/firefox/i.test(ua)) browser = 'Firefox';

    return { os, browser };
}

/**
 * Initialize PeerJS link setup
 */
function initPeerJS(forcedSuffix) {
    // 1. Set/Fetch device name and Peer suffix code
    deviceName = localStorage.getItem('vanilla_peer_name');
    const system = getClientSystemInfo();
    
    if (!deviceName) {
        deviceName = `${generateRandomName()} (${system.os})`;
        localStorage.setItem('vanilla_peer_name', deviceName);
    }
    
    document.getElementById('device-name').innerText = deviceName;
    document.getElementById('device-os').innerText = system.os;
    document.getElementById('device-browser').innerText = system.browser;

    let suffix = forcedSuffix || sessionStorage.getItem('vanilla_peer_suffix');
    if (!suffix) {
        suffix = generateShortCode();
        sessionStorage.setItem('vanilla_peer_suffix', suffix);
    }

    joinCode = suffix;
    peerId = `wifishare-${suffix}`;
    
    document.getElementById('display-join-code').innerText = suffix.toUpperCase();
    document.getElementById('device-peer-id').innerText = suffix.toUpperCase();

    // Setup sharing URL link block
    const shareUrl = `${window.location.origin}${window.location.pathname}?join=${suffix}`;
    document.getElementById('share-link-input').value = shareUrl;

    // 2. Render QR code
    const qrCanvas = document.getElementById('qr-canvas');
    if (qrCanvas && window.QRCode) {
        QRCode.toCanvas(qrCanvas, shareUrl, {
            width: 125,
            margin: 1,
            color: {
                dark: '#0f172a',  // deep slate-900
                light: '#ffffff'  // white background
            }
        }, function(error) {
            if (error) console.error("QR Canvas generate fail", error);
        });
    }

    // Safely destroy any existing peer instance
    if (peer) {
        try {
            peer.destroy();
        } catch (e) {
            console.error("Error destroying previous peer instance:", e);
        }
        peer = null;
    }

    // 3. Launch PeerJS client connecting to public brokering server
    peer = new Peer(peerId, {
        host: '0.peerjs.com',
        port: 443,
        secure: true,
        debug: 0 // Disable internal PeerJS logging to prevent automated console alerts on handled retries
    });

    peer.on('open', (id) => {
        console.log("My PeerJS ID established:", id);
        
        // Check if query params have active join code to connect to
        const urlParams = new URLSearchParams(window.location.search);
        const joinTarget = urlParams.get('join');
        if (joinTarget && joinTarget !== suffix) {
            console.log(`Auto-pairing target join link code: ${joinTarget}`);
            connectToTargetPeer(joinTarget);
        }
    });

    peer.on('connection', (conn) => {
        console.log("Incoming peer connection handshakes:", conn.peer);
        setupConnectionCallbacks(conn);
    });

    peer.on('error', (err) => {
        if (err.type === 'unavailable-id') {
            console.warn(`ID ${peerId} is taken. Re-trying with a fresh ID...`);
            const freshCode = generateShortCode();
            sessionStorage.setItem('vanilla_peer_suffix', freshCode);
            
            if (peer) {
                try {
                    peer.destroy();
                } catch (e) {
                    console.error("Error destroying peer on collision:", e);
                }
                peer = null;
            }
            
            setTimeout(() => {
                initPeerJS(freshCode);
            }, 300);
        } else {
            console.error("PeerJS Core Encountered error", err);
        }
    });

    peer.on('disconnected', () => {
        console.log("Disconnected from cloud server. Attempting reconnect...");
        if (peer && !peer.destroyed) {
            peer.reconnect();
        }
    });
}

/**
 * Configure Callbacks for established WebRTC connections
 */
function setupConnectionCallbacks(conn) {
    const remoteId = conn.peer;
    activeConnections.set(remoteId, conn);

    conn.on('open', () => {
        console.log("P2P channel ready with peer:", remoteId);

        // Send local device details packet
        const info = getClientSystemInfo();
        conn.send({
            type: 'system-sync',
            deviceInfo: {
                name: deviceName,
                os: info.os,
                browser: info.browser
            }
        });

        // Add to active view node
        addNewDeviceCard(remoteId, "Connecting Device...", "WebClient");
        updateScreenPills();
    });

    conn.on('data', (data) => {
        handleIncomingPacket(conn, data);
    });

    conn.on('close', () => {
        console.log("Device channel closed:", remoteId);
        removeDeviceCard(remoteId);
    });

    conn.on('error', (err) => {
        console.error("Connection error has occurred", err);
        removeDeviceCard(remoteId);
    });
}

/**
 * Process received packets on datachannel
 */
function handleIncomingPacket(conn, packet) {
    const remoteId = conn.peer;

    switch (packet.type) {
        case 'system-sync':
            // Sync remote device label
            const peerCardName = document.getElementById(`peer-name-${remoteId}`);
            const peerCardDetails = document.getElementById(`peer-details-${remoteId}`);
            
            if (peerCardName && peerCardDetails) {
                peerCardName.innerText = packet.deviceInfo.name;
                peerCardDetails.innerText = `${packet.deviceInfo.os} • ${packet.deviceInfo.browser}`;
            }
            break;

        case 'file-header':
            // Settle new incoming transfer track
            const transferId = packet.transferId;
            const folderBuffer = new Array(packet.totalChunks);
            
            activeTransfers.set(transferId, {
                id: transferId,
                fileName: packet.fileName,
                fileSize: packet.fileSize,
                fileType: packet.fileType,
                totalChunks: packet.totalChunks,
                direction: 'receive',
                bytesCurrent: 0,
                chunksBuffer: folderBuffer,
                speedMetrics: {
                    lastBytes: 0,
                    lastTime: Date.now()
                }
            });

            // Reveal progress list panel on screen
            document.getElementById('transfers-container').classList.remove('hidden');
            injectActiveTransferUI(transferId, packet.fileName, packet.fileSize, 'receive');

            // Ack header ready states
            conn.send({
                type: 'file-ack',
                transferId: transferId,
                chunkIndex: -1,
                receivedBytes: 0,
                status: 'ok'
            });
            break;

        case 'file-chunk': {
            const transfer = activeTransfers.get(packet.transferId);
            if (!transfer) return;

            transfer.chunksBuffer[packet.chunkIndex] = packet.data;
            
            // Recalculate bytes current sum
            let countCompleted = 0;
            let sumBytesReceived = 0;
            const len = transfer.totalChunks;

            for (let i = 0; i < len; i++) {
                if (transfer.chunksBuffer[i]) {
                    countCompleted++;
                    sumBytesReceived += transfer.chunksBuffer[i].byteLength || 0;
                }
            }

            transfer.bytesCurrent = sumBytesReceived;
            const progressPct = Math.round((countCompleted / transfer.totalChunks) * 100);
            
            // Track transfer speed
            const now = Date.now();
            const elapsed = (now - transfer.speedMetrics.lastTime) / 1000;
            let speedStr = "Calculating Speed...";
            
            if (elapsed >= 0.5) {
                const diffBytes = sumBytesReceived - transfer.speedMetrics.lastBytes;
                const speedBps = diffBytes / elapsed;
                speedStr = formatSpeed(speedBps);
                
                transfer.speedMetrics.lastBytes = sumBytesReceived;
                transfer.speedMetrics.lastTime = now;
                
                const speedSpan = document.getElementById(`speed-span-${packet.transferId}`);
                if (speedSpan) speedSpan.innerText = speedStr;
            }

            // Sync visual UI elements
            const bar = document.getElementById(`progress-bar-${packet.transferId}`);
            const pctText = document.getElementById(`progress-pct-${packet.transferId}`);
            const statText = document.getElementById(`progress-stat-${packet.transferId}`);

            if (bar) bar.style.width = `${progressPct}%`;
            if (pctText) pctText.innerText = `${progressPct}%`;
            if (statText) statText.innerText = `${formatBytes(sumBytesReceived)} of ${formatBytes(transfer.fileSize)}`;

            const isFinished = countCompleted === transfer.totalChunks;

            // Send acknowledge packet back to sender
            conn.send({
                type: 'file-ack',
                transferId: packet.transferId,
                chunkIndex: packet.chunkIndex,
                receivedBytes: sumBytesReceived,
                status: isFinished ? 'complete' : 'ok'
            });

            if (isFinished) {
                // Completed! Package the blob and clean memory
                const blob = new Blob(transfer.chunksBuffer, { type: transfer.fileType });
                const blobUrl = URL.createObjectURL(blob);

                // Add to history
                const histObj = {
                    id: transfer.id,
                    fileName: transfer.fileName,
                    fileSize: transfer.fileSize,
                    direction: 'receive',
                    blobUrl: blobUrl,
                    status: 'success',
                    timestamp: Date.now()
                };
                
                historicalTransfers.unshift(histObj);
                activeTransfers.delete(transfer.id);

                // Remove from active block list
                removeActiveTransferUI(transfer.id);
                syncHistoryUI();

                // Trigger celebration confetti
                if (window.confetti) {
                    confetti({
                        particleCount: 75,
                        spread: 60,
                        origin: { y: 0.7 }
                    });
                }
            }
            break;
        }

        case 'file-ack': {
            const ackTransfer = activeTransfers.get(packet.transferId);
            if (!ackTransfer) return;

            if (packet.status === 'complete' || packet.chunkIndex === ackTransfer.totalChunks - 1) {
                // Sender side indicates completed
                const histObj = {
                    id: ackTransfer.id,
                    fileName: ackTransfer.fileName,
                    fileSize: ackTransfer.fileSize,
                    direction: 'send',
                    status: 'success',
                    timestamp: Date.now()
                };

                historicalTransfers.unshift(histObj);
                activeTransfers.delete(ackTransfer.id);

                removeActiveTransferUI(ackTransfer.id);
                syncHistoryUI();
                
                if (window.confetti) {
                    confetti({
                        particleCount: 40,
                        spread: 40,
                        origin: { y: 0.85 }
                    });
                }
            } else {
                // Dispatch next file chunk
                sendNextChunk(remoteId, packet.transferId, packet.chunkIndex + 1);
            }
            break;
        }

        case 'file-cancel':
            const cancelId = packet.transferId;
            const cancelledTransfer = activeTransfers.get(cancelId);
            if (cancelledTransfer) {
                const histObj = {
                    id: cancelledTransfer.id,
                    fileName: cancelledTransfer.fileName,
                    fileSize: cancelledTransfer.fileSize,
                    direction: cancelledTransfer.direction,
                    status: 'failed',
                    timestamp: Date.now(),
                    error: 'Cancelled by peer connection'
                };
                historicalTransfers.unshift(histObj);
                activeTransfers.delete(cancelId);
                removeActiveTransferUI(cancelId);
                syncHistoryUI();
            }
            break;
    }
}

/**
 * Perform manual connection initiating handshake targeting peer ID code
 */
function connectToTargetPeer(code) {
    const clean = code.trim().toLowerCase();
    if (clean.length !== 6) return;

    const targetId = `wifishare-${clean}`;
    document.getElementById('connect-error').classList.add('hidden');
    
    const connectBtn = document.getElementById('connect-submit-btn');
    connectBtn.disabled = true;
    connectBtn.innerText = "Connecting...";

    const conn = peer.connect(targetId, { reliable: true });
    
    setupConnectionCallbacks(conn);

    setTimeout(() => {
        connectBtn.disabled = false;
        connectBtn.innerText = "Connect";
    }, 1200);
}

/**
 * Handle dispatching file header packet to kick off sending workflow
 */
function initiateFileSends(file) {
    if (activeConnections.size === 0) {
        alert("No connected device detected. Connect a phone or secondary tab first!");
        return;
    }

    activeConnections.forEach((conn, remoteId) => {
        const transferId = generateShortCode() + '-' + generateShortCode();
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

        activeTransfers.set(transferId, {
            id: transferId,
            file: file,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            totalChunks: totalChunks,
            direction: 'send',
            bytesCurrent: 0,
            speedMetrics: {
                lastBytes: 0,
                lastTime: Date.now()
            }
        });

        // Show transfers card container
        document.getElementById('transfers-container').classList.remove('hidden');
        injectActiveTransferUI(transferId, file.name, file.size, 'send');

        // Dispatch header notice
        conn.send({
            type: 'file-header',
            transferId: transferId,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            totalChunks: totalChunks
        });
    });
}

/**
 * Send a specific sliced binary chunk
 */
function sendNextChunk(remoteId, transferId, chunkIdx) {
    const conn = activeConnections.get(remoteId);
    const transfer = activeTransfers.get(transferId);
    
    if (!conn || !transfer) return;

    const file = transfer.file;
    const start = chunkIdx * CHUNK_SIZE;
    const end = Math.min(file.size, start + CHUNK_SIZE);
    
    const sliceBlob = file.slice(start, end);
    const reader = new FileReader();

    reader.onload = function() {
        // Compute metrics
        const pct = Math.round((chunkIdx / transfer.totalChunks) * 100);
        
        const now = Date.now();
        const elapsed = (now - transfer.speedMetrics.lastTime) / 1000;
        let speedStr = "Calculating...";

        if (elapsed >= 0.5) {
            const diffBytes = start - transfer.speedMetrics.lastBytes;
            const speedBps = diffBytes / elapsed;
            speedStr = formatSpeed(speedBps);
            
            transfer.speedMetrics.lastBytes = start;
            transfer.speedMetrics.lastTime = now;
            
            const speedSpan = document.getElementById(`speed-span-${transferId}`);
            if (speedSpan) speedSpan.innerText = speedStr;
        }

        // Send binary data chunk payload
        conn.send({
            type: 'file-chunk',
            transferId: transferId,
            chunkIndex: chunkIdx,
            data: reader.result
        });

        // Update active displays
        const bar = document.getElementById(`progress-bar-${transferId}`);
        const pctText = document.getElementById(`progress-pct-${transferId}`);
        const statText = document.getElementById(`progress-stat-${transferId}`);

        if (bar) bar.style.width = `${pct}%`;
        if (pctText) pctText.innerText = `${pct}%`;
        if (statText) statText.innerText = `${formatBytes(start)} of ${formatBytes(file.size)}`;
    };

    reader.onerror = function() {
        console.error("FileReader slice read failed");
    };

    reader.readAsArrayBuffer(sliceBlob);
}

/**
 * Cancel a specific transfer in active map
 */
function cancelLocalTransfer(transferId) {
    const transfer = activeTransfers.get(transferId);
    if (!transfer) return;

    activeConnections.forEach((conn) => {
        conn.send({
            type: 'file-cancel',
            transferId: transferId
        });
    });

    const histObj = {
        id: transfer.id,
        fileName: transfer.fileName,
        fileSize: transfer.fileSize,
        direction: transfer.direction,
        status: 'failed',
        timestamp: Date.now(),
        error: 'Cancelled by user'
    };

    historicalTransfers.unshift(histObj);
    activeTransfers.delete(transferId);
    removeActiveTransferUI(transferId);
    syncHistoryUI();
}

/*
 * =========================================================================
 * UI Dom Rendering Helpers
 * =========================================================================
 */

function addNewDeviceCard(remoteId, initialNameStr, typeStr) {
    const grid = document.getElementById('devices-grid');
    const placeholders = document.getElementById('no-devices');
    if (placeholders) placeholders.classList.add('hidden');

    // Remove existing card wrapper representing this remote node if present
    const existing = document.getElementById(`peer-wrapper-${remoteId}`);
    if (existing) existing.remove();

    const card = document.createElement('div');
    card.id = `peer-wrapper-${remoteId}`;
    card.className = "p-3.5 rounded-xl bg-neutral-100/50 hover:bg-neutral-100 dark:bg-slate-950/25 dark:hover:bg-slate-950/40 border border-neutral-200/50 dark:border-slate-800/60 flex items-center justify-between gap-3 group transition-colors";
    
    card.innerHTML = `
        <div class="flex items-center gap-3 min-w-0">
            <div class="p-2 rounded-lg bg-white dark:bg-slate-900 border border-neutral-200/40 dark:border-slate-800/60 shadow-xs">
                <!-- Device Icon standard placement -->
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-500"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
            </div>
            <div class="min-w-0">
                <h4 class="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate pr-2" id="peer-name-${remoteId}">${initialNameStr}</h4>
                <p class="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono mt-0.5 uppercase" id="peer-details-${remoteId}">Linking Connection...</p>
            </div>
        </div>
        <button class="p-1 px-1.5 text-[10px] font-semibold text-rose-600 hover:text-white hover:bg-rose-600 bg-rose-500/10 rounded-lg border border-rose-500/15 cursor-pointer transition-all opacity-0 group-hover:opacity-100" onclick="disconnectFromPeerBtn('${remoteId}')">Disconnect</button>
    `;

    grid.appendChild(card);
}

function removeDeviceCard(remoteId) {
    const card = document.getElementById(`peer-wrapper-${remoteId}`);
    if (card) card.remove();

    activeConnections.delete(remoteId);
    updateScreenPills();

    const grid = document.getElementById('devices-grid');
    if (grid && grid.children.length <= 1) {
        const placeholders = document.getElementById('no-devices');
        if (placeholders) placeholders.classList.remove('hidden');
    }
}

function disconnectFromPeerBtn(remoteId) {
    const conn = activeConnections.get(remoteId);
    if (conn) {
        conn.close();
        removeDeviceCard(remoteId);
    }
}

window.disconnectFromPeerBtn = disconnectFromPeerBtn; // Export to click events safely

function updateScreenPills() {
    const count = activeConnections.size;
    const connectionsPill = document.getElementById('connections-count');
    const signalIcon = document.getElementById('status-signal-icon');
    const warningLabel = document.getElementById('dropzone-p2p-warn');
    
    if (connectionsPill) {
        connectionsPill.innerText = count === 1 ? "1 Device Connected" : `${count} Devices Connected`;
    }

    if (signalIcon) {
        if (count > 0) {
            signalIcon.classList.remove('text-neutral-400');
            signalIcon.classList.add('text-emerald-500', 'animate-pulse');
        } else {
            signalIcon.classList.remove('text-emerald-500', 'animate-pulse');
            signalIcon.classList.add('text-neutral-400');
        }
    }

    if (warningLabel) {
        if (count > 0) {
            warningLabel.classList.add('hidden');
        } else {
            warningLabel.classList.remove('hidden');
        }
    }
}

function injectActiveTransferUI(id, fileName, size, direction) {
    const list = document.getElementById('transfers-list');
    const item = document.createElement('div');
    item.id = `active-transfer-ui-${id}`;
    item.className = "p-4 rounded-xl bg-neutral-50/65 dark:bg-slate-950/20 border border-neutral-200/40 dark:border-slate-800/50 flex flex-col gap-3";
    
    const isSend = direction === 'send';
    const directionBadgeStr = isSend 
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-sky-500"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg><span>Sending...</span>` 
        : `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-emerald-500"><path d="M17 17H7V7"/><path d="M17 7 7 17"/></svg><span>Receiving...</span>`;

    item.innerHTML = `
        <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-2.5 min-w-0">
                <div class="p-2 rounded-lg bg-white dark:bg-slate-900 border border-neutral-200/50 dark:border-slate-800/60 shadow-xs flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-sky-500"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>
                </div>
                <div class="min-w-0">
                    <h4 class="text-xs font-semibold text-neutral-800 dark:text-neutral-100 truncate pr-1" title="${fileName}">${fileName}</h4>
                    <p class="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5 flex items-center gap-1.5 font-mono">
                        <span>${formatBytes(size)}</span>
                        <span>•</span>
                        <span class="flex items-center gap-0.5">${directionBadgeStr}</span>
                    </p>
                </div>
            </div>
            <button class="p-1 rounded-md text-neutral-400 hover:text-rose-500 hover:bg-neutral-100 dark:hover:bg-slate-800 cursor-pointer" onclick="cancelTransferBtn('${id}')">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
        </div>

        <div>
            <div class="flex justify-between items-center text-[10px] text-neutral-500 dark:text-neutral-400 font-mono mb-1.5">
                <span class="font-bold flex items-center gap-0.5 text-zinc-650 dark:text-zinc-350" id="speed-span-${id}">0 B/s</span>
                <span class="font-bold text-sky-500" id="progress-pct-${id}">0%</span>
            </div>
            
            <div class="w-full h-1.5 bg-neutral-200 dark:bg-slate-800 rounded-full overflow-hidden relative">
                <div id="progress-bar-${id}" style="width: 0%" class="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full transition-all duration-150"></div>
            </div>
            
            <div class="flex justify-end text-[9px] text-neutral-450 dark:text-neutral-500 font-mono mt-1">
                <span id="progress-stat-${id}">0 B of ${formatBytes(size)}</span>
            </div>
        </div>
    `;

    list.appendChild(item);
}

function removeActiveTransferUI(id) {
    const item = document.getElementById(`active-transfer-ui-${id}`);
    if (item) item.remove();

    const list = document.getElementById('transfers-list');
    if (list && list.children.length === 0) {
        document.getElementById('transfers-container').classList.add('hidden');
    }
}

function cancelTransferBtn(id) {
    cancelLocalTransfer(id);
}

window.cancelTransferBtn = cancelTransferBtn;

function syncHistoryUI() {
    const list = document.getElementById('history-list');
    list.innerHTML = '';

    if (historicalTransfers.length === 0) {
        document.getElementById('history-container').classList.add('hidden');
        return;
    }

    document.getElementById('history-container').classList.remove('hidden');

    historicalTransfers.forEach((item) => {
        const row = document.createElement('div');
        row.className = "p-3 rounded-xl bg-neutral-50/55 hover:bg-neutral-100/40 dark:bg-slate-950/20 dark:hover:bg-slate-950/30 border border-neutral-150/40 dark:border-slate-850/40 flex items-center justify-between gap-3 transition-colors";
        
        const isSuccess = item.status === 'success';
        const isReceive = item.direction === 'receive';
        
        let actionBtnStr = `<span class="p-1 px-2 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/15 rounded-lg">Sent</span>`;
        if (isReceive && isSuccess && item.blobUrl) {
            actionBtnStr = `<a href="${item.blobUrl}" download="${item.fileName}" class="p-1.5 px-3 text-[10px] font-bold text-emerald-600 hover:text-white hover:bg-emerald-500 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/15 rounded-lg flex items-center gap-1 transition-all">Download</a>`;
        } else if (!isSuccess) {
            actionBtnStr = `<span class="p-1 px-2 text-[10px] font-semibold text-rose-600 dark:text-rose-450 bg-rose-500/10 border border-rose-500/15 rounded-lg">Failed</span>`;
        }

        row.innerHTML = `
            <div class="flex items-center gap-2.5 min-w-0">
                <div class="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-neutral-200/40 dark:border-slate-800/60 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-neutral-400"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>
                </div>
                <div class="min-w-0">
                    <h4 class="text-xs font-semibold text-neutral-700 dark:text-neutral-300 truncate" title="${item.fileName}">${item.fileName}</h4>
                    <p class="text-[9px] text-neutral-400 dark:text-neutral-510 font-mono mt-0.5 truncate flex items-center gap-1">
                        <span>${formatBytes(item.fileSize)}</span>
                        <span>•</span>
                        <span>${isReceive ? 'Received' : 'Sent'}</span>
                        <span>•</span>
                        <span>${new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        ${item.error ? `<span class="text-rose-500 border-l border-neutral-200 dark:border-slate-800 pl-1">${item.error}</span>` : ''}
                    </p>
                </div>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
                ${actionBtnStr}
            </div>
        `;
        list.appendChild(row);
    });
}

/**
 * Clean bytes sizing display converter
 */
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Clean speed metrics displaying format
 */
function formatSpeed(bytesPerSec) {
    if (bytesPerSec === 0 || bytesPerSec === Infinity || isNaN(bytesPerSec)) return '0 B/s';
    return formatBytes(bytesPerSec, 1) + '/s';
}

/*
 * =========================================================================
 * DOM Event Listeners & Bootstrapping
 * =========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // Check local storage for dark theme overrides
    const theme = localStorage.getItem('vanilla_theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const applyTheme = (isDark) => {
        const moon = document.getElementById('theme-moon');
        const sun = document.getElementById('theme-sun');
        if (isDark) {
            document.documentElement.classList.add('dark');
            if (moon) moon.classList.add('hidden');
            if (sun) sun.classList.remove('hidden');
        } else {
            document.documentElement.classList.remove('dark');
            if (sun) sun.classList.add('hidden');
            if (moon) moon.classList.remove('hidden');
        }
    };
    
    applyTheme(theme === 'dark' || (!theme && systemPrefersDark));

    // Dark layout toggling handle
    document.getElementById('theme-toggle').addEventListener('click', () => {
        const isCurrentlyDark = document.documentElement.classList.contains('dark');
        applyTheme(!isCurrentlyDark);
        localStorage.setItem('vanilla_theme', !isCurrentlyDark ? 'dark' : 'light');
    });

    // Rename Modal Operations
    const modal = document.getElementById('rename-modal');
    const input = document.getElementById('rename-input');

    document.getElementById('edit-name-btn').addEventListener('click', () => {
        input.value = deviceName;
        modal.classList.remove('hidden');
        input.focus();
    });

    document.getElementById('rename-cancel').addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    document.getElementById('rename-save').addEventListener('click', () => {
        const newValue = input.value.trim();
        if (newValue) {
            deviceName = newValue;
            localStorage.setItem('vanilla_peer_name', newValue);
            document.getElementById('device-name').innerText = newValue;
            
            // Send sync block to all peers
            const system = getClientSystemInfo();
            activeConnections.forEach((conn) => {
                conn.send({
                    type: 'system-sync',
                    deviceInfo: {
                        name: newValue,
                        os: system.os,
                        browser: system.browser
                    }
                });
            });
        }
        modal.classList.add('hidden');
    });

    // Clear History workflow
    document.getElementById('clear-history-btn').addEventListener('click', () => {
        historicalTransfers.forEach(itm => {
            if (itm.blobUrl) URL.revokeObjectURL(itm.blobUrl);
        });
        historicalTransfers.length = 0;
        syncHistoryUI();
    });

    // Manual Manual Connection Pairing
    document.getElementById('connect-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const codeVal = document.getElementById('target-code-input').value;
        connectToTargetPeer(codeVal);
    });

    // Drag-And-Drop Area Operations
    const dropzone = document.getElementById('dropzone');
    const inputPicker = document.getElementById('vanilla-file-input');

    dropzone.addEventListener('click', () => {
        inputPicker.click();
    });

    inputPicker.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            Array.from(e.target.files).forEach(file => initiateFileSends(file));
        }
    });

    // Prevent default drag handlers
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });

    dropzone.addEventListener('dragenter', () => dropzone.classList.add('border-sky-500', 'bg-sky-50/50'), false);
    dropzone.addEventListener('dragover', () => dropzone.classList.add('border-sky-500', 'bg-sky-50/50'), false);
    
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('border-sky-500', 'bg-sky-50/50'), false);
    dropzone.addEventListener('drop', (e) => {
        dropzone.classList.remove('border-sky-500', 'bg-sky-50/50');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            Array.from(e.dataTransfer.files).forEach(file => initiateFileSends(file));
        }
    }, false);

    // Boot Up PeerJS
    initPeerJS();
});
