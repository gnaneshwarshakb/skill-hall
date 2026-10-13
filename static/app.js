// Skillhall front-end — talks to the Flask API, which stores everything in Excel.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
let me = JSON.parse(localStorage.getItem("skillhall_user") || "null");

const esc = t => String(t ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

async function api(url, method = "GET", body) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { toast(data.error || "Something went wrong", true); throw new Error(data.error); }
  return data;
}

function toast(msg, isErr) {
  const t = $("#toast");
  t.textContent = msg; t.className = "toast show" + (isErr ? " err" : "");
  setTimeout(() => (t.className = "toast"), 2600);
}

/* ---------- navigation ---------- */
function go(page) {
  $$(".page").forEach(p => p.classList.toggle("active", p.id === "page-" + page));
  $$("#nav button").forEach(b => b.classList.toggle("active", b.dataset.page === page));
  ({ profile: loadProfile, find: loadFind, matches: loadMatches,
     requests: loadRequests, database: loadDatabase, dashboard: loadDashboard }[page] || (() => {}))();
}
$$("#nav button").forEach(b => (b.onclick = () => go(b.dataset.page)));

function setUser(u) {
  me = u;
  if (u) localStorage.setItem("skillhall_user", JSON.stringify(u));
  else localStorage.removeItem("skillhall_user");
  document.body.classList.toggle("logged", !!u);
  $("#who").innerHTML = u ? `Signed in as<br><b>${esc(u.name)}</b><br><a id="logout">Log out</a>` : "Not signed in";
  if (u) $("#logout").onclick = () => { setUser(null); go("login"); };
}

/* ---------- login / register ---------- */
$("#registerForm").onsubmit = async e => {
  e.preventDefault();
  const u = await api("/api/register", "POST", Object.fromEntries(new FormData(e.target)));
  setUser(u); toast("Profile created!"); go("profile");
};
$("#loginForm").onsubmit = async e => {
  e.preventDefault();
  setUser(await api("/api/login", "POST", Object.fromEntries(new FormData(e.target))));
  toast("Welcome back!"); go("profile");
};
$("#demoBtn").onclick = async () => { setUser(await api("/api/demo", "POST")); go("profile"); };

/* ---------- profile ---------- */
async function loadProfile() {
  if (!me) return;
  const p = await api("/api/students/" + me.id);
  $("#pName").textContent = p.name;
  $("#pMeta").textContent = `${p.department || "—"} · ${p.year}`;
  $("#pContact").innerHTML = `✉ ${esc(p.email)}${p.phone ? " · ☎ " + esc(p.phone) : ""}`;
  $("#bioForm").bio.value = p.bio || ""; $("#bioForm").phone.value = p.phone || "";
  const chip = k => `<span class="chip">${esc(k.skill)} <small class="muted">${esc(k.level)}</small><button title="Remove" onclick="removeSkill(${k.id})">×</button></span>`;
  $("#teachList").innerHTML = p.skills.filter(k => k.type === "teach").map(chip).join("") || '<span class="muted">Nothing yet</span>';
  $("#learnList").innerHTML = p.skills.filter(k => k.type === "learn").map(chip).join("") || '<span class="muted">Nothing yet</span>';
}
$("#bioForm").onsubmit = async e => {
  e.preventDefault();
  await api("/api/students/" + me.id, "PUT", Object.fromEntries(new FormData(e.target)));
  toast("Saved"); loadProfile();
};
$("#skillForm").onsubmit = async e => {
  e.preventDefault();
  await api("/api/skills", "POST", { ...Object.fromEntries(new FormData(e.target)), student_id: me.id });
  e.target.reset(); toast("Skill added"); loadProfile();
};
async function removeSkill(id) { await api("/api/skills/" + id, "DELETE"); loadProfile(); }

/* ---------- find skills ---------- */
function studentCard(s, extra, skillForRequest) {
  return `<div class="card"><h3>${esc(s.name)}</h3>
    <div class="muted">${esc(s.department)} · ${esc(s.year)}</div>${extra}
    <div class="contact">✉ ${esc(s.email)}${s.phone ? "<br>☎ " + esc(s.phone) : ""}</div>
    <div class="row" style="margin-top:12px"><button class="btn amber sm" onclick="openModal(${s.id},'${esc(s.name).replace(/'/g, "")}','${esc(skillForRequest).replace(/'/g, "")}')">Request to learn</button></div></div>`;
}
async function loadFind() {
  const q = encodeURIComponent($("#searchBox").value);
  const list = await api(`/api/skills?q=${q}&me=${me ? me.id : ""}`);
  $("#findResults").innerHTML = list.map(k => studentCard(k.student,
    `<p><span class="badge">${esc(k.skill)}</span><span class="badge green">${esc(k.level)}</span></p><p class="muted">${esc(k.description)}</p>`, k.skill)
  ).join("") || '<p class="muted">No skills found yet. Be the first to post one!</p>';
}
$("#searchBox").oninput = loadFind;

/* ---------- matches ---------- */
async function loadMatches() {
  if (!me) return;
  const list = await api("/api/matches/" + me.id);
  $("#matchResults").innerHTML = list.map(m => studentCard(m.student,
    `<p>Teaches you: ${m.they_teach_me.map(s => `<span class="badge green">${esc(s)}</span>`).join("")}</p>
     ${m.mutual ? `<p>⇄ Wants to learn: ${m.i_teach_them.map(s => `<span class="badge">${esc(s)}</span>`).join("")}</p>` : ""}`,
    m.they_teach_me[0])
  ).join("") || '<p class="muted">No matches yet — add skills you want to learn on your Profile page.</p>';
}

/* ---------- requests ---------- */
let target = null;
function openModal(id, name, skill) {
  if (!me) { toast("Please login first", true); return go("login"); }
  target = { to_id: id, skill };
  $("#mTitle").textContent = `Ask ${name} to teach ${skill}`;
  $("#mMsg").value = ""; $("#modal").classList.add("show");
}
$("#mCancel").onclick = () => $("#modal").classList.remove("show");
$("#mSend").onclick = async () => {
  await api("/api/requests", "POST", { from_id: me.id, ...target, message: $("#mMsg").value });
  $("#modal").classList.remove("show"); toast("Request sent!");
};
async function loadRequests() {
  if (!me) return;
  const { inbox, sent } = await api("/api/requests/" + me.id);
  const cls = s => (s === "Accepted" ? "green" : s === "Declined" ? "red" : "");
  $("#inbox").innerHTML = inbox.map(r => `<div class="card req"><b>${esc(r.other.name)}</b> wants to learn <span class="badge">${esc(r.skill)}</span>
    <p class="muted">${esc(r.message)}</p><span class="badge ${cls(r.status)}">${r.status}</span>
    <div class="contact">✉ ${esc(r.other.email)} ${r.other.phone ? "· ☎ " + esc(r.other.phone) : ""}</div>
    ${r.status === "Pending" ? `<div class="row" style="margin-top:10px"><button class="btn dark sm" onclick="setStatus(${r.id},'Accepted')">Accept</button><button class="btn light sm" onclick="setStatus(${r.id},'Declined')">Decline</button></div>` : ""}</div>`
  ).join("") || '<p class="muted">No requests received.</p>';
  $("#sent").innerHTML = sent.map(r => `<div class="card req">To <b>${esc(r.other.name)}</b> for <span class="badge">${esc(r.skill)}</span>
    <p class="muted">${esc(r.message)}</p><span class="badge ${cls(r.status)}">${r.status}</span></div>`
  ).join("") || '<p class="muted">You have not sent any requests.</p>';
}
async function setStatus(id, status) { await api("/api/requests/" + id, "PUT", { status }); loadRequests(); }

/* ---------- database + dashboard ---------- */
async function loadDatabase() {
  const db = await api("/api/database");
  $("#dbTables").innerHTML = Object.entries(db).map(([name, t]) => `<h3 class="sub">Sheet: ${name} (${t.rows.length} rows)</h3>
    <div class="tbl"><table><tr>${t.columns.map(c => `<th>${c}</th>`).join("")}</tr>
    ${t.rows.map(r => `<tr>${t.columns.map(c => `<td>${esc(r[c])}</td>`).join("")}</tr>`).join("")}</table></div>`).join("");
}
async function loadDashboard() {
  const d = await api("/api/dashboard");
  const box = (n, l) => `<div class="stat"><b>${n}</b>${l}</div>`;
  $("#stats").innerHTML = box(d.students, "Students") + box(d.teach, "Skills offered") + box(d.learn, "Skills wanted") + box(d.requests, "Requests") + box(d.accepted, "Accepted");
  const max = Math.max(1, ...d.top_skills.map(s => s.count));
  $("#topSkills").innerHTML = d.top_skills.map(s => `<div class="bar"><span>${esc(s.skill)}</span><div style="width:${s.count / max * 60}%"></div><span>${s.count}</span></div>`).join("") || '<span class="muted">No data yet.</span>';
}

setUser(me);
