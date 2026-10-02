/* =========================================================
   MusicFinder - app.js (نسخه نهایی)
   Radio Javan (ایرانی) + iTunes (خارجی)
   با رفع مشکل کاور آلبوم‌ها
========================================================= */

const TASTE_KEY   = "musicFinderTasteV8";
const HISTORY_KEY = "musicFinderSearchHistoryV8";

/* ⚠️ اطلاعات خودت */
const PROXY_URL = "https://winter-cloud-3190musicfinder-proxy.ebrahiminasabtaha.workers.dev";
const API_TOKEN = "cif6wf8evc6mxah:b525h5OhbFlOXYjD6Z5N";


/* =========================
   STORAGE
========================= */
function getTasteData() {
  try {
    const s = localStorage.getItem(TASTE_KEY);
    return s ? JSON.parse(s) : { artists: {}, tracks: {} };
  } catch {
    return { artists: {}, tracks: {} };
  }
}

function saveTasteData(d) {
  localStorage.setItem(TASTE_KEY, JSON.stringify(d));
}

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveHistory(h) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
}


/* =========================
   UTILS
========================= */
function escapeHtml(v) {
  if (v === null || v === undefined) return "";
  return String(v)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/* ✅ تابع جدید: پروکسی عکس برای Radio Javan */
function proxifyImage(url, source) {
  if (!url) return "";

  // برای Radio Javan از weserv استفاده کن
  if (source === "radiojavan") {
    const clean = url.replace(/^https?:\/\//, "");
    return `https://images.weserv.nl/?url=${encodeURIComponent(clean)}`;
  }

  // بقیه منابع مستقیم لود شوند
  return url;
}


/* =========================
   MENU
========================= */
function openMenu() {
  document.getElementById("menuOverlay").classList.add("open");
  document.getElementById("menuDrawer").classList.add("open");
}

function closeMenu() {
  document.getElementById("menuOverlay").classList.remove("open");
  document.getElementById("menuDrawer").classList.remove("open");
}

function goTo(id) {
  closeMenu();
  setTimeout(() => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }, 150);
}


/* =========================
   HISTORY
========================= */
function rememberSearch(q) {
  const h = getHistory();
  const c = q.trim();
  if (!c) return;
  const f = h.filter(i => i.toLowerCase() !== c.toLowerCase());
  f.unshift(c);
  saveHistory(f.slice(0, 30));
  renderHistory();
}

function renderHistory() {
  const el = document.getElementById("historyList");
  if (!el) return;
  const h = getHistory();

  if (!h.length) {
    el.innerHTML = `<div class="empty">هنوز جستجویی نیست.</div>`;
    return;
  }

  el.innerHTML = h.map(q =>
    `<button class="historyItem" onclick="searchFromHistory(${JSON.stringify(q)})">🔎 ${escapeHtml(q)}</button>`
  ).join("");
}

function searchFromHistory(q) {
  document.getElementById("searchInput").value = q;
  performSearch();
}

function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
}


/* =========================
   TASTE
========================= */
function rememberTrack(t) {
  if (!t) return;
  const d = getTasteData();
  const id = t.id || `${t.name}-${t.artist}`;
  if (!id) return;

  if (!d.tracks[id]) {
    d.tracks[id] = {
      id: t.id || "",
      name: t.name || "",
      artist: t.artist || "",
      image: t.image || "",
      source: t.source || "",
      audio: t.audio || "",
      clicks: 0
    };
  }
  d.tracks[id].clicks++;
  saveTasteData(d);
}

function registerTrackClick(t) {
  rememberTrack(t);
  renderTaste();
  renderForYou();
}

function clearTaste() {
  localStorage.removeItem(TASTE_KEY);
  renderTaste();
  renderForYou();
}


/* =========================
   SEARCH (Radio Javan + iTunes)
========================= */
async function performSearch() {
  const input = document.getElementById("searchInput");
  const query = input.value.trim();
  if (!query) return;

  const rs = document.getElementById("resultsSection");
  const results = document.getElementById("searchResults");
  const status = document.getElementById("searchStatus");

  rs.style.display = "block";
  status.innerHTML = `در حال جستجوی "${escapeHtml(query)}"...`;
  results.innerHTML = `
    <div class="empty glass">
      در حال یافتن موسیقی
      <span class="searchLoading"><span></span><span></span><span></span></span>
    </div>
  `;

  rememberSearch(query);

  // === ۱) Radio Javan (آهنگ‌های ایرانی کامل) ===
  let rjTracks = [];
  try {
    const url = `${PROXY_URL}/music/radiojavan?action=search&s=${encodeURIComponent(query)}&token=${API_TOKEN}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data && data.result && data.result.mp3s) {
      rjTracks = data.result.mp3s.map(item => ({
        id: "rj_" + String(item.id),
        name: item.song || item.title || "بدون نام",
        artist: item.artist || "هنرمند ناشناس",
        album: item.album_album || "",
        image: item.photo || item.thumbnail || "",
        audio: item.link || "",
        duration: item.duration || 0,
        source: "radiojavan",
        full: true,
        title_fa: item.song_farsi || "",
        artist_fa: item.artist_farsi || ""
      })).filter(t => t.audio);
    }
  } catch (e) {
    console.warn("Radio Javan failed:", e);
  }

  // === ۲) iTunes (آهنگ‌های خارجی - پیش‌نمایش ۳۰ ثانیه) ===
  let itunesTracks = [];
  try {
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=20`;
    const res = await fetch(itunesUrl);
    const data = await res.json();

    itunesTracks = (data.results || []).map(item => ({
      id: "it_" + String(item.trackId),
      name: item.trackName || "",
      artist: item.artistName || "",
      album: item.collectionName || "",
      image: item.artworkUrl100?.replace("100x100", "400x400") || "",
      audio: item.previewUrl || "",
      duration: item.trackTimeMillis ? Math.floor(item.trackTimeMillis / 1000) : 0,
      source: "itunes",
      full: false
    })).filter(t => t.audio);
  } catch (e) {
    console.warn("iTunes failed:", e);
  }

  const allTracks = [...rjTracks, ...itunesTracks];

  if (!allTracks.length) {
    results.innerHTML = `<div class="empty glass">نتیجه‌ای برای <strong>${escapeHtml(query)}</strong> پیدا نشد.</div>`;
    status.textContent = "نتیجه‌ای نیست.";
    return;
  }

  renderResults(allTracks, query, rjTracks.length, itunesTracks.length);
}


function renderResults(tracks, query, rjCount = 0, itCount = 0) {
  const c = document.getElementById("searchResults");
  const s = document.getElementById("searchStatus");

  window.currentTracks = tracks;

  if (rjCount || itCount) {
    s.textContent = `${rjCount} آهنگ ایرانی · ${itCount} پیش‌نمایش خارجی`;
  } else {
    s.textContent = `${tracks.length} آهنگ پیدا شد`;
  }

  if (!tracks.length) {
    c.innerHTML = `<div class="empty glass">نتیجه‌ای برای <strong>${escapeHtml(query)}</strong> پیدا نشد.</div>`;
    return;
  }

  c.innerHTML = `
    <div class="resultGroup">
      <div class="resultGrid">
        ${tracks.map(trackCard).join("")}
      </div>
    </div>
  `;
}


function trackCard(t) {
  const rawImg = t.image || "";
  const img = proxifyImage(rawImg, t.source);
  const dur = t.duration ? formatTime(t.duration) : "";
  const isFull = t.full;
  const badge = isFull
    ? `<span class="badge full">کامل</span>`
    : `<span class="badge preview">۳۰ ثانیه</span>`;

  return `
    <div class="resultCard glass" onclick="setBackground('${img}')">
      ${img
        ? `<img class="cover" src="${img}" alt="" referrerpolicy="no-referrer" loading="lazy" onerror="this.style.display='none'">`
        : `<div class="cover"></div>`}

      <div style="margin-top:10px;">${badge}</div>
      <div class="cardTitle">${escapeHtml(t.name)}</div>
      <div class="cardArtist">${escapeHtml(t.artist)}</div>
      ${t.album ? `<div class="cardMeta">${escapeHtml(t.album)}</div>` : ""}
      ${dur ? `<div class="cardMeta">${dur}</div>` : ""}

      <div class="cardActions">
        <button class="smallBtn primary"
          onclick="event.stopPropagation(); playMusicFinderSong(window.currentTracks.find(x => x.id === '${t.id}'), window.currentTracks)">
          ▶ ${isFull ? "پخش کامل" : "پیش‌نمایش"}
        </button>
      </div>
    </div>
  `;
}


/* =========================
   BACKGROUND
========================= */
function setBackground(image) {
  if (!image) return;
  const bg = document.getElementById("backgroundArt");
  if (!bg) return;
  bg.style.backgroundImage = `url("${image}")`;
  bg.style.opacity = ".30";
}


/* =========================
   FOR YOU
========================= */
function renderForYou() {
  const c = document.getElementById("forYouContent");
  if (!c) return;

  const d = getTasteData();
  const tracks = Object.values(d.tracks).sort((a, b) => b.clicks - a.clicks);

  if (!tracks.length) {
    c.innerHTML = `<div class="empty glass">شروع به جستجوی موسیقی کن تا MusicFinder سلیقه‌ات را یاد بگیرد.</div>`;
    return;
  }

  c.innerHTML = `
    <div style="margin-top:10px;">
      <h3 style="margin-bottom:16px;">🎵 آهنگ‌هایی که بیشتر کاوش کرده‌اید</h3>
      <div class="resultGrid">
        ${tracks.slice(0, 6).map(t => {
          const img = proxifyImage(t.image, t.source);
          return `
            <div class="resultCard glass">
              ${img ? `<img class="cover" src="${img}" alt="" referrerpolicy="no-referrer" loading="lazy">` : ""}
              <div class="cardTitle">${escapeHtml(t.name)}</div>
              <div class="cardArtist">${escapeHtml(t.artist)}</div>
              <div class="cardMeta">${t.clicks} بار کاوش شده</div>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}


/* =========================
   TASTE RENDER
========================= */
function renderTaste() {
  const d = getTasteData();
  const tracks = Object.values(d.tracks).sort((a, b) => b.clicks - a.clicks).slice(0, 10);

  const tc = document.getElementById("topTracks");
  if (tc) {
    tc.innerHTML = !tracks.length
      ? `<div class="empty">هنوز آهنگی نیست.</div>`
      : tracks.map(t => `
          <div class="tasteRow">
            <div>
              <div class="tasteName">${escapeHtml(t.name)}</div>
              <div class="tasteCount">${escapeHtml(t.artist)}</div>
            </div>
            <div class="tasteCount">${t.clicks}×</div>
          </div>
        `).join("");
  }

  const ac = document.getElementById("topArtists");
  if (ac) {
    ac.innerHTML = `<div class="empty">هنرمند به زودی.</div>`;
  }
}


/* =========================
   MUSIC PLAYER
========================= */
const musicPlayer = document.getElementById("musicPlayer");
const musicAudio = document.getElementById("musicAudio");
const playerCover = document.getElementById("playerCover");
const playerTitle = document.getElementById("playerTitle");
const playerArtist = document.getElementById("playerArtist");
const playerPlay = document.getElementById("playerPlay");
const playerPrevious = document.getElementById("playerPrevious");
const playerNext = document.getElementById("playerNext");
const playerProgress = document.getElementById("playerProgress");
const playerCurrentTime = document.getElementById("playerCurrentTime");
const playerDuration = document.getElementById("playerDuration");
const playerVolume = document.getElementById("playerVolume");

let currentPlayerIndex = -1;
let playerQueue = [];


async function loadPlayerSong(song, autoPlay = false) {
  if (!song) return;

  const url = song.audio;
  if (!url) {
    alert("لینک پخش برای این آهنگ موجود نیست.");
    return;
  }

  playerTitle.textContent = song.name || "آهنگ ناشناس";
  playerArtist.textContent = song.artist || "هنرمند ناشناس";

  // کاور پلیر هم از پروکسی رد شود
  const coverImg = proxifyImage(song.image, song.source);
  playerCover.src = coverImg || "";

  musicAudio.src = url;
  musicPlayer.classList.add("active");

  if (autoPlay) {
    try {
      await musicAudio.play();
      playerPlay.textContent = "❚❚";
    } catch (e) {
      console.warn("Autoplay blocked:", e);
      playerPlay.textContent = "▶";
    }
  } else {
    playerPlay.textContent = "▶";
  }

  if (coverImg) setBackground(coverImg);
  registerTrackClick(song);
}


if (playerPlay) {
  playerPlay.addEventListener("click", () => {
    if (!musicAudio.src) return;
    if (musicAudio.paused) {
      musicAudio.play();
      playerPlay.textContent = "❚❚";
    } else {
      musicAudio.pause();
      playerPlay.textContent = "▶";
    }
  });
}

if (musicAudio) {
  musicAudio.addEventListener("timeupdate", () => {
    if (!musicAudio.duration) return;
    playerProgress.value = (musicAudio.currentTime / musicAudio.duration) * 100;
    playerCurrentTime.textContent = formatTime(musicAudio.currentTime);
  });

  musicAudio.addEventListener("loadedmetadata", () => {
    playerDuration.textContent = formatTime(musicAudio.duration);
  });

  musicAudio.addEventListener("ended", () => {
    playerPlay.textContent = "▶";
    playerProgress.value = 0;
    playerCurrentTime.textContent = "0:00";
    if (playerQueue.length > 1) playerNext.click();
  });

  musicAudio.addEventListener("error", () => {
    console.error("Audio error");
    playerPlay.textContent = "▶";
  });
}

if (playerProgress) {
  playerProgress.addEventListener("input", () => {
    if (!musicAudio.duration) return;
    musicAudio.currentTime = (playerProgress.value / 100) * musicAudio.duration;
  });
}

if (playerVolume) {
  playerVolume.addEventListener("input", () => {
    musicAudio.volume = Number(playerVolume.value);
  });
}

if (playerPrevious) {
  playerPrevious.addEventListener("click", () => {
    if (!playerQueue.length) return;
    currentPlayerIndex--;
    if (currentPlayerIndex < 0) currentPlayerIndex = playerQueue.length - 1;
    loadPlayerSong(playerQueue[currentPlayerIndex], true);
  });
}

if (playerNext) {
  playerNext.addEventListener("click", () => {
    if (!playerQueue.length) return;
    currentPlayerIndex++;
    if (currentPlayerIndex >= playerQueue.length) currentPlayerIndex = 0;
    loadPlayerSong(playerQueue[currentPlayerIndex], true);
  });
}


window.playMusicFinderSong = function (song, queue = []) {
  if (!song) return;
  playerQueue = queue.length ? queue : [song];
  currentPlayerIndex = playerQueue.findIndex(i => i.id === song.id);
  if (currentPlayerIndex < 0) currentPlayerIndex = 0;
  loadPlayerSong(song, true);
};


/* =========================
   INIT
========================= */
const si = document.getElementById("searchInput");
if (si) {
  si.addEventListener("keydown", e => {
    if (e.key === "Enter") performSearch();
  });
}

renderHistory();
renderTaste();
renderForYou();

console.log("MusicFinder ready · Radio Javan + iTunes");
