const BASE = "https://www.googleapis.com/youtube/v3";

function key() {
  const k = import.meta.env.VITE_YOUTUBE_API_KEY;
  if (!k) throw new Error("VITE_YOUTUBE_API_KEY is not set in .env");
  return k;
}

async function ytGet(path, params) {
  const url = new URL(`${BASE}/${path}`);
  url.searchParams.set("key", key());
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText);
    throw new Error(`YouTube API ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

// ─── Parse ISO 8601 duration PT7M34S → seconds ───────────────────────────────
export function parseDuration(iso) {
  const m = iso?.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (+(m[1] ?? 0)) * 3600 + (+(m[2] ?? 0)) * 60 + (+(m[3] ?? 0));
}

export function formatDuration(s) {
  if (!s) return "—";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, "0");
  if (h) return `${h}:${pad(m)}:${pad(sec)}`;
  return `${m}:${pad(sec)}`;
}

export function formatViewCount(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

// ─── Search + fetch details in one call ──────────────────────────────────────

export async function searchAndEnrich(query, { maxResults = 20, pageToken } = {}) {
  const params = {
    part: "snippet",
    q: query,
    type: "video",
    videoEmbeddable: "true",
    safeSearch: "strict",
    maxResults: String(maxResults),
  };
  if (pageToken) params.pageToken = pageToken;

  const searchData = await ytGet("search", params);
  const ids = searchData.items.map((i) => i.id.videoId).filter(Boolean);

  // Batch-fetch duration + view count
  let detailsMap = {};
  if (ids.length) {
    const detailData = await ytGet("videos", {
      part: "contentDetails,statistics",
      id: ids.join(","),
    });
    for (const item of detailData.items) {
      detailsMap[item.id] = {
        durationSeconds: parseDuration(item.contentDetails.duration),
        viewCount: parseInt(item.statistics.viewCount ?? "0", 10),
      };
    }
  }

  const items = searchData.items.map((item) => {
    const id = item.id.videoId;
    const s = item.snippet;
    const d = detailsMap[id] ?? { durationSeconds: 0, viewCount: 0 };
    const t = s.thumbnails;
    return {
      id,
      title: s.title,
      description: s.description,
      thumbnail: t.high?.url ?? t.medium?.url ?? t.default?.url ?? "",
      channelTitle: s.channelTitle,
      channelId: s.channelId,
      publishedAt: s.publishedAt,
      durationSeconds: d.durationSeconds,
      viewCount: d.viewCount,
    };
  });

  return {
    items,
    nextPageToken: searchData.nextPageToken,
    totalResults: searchData.pageInfo?.totalResults ?? 0,
  };
}
