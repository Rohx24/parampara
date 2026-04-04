const BOOST = [
  "animated", "animation", "cartoon", "story", "stories",
  "educational", "learn", "learning", "lesson", "kids",
  "children", "beginner", "language", "nursery", "vocabulary",
  "alphabet", "phonics",
];

const CHANNEL_BOOST = [
  "kids", "learn", "education", "story", "children",
  "school", "academy", "junior", "preschool",
];

const PENALIZE = [
  "remix", "prank", "live", "trailer", "reaction", "meme",
  "compilation", "best of", "top 10", "1 hour", "2 hours",
  "3 hours", "full movie",
];

export function scoreVideo(v) {
  let score = 50;
  const haystack = `${v.title} ${v.description}`.toLowerCase();

  for (const kw of BOOST) {
    if (haystack.includes(kw)) score += 3;
  }
  score = Math.min(score, 70);

  const ch = v.channelTitle.toLowerCase();
  if (CHANNEL_BOOST.some((kw) => ch.includes(kw))) score += 5;

  const d = v.durationSeconds;
  if (d >= 90 && d <= 900) score += 15;
  else if (d > 900 && d <= 1800) score += 5;
  else if (d < 60) score -= 25;
  else if (d > 1800) score -= 10;

  for (const kw of PENALIZE) {
    if (haystack.includes(kw)) score -= 10;
  }

  if (v.viewCount > 500_000) score += 5;
  if (v.viewCount > 5_000_000) score += 3;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function rankVideos(videos, minScore = 15) {
  return videos
    .map((v) => ({ ...v, score: scoreVideo(v) }))
    .filter((v) => v.score >= minScore)
    .sort((a, b) => b.score - a.score);
}

export function buildQuery(language, topic, difficulty) {
  const diffMap = {
    beginner: "for kids beginners",
    intermediate: "for children",
    advanced: "story lesson",
  };
  return `${language} ${topic} animated educational ${diffMap[difficulty] ?? "for kids"}`;
}
