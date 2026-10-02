/* =========================================================
   MusicFinder - app.js v17 (رفع مشکل پخش)
========================================================= */

const TASTE_KEY       = "musicFinderTasteV9";
const HISTORY_KEY     = "musicFinderSearchHistoryV9";
const FAV_SONGS_KEY   = "musicFinderFavSongsV9";
const FAV_ARTISTS_KEY = "musicFinderFavArtistsV9";
const AUTH_TOKEN_KEY  = "musicFinderAuthToken";

const PROXY_URL = "https://musicfinder-proxy.ebrahiminasabtaha.workers.dev";
const API_TOKEN = "cif6wf8evc6mxah:b525h5OhbFlOXYjD6Z5N";

let currentUser = null;
let authMode = "login";

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

function isFavoriteSong(id) { return getFavoriteSongs().some(x => x.id === id); }
function isFavoriteArtist(name) { return getFavoriteArtists().some(x => x.name === name); }

function toggleFavoriteSong(track, event) {
  if (event) event.stopPropagation();
  const list = getFavoriteSongs();
  const idx = list.findIndex(x => x.id === track.id);

  if (idx >= 0) list.splice(idx, 1);
  else list.unshift({
    id: track.id, name: track.name, artist: track.artist,
    album: track.album, image: track.image, audio: track.audio,
    duration: track.duration, source: track.source, full: track.full,
    addedAt: Date.now()
  });

  saveFavoriteSongs(list);
  saveFavoritesToServer();
  renderFavoriteSongs();
  refreshAllCards();
}

function toggleFavoriteArtist(track, event) {
  if (event) event.stopPropagation();
  if (!track || !track.artist) return;

  const list = getFavoriteArtists();
  const idx = list.findIndex(x => x.name === track.artist);

  if (idx >= 0) list.splice(idx, 1);
  else list.unshift({
    name: track.artist, image: track.image,
    source: track.source, addedAt: Date.now()
  });

  saveFavoriteArtists(list);
  saveFavoritesToServer();
  renderFavoriteArtists();
  refreshAllCards();
}

function clearFavoriteSongs() {
  if (!confirm("همه‌ی آهنگ‌های مورد علاقه پاک شوند؟")) return;
  saveFavoriteSongs([]);
  saveFavoritesToServer();
  renderFavoriteSongs();
  refreshAllCards();
}

function clearFavoriteArtists() {
  if (!confirm("همه‌ی هنرمندان مورد علاقه پاک شوند؟")) return;
  saveFavoriteArtists([]);
  saveFavoritesToServer();
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
  if (source === "radiojavan") return `${PROXY_URL}/img?url=${encodeURIComponent(url)}`;
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

/* =========================================================
   SEARCH (فقط mp3s از رادیو جوان + iTunes)
========================================================= */
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

  // === Radio Javan: فقط mp3s ===
  let rjTracks = [];
  try {
    const url = `${PROXY_URL}/music/radiojavan?action=search&s=${encodeURIComponent(query)}&token=${API_TOKEN}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data && data.result && Array.isArray(data.result.mp3s)) {
      rjTracks = data.result.mp3s
        .filter(item => item && item.link && item.song)
        .map(item => ({
          id: "rj_" + String(item.id),
          name: item.song || "بدون نام",
          artist: item.artist || "هنرمند ناشناس",
          album: item.album_album || item.album || "",
          image: item.photo || item.thumbnail || "",
          audio: item.link,
          duration: item.duration || 0,
          source: "radiojavan",
          full: true
        }));
    }
  } catch (e) {
    console.warn("RJ failed:", e);
  }

  // === iTunes ===
  let itunesTracks = [];
  try {
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=20`;
    const res = await fetch(itunesUrl);
    const data = await res.json();

    itunesTracks = (data.results || [])
      .filter(item => item.previewUrl)
      .map(item => ({
        id: "it_" + String(item.trackId),
        name: item.trackName || "",
        artist: item.artistName || "",
        album: item.collectionName || "",
        image: item.artworkUrl100?.replace("100x100", "400x400") || "",
        audio: item.previewUrl,
        duration: item.trackTimeMillis ? Math.floor(item.trackTimeMillis / 1000) : 0,
        source: "itunes",
        full: false
      }));
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

  if (rjCount || itCount) s.textContent = `${rjCount} آهنگ ایرانی · ${itCount} پیش‌نمایش خارجی`;
  else s.textContent = `${tracks.length} آهنگ پیدا شد`;

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
            title="${artistFav ? 'حذف هنرمند' : 'ذخیره هنرمند'}"
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
          <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
        </div>
      </div>

      <div class="cardTitle">${escapeHtml(t.name)}</div>
      <div class="cardArtist">${escapeHtml(t.artist)}</div>
      ${t.album ? `<div class="cardMeta">${escapeHtml(t.album)}</div>` : ""}
      ${dur ? `<div class="cardMeta">${dur}</div>` : ""}

      <div class="cardActions">
        <button class="smallBtn primary"
          onclick="event.stopPropagation(); playMusicFinderSong(window.currentTracks.find(x => x.id === '${t.id}'), window.currentTracks)">
          ▶ ${isFull ? "پخش" : "پیش‌نمایش"}
        </button>
        <button class="smallBtn downloadBtn" title="دانلود"
          onclick="event.stopPropagation(); downloadTrack(JSON.parse(decodeURIComponent('${trackData}')))">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3v11m0 0 4-4m-4 4-4-4M5 19h14"/>
          </svg>
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
   DOWNLOAD
========================= */
function downloadTrack(t) {
  if (!t || !t.audio) {
    showToast("لینک دانلود موجود نیست", "error");
    return;
  }

  const safeName = `${t.artist || "Unknown"} - ${t.name || "Unknown"}`
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const extension = t.source === "radiojavan" ? "mp3" : "m4a";
  const filename = `${safeName}.${extension}`;
  const downloadUrl = `${PROXY_URL}/download?url=${encodeURIComponent(t.audio)}&filename=${encodeURIComponent(filename)}`;

  showToast(`در حال دانلود «${t.name}»...`, "info");

  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
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
        ❤️ هنوز آهنگی ذخیره نکرده‌ای. روی قلب هر آهنگ بزن.
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

        return `
          <div class="resultCard glass">
            <div class="cardTopRow">
              ${badge}
              <div class="cardFavBtns">
                <button class="favMiniBtn active" title="حذف"
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
              <button class="smallBtn downloadBtn" title="دانلود"
                onclick="event.stopPropagation(); downloadTrack(JSON.parse(decodeURIComponent('${trackData}')))">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 3v11m0 0 4-4m-4 4-4-4M5 19h14"/>
                </svg>
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
              title="حذف">
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
  saveFavoritesToServer();
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
    c.innerHTML = `<div class="empty glass">🎵 شروع به جستجوی موسیقی کن.</div>`;
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
  if (ac) ac.innerHTML = `<div class="empty">هنرمند به زودی.</div>`;
}

/* =========================================================
   AUTH
========================================================= */
function getAuthToken() { return localStorage.getItem(AUTH_TOKEN_KEY) || ""; }
function setAuthToken(t) {
  if (t) localStorage.setItem(AUTH_TOKEN_KEY, t);
  else localStorage.removeItem(AUTH_TOKEN_KEY);
}

async function checkAuth() {
  const token = getAuthToken();
  if (!token) {
    updateUserButton(null);
    renderProfile();
    return;
  }

  try {
    const res = await fetch(`${PROXY_URL}/auth/me`, {
      headers: { "Authorization": "Bearer " + token }
    });
    const data = await res.json();

    if (data.ok) {
      currentUser = data.user;
      updateUserButton(currentUser);
      await loadUserFavorites();
      renderProfile();
    } else {
      setAuthToken("");
      updateUserButton(null);
      renderProfile();
    }
  } catch (e) {
    console.warn("Auth check failed:", e);
    updateUserButton(null);
    renderProfile();
  }
}

function updateUserButton(user) {
  const btn = document.getElementById("userBtn");
  const label = document.getElementById("userBtnLabel");
  if (!btn || !label) return;

  if (user) {
    const firstName = (user.name || user.email.split("@")[0]).split(" ")[0];
    label.textContent = firstName;
    btn.classList.add("loggedIn");
    btn.onclick = toggleUserMenu;
  } else {
    label.textContent = "ورود";
    btn.classList.remove("loggedIn");
    btn.onclick = handleUserClick;
  }
}

function handleUserClick() {
  if (currentUser) toggleUserMenu();
  else openAuth("login");
}

function toggleUserMenu() {
  let menu = document.getElementById("userMenu");

  if (!menu) {
    menu = document.createElement("div");
    menu.className = "userMenu";
    menu.id = "userMenu";
    document.body.appendChild(menu);
  }

  menu.innerHTML = `
    <div class="userMenuHeader">
      <div class="userMenuName">${escapeHtml(currentUser.name || "کاربر")}</div>
      <div class="userMenuEmail">${escapeHtml(currentUser.email)}</div>
    </div>
    <button class="userMenuItem" onclick="goTo('profile'); closeUserMenu();">
      👤 پروفایل کاربری
    </button>
    <button class="userMenuItem" onclick="goTo('favorites'); closeUserMenu();">
      ❤️ آهنگ‌های مورد علاقه
    </button>
    <button class="userMenuItem" onclick="goTo('favArtists'); closeUserMenu();">
      ⭐ هنرمندان مورد علاقه
    </button>
    <button class="userMenuItem logout" onclick="logoutUser()">
      🚪 خروج از حساب
    </button>
  `;

  menu.classList.toggle("open");

  if (menu.classList.contains("open")) {
    setTimeout(() => {
      document.addEventListener("click", closeUserMenuOutside);
    }, 10);
  }
}

function closeUserMenu() {
  document.getElementById("userMenu")?.classList.remove("open");
}

function closeUserMenuOutside(e) {
  const menu = document.getElementById("userMenu");
  const btn = document.getElementById("userBtn");
  if (!menu || !menu.classList.contains("open")) return;
  if (menu.contains(e.target) || btn.contains(e.target)) return;
  closeUserMenu();
  document.removeEventListener("click", closeUserMenuOutside);
}

function openAuth(mode = "login") {
  authMode = mode;
  document.getElementById("authError").textContent = "";
  document.getElementById("authForm").reset();
  updateAuthModalUI();
  document.getElementById("authOverlay").classList.add("open");
}

function closeAuth() {
  document.getElementById("authOverlay").classList.remove("open");
}

function switchAuthTab(mode) {
  if (!mode) mode = authMode === "login" ? "signup" : "login";
  authMode = mode;
  updateAuthModalUI();
  document.getElementById("authError").textContent = "";
}

function updateAuthModalUI() {
  const isLogin = authMode === "login";
  document.getElementById("authTitle").textContent = isLogin ? "ورود به MusicFinder" : "ساخت حساب جدید";
  document.getElementById("authSub").textContent = isLogin ? "خوش برگشتی! وارد شو." : "به MusicFinder خوش آمدی!";
  document.getElementById("authSubmitText").textContent = isLogin ? "ورود" : "ثبت‌نام";
  document.getElementById("nameField").style.display = isLogin ? "none" : "flex";
  document.getElementById("tabLogin").classList.toggle("active", isLogin);
  document.getElementById("tabSignup").classList.toggle("active", !isLogin);
  document.getElementById("authSwitchText").textContent = isLogin ? "حساب نداری؟" : "حساب داری؟";
  document.getElementById("authSwitchBtn").textContent = isLogin ? "ثبت‌نام کن" : "وارد شو";
}

async function submitAuth(e) {
  e.preventDefault();

  const btn = document.getElementById("authSubmitBtn");
  const loading = document.getElementById("authLoading");
  const text = document.getElementById("authSubmitText");
  const errEl = document.getElementById("authError");

  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value;
  const name = document.getElementById("authName").value.trim();

  errEl.textContent = "";
  btn.disabled = true;
  loading.style.display = "inline-flex";
  text.textContent = authMode === "login" ? "در حال ورود..." : "در حال ثبت‌نام...";

  try {
    const endpoint = authMode === "login" ? "/auth/login" : "/auth/signup";
    const body = authMode === "login"
      ? { email, password }
      : { email, password, name };

    const res = await fetch(PROXY_URL + endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json();

    if (!data.ok) {
      errEl.textContent = data.error || "خطایی رخ داد";
      return;
    }

    setAuthToken(data.token);
    currentUser = data.user;
    showLoadingScreen(authMode === "login"
      ? "خوش آمدی " + (data.user.name || data.user.email) + "!"
      : "حسابت ساخته شد! خوش آمدی 🎉");
    setTimeout(() => location.reload(), 800);

  } catch (err) {
    errEl.textContent = "خطای شبکه";
    console.error(err);
  } finally {
    btn.disabled = false;
    loading.style.display = "none";
    text.textContent = authMode === "login" ? "ورود" : "ثبت‌نام";
  }
}

function showLoadingScreen(msg) {
  let screen = document.getElementById("loadingScreen");
  if (!screen) {
    screen = document.createElement("div");
    screen.id = "loadingScreen";
    screen.className = "loadingScreen";
    screen.innerHTML = `
      <div class="loadingSpinner"></div>
      <div class="loadingText">${msg || "لطفاً صبر کن..."}</div>
    `;
    document.body.appendChild(screen);
  } else {
    screen.querySelector(".loadingText").textContent = msg;
  }
  requestAnimationFrame(() => screen.classList.add("show"));
}

async function logoutUser() {
  const token = getAuthToken();
  if (token) {
    try {
      await fetch(`${PROXY_URL}/auth/logout`, {
        method: "POST",
        headers: { "Authorization": "Bearer " + token }
      });
    } catch (e) {}
  }

  setAuthToken("");
  showLoadingScreen("در حال خروج...");
  setTimeout(() => location.reload(), 500);
}

/* ===== SYNC FAVORITES ===== */
async function saveFavoritesToServer() {
  const token = getAuthToken();
  if (!token) return;

  try {
    await fetch(`${PROXY_URL}/user/favorites`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({
        songs: getFavoriteSongs(),
        artists: getFavoriteArtists()
      })
    });
  } catch (e) {
    console.warn("Failed to save favorites:", e);
  }
}

async function loadUserFavorites() {
  const token = getAuthToken();
  if (!token) return;

  try {
    const res = await fetch(`${PROXY_URL}/user/favorites`, {
      headers: { "Authorization": "Bearer " + token }
    });
    const data = await res.json();

    if (data.ok && data.favorites) {
      saveFavoriteSongs(data.favorites.songs || []);
      saveFavoriteArtists(data.favorites.artists || []);
      renderFavoriteSongs();
      renderFavoriteArtists();
    }
  } catch (e) {
    console.warn("Failed to load favorites:", e);
  }
}

/* ===== TOAST ===== */
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = "downloadToast " + type;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("fadeOut");
    setTimeout(() => toast.remove(), 400);
  }, 2500);
}

/* =========================================================
   PROFILE
========================================================= */
function renderProfile() {
  const guestBox = document.getElementById("profileGuest");
  const grid = document.querySelector(".profileGrid");

  if (!guestBox || !grid) return;

  if (!currentUser) {
    guestBox.classList.add("show");
    grid.style.display = "none";
    return;
  }

  guestBox.classList.remove("show");
  grid.style.display = "grid";

  const name = currentUser.name || "کاربر";
  const email = currentUser.email || "-";

  const avatar = document.getElementById("profileAvatar");
  if (avatar) avatar.textContent = name.charAt(0).toUpperCase();

  const nameEl = document.getElementById("profileName");
  if (nameEl) nameEl.textContent = name;

  const emailEl = document.getElementById("profileEmail");
  if (emailEl) emailEl.textContent = email;

  const editInput = document.getElementById("editNameInput");
  if (editInput) editInput.value = name;

  const favCount = document.getElementById("profileFavCount");
  if (favCount) favCount.textContent = getFavoriteSongs().length;

  const artistCount = document.getElementById("profileArtistCount");
  if (artistCount) artistCount.textContent = getFavoriteArtists().length;
}

async function updateProfileName() {
  const input = document.getElementById("editNameInput");
  const errEl = document.getElementById("editNameError");
  const btn = document.getElementById("editNameBtn");
  const text = document.getElementById("editNameBtnText");

  const name = input.value.trim();
  errEl.textContent = "";

  if (!name) {
    errEl.textContent = "نام نمی‌تواند خالی باشد";
    return;
  }

  if (name === currentUser.name) {
    errEl.textContent = "نام جدید با نام فعلی یکسان است";
    return;
  }

  btn.disabled = true;
  text.textContent = "در حال ذخیره...";

  try {
    const res = await fetch(`${PROXY_URL}/user/profile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + getAuthToken()
      },
      body: JSON.stringify({ name })
    });
    const data = await res.json();

    if (!data.ok) {
      errEl.textContent = data.error || "خطایی رخ داد";
      return;
    }

    currentUser = data.user;
    updateUserButton(currentUser);
    renderProfile();
    showToast("نام با موفقیت تغییر کرد ✅", "success");

  } catch (err) {
    errEl.textContent = "خطای شبکه";
  } finally {
    btn.disabled = false;
    text.textContent = "ذخیره نام";
  }
}

async function changePassword() {
  const currentPwd = document.getElementById("currentPwdInput").value;
  const newPwd = document.getElementById("newPwdInput").value;
  const errEl = document.getElementById("changePwdError");
  const btn = document.getElementById("changePwdBtn");
  const text = document.getElementById("changePwdBtnText");

  errEl.textContent = "";

  if (!currentPwd || !newPwd) {
    errEl.textContent = "همه فیلدها الزامی است";
    return;
  }

  if (newPwd.length < 6) {
    errEl.textContent = "رمز جدید باید حداقل ۶ کاراکتر باشد";
    return;
  }

  btn.disabled = true;
  text.textContent = "در حال تغییر...";

  try {
    const res = await fetch(`${PROXY_URL}/user/password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + getAuthToken()
      },
      body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd })
    });
    const data = await res.json();

    if (!data.ok) {
      errEl.textContent = data.error || "خطایی رخ داد";
      return;
    }

    document.getElementById("currentPwdInput").value = "";
    document.getElementById("newPwdInput").value = "";
    showToast("رمز عبور با موفقیت تغییر کرد 🔒", "success");

  } catch (err) {
    errEl.textContent = "خطای شبکه";
  } finally {
    btn.disabled = false;
    text.textContent = "تغییر رمز";
  }
}

/* ===== DELETE ACCOUNT ===== */
function openDeleteModal() {
  if (!currentUser) {
    openAuth("login");
    return;
  }
  document.getElementById("deleteModalOverlay").classList.add("open");
  document.getElementById("deleteConfirmPwd").value = "";
  document.getElementById("deleteError").textContent = "";
}

function closeDeleteModal() {
  document.getElementById("deleteModalOverlay").classList.remove("open");
}

async function confirmDeleteAccount() {
  const pwd = document.getElementById("deleteConfirmPwd").value;
  const errEl = document.getElementById("deleteError");
  const btn = document.getElementById("deleteConfirmBtn");
  const text = document.getElementById("deleteConfirmText");

  errEl.textContent = "";

  if (!pwd) {
    errEl.textContent = "رمز عبور را وارد کن";
    return;
  }

  btn.disabled = true;
  text.textContent = "در حال حذف...";

  try {
    const loginRes = await fetch(`${PROXY_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: currentUser.email, password: pwd })
    });
    const loginData = await loginRes.json();

    if (!loginData.ok) {
      errEl.textContent = "رمز عبور اشتباه است";
      btn.disabled = false;
      text.textContent = "حذف کن";
      return;
    }

    const res = await fetch(`${PROXY_URL}/user/delete`, {
      method: "DELETE",
      headers: { "Authorization": "Bearer " + getAuthToken() }
    });
    const data = await res.json();

    if (!data.ok) {
      errEl.textContent = data.error || "خطا در حذف";
      return;
    }

    setAuthToken("");
    localStorage.removeItem(FAV_SONGS_KEY);
    localStorage.removeItem(FAV_ARTISTS_KEY);
    localStorage.removeItem(TASTE_KEY);
    localStorage.removeItem(HISTORY_KEY);

    closeDeleteModal();
    showLoadingScreen("حساب حذف شد. خداحافظ 👋");
    setTimeout(() => location.reload(), 1500);

  } catch (err) {
    errEl.textContent = "خطای شبکه";
    btn.disabled = false;
    text.textContent = "حذف کن";
  }
}

/* =========================================================
   MUSIC PLAYER (با پروکسی استریم)
========================================================= */
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

  let url = song.audio;
  if (!url) {
    showToast("لینک پخش موجود نیست", "error");
    return;
  }

  // اگر از رادیو جوانه، از پروکسی /stream استفاده کن
  if (song.source === "radiojavan") {
    url = `${PROXY_URL}/stream?url=${encodeURIComponent(song.audio)}`;
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
      console.error("Play error:", e);
      showToast("خطا در پخش. دوباره امتحان کن.", "error");
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

  musicAudio.addEventListener("error", (e) => {
    console.error("Audio error:", e);
    showToast("خطا در پخش آهنگ", "error");
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

/* =========================================================
   INIT
========================================================= */
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
checkAuth();

console.log("MusicFinder v17 ready · با پروکسی استریم");
