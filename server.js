// ═══════════════════════════════════════════════════════════
// PJM Trading Alert – Telegram Webhook Server
// Empfängt TradingView Alerts und sendet sie an Telegram
// ═══════════════════════════════════════════════════════════

const express = require('express');

const app = express();
app.use(express.json());


// ─── KONFIGURATION ──────────────────────────────────────────
// Diese Werte in Railway/Render als Environment Variables setzen
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID   = process.env.TELEGRAM_CHAT_ID;
const WEBHOOK_SECRET     = process.env.WEBHOOK_SECRET || 'pjm-secret-2024';
const PORT               = process.env.PORT || 3000;

// ─── TELEGRAM NACHRICHT SENDEN ───────────────────────────────
async function sendTelegram(message) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'HTML',
      disable_notification: false
    })
  });
  const data = await res.json();
  if (!data.ok) throw new Error('Telegram Fehler: ' + JSON.stringify(data));
  return data;
}

// ─── SIGNAL FORMATIERUNG ─────────────────────────────────────
function formatSignal(body) {
  const {
    ticker   = '—',
    action   = '—',
    price    = '—',
    system   = '—',
    timeframe= '—',
    setup    = '—',
    stop     = '—',
    target2r = '—',
    target3r = '—',
    quality  = '—',
    time     = new Date().toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin' })
  } = body;

  const isLong  = action.toLowerCase().includes('long');
  const isShort = action.toLowerCase().includes('short');
  const emoji   = isLong ? '🟢' : isShort ? '🔴' : '🔵';
  const dir     = isLong ? 'LONG' : isShort ? 'SHORT' : action.toUpperCase();

  return `
${emoji} <b>PJM Signal – ${dir}</b>

📊 <b>Markt:</b> ${ticker}
⏱ <b>TF:</b> ${timeframe} | <b>System:</b> ${system}
🔧 <b>Setup:</b> ${setup}

💰 <b>Einstieg:</b> ${price}
🛑 <b>Stop:</b> ${stop}
🎯 <b>2R Ziel:</b> ${target2r}
🎯 <b>3R Ziel:</b> ${target3r}
⭐ <b>Qualität:</b> ${quality}/5

🕐 ${time} (Berlin)
`.trim();
}

// ─── WEBHOOK ENDPOINT ────────────────────────────────────────
app.post('/alert', async (req, res) => {
  // Sicherheits-Check
  const secret = req.headers['x-webhook-secret'] || req.body.secret;
  if (secret !== WEBHOOK_SECRET) {
    console.warn('Ungültiger Secret-Key');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('Alert empfangen:', JSON.stringify(req.body));
    const message = formatSignal(req.body);
    await sendTelegram(message);
    console.log('Telegram Alert gesendet:', req.body.ticker, req.body.action);
    res.json({ ok: true, message: 'Alert gesendet' });
  } catch (err) {
    console.error('Fehler:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── TEST ENDPOINT ───────────────────────────────────────────
app.get('/test', async (req, res) => {
  try {
    await sendTelegram('✅ <b>PJM Scanner</b>\n\nVerbindung erfolgreich! Webhook läuft.');
    res.json({ ok: true, message: 'Test-Nachricht gesendet' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health Check
app.get('/', (req, res) => {
  res.json({ status: 'PJM Webhook läuft', uptime: process.uptime() });
});

app.listen(PORT, () => {
  console.log(`PJM Webhook Server läuft auf Port ${PORT}`);
  console.log(`Bot Token: ${TELEGRAM_BOT_TOKEN ? '✓ gesetzt' : '✗ fehlt'}`);
  console.log(`Chat ID:   ${TELEGRAM_CHAT_ID   ? '✓ gesetzt' : '✗ fehlt'}`);
});
