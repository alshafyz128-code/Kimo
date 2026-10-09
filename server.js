"use strict";

const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 3000;
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, "data.json");

/* ───────── التخزين: ملف JSON بسيط ───────── */
let db = { users: {}, sessions: {}, messages: [] };
try {
  db = { ...db, ...JSON.parse(fs.readFileSync(DATA_FILE, "utf8")) };
} catch {
  /* أول تشغيل: لا يوجد ملف بعد */
}

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.writeFile(DATA_FILE, JSON.stringify(db), (err) => {
      if (err) console.error("تعذّر حفظ البيانات:", err.message);
    });
  }, 300);
}
function saveNow() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db));
  } catch (err) {
    console.error("تعذّر حفظ البيانات:", err.message);
  }
}

/* ───────── كلمات المرور والجلسات ───────── */
const hashPassword = (password, salt) => crypto.scryptSync(password, salt, 64).toString("hex");

function checkPassword(user, password) {
  const a = Buffer.from(hashPassword(password, user.salt), "hex");
  const b = Buffer.from(user.hash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function newSession(username) {
  const token = crypto.randomBytes(32).toString("hex");
  db.sessions[token] = username;
  save();
  return token;
}

function userFromToken(token) {
  const username = db.sessions[token];
  return username && db.users[username] ? db.users[username] : null;
}

const publicUser = (u) => ({ username: u.username, name: u.name });

function limiter(max, windowMs) {
  const hits = new Map();
  setInterval(() => hits.clear(), windowMs).unref();
  return (req, res, next) => {
    const n = (hits.get(req.ip) || 0) + 1;
    hits.set(req.ip, n);
    if (n > max) return res.status(429).json({ error: "محاولات كثيرة، انتظر دقيقة ثم أعد المحاولة" });
    next();
  };
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const user = userFromToken(header.startsWith("Bearer ") ? header.slice(7) : "");
  if (!user) return res.status(401).json({ error: "انتهت الجلسة، سجّل الدخول من جديد" });
  req.user = user;
  next();
}

/* ───────── واجهة REST ───────── */
const app = express();
app.set("trust proxy", 1);
app.use(express.json({ limit: "10kb" }));

const authLimiter = limiter(20, 60_000);

app.post("/api/register", authLimiter, (req, res) => {
  const { name, username, password } = req.body || {};
  const uname = String(username || "").trim().toLowerCase();
  const displayName = String(name || "").trim();

  if (!/^[a-z0-9_]{3,20}$/.test(uname)) {
    return res.status(400).json({ error: "اسم المستخدم: من ٣ إلى ٢٠ حرفًا إنجليزيًا أو أرقامًا أو _" });
  }
  if (displayName.length < 1 || displayName.length > 30) {
    return res.status(400).json({ error: "اكتب اسمك (حتى ٣٠ حرفًا)" });
  }
  if (typeof password !== "string" || password.length < 6 || password.length > 100) {
    return res.status(400).json({ error: "كلمة المرور ٦ أحرف على الأقل" });
  }
  if (db.users[uname]) return res.status(409).json({ error: "اسم المستخدم مستخدم بالفعل" });

  const salt = crypto.randomBytes(16).toString("hex");
  db.users[uname] = {
    username: uname,
    name: displayName,
    salt,
    hash: hashPassword(password, salt),
    createdAt: Date.now(),
  };
  const token = newSession(uname);
  res.json({ token, user: publicUser(db.users[uname]) });
});

app.post("/api/login", authLimiter, (req, res) => {
  const { username, password } = req.body || {};
  const user = db.users[String(username || "").trim().toLowerCase()];
  if (!user || typeof password !== "string" || !checkPassword(user, password)) {
    return res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
  }
  res.json({ token: newSession(user.username), user: publicUser(user) });
});

app.get("/api/me", requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

app.get("/api/users", requireAuth, (req, res) => {
  const q = String(req.query.q || "").trim().toLowerCase();
  if (!q) return res.json({ users: [] });
  const users = Object.values(db.users)
    .filter((u) => u.username !== req.user.username && (u.username.includes(q) || u.name.toLowerCase().includes(q)))
    .slice(0, 20)
    .map(publicUser);
  res.json({ users });
});

app.get("/api/chats", requireAuth, (req, res) => {
  const me = req.user.username;
  const byPeer = new Map();
  for (const m of db.messages) {
    if (m.from !== me && m.to !== me) continue;
    const peer = m.from === me ? m.to : m.from;
    const entry = byPeer.get(peer) || { last: null, unread: 0 };
    entry.last = m;
    if (m.to === me && m.status !== "read") entry.unread++;
    byPeer.set(peer, entry);
  }
  const chats = [...byPeer]
    .filter(([peer]) => db.users[peer])
    .map(([peer, e]) => ({ peer: publicUser(db.users[peer]), last: e.last, unread: e.unread }))
    .sort((a, b) => b.last.ts - a.last.ts);
  res.json({ chats });
});

app.get("/api/messages/:peer", requireAuth, (req, res) => {
  const me = req.user.username;
  const peer = req.params.peer;
  if (!db.users[peer]) return res.status(404).json({ error: "المستخدم غير موجود" });
  const messages = db.messages
    .filter((m) => (m.from === me && m.to === peer) || (m.from === peer && m.to === me))
    .slice(-200);
  res.json({ peer: publicUser(db.users[peer]), messages });
});

app.get("/health", (req, res) => res.send("ok"));
// ملفات الواجهة: قائمة محددة فقط، حتى لا يُكشف server.js أو data.json
const PUBLIC_FILES = new Set([
  "index.html", "app.jsx", "manifest.json", "sw.js",
  "icon-180.png", "icon-192.png", "icon-512.png",
]);
app.get(["/", "/:file"], (req, res, next) => {
  const file = req.params.file || "index.html";
  if (!PUBLIC_FILES.has(file)) return next();
  res.sendFile(path.join(__dirname, file));
});

/* ───────── الاتصال الفوري (WebSocket) ───────── */
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws", maxPayload: 16 * 1024 });
const online = new Map(); // اسم المستخدم → مجموعة اتصالاته (هاتف + كمبيوتر مثلًا)

const isOnline = (u) => online.has(u) && online.get(u).size > 0;

function sendTo(username, payload) {
  const sockets = online.get(username);
  if (!sockets) return;
  const data = JSON.stringify(payload);
  for (const ws of sockets) if (ws.readyState === 1) ws.send(data);
}

function broadcast(payload) {
  const data = JSON.stringify(payload);
  for (const sockets of online.values()) for (const ws of sockets) if (ws.readyState === 1) ws.send(data);
}

wss.on("connection", (ws, req) => {
  const token = new URL(req.url, "http://localhost").searchParams.get("token") || "";
  const user = userFromToken(token);
  if (!user) {
    ws.close(4001, "unauthorized");
    return;
  }
  const me = user.username;

  ws.isAlive = true;
  ws.on("pong", () => {
    ws.isAlive = true;
  });

  const wasOnline = isOnline(me);
  if (!online.has(me)) online.set(me, new Set());
  online.get(me).add(ws);

  ws.send(JSON.stringify({ type: "online", users: [...online.keys()] }));
  if (!wasOnline) broadcast({ type: "presence", username: me, online: true });

  // رسائل وصلتني وأنا غائب تصبح الآن "تم التسليم"
  const delivered = {};
  for (const m of db.messages) {
    if (m.to === me && m.status === "sent") {
      m.status = "delivered";
      (delivered[m.from] = delivered[m.from] || []).push(m.id);
    }
  }
  for (const [sender, ids] of Object.entries(delivered)) {
    sendTo(sender, { type: "status", peer: me, ids, status: "delivered" });
  }
  if (Object.keys(delivered).length) save();

  let sentTimes = [];
  const fail = (cid, error) => ws.send(JSON.stringify({ type: "error", cid, error }));

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    if (msg.type === "send") {
      const now = Date.now();
      sentTimes = sentTimes.filter((t) => now - t < 10_000);
      if (sentTimes.length >= 20) return fail(msg.cid, "رسائل كثيرة بسرعة، انتظر قليلًا");
      sentTimes.push(now);

      const to = String(msg.to || "");
      const text = String(msg.text || "").trim();
      if (!db.users[to] || to === me) return fail(msg.cid, "المستلم غير موجود");
      if (!text || text.length > 4000) return fail(msg.cid, "الرسالة فارغة أو طويلة جدًا");

      const m = {
        id: crypto.randomUUID(),
        from: me,
        to,
        text,
        ts: now,
        status: isOnline(to) ? "delivered" : "sent",
      };
      db.messages.push(m);
      save();
      sendTo(to, { type: "message", message: m, peer: publicUser(user) });
      sendTo(me, { type: "sent", cid: msg.cid, message: m, peer: publicUser(db.users[to]) });
    } else if (msg.type === "read") {
      const peer = String(msg.peer || "");
      let changed = false;
      for (const m of db.messages) {
        if (m.from === peer && m.to === me && m.status !== "read") {
          m.status = "read";
          changed = true;
        }
      }
      if (changed) {
        save();
        sendTo(peer, { type: "read", by: me });
      }
    } else if (msg.type === "typing") {
      const to = String(msg.to || "");
      if (db.users[to]) sendTo(to, { type: "typing", from: me });
    }
  });

  ws.on("close", () => {
    const sockets = online.get(me);
    if (!sockets) return;
    sockets.delete(ws);
    if (sockets.size === 0) {
      online.delete(me);
      broadcast({ type: "presence", username: me, online: false });
    }
  });
});

// فحص دوري يُبقي الاتصال حيًا ويُنظّف الاتصالات الميتة
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, 30_000).unref();

server.listen(PORT, () => console.log(`Kimo يعمل على المنفذ ${PORT}`));

for (const sig of ["SIGTERM", "SIGINT"]) {
  process.on(sig, () => {
    saveNow();
    process.exit(0);
  });
}
