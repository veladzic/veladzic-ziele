import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import cookieParser from 'cookie-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const COOKIE_MAX_AGE_DAYS = parseInt(process.env.ADMIN_COOKIE_DAYS || '365', 10);
const COOKIE_MAX_AGE_MS = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

// Paths
const dataDir = path.join(__dirname, 'data');
const dataFile = path.join(dataDir, 'countdowns.json');

// Ensure data dir/file
fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(dataFile)) {
  const initial = [
    {
      id: genId(),
      title: 'Anniversary',
      description: 'Celebrating love and good times',
      target: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
      emoji: '💖',
      color: '#FF6EC7'
    },
    {
      id: genId(),
      title: 'Vacation',
      description: 'Sunshine, sea, and serenity',
      target: new Date(Date.now() + 1000 * 60 * 60 * 24 * 75).toISOString(),
      emoji: '🏝️',
      color: '#00D1FF'
    }
  ];
  fs.writeFileSync(dataFile, JSON.stringify(initial, null, 2));
}

// View engine & static
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use('/public', express.static(path.join(__dirname, 'public')));

// Parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// Global auth: if ADMIN_TOKEN is set, protect the whole app (except static + login routes)
app.use((req, res, next) => {
  if (!ADMIN_TOKEN) return next();
  const openPaths = [
    '/login',
    '/admin/login',
    '/api/health',
  ];
  const isOpen =
    req.path.startsWith('/public') ||
    req.path === '/' && false || // home is protected when ADMIN_TOKEN is set
    openPaths.includes(req.path) ||
    (req.path === '/admin/login' && (req.method === 'GET' || req.method === 'POST')) ||
    (req.path === '/login' && (req.method === 'GET' || req.method === 'POST'));
  if (isOpen) return next();
  const token = req.cookies.adminToken;
  if (token && token === ADMIN_TOKEN) return next();
  return res.redirect('/login');
});

// Utilities for JSON persistence with basic atomic write
function readCountdowns() {
  try {
    const raw = fs.readFileSync(dataFile, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading countdowns:', e);
    return [];
  }
}

let writeQueue = Promise.resolve();
function writeCountdowns(countdowns) {
  // Serialize writes to avoid races
  writeQueue = writeQueue.then(
    () =>
      new Promise((resolve, reject) => {
        const tmp = dataFile + '.tmp';
        const data = JSON.stringify(countdowns, null, 2);
        fs.writeFile(tmp, data, (err) => {
          if (err) return reject(err);
          fs.rename(tmp, dataFile, (err2) => {
            if (err2) return reject(err2);
            resolve();
          });
        });
      })
  );
  return writeQueue;
}

function genId() {
  // Simple unique-ish ID
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  ).toUpperCase();
}

function requireAdmin(req, res, next) {
  if (!ADMIN_TOKEN) return next(); // no auth configured
  const token = req.cookies.adminToken;
  if (token && token === ADMIN_TOKEN) return next();
  return res.redirect('/admin/login');
}

// Routes
app.get('/', (req, res) => {
  const countdowns = readCountdowns();
  // Sort by soonest target
  countdowns.sort((a, b) => new Date(a.target) - new Date(b.target));
  res.render('index', { countdowns });
});

// Public API (read-only)
app.get('/api/countdowns', (req, res) => {
  const countdowns = readCountdowns();
  res.json(countdowns);
});

// Admin auth
// Unified login routes
app.get('/login', (req, res) => {
  if (!ADMIN_TOKEN) return res.redirect('/');
  if (req.cookies.adminToken && req.cookies.adminToken === ADMIN_TOKEN) {
    return res.redirect('/');
  }
  res.render('login', { error: null });
});

app.get('/admin/login', (req, res) => res.redirect('/login'));

app.post('/login', (req, res) => {
  if (!ADMIN_TOKEN) return res.redirect('/');
  const { token } = req.body;
  if (token && token === ADMIN_TOKEN) {
    res.cookie('adminToken', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE_MS,
    });
    return res.redirect('/');
  }
  return res.status(401).render('login', { error: 'Invalid token' });
});

app.post('/admin/login', (req, res) => res.redirect(307, '/login'));

// Logout
app.get('/admin/logout', (req, res) => {
  res.clearCookie('adminToken', { sameSite: 'lax' });
  res.redirect('/admin/login');
});

// Admin listing
app.get('/admin', requireAdmin, (req, res) => {
  const countdowns = readCountdowns();
  countdowns.sort((a, b) => new Date(a.target) - new Date(b.target));
  res.render('admin', { countdowns, authEnabled: !!ADMIN_TOKEN });
});

// Add countdown
app.post('/admin/add', requireAdmin, async (req, res) => {
  const { title, description, targetDate, targetTime, emoji, color } = req.body;
  try {
    const countdowns = readCountdowns();
    const iso = toIso(targetDate, targetTime);
    countdowns.push({
      id: genId(),
      title: (title || '').trim() || 'Untitled',
      description: (description || '').trim(),
      target: iso,
      emoji: (emoji || '').trim() || '⏳',
      color: (color || '').trim() || '#8B5CF6'
    });
    await writeCountdowns(countdowns);
    res.redirect('/admin');
  } catch (e) {
    console.error(e);
    res.status(500).send('Failed to add countdown');
  }
});

// Edit view
app.get('/admin/edit/:id', requireAdmin, (req, res) => {
  const countdowns = readCountdowns();
  const item = countdowns.find((c) => c.id === req.params.id);
  if (!item) return res.status(404).send('Not found');
  res.render('edit', { c: item });
});

// Edit submit
app.post('/admin/edit/:id', requireAdmin, async (req, res) => {
  const { title, description, targetDate, targetTime, emoji, color } = req.body;
  try {
    const countdowns = readCountdowns();
    const idx = countdowns.findIndex((c) => c.id === req.params.id);
    if (idx === -1) return res.status(404).send('Not found');
    const iso = toIso(targetDate, targetTime);
    countdowns[idx] = {
      ...countdowns[idx],
      title: (title || '').trim() || 'Untitled',
      description: (description || '').trim(),
      target: iso,
      emoji: (emoji || '').trim() || '⏳',
      color: (color || '').trim() || '#8B5CF6'
    };
    await writeCountdowns(countdowns);
    res.redirect('/admin');
  } catch (e) {
    console.error(e);
    res.status(500).send('Failed to update countdown');
  }
});

// Delete
app.post('/admin/delete/:id', requireAdmin, async (req, res) => {
  try {
    const countdowns = readCountdowns();
    const next = countdowns.filter((c) => c.id !== req.params.id);
    await writeCountdowns(next);
    res.redirect('/admin');
  } catch (e) {
    console.error(e);
    res.status(500).send('Failed to delete');
  }
});

function toIso(dateStr, timeStr) {
  // Build ISO in local time from date and time inputs
  const [y, m, d] = (dateStr || '').split('-').map((n) => parseInt(n, 10));
  const [hh, mm] = (timeStr || '00:00').split(':').map((n) => parseInt(n, 10));
  const dt = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
  return dt.toISOString();
}

app.listen(PORT, () => {
  console.log(`Veladzic • Ziele läuft auf http://0.0.0.0:${PORT}`);
});
