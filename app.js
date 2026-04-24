/* =============================================================
   Portfolio — app.js
   -----------------------------------------------------------------
   Zero-dependency. Fetches repos/profile from the GitHub API and
   renders every section below. Edit ONLY the CONFIG block below.
   ============================================================= */


/* ─────────────────────────────────────────
   CONFIGURATION — edit only this section
   ───────────────────────────────────────── */
const CONFIG = {
  githubUsername: "Fejanos",                    // Your GitHub handle
  name: "János Fenyvesi",                       // Displayed in hero + navbar + footer
  title: "IT Educator",                         // Typewriter first line / role
  bio: "IT educator building small tools in C# and Python to make teaching and everyday work a bit easier.",
  avatarUrl: "",                                // Leave empty to auto-fetch from GitHub
  email: "fenyvesijani97@gmail.com",            // Used by the copy-to-clipboard button + contact form
  location: "Hungary",                          // Shown in hero meta strip
  since: "2023",                                // Year you started — shown in hero meta
  accentColor: "#3B82F6",                       // Primary accent (hex). Overrides --accent.

  // Repo names that should always appear first in the Projects grid.
  // Matches on repo.name (case-insensitive).
  pinnedRepos: [
    "SmartDocAnalyzer",
    "NumberQuest",
    "MorseTranslator",
    "ToDo_FinalProject",
    "WeatherAppConsole",
  ],

  // Tagline rotation under the hero name.
  typewriterPhrases: [
    "IT Educator",
    "C# & Python Developer",
    "Automation Enthusiast",
    "Builder of small tools",
  ],

  // Skills rendered as chips in the About section.
  skills: [
    "C#", "WPF", "Java", ".NET", "Python", "JavaScript",
    "HTML", "CSS", "SQL", "Docker",
    "Git", "OpenAI API", "Teaching",
  ],

  // Displayed under "Stack" in the hero meta strip.
  stack: "C# · Python · Docker",

  // About section text.
  aboutLead: "I teach IT and build small automation tools that turn repetitive tasks into one-click jobs.",
  aboutText: "Most of my projects come from a real classroom or workflow problem: grading student assignments, translating Morse code, tracking the weather, or just learning-by-building. I care about clean, readable code and tools that anyone can pick up without a manual.",

  // Contact section intro.
  contactLead: "Got a project, a question, or just want to say hi? Drop a line.",

  // Three facts shown under About. {num, label} each.
  facts: [
    { num: "5+", label: "featured projects" },
    { num: "C# · Py", label: "main stack" },
    { num: "200+",   label: "students helped" },
  ],

  // Leave empty strings to hide individual social links.
  socialLinks: {
    github: "https://github.com/Fejanos",
    linkedin: "https://www.linkedin.com/in/j%C3%A1nos-fenyvesi-7809a2299/",
    twitter: "",
  },

  // OPTIONAL: personal access token to raise the GitHub API rate limit
  // from 60/hour (unauthenticated) to 5000/hour. Generate one at:
  //   https://github.com/settings/tokens?type=beta  (no scopes needed)
  // WARNING: this file is public — only use a token on private/local deploys.
  githubToken: "",
};

/* ─────────────────────────────────────────
   End of configuration
   ───────────────────────────────────────── */


/* =============================================================
   Small DOM helpers
   ============================================================= */
// Shorthand for querySelector / querySelectorAll.
function qs(sel, root) { return (root || document).querySelector(sel); }
function qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

// Format large numbers compactly: 1234 → "1.2k", 2500000 → "2.5M".
function formatNumber(n) {
  if (n == null) return "—";
  if (n < 1000) return String(n);
  if (n < 1_000_000) return (n / 1000).toFixed(n < 10000 ? 1 : 0).replace(/\.0$/, "") + "k";
  return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
}

// Human-readable relative time ("3d ago", "2mo ago").
function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.round(diff / 1000);
  if (s < 60) return s + "s ago";
  const m = Math.round(s / 60);
  if (m < 60) return m + "m ago";
  const h = Math.round(m / 60);
  if (h < 24) return h + "h ago";
  const d = Math.round(h / 24);
  if (d < 30) return d + "d ago";
  const mo = Math.round(d / 30);
  if (mo < 12) return mo + "mo ago";
  return Math.round(mo / 12) + "y ago";
}

// Debounce: coalesce rapid calls (e.g. resize) to the trailing edge.
function debounce(fn, wait) {
  let t;
  return function () {
    const args = arguments;
    clearTimeout(t);
    t = setTimeout(() => fn.apply(null, args), wait || 150);
  };
}

// Lookup for language badge colors (GitHub-like).
const LANG_COLORS = {
  "JavaScript": "#F7DF1E", "TypeScript": "#3178C6", "Python": "#3572A5",
  "Go": "#00ADD8", "Rust": "#DEA584", "C": "#555555", "C++": "#F34B7D",
  "C#": "#178600", "Java": "#B07219", "Ruby": "#701516", "Swift": "#F05138",
  "Kotlin": "#A97BFF", "PHP": "#4F5D95", "HTML": "#E34C26", "CSS": "#563D7C",
  "Shell": "#89E051", "Vue": "#41B883", "Svelte": "#FF3E00", "Dart": "#00B4AB",
  "Lua": "#000080",
};
function langColor(lang) { return LANG_COLORS[lang] || "#8a93a3"; }

// Show a short message in the bottom-center toast.
function toast(msg) {
  const el = qs("#toast");
  el.textContent = msg;
  el.classList.add("is-visible");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("is-visible"), 2000);
}

// Convert "#3B82F6" → "59, 130, 246" so CSS can use rgba(var(--accent-rgb), α).
function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const v = h.length === 3
    ? h.split("").map((c) => c + c).join("")
    : h;
  const n = parseInt(v, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(", ");
}


/* =============================================================
   App state (mutated by load/render functions)
   ============================================================= */
const state = {
  user: null,      // GitHub user object
  repos: [],       // raw non-fork repos
  filter: "all",   // current filter key ("all" or topic/language)
  sort: "stars",   // sort mode for projects grid
};


/* =============================================================
   Fallback data shown if the GitHub API is unreachable or the
   username in CONFIG does not exist. Keeps the UI usable offline.
   ============================================================= */
const FALLBACK_USER = {
  login: CONFIG.githubUsername,
  public_repos: 5,
  followers: 0,
  avatar_url: "",
};
const FALLBACK_REPOS = [
  { id: 1, name: "SmartDocAnalyzer",   description: "AI-powered document analyzer — live data will replace this once the GitHub API responds.", language: "C#",     stargazers_count: 0, forks_count: 0, topics: ["ai", "documents"], html_url: "https://github.com/Fejanos/SmartDocAnalyzer",  homepage: "", pushed_at: new Date().toISOString() },
  { id: 2, name: "NumberQuest",        description: "Small number-guessing game built as a teaching example.",           language: "C#",     stargazers_count: 0, forks_count: 0, topics: ["game", "teaching"], html_url: "https://github.com/Fejanos/NumberQuest",       homepage: "", pushed_at: new Date().toISOString() },
  { id: 3, name: "MorseTranslator",    description: "Text ⇄ Morse code translator.",                                      language: "Python", stargazers_count: 0, forks_count: 0, topics: ["cli", "tool"],      html_url: "https://github.com/Fejanos/MorseTranslator",   homepage: "", pushed_at: new Date().toISOString() },
  { id: 4, name: "ToDo_FinalProject",  description: "Final-project-style to-do app.",                                    language: "C#",     stargazers_count: 0, forks_count: 0, topics: ["todo", "app"],      html_url: "https://github.com/Fejanos/ToDo_FinalProject", homepage: "", pushed_at: new Date().toISOString() },
  { id: 5, name: "WeatherAppConsole",  description: "Console app fetching current weather from an API.",                 language: "C#",     stargazers_count: 0, forks_count: 0, topics: ["weather", "cli"],   html_url: "https://github.com/Fejanos/WeatherAppConsole", homepage: "", pushed_at: new Date().toISOString() },
];


/* =============================================================
   GitHub API
   Returns { user, repos }. Throws on non-OK responses so the
   boot code can fall back gracefully.
   ============================================================= */
async function fetchGitHub() {
  const u = CONFIG.githubUsername;
  const headers = {};
  if (CONFIG.githubToken) headers.Authorization = "token " + CONFIG.githubToken;

  const [userRes, reposRes] = await Promise.all([
    fetch("https://api.github.com/users/" + encodeURIComponent(u), { headers }),
    fetch("https://api.github.com/users/" + encodeURIComponent(u) + "/repos?per_page=100&sort=updated", { headers }),
  ]);
  if (!userRes.ok) throw new Error("User request failed: " + userRes.status);
  if (!reposRes.ok) throw new Error("Repos request failed: " + reposRes.status);

  const user = await userRes.json();
  const repos = await reposRes.json();
  // Filter forks out — we want to feature original work.
  return { user, repos: repos.filter((r) => !r.fork) };
}

// Top-level loader. Tries live API, falls back to sample data on failure.
async function loadData() {
  try {
    const data = await fetchGitHub();
    state.user = data.user;
    state.repos = data.repos;
  } catch (err) {
    console.warn("GitHub API failed:", err);
    state.user = FALLBACK_USER;
    state.repos = FALLBACK_REPOS;
    showApiError(err.message);
  }
  hydrateUser();
  renderAll();
}

// Show the inline error panel in the Projects section.
function showApiError(msg) {
  qs("#projectsError").hidden = false;
  qs("#errorMessage").textContent =
    "Couldn't reach GitHub (" + msg + "). Showing sample projects instead. Possible causes: invalid username, offline, or rate-limited (60 req/hour without a token).";
  qs("#projectsMeta").textContent = "Sample data";
}


/* =============================================================
   Fill static CONFIG-driven text into the page.
   Runs once after loadData, before renders.
   ============================================================= */
function hydrateUser() {
  const u = state.user || {};

  // Split CONFIG.name into first + last for the two-tone hero title.
  const nameParts = (CONFIG.name || u.login || "").split(" ");
  const first = nameParts[0] || "";
  const last = nameParts.slice(1).join(" ") || "";
  qs("[data-name-first]").textContent = first;
  qs("[data-name-last]").textContent = last;

  qs("[data-bio]").textContent = CONFIG.bio || "";
  qs("[data-location]").textContent = CONFIG.location || "Remote";
  qs("[data-stack]").textContent = CONFIG.stack || "";
  qs("[data-since]").textContent = CONFIG.since || "";
  qs("[data-available-text]").textContent = "Available for new work";

  // Terminal card contents.
  qs("[data-term-name]").textContent = (CONFIG.name || u.login || "").toLowerCase();
  qs("[data-term-role]").textContent = CONFIG.title || "";
  qs("[data-term-repos]").textContent = u.public_repos != null ? u.public_repos : state.repos.length;

  // Brand and footer.
  qs("[data-brand-text]").textContent = (u.login || CONFIG.githubUsername || "portfolio").toLowerCase();
  qs("[data-foot-name]").textContent = "© " + new Date().getFullYear() + " " + CONFIG.name;

  // Document title reflects the person, helpful for browser tabs.
  document.title = CONFIG.name + " — " + CONFIG.title;

  // About text + contact lead.
  qs("[data-about-lead]").textContent = CONFIG.aboutLead || "";
  qs("[data-about-text]").textContent = CONFIG.aboutText || "";
  qs("[data-contact-lead]").textContent = CONFIG.contactLead || "";

  // Avatar — auto-fetched from GitHub when CONFIG.avatarUrl is empty.
  const avatarSrc = CONFIG.avatarUrl || u.avatar_url;
  const img = qs("#avatarImg");
  if (avatarSrc) {
    img.src = avatarSrc;
    img.alt = CONFIG.name || u.login || "";
    img.addEventListener("load", () => img.classList.add("is-loaded"), { once: true });
  }

  // Email button value.
  qs("#emailValue").textContent = CONFIG.email || "";
}


/* =============================================================
   Typewriter effect for the hero subtitle.
   Loops through CONFIG.typewriterPhrases forever.
   ============================================================= */
function initTypewriter() {
  const el = qs("#typewriter");
  const phrases = CONFIG.typewriterPhrases && CONFIG.typewriterPhrases.length
    ? CONFIG.typewriterPhrases
    : [CONFIG.title];
  let i = 0, j = 0, deleting = false;

  function tick() {
    const phrase = phrases[i];
    if (!deleting) {
      el.textContent = phrase.slice(0, ++j);
      if (j === phrase.length) {
        deleting = true;
        return setTimeout(tick, 1800);
      }
      setTimeout(tick, 55 + Math.random() * 40);
    } else {
      el.textContent = phrase.slice(0, --j);
      if (j === 0) {
        deleting = false;
        i = (i + 1) % phrases.length;
        return setTimeout(tick, 400);
      }
      setTimeout(tick, 30);
    }
  }
  tick();
}


/* =============================================================
   Skills — render chips from CONFIG.skills.
   ============================================================= */
function renderSkills() {
  const list = qs("#skillsList");
  list.textContent = "";
  CONFIG.skills.forEach((skill, idx) => {
    const li = document.createElement("li");
    li.className = "chip";
    // Stagger entrance per chip.
    li.style.animationDelay = (idx * 40) + "ms";
    li.textContent = skill;
    list.appendChild(li);
  });
}

// Render facts row (num + label pairs).
function renderFacts() {
  const root = qs("#factsList");
  root.textContent = "";
  (CONFIG.facts || []).forEach((f) => {
    const wrap = document.createElement("div");
    const num = document.createElement("span");
    num.className = "fact__num";
    num.textContent = f.num;
    const label = document.createElement("span");
    label.className = "fact__label";
    label.textContent = f.label;
    wrap.appendChild(num);
    wrap.appendChild(label);
    root.appendChild(wrap);
  });
}


/* =============================================================
   Social icons — rendered from CONFIG.socialLinks.
   Only entries with a truthy URL are shown.
   ============================================================= */
const SOCIAL_ICONS = {
  github: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5A12 12 0 0 0 0 12.5c0 5.3 3.4 9.8 8.2 11.4.6.1.8-.3.8-.6v-2.1c-3.3.7-4-1.6-4-1.6-.5-1.4-1.3-1.8-1.3-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17 5 18 5.3 18 5.3c.7 1.7.3 2.9.2 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.7-5.5 6 .4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 24 12.5C24 5.9 18.6.5 12 .5z"/></svg>',
  linkedin: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.5 2h-17A1.5 1.5 0 0 0 2 3.5v17A1.5 1.5 0 0 0 3.5 22h17a1.5 1.5 0 0 0 1.5-1.5v-17A1.5 1.5 0 0 0 20.5 2zM8 19H5v-9h3v9zM6.5 8.3a1.7 1.7 0 1 1 0-3.5 1.7 1.7 0 0 1 0 3.5zM19 19h-3v-4.7c0-1.1 0-2.6-1.6-2.6s-1.8 1.2-1.8 2.5V19h-3v-9h2.9v1.2a3.2 3.2 0 0 1 2.9-1.6c3.1 0 3.6 2 3.6 4.7V19z"/></svg>',
  twitter: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.2 2H21l-6.5 7.5L22 22h-6.1l-4.8-6.3L5.6 22H2.8l7-8L2 2h6.2l4.3 5.7L18.2 2z"/></svg>',
  website: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 0 20"/><path d="M12 2a15.3 15.3 0 0 0 0 20"/></svg>',
};

function renderSocials() {
  const ul = qs("#socials");
  ul.textContent = "";
  Object.entries(CONFIG.socialLinks || {}).forEach(([key, url]) => {
    if (!url) return;
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.className = "social";
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    // Icon is trusted static markup (not user-supplied), so innerHTML is safe here.
    const icon = SOCIAL_ICONS[key] || SOCIAL_ICONS.website;
    a.innerHTML = icon + "<span></span>";
    qs("span", a).textContent = key[0].toUpperCase() + key.slice(1);
    li.appendChild(a);
    ul.appendChild(li);
  });
}


/* =============================================================
   PROJECTS — filters, sort, cards
   ============================================================= */

// Build the set of filter tags from topics + primary languages.
// Returns top entries by frequency, limited to 6 to stay tidy.
function projectTags(repos) {
  const counts = new Map();
  repos.forEach((r) => {
    (r.topics || []).forEach((t) => {
      const k = t.toLowerCase();
      counts.set(k, (counts.get(k) || 0) + 1);
    });
    if (r.language) {
      const k = r.language.toLowerCase();
      counts.set(k, (counts.get(k) || 0) + 1);
    }
  });
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
}

// Render the filter pills. Re-run whenever the active filter changes
// to update the "is-active" state.
function renderFilters() {
  const root = qs("#filters");
  root.textContent = "";

  const tags = projectTags(state.repos);

  // Helper to create a single pill button.
  function makeBtn(key, label, count) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "filter" + (state.filter === key ? " is-active" : "");
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-selected", state.filter === key ? "true" : "false");
    btn.dataset.filter = key;
    btn.textContent = label;
    const c = document.createElement("span");
    c.className = "filter__count";
    c.textContent = count;
    btn.appendChild(c);
    btn.addEventListener("click", () => {
      state.filter = key;
      renderFilters();
      renderProjects();
    });
    return btn;
  }

  root.appendChild(makeBtn("all", "All", state.repos.length));
  tags.forEach(([k, c]) => root.appendChild(makeBtn(k, k, c)));
}

// Does the repo match the current filter?
function matchesFilter(repo, filter) {
  if (filter === "all") return true;
  const topics = (repo.topics || []).map((t) => t.toLowerCase());
  const lang = (repo.language || "").toLowerCase();
  return topics.includes(filter) || lang === filter;
}

// Sort + pin repos. Pinned first, then by user's sort choice.
function sortRepos(repos) {
  const pinnedSet = new Set((CONFIG.pinnedRepos || []).map((n) => n.toLowerCase()));
  const sorted = repos.slice();
  if (state.sort === "stars")        sorted.sort((a, b) => b.stargazers_count - a.stargazers_count);
  else if (state.sort === "updated") sorted.sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));
  else if (state.sort === "name")    sorted.sort((a, b) => a.name.localeCompare(b.name));
  // Stable pin pass — keeps previous ordering within each group.
  sorted.sort((a, b) => {
    const ap = pinnedSet.has(a.name.toLowerCase()) ? 1 : 0;
    const bp = pinnedSet.has(b.name.toLowerCase()) ? 1 : 0;
    return bp - ap;
  });
  return sorted;
}

// Render N skeleton placeholder cards while we wait on the API.
function renderSkeletonCards(n) {
  const grid = qs("#projectsGrid");
  grid.textContent = "";
  for (let i = 0; i < (n || 6); i++) {
    const c = document.createElement("article");
    c.className = "card is-skel";
    c.innerHTML = [
      '<div class="skel skel-title"></div>',
      '<div class="skel skel-line"></div>',
      '<div class="skel skel-line s"></div>',
      '<div class="skel-row"><div class="skel skel-pill"></div><div class="skel skel-pill"></div></div>',
      '<div class="skel skel-bottom"></div>',
    ].join("");
    grid.appendChild(c);
  }
}

// Inline SVG snippets — trusted, static.
const PIN_ICON      = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16 3l5 5-2 2-2-2-4 4 3 3-2 2-8-8 2-2 3 3 4-4-2-2 3-1z"/></svg>';
const STAR_ICON     = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.1 8.6 22 9.6 17 14.4 18.2 21.3 12 18 5.8 21.3 7 14.4 2 9.6 8.9 8.6 12 2"/></svg>';
const FORK_ICON     = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6" cy="3" r="2"/><circle cx="6" cy="21" r="2"/><circle cx="18" cy="6" r="2"/><path d="M6 5v14"/><path d="M18 8a5 5 0 0 1-5 5H9"/></svg>';
const EXTERNAL_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg>';

// Build a single project card. Uses createElement + textContent for
// user-supplied data to avoid any HTML injection.
function buildCard(repo, idx, pinnedSet) {
  const pinned = pinnedSet.has(repo.name.toLowerCase());
  const lang = repo.language;

  const card = document.createElement("article");
  card.className = "card";
  card.style.animationDelay = (idx * 50) + "ms";

  // Head: pin badge + language badge
  const head = document.createElement("div");
  head.className = "card__head";
  if (pinned) {
    const pin = document.createElement("span");
    pin.className = "card__pin";
    pin.innerHTML = PIN_ICON; // trusted static SVG
    const pinText = document.createElement("span");
    pinText.textContent = "Pinned";
    pin.appendChild(pinText);
    head.appendChild(pin);
  }
  if (lang) {
    const langEl = document.createElement("span");
    langEl.className = "card__lang";
    const dot = document.createElement("span");
    dot.className = "card__lang-dot";
    dot.style.background = langColor(lang);
    const name = document.createTextNode(lang);
    langEl.appendChild(dot);
    langEl.appendChild(name);
    head.appendChild(langEl);
  }
  card.appendChild(head);

  // Name (link)
  const h3 = document.createElement("h3");
  h3.className = "card__name";
  const nameA = document.createElement("a");
  nameA.href = repo.html_url || "#";
  nameA.target = "_blank";
  nameA.rel = "noopener noreferrer";
  nameA.textContent = repo.name;
  h3.appendChild(nameA);
  card.appendChild(h3);

  // Description
  const p = document.createElement("p");
  p.className = "card__desc";
  p.textContent = repo.description || "No description provided.";
  card.appendChild(p);

  // Topics
  const topics = (repo.topics || []).slice(0, 4);
  if (topics.length) {
    const wrap = document.createElement("div");
    wrap.className = "card__topics";
    topics.forEach((t) => {
      const span = document.createElement("span");
      span.className = "card__topic";
      span.textContent = "#" + t;
      wrap.appendChild(span);
    });
    card.appendChild(wrap);
  }

  // Footer: stars, forks, links
  const foot = document.createElement("div");
  foot.className = "card__foot";

  const starEl = document.createElement("span");
  starEl.className = "card__stat";
  starEl.title = "Stars";
  starEl.innerHTML = STAR_ICON;
  starEl.appendChild(document.createTextNode(formatNumber(repo.stargazers_count)));
  foot.appendChild(starEl);

  const forkEl = document.createElement("span");
  forkEl.className = "card__stat";
  forkEl.title = "Forks";
  forkEl.innerHTML = FORK_ICON;
  forkEl.appendChild(document.createTextNode(formatNumber(repo.forks_count)));
  foot.appendChild(forkEl);

  const links = document.createElement("div");
  links.className = "card__links";
  const ghLink = document.createElement("a");
  ghLink.className = "card__link";
  ghLink.href = repo.html_url || "#";
  ghLink.target = "_blank";
  ghLink.rel = "noopener noreferrer";
  ghLink.setAttribute("aria-label", "Open " + repo.name + " on GitHub");
  ghLink.title = "GitHub";
  ghLink.innerHTML = SOCIAL_ICONS.github;
  links.appendChild(ghLink);
  if (repo.homepage) {
    const liveLink = document.createElement("a");
    liveLink.className = "card__link";
    liveLink.href = repo.homepage;
    liveLink.target = "_blank";
    liveLink.rel = "noopener noreferrer";
    liveLink.setAttribute("aria-label", "Live demo for " + repo.name);
    liveLink.title = "Live demo";
    liveLink.innerHTML = EXTERNAL_ICON;
    links.appendChild(liveLink);
  }
  foot.appendChild(links);
  card.appendChild(foot);

  return card;
}

// Render the project grid using current filter + sort.
function renderProjects() {
  const grid = qs("#projectsGrid");
  const pinnedSet = new Set((CONFIG.pinnedRepos || []).map((n) => n.toLowerCase()));

  const filtered = state.repos.filter((r) => matchesFilter(r, state.filter));
  const sorted = sortRepos(filtered).slice(0, 12);

  grid.textContent = "";
  qs("#projectsEmpty").hidden = sorted.length > 0;

  sorted.forEach((repo, idx) => {
    grid.appendChild(buildCard(repo, idx, pinnedSet));
  });
}


/* =============================================================
   STATS — numeric cards, language breakdown, recent activity
   ============================================================= */

// Animate an integer from 0 to target over `duration` ms.
function animateNumber(el, target, duration) {
  const dur = duration || 1200;
  const t0 = performance.now();
  function tick(now) {
    const p = Math.min(1, (now - t0) / dur);
    // Cubic ease-out for a natural count-up.
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = formatNumber(Math.round(target * eased));
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = formatNumber(target);
  }
  requestAnimationFrame(tick);
}

function renderStats() {
  const u = state.user || {};
  const totalStars = state.repos.reduce((s, r) => s + (r.stargazers_count || 0), 0);
  const totalForks = state.repos.reduce((s, r) => s + (r.forks_count || 0), 0);

  const stats = {
    repos: u.public_repos != null ? u.public_repos : state.repos.length,
    stars: totalStars,
    forks: totalForks,
    followers: u.followers || 0,
  };

  qsa("#statsGrid .stat-card").forEach((card) => {
    const key = card.dataset.stat;
    animateNumber(qs("[data-stat-value]", card), stats[key] || 0);
  });

  // Language distribution by repo count.
  const langMap = new Map();
  state.repos.forEach((r) => {
    if (!r.language) return;
    langMap.set(r.language, (langMap.get(r.language) || 0) + 1);
  });
  const total = Array.from(langMap.values()).reduce((s, v) => s + v, 0) || 1;
  const langs = Array.from(langMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const langsUl = qs("#langsList");
  langsUl.textContent = "";
  langs.forEach(([name, count]) => {
    const pct = Math.round((count / total) * 100);
    const color = langColor(name);
    const li = document.createElement("li");
    li.className = "lang";

    const nameEl = document.createElement("span");
    nameEl.className = "lang__name";
    const dot = document.createElement("span");
    dot.className = "lang__dot";
    dot.style.background = color;
    nameEl.appendChild(dot);
    nameEl.appendChild(document.createTextNode(name));

    const bar = document.createElement("span");
    bar.className = "lang__bar";
    const fill = document.createElement("span");
    fill.className = "lang__fill";
    fill.style.setProperty("--pct", pct + "%");
    fill.style.background = color;
    bar.appendChild(fill);

    const pctEl = document.createElement("span");
    pctEl.className = "lang__pct";
    pctEl.textContent = pct + "%";

    li.appendChild(nameEl);
    li.appendChild(bar);
    li.appendChild(pctEl);
    langsUl.appendChild(li);
  });

  // Recent activity — top 6 by pushed_at.
  const activity = state.repos.slice().sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at)).slice(0, 6);
  const actUl = qs("#activityList");
  actUl.textContent = "";
  activity.forEach((r) => {
    const li = document.createElement("li");
    const icon = document.createElement("span");
    icon.className = "activity__icon";
    icon.innerHTML = STAR_ICON;
    const name = document.createElement("span");
    name.className = "activity__name";
    const a = document.createElement("a");
    a.href = r.html_url || "#";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = r.name;
    name.appendChild(a);
    const when = document.createElement("span");
    when.className = "activity__when";
    when.textContent = timeAgo(r.pushed_at);
    li.appendChild(icon);
    li.appendChild(name);
    li.appendChild(when);
    actUl.appendChild(li);
  });
}


// Master render after data changes.
function renderAll() {
  renderFilters();
  renderProjects();
  renderStats();
}


/* =============================================================
   Theme toggle — persists to localStorage.
   ============================================================= */
function initTheme() {
  const saved = localStorage.getItem("theme");
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme = saved || (systemDark ? "dark" : "light");

  qs("#themeToggle").addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("theme", next);
  });
}


/* =============================================================
   Sticky nav behaviour + scroll-spy.
   Uses IntersectionObserver to pick the most-visible section.
   ============================================================= */
function initNav() {
  const nav = qs("#nav");
  const links = qsa(".nav__links a");
  const linksWrap = qs(".nav__links");
  const indicator = qs(".nav__indicator");
  const menuBtn = qs("#menuToggle");

  // Shadow under the navbar once the user scrolls.
  function onScroll() { nav.classList.toggle("is-scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Move the sliding pill under the active link.
  function moveIndicator(activeLink) {
    if (!activeLink) return;
    const rect = activeLink.getBoundingClientRect();
    const wrapRect = linksWrap.getBoundingClientRect();
    indicator.style.width = rect.width + "px";
    indicator.style.transform = "translateX(" + (rect.left - wrapRect.left) + "px)";
    linksWrap.classList.add("has-active");
  }

  const sections = qsa("main section[id]");
  const linkMap = new Map(links.map((a) => [a.getAttribute("href"), a]));

  const io = new IntersectionObserver((entries) => {
    const visible = entries.filter((e) => e.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
    if (!visible.length) return;
    const id = "#" + visible[0].target.id;
    links.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === id));
    moveIndicator(linkMap.get(id));
  }, { rootMargin: "-30% 0px -60% 0px", threshold: [0, 0.2, 0.5, 1] });
  sections.forEach((s) => io.observe(s));

  window.addEventListener("resize", debounce(() => {
    moveIndicator(links.find((a) => a.classList.contains("is-active")));
  }, 120));

  // Hover preview — pill follows the hovered link.
  links.forEach((a) => {
    a.addEventListener("mouseenter", () => moveIndicator(a));
    a.addEventListener("mouseleave", () => moveIndicator(links.find((x) => x.classList.contains("is-active"))));
  });

  // Mobile menu.
  menuBtn.addEventListener("click", () => {
    const open = linksWrap.classList.toggle("is-open");
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
  });
  links.forEach((a) => a.addEventListener("click", () => {
    linksWrap.classList.remove("is-open");
    menuBtn.setAttribute("aria-expanded", "false");
  }));
}


/* =============================================================
   Contact form + copy-to-clipboard email.
   Submit opens the visitor's email client with a prefilled message
   (mailto:). No backend needed, and the message actually reaches
   CONFIG.email when the visitor hits "send" in their mail app.
   ============================================================= */
function initContact() {
  const form = qs("#contactForm");
  const status = qs("#contactStatus");

  function validate() {
    let ok = true;
    qsa(".field", form).forEach((f) => f.classList.remove("is-invalid"));
    qsa("[data-err]", form).forEach((e) => (e.textContent = ""));

    const name = qs("#f-name").value.trim();
    const email = qs("#f-email").value.trim();
    const message = qs("#f-message").value.trim();

    function fail(sel, msg) {
      const field = qs(sel).closest(".field");
      field.classList.add("is-invalid");
      qs("[data-err]", field).textContent = msg;
      ok = false;
    }

    if (!name) fail("#f-name", "Please enter your name.");
    if (!email) fail("#f-email", "Please enter your email.");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("#f-email", "That doesn't look like a valid email.");
    if (!message) fail("#f-message", "A message helps me help you.");
    else if (message.length < 8) fail("#f-message", "Just a little more — 8+ characters.");

    return ok;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    status.classList.remove("is-ok");
    status.textContent = "";
    if (!validate()) {
      status.textContent = "Check the highlighted fields.";
      return;
    }

    // Build a mailto: link with the visitor's input pre-filled, so when
    // they hit "send" in their mail client the message lands in my inbox.
    const name = qs("#f-name").value.trim();
    const email = qs("#f-email").value.trim();
    const subject = qs("#f-subject").value.trim() || ("Portfolio contact from " + name);
    const message = qs("#f-message").value.trim();
    const body = "From: " + name + " <" + email + ">\n\n" + message;
    const mailto = "mailto:" + CONFIG.email
      + "?subject=" + encodeURIComponent(subject)
      + "&body="    + encodeURIComponent(body);

    window.location.href = mailto;
    status.classList.add("is-ok");
    status.textContent = "Opening your email app...";
    toast("Opening your email app");
  });

  qsa("input, textarea", form).forEach((el) => {
    el.addEventListener("input", () => {
      const field = el.closest(".field");
      field.classList.remove("is-invalid");
      qs("[data-err]", field).textContent = "";
    });
  });

  // Copy email via Clipboard API; fall back to a toast if blocked.
  const copyBtn = qs("#copyEmailBtn");
  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(CONFIG.email);
      copyBtn.classList.add("is-copied");
      toast("Email copied to clipboard");
      setTimeout(() => copyBtn.classList.remove("is-copied"), 1800);
    } catch {
      toast("Couldn't copy — select manually");
    }
  });
}


/* =============================================================
   Secondary controls: sort select + retry.
   ============================================================= */
function initControls() {
  qs("#sortSelect").addEventListener("change", (e) => {
    state.sort = e.target.value;
    renderProjects();
  });
  qs("#retryBtn").addEventListener("click", () => {
    qs("#projectsError").hidden = true;
    renderSkeletonCards(6);
    loadData();
  });
}


/* =============================================================
   Boot — called when the DOM is ready.
   ============================================================= */
function boot() {
  // Apply accent color from CONFIG to the CSS custom properties.
  document.documentElement.style.setProperty("--accent", CONFIG.accentColor);
  document.documentElement.style.setProperty("--accent-rgb", hexToRgb(CONFIG.accentColor));

  initTheme();
  initNav();
  renderSkills();
  renderFacts();
  renderSocials();
  initTypewriter();
  initContact();
  initControls();

  renderSkeletonCards(6);
  loadData();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
