const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const express = require('express');

let latestQr = '';

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: process.env.SESSION_DIR || './.wwebjs_auth' }),
  puppeteer: {
    // Use the system Chrome (puppeteer's bundled browser is skipped at install).
    executablePath:
      process.env.CHROME_PATH || '/home/nacreousdawn596/.nix-profile/bin/google-chrome-stable',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
});

client.on('qr', (qr) => {
  latestQr = qr;
  console.log('SCAN_QR_BEGIN');
  qrcode.generate(qr, { small: true });
  console.log('SCAN_QR_END');
});

client.on('ready', () => {
  console.log('WHATSAPP_READY');
});

client.on('authenticated', () => {
  console.log('WHATSAPP_AUTHENTICATED — session saved');
});

client.on('auth_failure', (msg) => {
  console.error('WHATSAPP_AUTH_FAILURE', msg);
});

client.initialize();

const app = express();
app.use(express.json());

app.post('/send', async (req, res) => {
  const { number, message } = req.body || {};
  if (!number || !message) {
    res.status(400).json({ ok: false, error: 'number and message are required' });
    return;
  }
  try {
    await client.sendMessage(`${number}@c.us`, message);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.get('/health', async (_req, res) => {
  let ready = false;
  let alive = false;
  try {
    const state = await client.getState();
    alive = true;
    ready = state === 'CONNECTED' && client.info !== undefined;
  } catch {
    alive = false;
    ready = false;
  }
  res.json({ ok: true, ready, alive });
});

// Render the current WhatsApp Web QR as a clean HTML page (scannable by phone).
app.get('/qr', async (_req, res) => {
  if (!latestQr) {
    res.status(404).send('No QR available yet — wait a few seconds and reload.');
    return;
  }
  const dataUrl = await QRCode.toDataURL(latestQr, { width: 480, margin: 2 });
  res.send(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FAME — Link WhatsApp</title></head><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#111;font-family:sans-serif"><div style="text-align:center"><img src="${dataUrl}" width="480" height="480" style="max-width:90vw;height:auto;background:#fff;border-radius:16px;padding:16px"><p style="color:#eee;margin-top:16px">WhatsApp → Paramètres → Appareils connectés → Connecter un appareil</p></div><script>setTimeout(()=>location.reload(),20000)</script></body></html>`);
});

app.get('/', (_req, res) => {
  res.redirect('/qr');
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`BRIDGE_LISTENING on ${HOST}:${PORT}`);
});
