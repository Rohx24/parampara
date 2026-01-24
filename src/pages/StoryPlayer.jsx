import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useSession } from "../context/SessionContext.jsx";
import { logEvent, updateProgressSummary } from "../lib/db";

const stories = [
  {
    id: "festival-lanterns",
    title: "Festival of Lanterns",
    type: "Festival",
    length: "6 min",
  },
  {
    id: "folk-river",
    title: "The River & The Drum",
    type: "Folk tale",
    length: "5 min",
  },
  {
    id: "moral-sharing",
    title: "Mango Learns to Share",
    type: "Moral",
    length: "4 min",
  },
  {
    id: "mythology-star",
    title: "Star of the Sky Queen",
    type: "Mythology",
    length: "7 min",
  },
  {
    id: "festival-drum",
    title: "The Festival Drum",
    type: "Festival",
    length: "6 min",
  },
  {
    id: "folk-forest",
    title: "Forest of Fireflies",
    type: "Folk tale",
    length: "5 min",
  },
];

const languages = [
  {
    id: "tamil",
    label: "Tamil",
    subtitle: "Vaanga, oru kathai ketpom",
  },
  {
    id: "telugu",
    label: "Telugu",
    subtitle: "Randi, oka kadha vinadam",
  },
  {
    id: "hindi",
    label: "Hindi",
    subtitle: "Aao, kahani sunte hain",
  },
  {
    id: "kannada",
    label: "Kannada",
    subtitle: "Banni, ondu kathe kelona",
  },
];

const pauseMoments = [
  "What do you think happens next?",
  "Can you say the new word with Buddy?",
  "Point to the sparkle in the sky!",
];

const subtitleTracks = {
  tamil: [
    {
      start: 0,
      end: 8,
      text: "அமைதியான குளிர்கால காலை ஒன்றில், ஒரு சிறிய பறவை வழி தவறியது. ஒரு குழந்தை அதை கவனித்து ஆர்வமாக இருந்தது.",
    },
    { start: 8, end: 12, text: "அந்தச் சிறிய பறவை பயந்தது." },
    {
      start: 12,
      end: 24,
      text: "பாட்டி மெதுவாக குழந்தைக்கு கவனமாக இருக்கச் சொன்னாள். சிறிய உயிர்களுக்கு கருணையும் இடமும் தேவை.",
    },
    { start: 24, end: 32, text: "அக்குழந்தை அமைதியாகவும் மெல்லவும் இருக்க கற்றுக்கொண்டது." },
    {
      start: 32,
      end: 40,
      text: "அவர்கள் அந்தப் பறவைக்கு வீடு தேடும் வழியை கண்டுபிடிக்க உதவினர்.",
    },
    {
      start: 40,
      end: 52,
      text: "அந்தச் சிறிய பறவை மீண்டும் பாதுகாப்பாக இருந்தது; உதவியது குழந்தையை பெருமையும் மகிழ்ச்சியும் உணரச் செய்தது.",
    },
    {
      start: 52,
      end: 60,
      text: "விலங்குகளை பாதுகாப்பது அனைத்து உயிர்களுக்குமான கருணையை காட்டுகிறது.",
    },
  ],
  telugu: [
    {
      start: 0,
      end: 8,
      text: "నిశ్శబ్దమైన చలికాల ఉదయాన ఒక చిన్న పక్షి దారి తప్పింది. ఒక చిన్నారి దాన్ని గమనించి ఆసక్తిగా అనిపించింది.",
    },
    { start: 8, end: 12, text: "ఆ చిన్న పక్షి భయపడింది." },
    {
      start: 12,
      end: 24,
      text: "బామ్మ మెల్లగా పిల్లవాడిని జాగ్రత్తగా ఉండమని గుర్తు చేసింది. చిన్న జంతువులకు దయా భావం, కొంచెం స్థలం అవసరం.",
    },
    {
      start: 24,
      end: 32,
      text: "ఆ పిల్లాడు శాంతంగా, నిశ్శబ్దంగా ఉండడం నేర్చుకున్నాడు.",
    },
    {
      start: 32,
      end: 40,
      text: "వారు ఆ పక్షికి ఇంటికి దారి కనుగొనడానికి సహాయపడ్డారు.",
    },
    {
      start: 40,
      end: 52,
      text: "ఆ చిన్న పక్షి మళ్లీ సురక్షితంగా ఉండింది; సహాయం చేయడం వల్ల పిల్లవాడికి గర్వం, ఆనందం కలిగింది.",
    },
    {
      start: 52,
      end: 60,
      text: "జంతువులను కాపాడటం అన్ని జీవుల పట్ల కరుణను చూపిస్తుంది.",
    },
  ],
  hindi: [
    {
      start: 0,
      end: 8,
      text: "शांत सर्द सुबह में एक छोटी चिड़िया रास्ता भटक गई। एक बच्चे ने उसे देखा और जिज्ञासा हुई।",
    },
    { start: 8, end: 12, text: "वह छोटी चिड़िया डर गई थी।" },
    {
      start: 12,
      end: 24,
      text: "दादी ने धीरे से बच्चे को सावधान रहने को कहा। छोटे जानवरों को दया और जगह चाहिए।",
    },
    { start: 24, end: 32, text: "बच्चे ने शांत और चुप रहना सीख लिया।" },
    {
      start: 32,
      end: 40,
      text: "उन्होंने चिड़िया को घर का रास्ता ढूँढने में मदद की।",
    },
    {
      start: 40,
      end: 52,
      text: "छोटी चिड़िया फिर सुरक्षित थी; मदद करने से बच्चे को गर्व और खुशी हुई।",
    },
    {
      start: 52,
      end: 60,
      text: "जानवरों की रक्षा करना सभी जीवन के प्रति देखभाल दिखाता है।",
    },
  ],
  kannada: [
    {
      start: 0,
      end: 8,
      text: "ನಿಶ್ಶಬ್ದ ಚಳಿಗಾಲದ ಬೆಳಿಗ್ಗೆ ಒಂದು ಸಣ್ಣ ಹಕ್ಕಿ ದಾರಿ ತಪ್ಪಿತು. ಒಂದು ಮಗು ಅದನ್ನು ನೋಡಿ ಕುತೂಹಲದಿಂದಿತ್ತು.",
    },
    { start: 8, end: 12, text: "ಆ ಸಣ್ಣ ಹಕ್ಕಿ ಭಯಪಟ್ಟಿತು." },
    {
      start: 12,
      end: 24,
      text: "ಅಜ್ಜಿ ಮೃದುವಾಗಿ ಮಗುವಿಗೆ ಜಾಗರೂಕವಾಗಿರಲು ಹೇಳಿದಳು. ಸಣ್ಣ ಪ್ರಾಣಿಗಳಿಗೆ ದಯೆಯೂ ಸ್ಥಳವೂ ಬೇಕು.",
    },
    { start: 24, end: 32, text: "ಮಗು ಶಾಂತವಾಗಿ, ನಿಶ್ಶಬ್ದವಾಗಿ ಇರುವುದನ್ನು ಕಲಿತಿತು." },
    {
      start: 32,
      end: 40,
      text: "ಅವರು ಹಕ್ಕಿಗೆ ಮನೆ ದಾರಿ ಕಂಡುಕೊಳ್ಳಲು ಸಹಾಯ ಮಾಡಿದರು.",
    },
    {
      start: 40,
      end: 52,
      text: "ಸಣ್ಣ ಹಕ್ಕಿ ಮತ್ತೆ ಸುರಕ್ಷಿತವಾಗಿತ್ತು; ಸಹಾಯ ಮಾಡಿದ್ದು ಮಗುವಿಗೆ ಹೆಮ್ಮೆ ಮತ್ತು ಸಂತೋಷ ನೀಡಿತು.",
    },
    {
      start: 52,
      end: 60,
      text: "ಪ್ರಾಣಿಗಳನ್ನು ಕಾಪಾಡುವುದು ಎಲ್ಲಾ ಜೀವಗಳ ಮೇಲಿನ ಕಾಳಜಿಯನ್ನು ತೋರಿಸುತ್ತದೆ.",
    },
  ],
};

export default function StoryPlayer() {
  const { id } = useParams();
  const { childProfile, setChildProfile } = useSession();
  const story = useMemo(
    () => stories.find((item) => item.id === id) || stories[0],
    [id]
  );
  const videoRef = useRef(null);
  const loggedStoryId = useRef(null);
  const [selected, setSelected] = useState(languages[0]);
  const [momentIndex, setMomentIndex] = useState(0);
  const [showMoment, setShowMoment] = useState(false);
  const [activeSubtitle, setActiveSubtitle] = useState(
    subtitleTracks[languages[0].id][0].text
  );

  useEffect(() => {
    let mounted = true;
    const scheduleMoment = () => {
      setShowMoment(false);
      setTimeout(() => {
        if (!mounted) return;
        setShowMoment(true);
        setTimeout(() => {
          if (!mounted) return;
          setShowMoment(false);
          setMomentIndex((prev) => (prev + 1) % pauseMoments.length);
        }, 2400);
      }, 3200);
    };

    scheduleMoment();
    const interval = setInterval(scheduleMoment, 7200);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!childProfile?.id) return;
    if (loggedStoryId.current === story.id) return;
    loggedStoryId.current = story.id;
    logEvent(childProfile.id, "story_start", {
      storyId: story.id,
      language: selected.id,
    });
    const currentSummary = childProfile.progress_summary || {};
    updateProgressSummary(childProfile.id, {
      ...currentSummary,
      lastStoryId: story.id,
    })
      .then((updated) => updated && setChildProfile(updated))
      .catch(() => undefined);
  }, [childProfile?.id, selected.id, story.id]);

  useEffect(() => {
    if (!childProfile?.id || !showMoment) return;
    logEvent(childProfile.id, "story_checkpoint", {
      storyId: story.id,
      checkpointId: momentIndex,
      language: selected.id,
    });
  }, [childProfile?.id, momentIndex, selected.id, showMoment, story.id]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const cues = subtitleTracks[selected.id] || [];

    const updateCue = () => {
      const time = video.currentTime;
      const cue =
        cues.find((item) => time >= item.start && time < item.end) ||
        cues[cues.length - 1];
      if (cue?.text) setActiveSubtitle(cue.text);
    };

    updateCue();
    video.addEventListener("timeupdate", updateCue);
    return () => {
      video.removeEventListener("timeupdate", updateCue);
    };
  }, [selected.id]);

  return (
    <div className="min-h-screen bg-sparkle px-6 py-10 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Story Player
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold text-buddy-cocoa">
              {story.title}
            </h1>
          </div>
          <Link
            to="/stories"
            className="rounded-full bg-white/80 px-4 py-2 text-xs font-semibold text-slate-600 shadow-soft transition hover:-translate-y-0.5"
          >
            Back to library
          </Link>
        </header>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-card sm:p-6">
            <div className="relative overflow-hidden rounded-2xl bg-slate-100">
              <video
                ref={videoRef}
                src="/story.mp4"
                muted
                loop
                playsInline
                autoPlay
                className="h-[320px] w-full object-cover sm:h-[380px]"
              />
              <AnimatePresence>
                {showMoment && (
                  <motion.div
                    key={momentIndex}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="absolute left-6 top-6 rounded-2xl bg-white/90 px-4 py-3 text-sm font-semibold text-slate-700 shadow-soft"
                  >
                    Pause & Ask: {pauseMoments[momentIndex]}
                  </motion.div>
                )}
              </AnimatePresence>
              <motion.button
                type="button"
                aria-label="Microphone prompt"
                whileTap={{ scale: 0.92 }}
                className="absolute bottom-5 right-5 flex h-12 w-12 items-center justify-center rounded-full bg-buddy-coral text-white shadow-soft"
              >
                <MicIcon />
              </motion.button>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <span className="rounded-full bg-buddy-mint/70 px-3 py-1">
                  {story.type}
                </span>
                <span className="rounded-full bg-white/80 px-3 py-1">
                  {story.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {languages.map((language) => (
                  <button
                    key={language.id}
                    type="button"
                    onClick={() => setSelected(language)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                      selected.id === language.id
                        ? "bg-buddy-grape text-white shadow-soft"
                        : "bg-white/80 text-slate-600"
                    }`}
                  >
                    {language.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-full bg-buddy-mint/70 px-4 py-2 text-center text-sm font-semibold text-slate-600">
              {activeSubtitle}
            </div>
          </div>

          <aside className="space-y-5">
            <div className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-card">
              <h2 className="font-display text-xl font-semibold text-buddy-cocoa">
                Story hints
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Listen for repeated words and try saying them aloud with Buddy.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {["Glow", "Lantern", "Night", "Friendship"].map((item) => (
                  <span
                    key={item}
                    className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-600"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-card">
              <h2 className="font-display text-xl font-semibold text-buddy-cocoa">
                Next up
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Keep going with another story in the same vibe.
              </p>
              <Link
                to="/stories"
                className="mt-4 inline-flex rounded-full bg-buddy-grape px-5 py-2 text-xs font-semibold text-white shadow-soft transition hover:-translate-y-0.5"
              >
                Browse more stories
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function MicIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 64 64" fill="none">
      <rect x="22" y="10" width="20" height="30" rx="10" fill="#FFFFFF" />
      <path
        d="M16 30c0 9 7 16 16 16s16-7 16-16"
        stroke="#FFFFFF"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path d="M32 46v8" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
      <path d="M24 56h16" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
