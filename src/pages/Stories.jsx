import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const stories = [
  {
    id: "festival-lanterns",
    title: "Festival of Lanterns",
    type: "Festival",
    length: "6 min",
    tags: ["Festivals", "Stories"],
  },
  {
    id: "folk-river",
    title: "The River & The Drum",
    type: "Folk tale",
    length: "5 min",
    tags: ["Folk tales", "Moral stories"],
  },
  {
    id: "moral-sharing",
    title: "Mango Learns to Share",
    type: "Moral",
    length: "4 min",
    tags: ["Moral stories", "Daily conversation"],
  },
  {
    id: "mythology-star",
    title: "Star of the Sky Queen",
    type: "Mythology",
    length: "7 min",
    tags: ["Mythology", "Stories"],
  },
  {
    id: "festival-drum",
    title: "The Festival Drum",
    type: "Festival",
    length: "6 min",
    tags: ["Festivals", "Speaking"],
  },
  {
    id: "folk-forest",
    title: "Forest of Fireflies",
    type: "Folk tale",
    length: "5 min",
    tags: ["Folk tales", "Pronunciation"],
  },
];

const focusToTag = {
  Festivals: "Festival",
  "Folk tales": "Folk tale",
  "Moral stories": "Moral",
  Mythology: "Mythology",
  Stories: "Story",
};

export default function Stories() {
  const onboarding = useMemo(() => {
    try {
      const stored = localStorage.getItem("bhashabuddy_onboarding");
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      return null;
    }
  }, []);

  const focusList = onboarding?.focus?.length
    ? onboarding.focus
    : ["Festivals", "Folk tales", "Moral stories"];

  const recommended = useMemo(() => {
    const preferredTypes = new Set(
      focusList
        .map((item) => focusToTag[item])
        .filter((item) => Boolean(item))
    );
    const picks = stories.filter((story) => preferredTypes.has(story.type));
    return picks.length ? picks.slice(0, 3) : stories.slice(0, 3);
  }, [focusList]);

  return (
    <div className="min-h-screen bg-sparkle px-6 py-10 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Stories Library
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold text-buddy-cocoa sm:text-4xl">
              Pick a story to begin
            </h1>
          </div>
          <Link
            to="/"
            className="rounded-full bg-white/80 px-4 py-2 text-xs font-semibold text-slate-600 shadow-soft transition hover:-translate-y-0.5"
          >
            Back home
          </Link>
        </header>

        <section className="mt-8 rounded-3xl border border-white/70 bg-white/80 p-6 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold text-buddy-cocoa">
                Recommended for you
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Based on your onboarding picks.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {focusList.slice(0, 3).map((item) => (
                <span
                  key={item}
                  className="rounded-full bg-buddy-mint/70 px-3 py-1 text-xs font-semibold text-slate-600"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {recommended.map((story) => (
              <StoryCard key={story.id} story={story} highlight />
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-2xl font-semibold text-buddy-cocoa">
            All stories
          </h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {stories.map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function StoryCard({ story, highlight = false }) {
  return (
    <motion.div
      whileHover={{ y: -6 }}
      className={`flex h-full flex-col rounded-2xl border bg-white/80 p-4 shadow-soft transition ${
        highlight ? "border-buddy-grape/40" : "border-white/70"
      }`}
    >
      <Thumbnail type={story.type} />
      <div className="mt-4 flex-1">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
          <span>{story.type}</span>
          <span>{story.length}</span>
        </div>
        <h3 className="mt-2 font-display text-lg font-semibold text-buddy-cocoa">
          {story.title}
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {story.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-slate-600"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
      <Link
        to={`/stories/${story.id}`}
        className="mt-4 inline-flex items-center justify-center rounded-full bg-buddy-grape px-4 py-2 text-xs font-semibold text-white shadow-soft transition hover:-translate-y-0.5"
      >
        Start story
      </Link>
    </motion.div>
  );
}

function Thumbnail({ type }) {
  const palette = {
    Festival: "from-[#FFE3C2] via-[#FFD6EA] to-[#CBE9FF]",
    "Folk tale": "from-[#D7F8E6] via-[#CBE9FF] to-[#FFD6C9]",
    Moral: "from-[#FFF0C9] via-[#D7F8E6] to-[#FFD6C9]",
    Mythology: "from-[#E6E0FF] via-[#CBE9FF] to-[#FFE8A6]",
  };

  return (
    <div
      className={`relative h-36 w-full overflow-hidden rounded-2xl bg-gradient-to-br ${
        palette[type] || palette.Festival
      }`}
    >
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 200 140" fill="none">
        <circle cx="40" cy="40" r="18" fill="#FFFFFF" fillOpacity="0.7" />
        <circle cx="70" cy="28" r="24" fill="#FFFFFF" fillOpacity="0.8" />
        <circle cx="110" cy="44" r="20" fill="#FFFFFF" fillOpacity="0.7" />
        <path
          d="M30 110c30-20 60-20 90 0"
          stroke="#FFFFFF"
          strokeOpacity="0.8"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <circle cx="150" cy="90" r="12" fill="#FFFFFF" fillOpacity="0.6" />
      </svg>
      <div className="absolute bottom-3 left-3 rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold text-slate-600">
        {type}
      </div>
    </div>
  );
}
