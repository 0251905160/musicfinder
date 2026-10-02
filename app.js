/* =========================================================
   MusicFinder - app.js v3 (JioSaavn + iTunes)
   پخش کامل آهنگ از JioSaavn + پیش‌نمایش iTunes
========================================================= */

const TASTE_KEY   = "musicFinderTasteV5";
const HISTORY_KEY = "musicFinderSearchHistoryV5";

/* =========================================================
   SEARCH (JioSaavn + iTunes)
========================================================= */

async function performSearch() {
  const input = document.getElementById("searchInput");
  const query = input.value.trim();
  if (!query) return;

  const resultsSection = document.getElementById("resultsSection");
  const results = document.getElementById("searchResults");
  const status = document.getElementById("searchStatus");

  resultsSection.style.display = "block";
  status.innerHTML = `در حال جستجوی "${escapeHtml(query)}"...`;
  results.innerHTML = `
    <div class="empty glass">
      در حال یافتن موسیقی
      <span class="searchLoading"><span></span><span></span><span></span></span>
    </div>
  `;

  rememberSearch(query);

  try {
    /* ۱) JioSaavn - آهنگ‌های کامل */
    let jiosaavnTracks = [];
    try {
      const jsRes = await fetch(
        `https://saavn.dev/api/search/songs?query=${encodeURIComponent(query)}`
      );
      const jsData = await jsRes.json();
      jiosaavnTracks = (jsData.data?.results || []).map(t => ({
        id: `js_${t.id}`,
        name: t.name,
        artist: t.artists?.primary?.map(a => a.name).join(", ") || t.primaryArtists || "Unknown",
        album: t.album?.name || "",
        image: t.image?.[2]?.url || t.image?.[1]?.url || t.image?.[0]?.url || "",
        audio: t.downloadUrl?.[4]?.url || t.downloadUrl?.[3]?.url || t.downloadUrl?.[2]?.url || t.downloadUrl?.[1]?.url || t.downloadUrl?.[0]?.url || "",
        source: "jiosaavn",
        full: true
      }));
    } catch (e) {
      console.warn("JioSaavn failed:", e);
    }

    /* ۲) iTunes - پیش‌نمایش ۳۰ ثانیه */
    let itunesTracks = [];
    try {
      const itRes = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=15`
      );
      const itData = await itRes.json();
      itunesTracks = (itData.results || []).map(t => ({
        id: `it_${t.trackId}`,
        name: t.trackName,
        artist: t.artistName,
        album: t.collectionName || "",
        image: t.artworkUrl100?.replace("100x100", "400x400") || "",
        audio: t.previewUrl || "",
        source: "itunes",
        full: false
      }));
    } catch (e) {
      console.warn("iTunes failed:", e);
    }

    const all = [...jiosaavnTracks, ...itunesTracks];

    renderResults(all, query, jiosaavnTracks.length, itunesTracks.length);

  } catch (err) {
    console.error(err);
    results.innerHTML = `<div class="empty glass">خطا در جستجو. اتصال اینترنت را چک کن.</div>`;
    status.textContent = "جستجو ناموفق بود.";
  }
}

function renderResults(tracks, query, jsCount, itCount) {
  const container = document.getElementById("searchResults");
  const status = document.getElementById("searchStatus");

  window.currentTracks = tracks;

  status.textContent =
    `${jsCount} آهنگ کامل (JioSaavn) · ${itCount} پیش‌نمایش (iTunes)`;

  if (!tracks.length) {
    container.innerHTML = `<div class="empty glass">نتیجه‌ای برای <strong>${escapeHtml(query)}</strong> پیدا نشد.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="resultGroup">
      <div class="resultGrid">
        ${tracks.map(trackCard).join("")}
      </div>
    </div>
  `;
}

function trackCard(track) {
  const image = track.image || "";
  const isFull = track.full;
  const badge = isFull
    ? `<span class="badge full">کامل</span>`
    : `<span class="badge preview">۳۰ ثانیه</span>`;

  return `
    <div class="resultCard glass" onclick="setBackground('${image}')">
      ${image
        ? `<img class="cover" src="${image}" alt="">`
        : `<div class="cover"></div>`}

      <div style="margin-top:10px;">${badge}</div>
      <div class="cardTitle">${escapeHtml(track.name)}</div>
      <div class="cardArtist">${escapeHtml(track.artist)}</div>
      <div class="cardMeta">${escapeHtml(track.album || "")}</div>

      <div class="cardActions">
        <button
          class="smallBtn primary"
          onclick="event.stopPropagation(); playMusicFinderSong(window.currentTracks.find(t => t.id === '${track.id}'), window.currentTracks)"
        >▶ پخش</button>
      </div>
    </div>
  `;
}
