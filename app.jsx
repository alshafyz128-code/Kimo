const { useState, useEffect, useRef, useCallback } = React;

/* ───────── أيقونات SVG مدمجة ───────── */
const mk = (children) => ({ size = 20, className, style }) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className={className} style={style} aria-hidden="true"
  >
    {children}
  </svg>
);
const PHONE = "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z";
const Search = mk(<><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>);
const MoreVertical = mk(<><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></>);
const Send = mk(<><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></>);
const Phone = mk(<path d={PHONE} />);
const Video = mk(<><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></>);
const ArrowRight = mk(<><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></>);
const Check = mk(<polyline points="20 6 9 17 4 12" />);
const CheckCheck = mk(<><path d="M18 6 7 17l-5-5" /><path d="m22 10-7.5 7.5L13 16" /></>);
const Mic = mk(<><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /></>);
const Paperclip = mk(<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />);
const Smile = mk(<><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></>);
const MessageCircle = mk(<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />);
const CircleDashed = mk(<circle cx="12" cy="12" r="9" strokeDasharray="3.5 3.5" />);
const PhoneCall = mk(<><path d={PHONE} /><path d="M15.05 5A5 5 0 0 1 19 8.95M15.05 1A9 9 0 0 1 23 8.94" /></>);
const Plus = mk(<><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>);

/* ───────── أدوات مساعدة ───────── */
const TONES = ["#2b2f3a", "#35302b", "#2b3532", "#3a2b35", "#2b3a3a", "#33332b"];
const toneOf = (s) => TONES[s.charCodeAt(0) % TONES.length];

const timeFmt = (ts) => new Date(ts).toLocaleTimeString("ar", { hour: "numeric", minute: "2-digit" });
const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
const DAY = 864e5;
const dayLabel = (ts) => {
  if (sameDay(ts, Date.now())) return "اليوم";
  if (sameDay(ts, Date.now() - DAY)) return "أمس";
  return new Date(ts).toLocaleDateString("ar", { day: "numeric", month: "long" });
};
const listTime = (ts) => {
  if (sameDay(ts, Date.now())) return timeFmt(ts);
  if (sameDay(ts, Date.now() - DAY)) return "أمس";
  return new Date(ts).toLocaleDateString("ar", { day: "numeric", month: "numeric" });
};

async function api(path, { method = "GET", body } = {}, token) {
  let res;
  try {
    res = await fetch("/api" + path, {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("تعذّر الاتصال بالخادم، تأكد من الإنترنت");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || "حدث خطأ، حاول مرة أخرى");
    err.status = res.status;
    throw err;
  }
  return data;
}

function Avatar({ name, size = 48 }) {
  return (
    <div className="k-avatar" style={{ width: size, height: size, background: toneOf(name), fontSize: size * 0.42 }}>
      {name[0]}
    </div>
  );
}

function Ticks({ status }) {
  if (status === "pending") return null;
  if (status === "sent") return <Check size={15} className="k-tick" />;
  if (status === "delivered") return <CheckCheck size={15} className="k-tick" />;
  return <CheckCheck size={15} className="k-tick k-tick-read" />;
}

/* ───────── شاشة الدخول ───────── */
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [f, setF] = useState({ name: "", username: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const data = await api(mode === "login" ? "/login" : "/register", { method: "POST", body: f });
      onAuth(data);
    } catch (ex) {
      setErr(ex.message);
      setBusy(false);
    }
  };

  return (
    <div dir="rtl" className="k-auth">
      <form className="k-auth-card" onSubmit={submit}>
        <span className="k-logo k-logo-big" dir="ltr">Kimo</span>
        <p className="k-auth-sub">{mode === "login" ? "سجّل الدخول لمتابعة محادثاتك" : "أنشئ حسابك وابدأ المراسلة"}</p>
        {mode === "register" && (
          <input className="k-auth-input" placeholder="اسمك" value={f.name} onChange={set("name")} maxLength={30} autoComplete="name" />
        )}
        <input
          className="k-auth-input" placeholder="اسم المستخدم (بالإنجليزية)" dir="ltr" value={f.username}
          onChange={set("username")} autoCapitalize="none" autoCorrect="off" autoComplete="username" maxLength={20}
        />
        <input
          className="k-auth-input" type="password" placeholder="كلمة المرور" dir="ltr" value={f.password}
          onChange={set("password")} autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
        {err && <p className="k-err">{err}</p>}
        <button className="k-auth-btn" type="submit" disabled={busy}>
          {busy ? "لحظة…" : mode === "login" ? "دخول" : "إنشاء الحساب"}
        </button>
        <button
          type="button" className="k-auth-switch"
          onClick={() => { setMode(mode === "login" ? "register" : "login"); setErr(""); }}
        >
          {mode === "login" ? "ليس لديك حساب؟ أنشئ حسابًا" : "لديك حساب؟ سجّل الدخول"}
        </button>
      </form>
    </div>
  );
}

/* ───────── بحث عن شخص لبدء محادثة ───────── */
function NewChat({ token, onPick, onClose }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const term = q.trim();
    if (!term) { setResults([]); return; }
    setBusy(true);
    const t = setTimeout(async () => {
      try {
        const { users } = await api("/users?q=" + encodeURIComponent(term), {}, token);
        setResults(users);
      } catch {
        setResults([]);
      }
      setBusy(false);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="k-panel">
      <header className="k-top">
        <button className="k-icon" onClick={onClose} aria-label="رجوع"><ArrowRight size={22} /></button>
        <span className="k-panel-title">محادثة جديدة</span>
        <span style={{ width: 38 }} />
      </header>
      <div className="k-search">
        <Search size={17} />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالاسم أو اسم المستخدم" aria-label="بحث" />
      </div>
      {!q.trim() && <p className="k-empty">اكتب اسم المستخدم لصديقك للبحث عنه.</p>}
      {q.trim() && !busy && results.length === 0 && <p className="k-empty">لا يوجد مستخدم بهذا الاسم.</p>}
      <div className="k-body">
        {results.map((u) => (
          <button key={u.username} className="k-row" onClick={() => onPick(u)}>
            <Avatar name={u.name} />
            <div className="k-row-main">
              <span className="k-name">{u.name}</span>
              <span className="k-preview-text" dir="ltr" style={{ textAlign: "start" }}>@{u.username}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ───────── التطبيق الرئيسي ───────── */
function Messenger({ auth, onLogout }) {
  const me = auth.user;
  const token = auth.token;

  const [chats, setChats] = useState({});
  const [active, setActive] = useState(null);
  const [online, setOnline] = useState({});
  const [typing, setTyping] = useState({});
  const [tab, setTab] = useState("chats");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [panel, setPanel] = useState(false);
  const [menu, setMenu] = useState(false);
  const [toast, setToast] = useState("");
  const [conn, setConn] = useState(false);
  const [canInstall, setCanInstall] = useState(false);

  const wsRef = useRef(null);
  const activeRef = useRef(null);
  const endRef = useRef(null);
  const typingSent = useRef(0);
  const installRef = useRef(null);
  const toastTimer = useRef(null);
  activeRef.current = active;

  const say = useCallback((t) => {
    setToast(t);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2200);
  }, []);

  const wsSend = (payload) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify(payload));
      return true;
    }
    return false;
  };

  /* المحادثات الحالية */
  useEffect(() => {
    api("/chats", {}, token)
      .then(({ chats: list }) => {
        setChats((cs) => {
          const next = { ...cs };
          for (const c of list) {
            if (!next[c.peer.username]) next[c.peer.username] = { peer: c.peer, messages: [c.last], unread: c.unread };
          }
          return next;
        });
      })
      .catch((e) => e.status === 401 && onLogout());
  }, []);

  /* الاتصال الفوري */
  useEffect(() => {
    let closed = false;
    let retry = 0;
    let timer;
    const typingTimers = {};

    const handle = (d) => {
      if (d.type === "online") {
        setOnline(Object.fromEntries(d.users.map((u) => [u, true])));
      } else if (d.type === "presence") {
        setOnline((o) => ({ ...o, [d.username]: d.online }));
      } else if (d.type === "message") {
        const m = d.message;
        const p = d.peer.username;
        const isActive = activeRef.current === p;
        setChats((cs) => {
          const c = cs[p] || { peer: d.peer, messages: [], unread: 0 };
          if (c.messages.some((x) => x.id === m.id)) return cs;
          return { ...cs, [p]: { ...c, messages: [...c.messages, m], unread: isActive ? 0 : c.unread + 1 } };
        });
        setTyping((t) => ({ ...t, [p]: false }));
        if (isActive) wsSend({ type: "read", peer: p });
      } else if (d.type === "sent") {
        const m = d.message;
        const p = m.to;
        setChats((cs) => {
          const c = cs[p] || { peer: d.peer, messages: [], unread: 0 };
          let messages;
          if (c.messages.some((x) => x.cid && x.cid === d.cid)) messages = c.messages.map((x) => (x.cid === d.cid ? m : x));
          else if (c.messages.some((x) => x.id === m.id)) messages = c.messages;
          else messages = [...c.messages, m];
          return { ...cs, [p]: { ...c, messages } };
        });
      } else if (d.type === "status") {
        setChats((cs) => {
          const c = cs[d.peer];
          if (!c) return cs;
          return { ...cs, [d.peer]: { ...c, messages: c.messages.map((x) => (d.ids.includes(x.id) ? { ...x, status: d.status } : x)) } };
        });
      } else if (d.type === "read") {
        setChats((cs) => {
          const c = cs[d.by];
          if (!c) return cs;
          return { ...cs, [d.by]: { ...c, messages: c.messages.map((x) => (x.from === me.username ? { ...x, status: "read" } : x)) } };
        });
      } else if (d.type === "typing") {
        setTyping((t) => ({ ...t, [d.from]: true }));
        clearTimeout(typingTimers[d.from]);
        typingTimers[d.from] = setTimeout(() => setTyping((t) => ({ ...t, [d.from]: false })), 3000);
      } else if (d.type === "error") {
        setChats((cs) =>
          Object.fromEntries(Object.entries(cs).map(([k, c]) => [k, { ...c, messages: c.messages.filter((x) => x.cid !== d.cid) }]))
        );
        say(d.error);
      }
    };

    const connect = () => {
      const proto = location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${proto}//${location.host}/ws?token=${token}`);
      wsRef.current = ws;
      ws.onopen = () => {
        retry = 0;
        setConn(true);
        if (activeRef.current) ws.send(JSON.stringify({ type: "read", peer: activeRef.current }));
      };
      ws.onclose = (ev) => {
        setConn(false);
        if (closed) return;
        if (ev.code === 4001) { onLogout(); return; }
        timer = setTimeout(connect, Math.min(1000 * 2 ** retry++, 10000));
      };
      ws.onmessage = (ev) => {
        try { handle(JSON.parse(ev.data)); } catch { /* تجاهل */ }
      };
    };
    connect();

    return () => {
      closed = true;
      clearTimeout(timer);
      if (wsRef.current) wsRef.current.close();
    };
  }, [token]);

  /* زر التثبيت */
  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); installRef.current = e; setCanInstall(true); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const activeChat = active ? chats[active] : null;
  const msgCount = activeChat ? activeChat.messages.length : 0;

  useEffect(() => {
    if (endRef.current) endRef.current.scrollIntoView({ behavior: "smooth" });
  }, [msgCount, active, active && typing[active]]);

  const openChat = async (username) => {
    setActive(username);
    setPanel(false);
    setDraft("");
    setChats((cs) => (cs[username] ? { ...cs, [username]: { ...cs[username], unread: 0 } } : cs));
    try {
      const { messages, peer } = await api("/messages/" + username, {}, token);
      setChats((cs) => {
        const c = cs[username] || { peer, messages: [], unread: 0 };
        const ids = new Set(messages.map((m) => m.id));
        const floor = messages.length ? messages[0].ts : 0;
        const extra = c.messages.filter((x) => !ids.has(x.id) && x.ts >= floor);
        return { ...cs, [username]: { ...c, peer, messages: [...messages, ...extra], unread: 0 } };
      });
    } catch (e) {
      if (e.status === 401) onLogout();
    }
    wsSend({ type: "read", peer: username });
  };

  const pickUser = (u) => {
    setChats((cs) => (cs[u.username] ? cs : { ...cs, [u.username]: { peer: u, messages: [], unread: 0 } }));
    openChat(u.username);
  };

  const send = () => {
    const text = draft.trim();
    if (!text || !active) return;
    const cid = "c" + Date.now() + Math.random().toString(36).slice(2, 6);
    const m = { id: cid, cid, from: me.username, to: active, text, ts: Date.now(), status: "pending" };
    if (!wsSend({ type: "send", to: active, text, cid })) return say("لا يوجد اتصال بالخادم، حاول بعد لحظات");
    setChats((cs) => ({ ...cs, [active]: { ...cs[active], messages: [...cs[active].messages, m] } }));
    setDraft("");
  };

  const onDraft = (e) => {
    setDraft(e.target.value);
    const now = Date.now();
    if (active && now - typingSent.current > 2000) {
      typingSent.current = now;
      wsSend({ type: "typing", to: active });
    }
  };

  const share = async () => {
    setMenu(false);
    const data = { title: "Kimo", text: "انضم إليّ على Kimo", url: location.origin };
    if (navigator.share) {
      try { await navigator.share(data); } catch { /* أغلق المستخدم النافذة */ }
    } else {
      try { await navigator.clipboard.writeText(location.origin); say("تم نسخ رابط التطبيق"); } catch { say(location.origin); }
    }
  };

  const install = async () => {
    setMenu(false);
    const e = installRef.current;
    if (!e) return;
    e.prompt();
    await e.userChoice;
    installRef.current = null;
    setCanInstall(false);
  };

  const q = query.trim().toLowerCase();
  const list = Object.values(chats)
    .filter((c) => c.messages.length && (c.peer.name.toLowerCase().includes(q) || c.peer.username.includes(q)))
    .sort((a, b) => b.messages[b.messages.length - 1].ts - a.messages[a.messages.length - 1].ts);

  const msgs = activeChat ? activeChat.messages : [];
  const sub = !active ? "" : typing[active] ? "يكتب الآن…" : online[active] ? "متصل" : "غير متصل";

  return (
    <div dir="rtl" className={"k-app" + (active ? " k-chat-open" : "")}>
      <aside className="k-side">
        <header className="k-top">
          <span className="k-logo" dir="ltr">Kimo</span>
          <button className="k-icon" onClick={() => setMenu(!menu)} aria-label="القائمة"><MoreVertical size={20} /></button>
        </header>
        {!conn && <div className="k-conn">جارٍ الاتصال…</div>}

        <div className="k-body">
          {tab === "chats" && (
            <>
              <div className="k-search">
                <Search size={17} />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث في المحادثات" aria-label="ابحث في المحادثات" />
              </div>
              {list.length === 0 && (
                <p className="k-empty">{q ? "لا توجد محادثة بهذا الاسم." : "لا توجد محادثات بعد. اضغط الزر الأبيض لتبدأ محادثة جديدة."}</p>
              )}
              {list.map((c) => {
                const last = c.messages[c.messages.length - 1];
                return (
                  <button
                    key={c.peer.username}
                    className={"k-row" + (c.peer.username === active ? " k-row-active" : "")}
                    onClick={() => openChat(c.peer.username)}
                  >
                    <Avatar name={c.peer.name} />
                    <div className="k-row-main">
                      <div className="k-row-line">
                        <span className="k-name">{c.peer.name}</span>
                        <span className={"k-time" + (c.unread ? " k-time-new" : "")}>{listTime(last.ts)}</span>
                      </div>
                      <div className="k-row-line">
                        <span className="k-preview">
                          {last.from === me.username && <Ticks status={last.status} />}
                          <span className="k-preview-text">{last.text}</span>
                        </span>
                        {c.unread > 0 && <span className="k-badge">{c.unread}</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </>
          )}
          {tab === "status" && <p className="k-empty">الحالات قريبًا.</p>}
          {tab === "calls" && <p className="k-empty">المكالمات قريبًا.</p>}
        </div>

        {tab === "chats" && (
          <button className="k-fab" onClick={() => setPanel(true)} aria-label="محادثة جديدة"><Plus size={26} /></button>
        )}

        <nav className="k-nav">
          {[["chats", "المحادثات", MessageCircle], ["status", "الحالات", CircleDashed], ["calls", "المكالمات", PhoneCall]].map(([key, label, Icon]) => (
            <button key={key} className={"k-nav-item" + (tab === key ? " k-nav-on" : "")} onClick={() => setTab(key)}>
              <Icon size={22} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        {panel && <NewChat token={token} onPick={pickUser} onClose={() => setPanel(false)} />}

        {menu && (
          <>
            <div className="k-scrim" onClick={() => setMenu(false)} />
            <div className="k-menu">
              <button onClick={share}>مشاركة التطبيق</button>
              {canInstall && <button onClick={install}>تثبيت على الهاتف</button>}
              <button onClick={() => { setMenu(false); onLogout(); }}>تسجيل الخروج ({me.name})</button>
            </div>
          </>
        )}
      </aside>

      <main className="k-main">
        {!activeChat ? (
          <div className="k-welcome">
            <span className="k-logo k-logo-big" dir="ltr">Kimo</span>
            <p>اختر محادثة لتبدأ المراسلة.</p>
          </div>
        ) : (
          <>
            <header className="k-chat-head">
              <button className="k-icon k-back" onClick={() => setActive(null)} aria-label="رجوع"><ArrowRight size={22} /></button>
              <Avatar name={activeChat.peer.name} size={40} />
              <div className="k-head-text">
                <span className="k-name">{activeChat.peer.name}</span>
                <span className="k-sub">{sub}</span>
              </div>
              <button className="k-icon" onClick={() => say("المكالمات قريبًا")} aria-label="مكالمة فيديو"><Video size={21} /></button>
              <button className="k-icon" onClick={() => say("المكالمات قريبًا")} aria-label="مكالمة صوتية"><Phone size={20} /></button>
            </header>

            <div className="k-messages">
              {msgs.length === 0 && <span className="k-day">ابدأ المحادثة مع {activeChat.peer.name}</span>}
              {msgs.map((m, i) => (
                <React.Fragment key={m.id}>
                  {(i === 0 || !sameDay(msgs[i - 1].ts, m.ts)) && <span className="k-day">{dayLabel(m.ts)}</span>}
                  <div className={"k-msg " + (m.from === me.username ? "k-me" : "k-them")}>
                    <span className="k-text">{m.text}</span>
                    <span className="k-meta">
                      {timeFmt(m.ts)}
                      {m.from === me.username && <Ticks status={m.status} />}
                    </span>
                  </div>
                </React.Fragment>
              ))}
              {typing[active] && (
                <div className="k-msg k-them k-typing" aria-label="يكتب"><i /><i /><i /></div>
              )}
              <div ref={endRef} />
            </div>

            <div className="k-composer">
              <div className="k-field">
                <button className="k-icon" onClick={() => say("قريبًا")} aria-label="رموز تعبيرية"><Smile size={21} /></button>
                <input
                  value={draft} onChange={onDraft} onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder="اكتب رسالة" dir="auto" aria-label="اكتب رسالة" maxLength={4000}
                />
                <button className="k-icon" onClick={() => say("قريبًا")} aria-label="إرفاق"><Paperclip size={20} /></button>
              </div>
              <button
                className="k-send"
                onClick={draft.trim() ? send : () => say("الرسائل الصوتية قريبًا")}
                aria-label={draft.trim() ? "إرسال" : "رسالة صوتية"}
              >
                {draft.trim() ? <Send size={20} style={{ transform: "scaleX(-1)" }} /> : <Mic size={21} />}
              </button>
            </div>
          </>
        )}
      </main>

      {toast && <div className="k-toast" role="status">{toast}</div>}
    </div>
  );
}

function App() {
  const [auth, setAuth] = useState(() => {
    try { return JSON.parse(localStorage.getItem("kimo_auth")); } catch { return null; }
  });
  const login = (a) => { localStorage.setItem("kimo_auth", JSON.stringify(a)); setAuth(a); };
  const logout = () => { localStorage.removeItem("kimo_auth"); setAuth(null); };
  return (
    <>
      <style>{css}</style>
      {auth ? <Messenger auth={auth} onLogout={logout} /> : <AuthScreen onAuth={login} />}
    </>
  );
}

const css = `
:root{--bg:#000;--bar:#141414;--line:#232323;--soft:#1c1c1c;--text:#f2f2f2;--mute:#8a8a8a;--read:#2f9bff}
body{font-family:'Noto Sans Arabic','Segoe UI',Tahoma,system-ui,sans-serif;color:var(--text)}
.k-app,.k-auth{font-family:inherit;color:var(--text)}
.k-app *,.k-auth *{box-sizing:border-box;margin:0}
.k-app button,.k-auth button{font-family:inherit;color:inherit;background:none;border:0;cursor:pointer}
.k-app input,.k-auth input{font-family:inherit;color:var(--text);background:none;border:0;outline:0;width:100%;font-size:16px}
.k-app button:focus-visible,.k-app input:focus-visible,.k-auth button:focus-visible{outline:2px solid #fff;outline-offset:2px}

.k-auth{min-height:100vh;min-height:100dvh;display:grid;place-items:center;background:#000;padding:20px}
.k-auth-card{width:100%;max-width:380px;display:flex;flex-direction:column;gap:12px;text-align:center}
.k-auth-sub{color:var(--mute);margin-bottom:6px}
.k-auth-input{height:48px;border-radius:12px;background:var(--soft)!important;border:1px solid var(--line)!important;padding:0 14px}
.k-auth-input:focus{border-color:#fff!important}
.k-auth-btn{height:48px;border-radius:12px;background:#fff!important;color:#000!important;font-weight:800;font-size:16px}
.k-auth-btn:disabled{opacity:.5}
.k-auth-switch{color:var(--mute)!important;font-size:14px}
.k-err{color:#ff6b6b;font-size:14px}

.k-app{background:var(--bg);height:100vh;height:100dvh;display:grid;grid-template-columns:400px 1fr;overflow:hidden}
.k-side{position:relative;display:flex;flex-direction:column;border-inline-end:1px solid var(--line);min-height:0;background:var(--bg)}
.k-top{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:var(--bar)}
.k-logo{font-weight:800;font-size:26px;letter-spacing:-.5px;color:#fff}
.k-logo-big{font-size:64px}
.k-panel-title{font-weight:600;font-size:17px}
.k-icon{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;color:#cfcfcf!important;flex:none}
.k-icon:hover{background:var(--soft)!important}
.k-conn{padding:5px;text-align:center;font-size:13px;background:#2a2a2a;color:#ddd}
.k-body{flex:1;overflow-y:auto;min-height:0}
.k-search{display:flex;align-items:center;gap:10px;margin:10px 14px;padding:0 14px;height:40px;border-radius:12px;background:var(--soft);color:var(--mute)}
.k-row{display:flex;align-items:center;gap:14px;width:100%;padding:11px 16px;text-align:start}
.k-row:hover,.k-row-active{background:var(--soft)!important}
.k-row-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.k-row-line{display:flex;align-items:center;justify-content:space-between;gap:8px}
.k-name{font-weight:600;font-size:16px}
.k-time{font-size:12px;color:var(--mute)}
.k-time-new{color:#fff}
.k-preview{display:flex;align-items:center;gap:4px;color:var(--mute);min-width:0}
.k-preview-text{font-size:14px;color:var(--mute);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.k-badge{min-width:21px;height:21px;padding:0 6px;border-radius:11px;background:#fff;color:#000;font-size:12px;font-weight:800;display:grid;place-items:center}
.k-avatar{border-radius:50%;display:grid;place-items:center;font-weight:600;color:#eee;flex:none}
.k-empty{padding:30px 20px;text-align:center;color:var(--mute);line-height:1.7}
.k-tick{color:var(--mute);flex:none}
.k-tick-read{color:var(--read)}

.k-fab{position:absolute;bottom:80px;inset-inline-end:18px;width:56px;height:56px;border-radius:18px;background:#fff!important;color:#000!important;display:grid;place-items:center;box-shadow:0 4px 16px rgba(0,0,0,.7)}
.k-panel{position:absolute;inset:0;background:#000;z-index:15;display:flex;flex-direction:column}
.k-scrim{position:fixed;inset:0;z-index:20}
.k-menu{position:absolute;top:56px;inset-inline-end:10px;z-index:30;min-width:210px;background:#1c1c1c;border:1px solid #2a2a2a;border-radius:12px;padding:6px;box-shadow:0 8px 24px rgba(0,0,0,.7)}
.k-menu button{display:block;width:100%;text-align:start;padding:11px 12px;border-radius:8px;font-size:15px}
.k-menu button:hover{background:#2a2a2a!important}
.k-toast{position:fixed;bottom:96px;left:50%;transform:translateX(-50%);background:#fff;color:#000;padding:10px 18px;border-radius:20px;font-size:14px;z-index:50;max-width:90vw;text-align:center}

.k-nav{display:flex;border-top:1px solid var(--line);background:var(--bar);padding-bottom:env(safe-area-inset-bottom)}
.k-nav-item{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:9px 0 8px;font-size:12px;color:var(--mute)!important}
.k-nav-on{color:#fff!important;box-shadow:inset 0 2px 0 #fff}

.k-main{display:flex;flex-direction:column;min-width:0;min-height:0;height:100vh;height:100dvh;
  background:radial-gradient(rgba(255,255,255,.05) 1px,transparent 1.4px) 0 0/22px 22px,#000}
.k-welcome{margin:auto;text-align:center;color:var(--mute);display:flex;flex-direction:column;gap:6px}
.k-chat-head{display:flex;align-items:center;gap:10px;padding:9px 12px;background:var(--bar);border-bottom:1px solid var(--line)}
.k-head-text{flex:1;display:flex;flex-direction:column;line-height:1.3;min-width:0}
.k-sub{font-size:12px;color:var(--mute)}
.k-back{display:none!important}
.k-messages{flex:1;overflow-y:auto;padding:16px 6% 10px;display:flex;flex-direction:column;gap:5px}
.k-day{align-self:center;margin:4px 0 10px;padding:4px 14px;border-radius:10px;background:var(--soft);font-size:12px;color:var(--mute)}
.k-msg{max-width:min(75%,520px);padding:7px 11px 5px;display:flex;flex-direction:column;gap:1px;border-radius:16px;font-size:15px;line-height:1.55}
.k-text{white-space:pre-wrap;overflow-wrap:anywhere}
.k-me{align-self:flex-start;background:#f2f2f2;color:#000;border-start-start-radius:4px}
.k-them{align-self:flex-end;background:#1c1c1c;border:1px solid #2a2a2a;border-start-end-radius:4px}
.k-meta{align-self:flex-end;display:flex;align-items:center;gap:3px;font-size:11px;color:#777}
.k-me .k-tick{color:#8a8a8a}.k-me .k-tick-read{color:#1d7fe0}
.k-typing{flex-direction:row;gap:4px;padding:13px 14px}
.k-typing i{width:7px;height:7px;border-radius:50%;background:#777;animation:kb 1s infinite}
.k-typing i:nth-child(2){animation-delay:.15s}.k-typing i:nth-child(3){animation-delay:.3s}
@keyframes kb{0%,60%,100%{opacity:.35}30%{opacity:1}}

.k-composer{display:flex;align-items:center;gap:8px;padding:9px 12px;padding-bottom:max(9px,env(safe-area-inset-bottom));background:var(--bar)}
.k-field{flex:1;display:flex;align-items:center;gap:2px;padding:0 6px;height:46px;border-radius:24px;background:var(--soft)}
.k-send{width:46px;height:46px;border-radius:50%;background:#fff!important;color:#000!important;display:grid;place-items:center;flex:none}

@media (max-width:859px){
  .k-app{grid-template-columns:1fr}
  .k-main{display:none}
  .k-chat-open .k-side{display:none}
  .k-chat-open .k-main{display:flex}
  .k-back{display:grid!important}
  .k-messages{padding:14px 12px 8px}
}
@media (prefers-reduced-motion:reduce){.k-typing i{animation:none}}
`;

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
