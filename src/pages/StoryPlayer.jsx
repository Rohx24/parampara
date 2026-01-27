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
    video: "/stories/story1.mp4",
    poster: "/stories/posters/festival-lanterns.svg",
  },
  {
    id: "folk-river",
    title: "The River & The Drum",
    type: "Folk tale",
    length: "5 min",
    poster: "/stories/posters/folk-river.svg",
  },
  {
    id: "moral-sharing",
    title: "Mango Learns to Share",
    type: "Moral",
    length: "4 min",
    poster: "/stories/posters/moral-sharing.svg",
  },
  {
    id: "mythology-star",
    title: "Star of the Sky Queen",
    type: "Mythology",
    length: "7 min",
    poster: "/stories/posters/mythology-star.svg",
  },
  {
    id: "festival-drum",
    title: "The Festival Drum",
    type: "Festival",
    length: "6 min",
    poster: "/stories/posters/festival-drum.svg",
  },
  {
    id: "folk-forest",
    title: "Forest of Fireflies",
    type: "Folk tale",
    length: "5 min",
    poster: "/stories/posters/folk-forest.svg",
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

const storySubtitles = {
  "festival-lanterns": {
    hindi: [
      {
        start: 0,
        end: 14,
        text: "इतिहास आमतौर पर वह होता है जिसे हम पढ़ते हैं। पन्ने तारीखों, नामों और दूर-दराज के स्थानों से भरे होते हैं,",
      },
      {
        start: 14,
        end: 28,
        text: "लेकिन हर पन्ने में कभी राज्यों और सीमाओं से पहले की वास्तविक जिंदगियां बसी थीं। ऐसे इंसान थे जो आग की खोज करके जीना सीख रहे थे।",
      },
      { start: 28, end: 36, text: "उन शुरुआती दिनों से राजाओं और सभ्यताओं का उदय हुआ," },
      {
        start: 36,
        end: 58,
        text: "साम्राज्य स्थापित हुए। संसाधनों का दोहन हुआ। ज्ञान को खामोश कर दिया गया और आवाजों को दबा दिया गया।",
      },
      {
        start: 58,
        end: 78,
        text: "किताबें जला दी गईं। ग्रामीणों को लूटा गया और पीढ़ियों को यह भूलने पर मजबूर किया गया कि वे कौन थे।",
      },
      {
        start: 78,
        end: 100,
        text: "यह लोगों में बसा था। परिवारों में और समय के साथ चुपचाप आगे बढ़ती कहानियों में। जब हम उन्हें देखते हैं, तो हम खो चुके होते हैं। हम उन्हें सिर्फ याद नहीं करते।",
      },
      {
        start: 100,
        end: 124,
        text: "हम चाहते हैं कि हम उनसे एक बार फिर बात कर सकें। क्या होगा अगर अतीत सिर्फ याद रखने की चीज न होकर, अनुभव करने की चीज हो? फिर से, सिर्फ इतिहास नहीं, बल्कि जुड़ाव। सिर्फ कहानियां नहीं, बल्कि उपस्थिति।",
      },
    ],
    tamil: [
      {
        start: 0,
        end: 20,
        text: "வரலாறு என்பது பொதுவாக நாம் படிக்கும் ஒன்று. தேதிகள், பெயர்கள் மற்றும் தொலைதூர இடங்களால் நிரப்பப்பட்ட பக்கங்கள்,",
      },
      {
        start: 20,
        end: 44,
        text: "ஆனால் ஒவ்வொரு பக்கமும் ஒரு காலத்தில் ராஜ்யங்களுக்கு முன்பும் எல்லைகளுக்கு முன்பும் உண்மையான வாழ்க்கையைக் கொண்டிருந்தது. நெருப்பைக் கண்டுபிடித்து உயிர்வாழக் கற்றுக்கொண்ட மனிதர்கள் இருந்தனர்.",
      },
    ],
    kannada: [
      {
        start: 0,
        end: 18,
        text: "చరిత్ర అనేది మనం సాధారణంగా చదివేది. తేదీలు, పేర్లు మరియు సుదూర ప్రదేశాలతో నిండిన పేజీలు, కానీ ప్రతి పేజీ ఒకప్పుడు రాజ్యాలకు ముందు మరియు సరిహద్దులకు ముందు నిజ జీవితాలను కలిగి ఉంది.",
      },
      {
        start: 18,
        end: 34,
        text: "అగ్నిని కనుగొనడం ద్వారా మనుగడ సాగించడం నేర్చుకునే మానవులు ఉన్నారు.",
      },
      { start: 34, end: 44, text: "ఆ ప్రారంభం నుండి, గులాబీ రాజులు మరియు నాగరికతలు," },
      {
        start: 44,
        end: 70,
        text: "సామ్రాజ్యాలు వచ్చాయి. వనరులు తీసుకోబడ్డాయి. జ్ఞానం నిశ్శబ్దం చేయబడింది మరియు స్వరాలు నియంత్రించబడ్డాయి. పుస్తకాలు తగలబెట్టబడ్డాయి.",
      },
      {
        start: 70,
        end: 92,
        text: "గ్రామస్తులను తొలగించారు మరియు తరాలు తాము ఎవరో మరచిపోవలసి వచ్చింది. అది ప్రజలలో నివసించింది. కుటుంబాలలో మరియు కథలలో నిశ్శబ్దంగా కాలం గడిచిపోయింది.",
      },
      {
        start: 92,
        end: 118,
        text: "మనం వాటిని చూసినప్పుడు, మనం ఓడిపోయాము. మనం వాటిని గుర్తుంచుకోవడం మాత్రమే కాదు. మనం వారితో మరోసారి మాట్లాడగలిగితే బాగుండును.",
      },
      {
        start: 118,
        end: 140,
        text: "గతం మీరు గుర్తుంచుకున్నది కాకపోతే, మీరు అనుభవించగలిగేది అయితే? మళ్ళీ, చరిత్ర మాత్రమే కాదు, సంబంధం. కథలు మాత్రమే కాదు, ఉనికి.",
      },
    ],
    telugu: [
      {
        start: 0,
        end: 18,
        text: "அந்தத் தொடக்கங்களிலிருந்து, ரோஜா மன்னர்களும் நாகரிகங்களும்,",
      },
      {
        start: 18,
        end: 40,
        text: "பேரரசுகள் வந்தன. வளங்கள் பறிக்கப்பட்டன. அறிவு மௌனமாக்கப்பட்டது, குரல்கள் கட்டுப்படுத்தப்பட்டன. புத்தகங்கள் எரிக்கப்பட்டன.",
      },
      {
        start: 40,
        end: 64,
        text: "கிராமவாசிகள் பறிக்கப்பட்டனர், தலைமுறைகள் தாங்கள் யார் என்பதை மறக்க வேண்டிய கட்டாயம் ஏற்பட்டது. அது மக்களில் வாழ்ந்தது.",
      },
      {
        start: 64,
        end: 88,
        text: "குடும்பங்களிலும் கதைகளிலும் அமைதியாகக் காலத்தைக் கடந்து சென்றது. அவற்றைப் பார்க்கும்போது, நாம் இழந்துவிட்டோம். நாம் அவர்களை நினைவில் கொள்வதில்லை.",
      },
      {
        start: 88,
        end: 120,
        text: "நாம் அவர்களிடம் மீண்டும் ஒரு முறை பேச வேண்டும் என்று நாங்கள் விரும்புகிறோம். கடந்த காலம் நீங்கள் நினைவில் வைத்திருப்பது மட்டுமல்லாமல், நீங்கள் அனுபவிக்கக்கூடிய ஒன்றாக இருந்தால் என்ன செய்வது? மீண்டும், வரலாறு மட்டுமல்ல, தொடர்பும். கதைகள் மட்டுமல்ல, இருப்பும்.",
      },
    ],
  },
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
  const [activeSubtitle, setActiveSubtitle] = useState("Subtitles not available");

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
    const tracks = storySubtitles[story.id] || subtitleTracks;
    const cues = tracks[selected.id] || [];
    if (!cues.length) {
      setActiveSubtitle("Subtitles not available");
      return;
    }
    const video = videoRef.current;
    if (!video) {
      setActiveSubtitle(cues[0].text);
      return;
    }

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
  }, [selected.id, story.id]);

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
              {story.video ? (
                <video
                  ref={videoRef}
                  muted
                  loop
                  playsInline
                  autoPlay
                  poster={story.poster}
                  className="h-[320px] w-full object-cover sm:h-[380px]"
                >
                  <source src={story.video} type="video/mp4" />
                </video>
              ) : (
                <div className="flex h-[320px] w-full items-center justify-center sm:h-[380px]">
                  {story.poster ? (
                    <img
                      src={story.poster}
                      alt={story.title}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
              )}
              {story.video ? (
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
              ) : null}
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
