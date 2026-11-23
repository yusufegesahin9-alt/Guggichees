// guggichees sunucusu: tek dosya, bağımlılık yok.  Kullanım:  node server.js [port]
// satranc.html ile aynı klasörde durmalı. Oyuncular http://SUNUCU:PORT adresini açar.
const http = require('http'), fs = require('fs'), path = require('path');
const PORT = +process.argv[2] || +process.env.PORT || 3000;
const DB = path.join(__dirname, 'players.json');

let players = {};                       // id -> {n: takma ad, pts: puan}  (players.json'da kalıcı)
try { players = JSON.parse(fs.readFileSync(DB, 'utf8')); } catch (e) {}
const persist = () => fs.writeFile(DB, JSON.stringify(players), () => {});

const rooms = new Map();                // oda kodu -> {tc, peers: Map(id -> {res, col})}
const lobby = new Map();                // çevrimiçi (ana menüdeki) oyuncular: id -> res
let queue = [];                         // otomatik eşleşme bekleyenler

const send = (res, o) => res.write('data: ' + JSON.stringify(o) + '\n\n');
const readBody = req => new Promise(ok => {
  let b = '';
  req.on('data', c => { b += c; if (b.length > 1e5) req.destroy(); });
  req.on('end', () => { try { ok(JSON.parse(b || '{}')); } catch (e) { ok({}); } });
});
// Server-Sent Events akışı başlat
function sse(req, res) {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.write(':ok\n\n');
  const k = setInterval(() => res.write(':k\n\n'), 20000);
  req.on('close', () => clearInterval(k));
}
const clean = s => String(s || '').toLowerCase().replace(/[^a-z0-9_.-]/g, '').slice(0, 12);

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x'), q = u.searchParams, p = u.pathname;
  const json = (o, c = 200) => { res.writeHead(c, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };

  if (p === '/') {                      // oyun sayfası
    return fs.readFile(path.join(__dirname, 'satranc.html'), (e, d) => {
      res.writeHead(e ? 500 : 200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(e ? 'satranc.html bulunamadı' : d);
    });
  }
  if (p === '/lb') {                    // puan tablosu + çevrimiçi sayısı
    const top = Object.entries(players).map(([id, x]) => ({ id, n: x.n, pts: x.pts }))
      .sort((a, b) => b.pts - a.pts).slice(0, 20);
    return json({ online: lobby.size, top });
  }
  if (p === '/score' && req.method === 'POST') {
    const b = await readBody(req);
    if (b.id && typeof b.pts === 'number')
      players[String(b.id).slice(0, 40)] = { n: String(b.name || 'Oyuncu').slice(0, 16), pts: Math.max(0, Math.min(1e6, b.pts | 0)) };
    persist();
    return json({ ok: 1 });
  }
  if (p === '/lobby') {                 // ana menü bağlantısı: çevrimiçi sayacı + eşleşme bildirimi
    sse(req, res);
    const id = q.get('id');
    lobby.set(id, res);
    req.on('close', () => { lobby.delete(id); queue = queue.filter(x => x !== id); });
    return send(res, { t: 'hi' });
  }
  if (p === '/queue') {                 // otomatik eşleşme: iki kişi olunca oda açılır
    const id = q.get('id');
    queue = queue.filter(x => x !== id && lobby.has(x));
    const w = queue.shift();
    if (w && lobby.has(id)) {
      const code = 'm' + Math.random().toString(36).slice(2, 8);
      rooms.set(code, { tc: [5, 0], peers: new Map() });
      setTimeout(() => { const r = rooms.get(code); if (r && !r.peers.size) rooms.delete(code); }, 60000);
      send(lobby.get(w), { t: 'match', code });
      send(lobby.get(id), { t: 'match', code });
    } else queue.push(id);
    return json({ ok: 1 });
  }
  if (p === '/unqueue') { queue = queue.filter(x => x !== q.get('id')); return json({ ok: 1 }); }

  if (p === '/ev') {                    // odaya bağlan (create=1: oda kur, 0: katıl)
    const code = clean(q.get('room')), id = q.get('id');
    let r = rooms.get(code);
    if (q.get('create') === '1') {
      if (r) return json({ err: 'Bu oda kodu kullanımda' }, 409);
      const tc = (q.get('tc') || '5,0').split(',').map(Number);
      r = { tc: tc.length === 2 && tc.every(n => n >= 0) ? tc : [5, 0], peers: new Map() };
      rooms.set(code, r);
    } else if (!r) return json({ err: 'Oda bulunamadı' }, 404);
    if (r.peers.size >= 2 && !r.peers.has(id)) return json({ err: 'Oda dolu' }, 409);
    sse(req, res);
    const col = [...r.peers.values()].some(x => x.col === 'w') ? 'b' : 'w';  // ilk gelen beyaz
    r.peers.set(id, { res, col });
    send(res, { t: 'role', col, tc: r.tc });
    const count = () => r.peers.forEach(x => send(x.res, { t: 'peers', n: r.peers.size }));
    count();
    req.on('close', () => { r.peers.delete(id); r.peers.size ? count() : rooms.delete(code); });
    return;
  }
  if (p === '/send' && req.method === 'POST') {   // hamle / pes mesajını odadaki diğer oyuncuya ilet
    const r = rooms.get(clean(q.get('room'))), b = await readBody(req);
    if (r) r.peers.forEach((x, i) => { if (i !== q.get('id')) send(x.res, b); });
    return json({ ok: 1 });
  }
  res.writeHead(404); res.end();
}).listen(PORT, () => console.log('guggichees sunucusu hazır: http://localhost:' + PORT));
