/* =========================================================
   MusicFinder - app.js v9
   Radio Javan + iTunes + Favorites System
========================================================= */

const TASTE_KEY       = "musicFinderTasteV9";
const HISTORY_KEY     = "musicFinderSearchHistoryV9";
const FAV_SONGS_KEY   = "musicFinderFavSongsV9";
const FAV_ARTISTS_KEY = "musicFinderFavArtistsV9";

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
  } catch { return { artists: {}, tracks: {} }; }
}
function saveTasteData(d) { localStorage.setItem(TASTE_KEY, JSON.stringify(d)); }

function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); }
  catch { return []; }
}
function saveHistory(h) { localStorage.setItem(HISTORY_KEY, JSON.stringify(h)); }

/* ===== FAVORITES ===== */
function getFavoriteSongs() {
  try { return JSON.parse(localStorage.getItem(FAV_SONGS_KEY) || "[]"); }
  catch { return []; }
}
function saveFavoriteSongs(arr) {
  localStorage.setItem(FAV_SONGS_KEY, JSON.stringify(arr));
  updateFavBadges();
}
function getFavoriteArtists() {
  try { return JSON.parse(localStorage.getItem(FAV_ARTISTS_KEY) || "[]"); }
  catch { return []; }
}
function saveFavoriteArtists(arr) {
  localStorage.setItem(FAV_ARTISTS_KEY, JSON.stringify(arr));
  updateFavBadges();
}

function isFavoriteSong(id) {
  return getFavoriteSongs().some(x => x.id === id);
}
function isFavoriteArtist(name) {
  return getFavoriteArtists().some(x => x.name === name);
}

function toggleFavoriteSong(track, event) {
  if (event) event.stopPropagation();
  const list = getFavoriteSongs();
  const idx = list.findIndex(x => x.id === track.id);

  if (idx >= 0) {
    list.splice(idx, 1);
  } else {
    list.unshift({
      id: track.id,
      name: track.name,
      artist: track.artist,
      album: track.album,
      image: track.image,
      audio: track.audio,
      duration: track.duration,
      source: track.source,
      full: track.full,
      addedAt: Date.now()
    });
  }
  saveFavoriteSongs(list);
  renderFavoriteSongs();
  refreshAllCards();
}

function toggleFavoriteArtist(track, event) {
  if (event) event.stopPropagation();
  if (!track || !track.artist) return;

  const list = getFavoriteArtists();
  const idx = list.findIndex(x => x.name === track.artist);

  if (idx >= 0) {
    list.splice(idx, 1);
  } else {
    list.unshift({
      name: track.artist,
      image: track.image,
      source: track.source,
      addedAt: Date.now()
    });
  }
  saveFavoriteArtists(list);
  renderFavoriteArtists();
  refreshAllCards();
}

function clearFavoriteSongs() {
  if (!confirm("همه‌ی آهنگ‌های مورد علاقه پاک شوند؟")) return;
  saveFavoriteSongs([]);
  renderFavoriteSongs();
  refreshAllCards();
}

function clearFavoriteArtists() {
  if (!confirm("همه‌ی هنرمندان مورد علاقه پاک شوند؟")) return;
  saveFavoriteArtists([]);
  renderFavoriteArtists();
  refreshAllCards();
}

function updateFavBadges() {
  const songsCount = getFavoriteSongs().length;
  const artistsCount = getFavoriteArtists().length;

  const badge = document.getElementById("favCountBadge");
  if (badge) {
    badge.textContent = songsCount;
    badge.style.display = songsCount > 0 ? "flex" : "none";
  }

  const m1 = document.getElementById("menuFavCount");
  if (m1) m1.textContent = songsCount;

  const m2 = document.getElementById("menuFavArtistCount");
  if (m2) m2.textContent = artistsCount;
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

function proxifyImage(url, source) {
  if (!url) return "";
  if (source === "radiojavan") {
    return `${PROXY_URL}/img?url=${encodeURIComponent(url)}`;
  }
  return url;
}


/* =========================
   MENU
========================= */
function openMenu() {
  document.getElementById("menuOverlay").classList.add("open");
  document.getElementById("menuDrawer").classList.add("open");
  document.body.style.overflow = "hidden";
}
function closeMenu() {
  document.getElementById("menuOverlay").classList.remove("open");
  document.getElementById("menuDrawer").classList.remove("open");
  document.body.style.overflow = "";
}
function goTo(id) {
  closeMenu();
  setTimeout(() => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 200);
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
    `<button class="historyItem" onclick="searchFromHistory(${JSON.stringify(q).replace(/"/g, '&quot;')})">🔎 ${escapeHtml(q)}</button>`
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

function quickSearch(q) {
  document.getElementById("searchInput").value = q;
  performSearch();
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
      id: t.id || "", name: t.name || "", artist: t.artist || "",
      image: t.image || "", source: t.source || "",
      audio: t.audio || "", clicks: 0
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
   SEARCH
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
        full: true
      })).filter(t => t.audio);
    }
  } catch (e) { console.warn("RJ failed:", e); }

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
  } catch (e) { console.warn("iTunes failed:", e); }

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

  c.innerHTML = `
    <div class="resultGroup">
      <div class="resultGrid">
        ${tracks.map(trackCard).join("")}
      </div>
    </div>
  `;
}


/* =========================
   TRACK CARD
========================= */
function trackCard(t) {
  const rawImg = t.image || "";
  const img = proxifyImage(rawImg, t.source);
  const dur = t.duration ? formatTime(t.duration) : "";
  const isFull = t.full;

  const badge = isFull
    ? `<span class="badge full">کامل</span>`
    : `<span class="badge preview">۳۰ ثانیه</span>`;

  const songFav = isFavoriteSong(t.id);
  const artistFav = isFavoriteArtist(t.artist);

  const trackData = encodeURIComponent(JSON.stringify(t));

  return `
    <div class="resultCard glass">
      <div class="cardTopRow">
        ${badge}
        <div class="cardFavBtns">
          <button class="favMiniBtn ${songFav ? 'active' : ''}"
            title="${songFav ? 'حذف از مورد علاقه' : 'ذخیره آهنگ'}"
            onclick="toggleFavoriteSong(JSON.parse(decodeURIComponent('${trackData}')), event)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="${songFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
              <path d="M12 21s-8-5-8-11a5 5 0 0 1 8-4 5 5 0 0 1 8 4c0 6-8 11-8 11z"/>
            </svg>
          </button>

          <button class="favMiniBtn star ${artistFav ? 'active' : ''}"
            title="${artistFav ? 'حذف هنرمند از مورد علاقه' : 'ذخیره هنرمند'}"
            onclick="toggleFavoriteArtist(JSON.parse(decodeURIComponent('${trackData}')), event)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="${artistFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="coverWrap" onclick="setBackground('${img}')">
        ${img
          ? `<img class="cover" src="${img}" alt="" referrerpolicy="no-referrer" loading="lazy" onerror="this.style.display='none'">`
          : `<div class="cover"></div>`}
        <div class="coverPlayOverlay">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </div>
      </div>

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


function refreshAllCards() {
  if (window.currentTracks && window.currentTracks.length) {
    const c = document.getElementById("searchResults");
    if (c && c.innerHTML.trim()) {
      c.innerHTML = `
        <div class="resultGroup">
          <div class="resultGrid">
            ${window.currentTracks.map(trackCard).join("")}
          </div>
        </div>
      `;
    }
  }
  updateFavBadges();
}


/* =========================
   FAVORITE SONGS RENDER
========================= */
function renderFavoriteSongs() {
  const c = document.getElementById("favoriteSongsContent");
  if (!c) return;

  const list = getFavoriteSongs();

  if (!list.length) {
    c.innerHTML = `
      <div class="empty glass">
        ❤️ هنوز آهنگی ذخیره نکرده‌ای. روی قلب هر آهنگ بزن تا اینجا بیاید.
      </div>
    `;
    return;
  }

  c.innerHTML = `
    <div class="resultGrid">
      ${list.map(t => {
        const img = proxifyImage(t.image, t.source);
        const dur = t.duration ? formatTime(t.duration) : "";
        const badge = t.full
          ? `<span class="badge full">کامل</span>`
          : `<span class="badge preview">۳۰ ثانیه</span>`;

        const trackData = encodeURIComponent(JSON.stringify(t));
        const idsArr = list.map(x => x.id);

        return `
          <div class="resultCard glass">
            <div class="cardTopRow">
              ${badge}
              <div class="cardFavBtns">
                <button class="favMiniBtn active"
                  title="حذف از مورد علاقه"
                  onclick="toggleFavoriteSong(JSON.parse(decodeURIComponent('${trackData}')), event)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
                    <path d="M12 21s-8-5-8-11a5 5 0 0 1 8-4 5 5 0 0 1 8 4c0 6-8 11-8 11z"/>
                  </svg>
                </button>
              </div>
            </div>

            <div class="coverWrap" onclick="setBackground('${img}')">
              ${img ? `<img class="cover" src="${img}" alt="" referrerpolicy="no-referrer" loading="lazy">` : `<div class="cover"></div>`}
              <div class="coverPlayOverlay">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
              </div>
            </div>

            <div class="cardTitle">${escapeHtml(t.name)}</div>
            <div class="cardArtist">${escapeHtml(t.artist)}</div>
            ${t.album ? `<div class="cardMeta">${escapeHtml(t.album)}</div>` : ""}
            ${dur ? `<div class="cardMeta">${dur}</div>` : ""}

            <div class="cardActions">
              <button class="smallBtn primary"
                onclick="event.stopPropagation(); playMusicFinderSong(JSON.parse(decodeURIComponent('${trackData}')), getFavoriteSongs())">
                ▶ پخش
              </button>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}


/* =========================
   FAVORITE ARTISTS RENDER
========================= */
function renderFavoriteArtists() {
  const c = document.getElementById("favoriteArtistsContent");
  if (!c) return;

  const list = getFavoriteArtists();

  if (!list.length) {
    c.innerHTML = `
      <div class="empty glass">
        ⭐ هنوز هنرمندی ذخیره نکرده‌ای. روی ستاره کنار اسم هنرمند بزن.
      </div>
    `;
    return;
  }

  c.innerHTML = `
    <div class="artistGrid">
      ${list.map(a => {
        const img = proxifyImage(a.image, a.source);
        return `
          <div class="artistCard glass" onclick="searchArtist('${escapeHtml(a.name).replace(/'/g, "&#39;")}')">
            <div class="artistImageWrap">
              ${img
                ? `<img class="artistImage" src="${img}" alt="" referrerpolicy="no-referrer" loading="lazy" onerror="this.style.display='none'">`
                : `<div class="artistImage"></div>`}
              <div class="artistOverlay">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
              </div>
            </div>
            <div class="artistName">${escapeHtml(a.name)}</div>
            <div class="artistSummary">کلیک کن تا آهنگ‌هایش را ببینی</div>
            <button class="favMiniBtn star active artistRemove"
              onclick="event.stopPropagation(); removeFavoriteArtist('${escapeHtml(a.name).replace(/'/g, "&#39;")}')"
              title="حذف از مورد علاقه">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </button>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function removeFavoriteArtist(name) {
  const list = getFavoriteArtists().filter(x => x.name !== name);
  saveFavoriteArtists(list);
  renderFavoriteArtists();
  refreshAllCards();
}

function searchArtist(name) {
  document.getElementById("searchInput").value = name;
  performSearch();
  setTimeout(() => {
    document.getElementById("resultsSection")?.scrollIntoView({ behavior: "smooth" });
  }, 400);
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
    c.innerHTML = `<div class="empty glass">🎵 شروع به جستجوی موسیقی کن تا MusicFinder سلیقه‌ات را یاد بگیرد.</div>`;
    return;
  }

  c.innerHTML = `
    <div style="margin-top:10px;">
      <h3 style="margin-bottom:16px;">🎵 آهنگ‌هایی که بیشتر کاوش کرده‌اید</h3>
      <div class="resultGrid">
        ${tracks.slice(0, 6).map(t => {
          const img = proxifyImage(t.image, t.source);
          return `
            <div class="resultCard glass" onclick="setBackground('${img}')">
              <div class="coverWrap">
                ${img ? `<img class="cover" src="${img}" alt="" referrerpolicy="no-referrer" loading="lazy">` : `<div class="cover"></div>`}
                <div class="coverPlayOverlay">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                </div>
              </div>
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

  const coverImg = proxifyImage(song.image, song.source);
  playerCover.src = coverImg || "";

  musicAudio.src = url;
  musicPlayer.classList.add("active");

  if (autoPlay) {
    try {
      await musicAudio.play();
      playerPlay.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>`;
    } catch (e) {
      playerPlay.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
    }
  } else {
    playerPlay.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
  }

  if (coverImg) setBackground(coverImg);
  registerTrackClick(song);
}

if (playerPlay) {
  playerPlay.addEventListener("click", () => {
    if (!musicAudio.src) return;
    if (musicAudio.paused) {
      musicAudio.play();
      playerPlay.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>`;
    } else {
      musicAudio.pause();
      playerPlay.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
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
    playerPlay.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
    playerProgress.value = 0;
    playerCurrentTime.textContent = "0:00";
    if (playerQueue.length > 1) playerNext.click();
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
renderFavoriteSongs();
renderFavoriteArtists();
updateFavBadges();

console.log("MusicFinder v9 ready · با سیستم علاقه‌مندی‌ها");
