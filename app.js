/* =========================================================
   MusicFinder - app.js
   با APIهای رایگان: iTunes + Deezer + Audius
========================================================= */

const TASTE_KEY   = "musicFinderTasteV4";
const HISTORY_KEY = "musicFinderSearchHistoryV4";

/* =========================
   STORAGE
========================= */

function getTasteData() {
  try {
    const saved = localStorage.getItem(TASTE_KEY);
    return saved ? JSON.parse(saved) : { searches: [], artists: {}, tracks: {} };
  } catch {
    return { searches: [], artists: {}, tracks: {} };
  }
}

function saveTasteData(data) {
  localStorage.setItem(TASTE_KEY, JSON.stringify(data));
}

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

/* =========================
   UTILS
========================= */

function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
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

function rememberSearch(query) {
  const history = getHistory();
  const clean = query.trim();
  if (!clean) return;

  const filtered = history.filter(item => item.toLowerCase() !== clean.toLowerCase());
  filtered.unshift(clean);
  saveHistory(filtered.slice(0, 30));
  renderHistory();
}

function renderHistory() {
  const container = document.getElementById("historyList");
  const history = getHistory();

  if (!history.length) {
    container.innerHTML = `<div class="empty">هنوز جستجویی نیست.</div>`;
    return;
  }

  container.innerHTML = history
    .map(q => `
      <button class="historyItem" onclick="searchFromHistory(${JSON.stringify(q)})">
        🔎 ${escapeHtml(q)}
      </button>
    `)
    .join("");
}

function searchFromHistory(query) {
  document.getElementById("searchInput").value = query;
  performSearch();
}

function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
}

/* =========================
   TASTE
========================= */

function rememberTrack(track) {
  if (!track) return;
  const data = getTasteData();
  const id = track.id || `${track.name}-${track.artist}`;
  if (!id) return;

  if (!data.tracks[id]) {
    data.tracks[id] = {
      id: track.id || "",
      name: track.name || "",
      artist: track.artist || "",
      image: track.image || "",
      preview: track.preview || "",
      spotify: track.spotify || "",
      clicks: 0
    };
  }
  data.tracks[id].clicks++;
  saveTasteData(data);
}

function rememberArtist(artist) {
  if (!artist) return;
  const data = getTasteData();
  const id = artist.id || artist.name;
  if (!id) return;

  if (!data.artists[id]) {
    data.artists[id] = {
      id: artist.id || "",
      name: artist.name || "",
      image: artist.image || "",
      spotify: artist.spotify || "",
      clicks: 0,
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString()
    };
  }
  data.artists[id].clicks++;
  data.artists[id].lastSeen = new Date().toISOString();
  if (artist.image) data.artists[id].image = artist.image;
  if (artist.spotify) data.artists[id].spotify = artist.spotify;
  saveTasteData(data);
}

function registerTrackClick(track) {
  rememberTrack(track);
  renderTaste();
  renderForYou();
}

function clearTaste() {
  localStorage.removeItem(TASTE_KEY);
  renderTaste();
  renderForYou();
}

/* =========================
   SEARCH (iTunes API)
========================= */

async function performSearch() {
  const input = document.getElementById("searchInput");
  const query = input.value.trim();
  if (!query) return;

  const resultsSection = document.getElementById("resultsSection");
  const results = document.getElementById("searchResults");
  const status = document.getElementById("searchStatus");

  resultsSection.style.display = "block";

  status.innerHTML = `
    در حال جستجوی "${escapeHtml(query)}"
    <span class="searchLoading"><span></span><span></span><span></span></span>
  `;

  results.innerHTML = `
    <div class="empty glass">
      <span>در حال یافتن موسیقی</span>
      <span class="searchLoading"><span></span><span></span><span></span></span>
    </div>
  `;

  rememberSearch(query);

  try {
    // جستجو در iTunes
    const itunesRes = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=25`
    );
    const itunesData = await itunesRes.json();

    const tracks = (itunesData.results || []).map(item => ({
      id: item.trackId,
      name: item.trackName,
      artist: item.artistName,
      album: item.collectionName,
      image: item.artworkUrl100?.replace("100x100", "400x400") || "",
      preview: item.previewUrl || "",
      spotify: "",
      duration: item.trackTimeMillis ? Math.floor(item.trackTimeMillis / 1000) : 0
    }));

    renderResults(tracks, query);

  } catch (error) {
    console.error(error);
    results.innerHTML = `
      <div class="empty glass">
        خطا در جستجو. لطفاً اتصال اینترنت خود را بررسی کن.
      </div>
    `;
    status.textContent = "جستجو ناموفق بود.";
  }
}

function renderResults(tracks, query) {
  const container = document.getElementById("searchResults");
  const status = document.getElementById("searchStatus");

  window.currentTracks = tracks;

  status.textContent = `${tracks.length} آهنگ پیدا شد`;

  if (!tracks.length) {
    container.innerHTML = `
      <div class="empty glass">
        نتیجه‌ای برای <strong>${escapeHtml(query)}</strong> پیدا نشد.
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="resultGroup">
      <h3 class="resultGroupTitle">🎵 آهنگ‌ها</h3>
      <div class="resultGrid">
        ${tracks.map(trackCard).join("")}
      </div>
    </div>
  `;
}

function trackCard(track) {
  const image = track.image || "";
  const search = encodeURIComponent(`${track.name} ${track.artist}`);
  const serialized = encodeURIComponent(JSON.stringify(track));

  return `
    <div class="resultCard glass" onclick="setBackground('${image}')">
      ${image
        ? `<img class="cover" src="${image}" alt="">`
        : `<div class="cover"></div>`}

      <div class="cardTitle">${escapeHtml(track.name)}</div>
      <div class="cardArtist">${escapeHtml(track.artist)}</div>
      <div class="cardMeta">${escapeHtml(track.album || "")}</div>

      <div class="cardActions">
        <button
          class="smallBtn primary"
          onclick="event.stopPropagation(); playMusicFinderSong(window.currentTracks.find(t => t.id === ${track.id}), window.currentTracks)"
        >▶ پخش</button>

        <button class="smallBtn" onclick="openTrackFromEncoded('${serialized}')">
          جزئیات
        </button>

        <a class="smallBtn"
           href="https://www.google.com/search?q=${search}+download"
           target="_blank">دانلود</a>
      </div>
    </div>
  `;
}

/* =========================
   DYNAMIC BACKGROUND
========================= */

function setBackground(image) {
  if (!image) return;
  const bg = document.getElementById("backgroundArt");
  const img = new Image();
  img.crossOrigin = "Anonymous";

  img.onload = function () {
    bg.style.backgroundImage = `url("${image}")`;
    const colors = extractColors(img);
    if (colors) {
      document.documentElement.style.setProperty("--dynamic-color", colors.primary);
      document.documentElement.style.setProperty("--dynamic-color-2", colors.secondary);
      document.documentElement.style.setProperty("--dynamic-color-3", colors.tertiary);
    }
    bg.style.opacity = ".30";
  };

  img.onerror = function () {
    bg.style.backgroundImage = `url("${image}")`;
    bg.style.opacity = ".24";
  };

  img.src = image;
}

function extractColors(img) {
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const size = 80;
    canvas.width = size;
    canvas.height = size;
    ctx.drawImage(img, 0, 0, size, size);

    const pixels = ctx.getImageData(0, 0, size, size).data;
    const samples = [];

    for (let i = 0; i < pixels.length; i += 16) {
      const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2], a = pixels[i + 3];
      if (a < 120) continue;
      const brightness = (r + g + b) / 3;
      if (brightness < 18) continue;
      if (r > 245 && g > 245 && b > 245) continue;
      samples.push({ r, g, b });
    }

    if (!samples.length) return null;

    let r = 0, g = 0, b = 0;
    samples.forEach(p => { r += p.r; g += p.g; b += p.b; });
    r = Math.round(r / samples.length);
    g = Math.round(g / samples.length);
    b = Math.round(b / samples.length);

    return {
      primary: `rgba(${r},${g},${b},.24)`,
      secondary: `rgba(${Math.round(r * .72)},${Math.round(g * .72)},${Math.round(b * .72)},.17)`,
      tertiary: `rgba(${Math.min(255, Math.round(r * 1.12))},${Math.min(255, Math.round(g * 1.12))},${Math.min(255, Math.round(b * 1.12))},.12)`
    };
  } catch (error) {
    console.warn("Color extraction failed:", error);
    return null;
  }
}

/* =========================
   TRACK MODAL
========================= */

function openTrackFromEncoded(encoded) {
  const track = JSON.parse(decodeURIComponent(encoded));
  registerTrackClick(track);

  const image = track.image || "";
  const downloadQuery = encodeURIComponent(`${track.name} ${track.artist}`);

  document.getElementById("modalBody").innerHTML = `
    <div class="modalHero">
      ${image ? `<img src="${image}" alt="">` : ""}
      <div>
        <div class="modalMuted">آهنگ</div>
        <h2>${escapeHtml(track.name)}</h2>
        <p class="modalMuted">${escapeHtml(track.artist)}</p>
        <p class="modalMuted">${escapeHtml(track.album || "")}</p>
      </div>
    </div>

    <div class="modalButtons">
      <a class="primary"
         href="https://www.google.com/search?q=${downloadQuery}+download"
         target="_blank">
        دانلود
      </a>
      <a href="https://soundcloud.com/search?q=${downloadQuery}" target="_blank">
        SoundCloud
      </a>
    </div>

    <div style="margin-top:30px;">
      <h3>درباره این آهنگ</h3>
      <p class="modalText">
        ${escapeHtml(track.name)} ساخته ${escapeHtml(track.artist)}
        از آلبوم ${escapeHtml(track.album || "نامشخص")}.
      </p>
    </div>
  `;

  document.getElementById("modalOverlay").classList.add("open");
  if (image) setBackground(image);
}

function closeModal(event) {
  if (event && event.target !== document.getElementById("modalOverlay")) return;
  document.getElementById("modalOverlay").classList.remove("open");
}

/* =========================
   FOR YOU
========================= */

function renderForYou() {
  const container = document.getElementById("forYouContent");
  const data = getTasteData();

  const artists = Object.values(data.artists).sort((a, b) => b.clicks - a.clicks);
  const tracks = Object.values(data.tracks).sort((a, b) => b.clicks - a.clicks);

  if (!artists.length && !tracks.length) {
    container.innerHTML = `
      <div class="empty glass">
        شروع به جستجوی موسیقی کن تا MusicFinder سلیقه‌ات را یاد بگیرد.
      </div>
    `;
    return;
  }

  let html = "";

  if (artists.length) {
    const a = artists[0];
    html += `
      <div class="featureArtist glass" style="display:grid;grid-template-columns:170px 1fr;gap:25px;padding:25px;border-radius:28px;align-items:center;">
        ${a.image ? `<img src="${a.image}" alt="" style="width:170px;height:170px;object-fit:cover;border-radius:25px;">` : ""}
        <div>
          <div class="modalMuted">پرکاوش‌ترین هنرمند شما</div>
          <h3 style="font-size:30px;margin:10px 0;">${escapeHtml(a.name)}</h3>
          <p style="color:var(--muted);line-height:1.7;">
            شما با ${escapeHtml(a.name)} بیشتر از هر هنرمند دیگری تعامل داشته‌اید.
          </p>
        </div>
      </div>
    `;
  }

  if (tracks.length) {
    html += `
      <div style="margin-top:25px;">
        <h3 style="margin-bottom:16px;">🎵 آهنگ‌هایی که بیشتر کاوش کرده‌اید</h3>
        <div class="resultGrid">
          ${tracks.slice(0, 6).map(t => {
            const enc = encodeURIComponent(JSON.stringify(t));
            return `
              <div class="resultCard glass" onclick="openTrackFromEncoded('${enc}')">
                ${t.image ? `<img class="cover" src="${t.image}" alt="">` : ""}
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

  container.innerHTML = html;
}

/* =========================
   TASTE RENDER
========================= */

function renderTaste() {
  const data = getTasteData();
  const tracks = Object.values(data.tracks).sort((a, b) => b.clicks - a.clicks).slice(0, 10);
  const artists = Object.values(data.artists).sort((a, b) => b.clicks - a.clicks).slice(0, 10);

  const trackContainer = document.getElementById("topTracks");
  const artistContainer = document.getElementById("topArtists");

  trackContainer.innerHTML = !tracks.length
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

  artistContainer.innerHTML = !artists.length
    ? `<div class="empty">هنوز هنرمندی نیست.</div>`
    : artists.map(a => `
        <div class="tasteRow">
          <div>
            <div class="tasteName">${escapeHtml(a.name)}</div>
            <div class="tasteCount">هنرمند</div>
          </div>
          <div class="tasteCount">${a.clicks}×</div>
        </div>
      `).join("");
}

/* =========================
   MUSIC PLAYER (iTunes Preview)
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

  const url = song.preview;
  if (!url) {
    alert("پیش‌نمایشی برای این آهنگ موجود نیست.");
    return;
  }

  playerTitle.textContent = song.name || "آهنگ ناشناس";
  playerArtist.textContent = song.artist || "هنرمند ناشناس";
  playerCover.src = song.image || "";

  musicAudio.src = url;
  musicPlayer.classList.add("active");

  if (autoPlay) {
    musicAudio.play()
      .then(() => { playerPlay.textContent = "❚❚"; })
      .catch(() => { playerPlay.textContent = "▶"; });
  } else {
    playerPlay.textContent = "▶";
  }
}

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

musicAudio.addEventListener("timeupdate", () => {
  if (!musicAudio.duration) return;
  playerProgress.value = (musicAudio.currentTime / musicAudio.duration) * 100;
  playerCurrentTime.textContent = formatTime(musicAudio.currentTime);
});

musicAudio.addEventListener("loadedmetadata", () => {
  playerDuration.textContent = formatTime(musicAudio.duration);
});

playerProgress.addEventListener("input", () => {
  if (!musicAudio.duration) return;
  musicAudio.currentTime = (playerProgress.value / 100) * musicAudio.duration;
});

playerVolume.addEventListener("input", () => {
  musicAudio.volume = Number(playerVolume.value);
});

musicAudio.addEventListener("ended", () => {
  playerPlay.textContent = "▶";
  playerProgress.value = 0;
  playerCurrentTime.textContent = "0:00";
  if (playerQueue.length > 1) playerNext.click();
});

playerPrevious.addEventListener("click", () => {
  if (!playerQueue.length) return;
  currentPlayerIndex--;
  if (currentPlayerIndex < 0) currentPlayerIndex = playerQueue.length - 1;
  loadPlayerSong(playerQueue[currentPlayerIndex], true);
});

playerNext.addEventListener("click", () => {
  if (!playerQueue.length) return;
  currentPlayerIndex++;
  if (currentPlayerIndex >= playerQueue.length) currentPlayerIndex = 0;
  loadPlayerSong(playerQueue[currentPlayerIndex], true);
});

window.playMusicFinderSong = function (song, queue = []) {
  if (!song) return;
  playerQueue = queue.length ? queue : [song];
  currentPlayerIndex = playerQueue.findIndex(item => item.id === song.id);
  if (currentPlayerIndex < 0) currentPlayerIndex = 0;
  loadPlayerSong(song, true);
};

/* =========================
   INIT
========================= */

document.getElementById("searchInput").addEventListener("keydown", e => {
  if (e.key === "Enter") performSearch();
});

renderHistory();
renderTaste();
renderForYou();