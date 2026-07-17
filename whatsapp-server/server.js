/**
 * WhatsApp Bridge Server
 * 
 * A lightweight REST API bridge that uses Baileys (WhatsApp Web protocol)
 * to send WhatsApp messages without any paid API service.
 * 
 * Endpoints:
 *   GET  /status          - Connection status
 *   GET  /qr              - Get QR code for pairing (as base64 image)
 *   GET  /qr/raw          - Get raw QR string
 *   POST /send-message    - Send a WhatsApp message
 *   POST /restart         - Restart the WhatsApp connection
 *   POST /logout          - Logout and clear session
 */

const express = require('express');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
  Browsers,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

// ─── Global Error Handlers ──────────────────────────────────────
// Prevents the server from crashing when Baileys throws unhandled timeouts
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

// ─── Configuration ──────────────────────────────────────────────
const PORT = process.env.WA_PORT || 3001;
const API_KEY = process.env.WA_API_KEY || 'premier-wa-secret-key';
const AUTH_DIR = path.join(__dirname, 'auth_session');

// ─── Logger ─────────────────────────────────────────────────────
const logger = pino({ level: 'warn' });

// ─── State ──────────────────────────────────────────────────────
let sock = null;
let currentQR = null;
let connectionStatus = 'disconnected'; // disconnected | connecting | qr_ready | connected
let retryCount = 0;
const MAX_RETRIES = 5;

// ─── Express App ────────────────────────────────────────────────
const app = express();
app.use(express.json());

// CORS - allow backend to call this
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// API Key authentication middleware
const authenticate = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.apikey;
  if (apiKey !== API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  next();
};

// ─── WhatsApp Connection ────────────────────────────────────────
async function connectWhatsApp() {
  try {
    connectionStatus = 'connecting';
    currentQR = null;

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      logger,
      printQRInTerminal: true,
      generateHighQualityLinkPreview: false,
      markOnlineOnConnect: false,
      syncFullHistory: false,
      browser: Browsers.macOS('Desktop'),
    });

    // Handle credentials update (save session)
    sock.ev.on('creds.update', saveCreds);

    // Handle connection updates
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        currentQR = qr;
        connectionStatus = 'qr_ready';
        console.log('\n📱 QR Code ready! Scan it from your WhatsApp app.');
        console.log(`   Open http://localhost:${PORT}/qr?apikey=${API_KEY} in your browser\n`);
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        console.log(`❌ Connection closed. Status: ${statusCode}`);
        connectionStatus = 'disconnected';
        currentQR = null;

        if (statusCode === DisconnectReason.loggedOut) {
          console.log('📤 Logged out. Clearing session...');
          // Clear auth session
          if (fs.existsSync(AUTH_DIR)) {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true });
          }
          retryCount = 0;
          // Auto-restart to get new QR
          setTimeout(connectWhatsApp, 2000);
        } else if (shouldReconnect && retryCount < MAX_RETRIES) {
          retryCount++;
          const delay = Math.min(retryCount * 2000, 10000);
          console.log(`🔄 Reconnecting in ${delay / 1000}s... (attempt ${retryCount}/${MAX_RETRIES})`);
          setTimeout(connectWhatsApp, delay);
        } else if (retryCount >= MAX_RETRIES) {
          console.log('⚠️  Max retries reached. Waiting for manual restart.');
          connectionStatus = 'disconnected';
        }
      }

      if (connection === 'open') {
        console.log('✅ WhatsApp connected successfully!');
        connectionStatus = 'connected';
        currentQR = null;
        retryCount = 0;
      }
    });

    // Ignore incoming messages (we only send)
    sock.ev.on('messages.upsert', () => { });

  } catch (error) {
    console.error('Failed to connect:', error);
    connectionStatus = 'disconnected';
    if (retryCount < MAX_RETRIES) {
      retryCount++;
      setTimeout(connectWhatsApp, 5000);
    }
  }
}

// ─── Helper: Format phone number ────────────────────────────────
function formatPhoneNumber(phone) {
  // Remove all non-digit characters
  let cleaned = phone.replace(/[^0-9]/g, '');

  // Handle Sri Lankan numbers
  if (cleaned.startsWith('0')) {
    cleaned = '94' + cleaned.substring(1); // Sri Lanka country code
  }

  // Ensure it doesn't start with +
  // Baileys expects: <country_code><number>@s.whatsapp.net
  return cleaned + '@s.whatsapp.net';
}

// ─── API Routes ─────────────────────────────────────────────────

// Health check (no auth required)
app.get('/', (req, res) => {
  res.json({
    service: 'WhatsApp Bridge',
    status: connectionStatus,
    version: '1.0.0',
  });
});

// Connection status
app.get('/status', authenticate, (req, res) => {
  res.json({
    status: connectionStatus,
    connected: connectionStatus === 'connected',
    qr_available: connectionStatus === 'qr_ready',
    retry_count: retryCount,
  });
});

// Get QR code as HTML page (for easy scanning)
app.get('/qr', authenticate, async (req, res) => {
  if (connectionStatus === 'connected') {
    return res.send(`
      <html>
        <body style="display:flex;justify-content:center;align-items:center;height:100vh;margin:0;font-family:system-ui;background:#f0f0f0;">
          <div style="text-align:center;background:white;padding:40px;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.1);">
            <h2 style="color:#25D366;">✅ WhatsApp Connected!</h2>
            <p style="color:#666;">Your WhatsApp is already paired and active.</p>
          </div>
        </body>
      </html>
    `);
  }

  if (!currentQR) {
    return res.send(`
      <html>
        <head><meta http-equiv="refresh" content="3"></head>
        <body style="display:flex;justify-content:center;align-items:center;height:100vh;margin:0;font-family:system-ui;background:#f0f0f0;">
          <div style="text-align:center;background:white;padding:40px;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.1);">
            <h2>⏳ Waiting for QR Code...</h2>
            <p style="color:#666;">This page will auto-refresh. Status: ${connectionStatus}</p>
          </div>
        </body>
      </html>
    `);
  }

  try {
    const qrImage = await QRCode.toDataURL(currentQR, { width: 300, margin: 2 });
    res.send(`
      <html>
        <head><meta http-equiv="refresh" content="15"></head>
        <body style="display:flex;justify-content:center;align-items:center;height:100vh;margin:0;font-family:system-ui;background:#f0f0f0;">
          <div style="text-align:center;background:white;padding:40px;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.1);">
            <h2 style="color:#25D366;">📱 Scan QR Code</h2>
            <p style="color:#666;margin-bottom:20px;">Open WhatsApp → Linked Devices → Link a Device</p>
            <img src="${qrImage}" alt="QR Code" style="border-radius:8px;" />
            <p style="color:#999;font-size:12px;margin-top:16px;">QR refreshes automatically. Page refreshes every 15s.</p>
          </div>
        </body>
      </html>
    `);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// Get QR code as base64 (for frontend embedding)
app.get('/qr/image', authenticate, async (req, res) => {
  if (connectionStatus === 'connected') {
    return res.json({ connected: true, qr: null });
  }

  if (!currentQR) {
    return res.json({ connected: false, qr: null, status: connectionStatus });
  }

  try {
    const qrDataUrl = await QRCode.toDataURL(currentQR, { width: 300, margin: 2 });
    res.json({ connected: false, qr: qrDataUrl, status: 'qr_ready' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate QR' });
  }
});

// Send message
app.post('/send-message', authenticate, async (req, res) => {
  const { to, message } = req.body;

  if (!to || !message) {
    return res.status(400).json({ error: 'Missing "to" and/or "message" in request body' });
  }

  if (connectionStatus !== 'connected' || !sock) {
    return res.status(503).json({
      error: 'WhatsApp not connected',
      status: connectionStatus,
      sent: false,
    });
  }

  try {
    const jid = formatPhoneNumber(to);
    await sock.sendMessage(jid, { text: message });
    console.log(`📨 Message sent to ${to}`);
    res.json({ sent: true, to, jid });
  } catch (error) {
    console.error(`Failed to send message to ${to}:`, error.message);
    res.status(500).json({ sent: false, error: error.message });
  }
});
// Send document (PDF)
app.post('/send-document', authenticate, async (req, res) => {
  const { to, filePath, fileName, caption } = req.body;

  if (!to || !filePath) {
    return res.status(400).json({ error: 'Missing "to" and/or "filePath" in request body' });
  }

  if (connectionStatus !== 'connected' || !sock) {
    return res.status(503).json({
      error: 'WhatsApp not connected',
      status: connectionStatus,
      sent: false,
    });
  }

  try {
    const jid = formatPhoneNumber(to);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: `File not found at path: ${filePath}` });
    }

    const documentData = fs.readFileSync(filePath);
    const name = fileName || 'document.pdf';

    const messagePayload = {
      document: documentData,
      fileName: name,
      mimetype: 'application/pdf'
    };

    if (caption) {
      messagePayload.caption = caption;
    }

    await sock.sendMessage(jid, messagePayload);
    console.log(`📨 PDF Document sent to ${to}`);
    res.json({ sent: true, to, jid });
  } catch (error) {
    console.error(`Failed to send document to ${to}:`, error.message);
    res.status(500).json({ sent: false, error: error.message });
  }
});



// Restart connection
app.post('/restart', authenticate, async (req, res) => {
  console.log('🔄 Restarting WhatsApp connection...');
  retryCount = 0;

  if (sock) {
    try {
      await sock.end(undefined);
    } catch (e) { /* ignore */ }
    sock = null;
  }

  connectionStatus = 'disconnected';
  currentQR = null;

  setTimeout(connectWhatsApp, 1000);
  res.json({ message: 'Restarting...', status: 'disconnected' });
});

// Logout and clear session
app.post('/logout', authenticate, async (req, res) => {
  console.log('📤 Logging out WhatsApp...');

  if (sock) {
    try {
      await sock.logout();
    } catch (e) { /* ignore */ }
    try {
      await sock.end(undefined);
    } catch (e) { /* ignore */ }
    sock = null;
  }

  // Clear session data
  if (fs.existsSync(AUTH_DIR)) {
    fs.rmSync(AUTH_DIR, { recursive: true, force: true });
  }

  connectionStatus = 'disconnected';
  currentQR = null;
  retryCount = 0;

  // Restart to generate new QR
  setTimeout(connectWhatsApp, 2000);
  res.json({ message: 'Logged out. New QR code will be generated.', status: 'disconnected' });
});

// ─── Start Server ───────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  🟢 WhatsApp Bridge Server');
  console.log(`  📡 Running on http://localhost:${PORT}`);
  console.log(`  🔑 API Key: ${API_KEY}`);
  console.log('═══════════════════════════════════════════════════════');
  console.log('');

  // Start WhatsApp connection
  connectWhatsApp();
});
