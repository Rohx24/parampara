import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useSession } from "../context/SessionContext.jsx";
import { logEvent, updateProgressSummary } from "../lib/db";
import { chatCompletion } from "../lib/openai";
import { getSpeechRecognition, VOICE_LANGUAGES } from "../lib/voice";

// ─── Story catalogue with rich content for GPT quiz context ──────────────────
const stories = [
  {
    id: "festival-lanterns",
    title: "Festival of Lanterns",
    type: "Festival",
    length: "6 min",
    video: "/stories/story1.mp4",
    poster: "/stories/posters/festival-lanterns.svg",
    content: `History is usually found in books — pages filled with dates, names, and faraway places.
But behind every page were real lives of people who lived before kingdoms and borders existed.
People who discovered fire and learned to survive.
From those early days came kings and civilisations, empires that took resources, silenced knowledge, and suppressed voices.
Books were burned. Villagers were displaced. Generations were made to forget who they were.
But culture survived quietly — living on inside people, inside families, and in stories whispered across time.
When we see those stories today, we feel the loss. We do not just remember them.
We wish we could speak with those people one more time.
What if the past was not just something to remember, but something to experience?
Not just history — but connection. Not just stories — but presence.
A grandmother sits with her grandchild by lamplight and tells these stories so they are never lost.
The child understands: keeping these stories alive is the greatest act of love.
Moral: Our cultural heritage lives on when we pass our stories to the next generation.`,
  },
  {
    id: "folk-river",
    title: "The River & The Drum",
    type: "Folk tale",
    length: "5 min",
    poster: "/stories/posters/folk-river.svg",
    content: `Near a deep forest river lived a young boy named Kiran who loved to fish every morning.
One rainy day Kiran found a large old drum half buried in the mud near the riverbank.
When he struck the drum, the river suddenly made a low rumbling sound as if answering back.
Kiran was amazed — a fast beat made the river rush faster, a slow beat made it calm.
A wise old woman named Mata Ganga who lived beside the river came to watch.
She explained that the drum was made long ago by the first people who settled here.
They believed the river had a spirit that communicated through music.
Mata Ganga warned Kiran never to play a fast angry beat because it could cause floods.
She taught him a gentle melody that the river spirit loved — it made the water clear and fish plentiful.
Kiran shared this knowledge with the other children in the village.
Every morning they played gentle music for the river together, and the village never suffered floods again.
Moral: Nature speaks to us in its own language, and we must listen and respond with care and gentleness.`,
  },
  {
    id: "moral-sharing",
    title: "Mango Learns to Share",
    type: "Moral",
    length: "4 min",
    poster: "/stories/posters/moral-sharing.svg",
    content: `Mango was a young monkey who lived in a large mango tree in the forest.
One day Mango found a huge bunch of ripe yellow bananas under the tree.
He was very excited and decided to eat all of them himself without telling his friends.
He hid the bananas in a hollow of the tree and ate them secretly for three days.
His friends — a parrot named Tia, a squirrel named Chiku, and a rabbit named Bhooo — noticed Mango was not sharing food as usual.
They felt hurt but said nothing.
One week later, Mango became sick with a stomach ache from eating too many bananas alone.
He could not find food because he was too weak to climb trees.
Tia, Chiku and Bhooo found him lying on the ground and felt sorry for him.
Even though he had been selfish, they brought him fruits, leaves and water to help him recover.
When Mango got better, he felt deeply ashamed and apologised to his friends.
He learned that food tastes much better when eaten together.
From that day Mango always shared everything he found, and he was never lonely again.
Moral: Selfishness leads to loneliness, but sharing brings joy and true friendship.`,
  },
  {
    id: "mythology-star",
    title: "Star of the Sky Queen",
    type: "Mythology",
    length: "7 min",
    poster: "/stories/posters/mythology-star.svg",
    content: `Long ago in the heavens, the Sky Queen named Akasha ruled the night with her collection of stars.
Her most precious star was the Dhruv Star — a star so bright it guided travellers home from wherever they were lost.
One night a jealous wind spirit named Vata stole the Dhruv Star and hid it inside the tallest mountain on earth.
Without the Dhruv Star, sailors were lost at sea and children could not find their way home at night.
A brave ten-year-old girl named Chandra lived in a village at the foot of that mountain.
She heard the Sky Queen weeping in the clouds above and decided to climb the mountain to find the star.
The mountain path was dangerous — sharp rocks, cold winds, and three riddles guarded by stone giants.
Chandra answered all three riddles with patience and honesty, not with tricks.
She found the star glowing inside a crystal cave and carried it carefully in her bare hands.
When she returned it to Akasha, the Sky Queen was overjoyed and asked Chandra what reward she wanted.
Chandra asked only that the star always guide lost children safely home.
Akasha granted this wish and also gave Chandra the gift of courage that she shared with every child she met.
Moral: True bravery is not about strength but about honesty and helping others even at great cost to yourself.`,
  },
  {
    id: "festival-drum",
    title: "The Festival Drum",
    type: "Festival",
    length: "6 min",
    poster: "/stories/posters/festival-drum.svg",
    content: `In a small village surrounded by paddy fields, the harvest festival came every year in October.
The most important part of the festival was the beating of the ancient village drum at sunset to announce the celebration.
But this year, twelve-year-old Meena discovered a large crack in the drum while cleaning the temple.
The village elder said the drum was too old to fix and the festival would have to go on without it.
Meena refused to accept this and went to her grandfather Thatha who was an old drum maker.
Thatha was nearly blind, but he taught Meena how to soak leather, stretch it over the frame and seal the crack with special forest resin.
For two weeks Meena worked every evening after school, getting it wrong many times and trying again.
Her hands blistered and her arms ached, but she kept going because she knew how much the festival meant to everyone.
On the evening before the festival, the drum was finally repaired.
When sunset came, Meena was chosen to be the first to beat the drum.
The sound rang out across the fields — deep, powerful and full.
The whole village came running and the festival began with the biggest celebration in years.
Meena's grandfather wept with pride and said the drum had never sounded so strong.
Moral: Persistence and love can repair anything, even what others say is beyond fixing.`,
  },
  {
    id: "folk-forest",
    title: "Forest of Fireflies",
    type: "Folk tale",
    length: "5 min",
    poster: "/stories/posters/folk-forest.svg",
    content: `Eight-year-old twins Ravi and Rani loved playing near the forest edge of their village.
One evening they chased a peacock deeper into the forest and suddenly realised they were completely lost.
It grew dark quickly and they could not see the path home.
Ravi was frightened and began to cry, but Rani held his hand and said they should stay calm and look for signs.
Just then, hundreds and hundreds of fireflies appeared all around them, flickering like tiny green and gold lanterns.
The fireflies slowly began to move in the same direction — forming a glowing path through the dark trees.
Ravi and Rani carefully followed the fireflies, walking slowly and trusting the light.
After thirty minutes the fireflies led them to the edge of the forest right next to their village.
Their mother was waiting at the gate with a lamp, tears on her face.
That night at dinner, their grandfather told them the forest fireflies are the spirits of ancestors who protect children.
He said the forest is not an enemy — it is a living friend that must be respected and protected.
Ravi and Rani promised never to cut branches or chase animals in the forest again.
They also started a small group at school to teach other children to protect the forest.
Moral: Nature protects those who respect it; the forest is a friend if we treat it as one.`,
  },
  {
    id: "folk-grandmother",
    title: "The Grandmother's Secret",
    type: "Folk tale",
    length: "5 min",
    poster: "/stories/posters/folk-grandmother.svg",
    content: `Every evening without fail, old Paati sat under the neem tree with her granddaughter Ammu and told her a story.
Ammu loved these evenings more than anything else, but she noticed that Paati always kept a small wooden box beside her.
Ammu was never allowed to open the box and her curiosity grew bigger every day.
One monsoon evening Paati finally said Ammu was ready to know the secret.
Inside the small box were tiny folded packets of seeds — each wrapped in a dry leaf and marked with a faded name.
Paati explained that these were not ordinary seeds. Each seed came from a plant that appears in one of the old folk stories.
The neem seed was from the story of the healing tree. The jasmine was from the story of the invisible princess.
The turmeric was from the warrior who stained his hands golden before battle.
Paati said that when a story is forgotten, the plant connected to it disappears from the village too.
She had spent her whole life collecting these seeds so the stories — and the plants — would never be lost.
She asked Ammu to take the box when she was older and teach every child a story with each seed.
Ammu cried and promised she would, and began to learn every story that very night.
Moral: Stories and nature are deeply connected — preserving one means preserving the other.`,
  },
  {
    id: "moral-water",
    title: "The River Teaches Us",
    type: "Moral",
    length: "4 min",
    poster: "/stories/posters/moral-water.svg",
    content: `Nine-year-old Rohan lived near a river that had flowed through his village for a thousand years.
Every day Rohan left the tap running while brushing his teeth, splashed water carelessly during his bath, and threw rubbish into the river.
His mother told him many times to be careful with water but Rohan thought there was always plenty.
That summer was the worst drought in fifty years. The river shrank to a thin trickle and then dried up completely.
The village well also ran dry. Women had to walk four kilometres every day to fetch water in heavy pots.
Crops died. Animals were thirsty. The school was closed because there was no water for the toilets.
Rohan felt guilty and ashamed seeing how much everyone was suffering.
One night he had a dream — a gentle old woman in a blue sari sat beside the empty riverbed.
She said she was the spirit of the river and that every drop of water wasted was one drop she could not give back.
She told Rohan the river could recover if every person in the village changed how they used water.
Rohan woke up and immediately began to act. He fixed the leaking tap. He took shorter baths. He organised a cleanup of the riverbank.
He taught his classmates how to save water and collected rainwater in buckets for the garden.
By the following year, the river had returned with small rains and the village learned to never waste it again.
Moral: Water is life itself — those who waste it risk losing everything, and it is never too late to change.`,
  },
];

// ─── Languages ────────────────────────────────────────────────────────────────
const languages = [
  { id: "hindi",   label: "Hindi",   speechCode: "hi-IN" },
  { id: "tamil",   label: "Tamil",   speechCode: "ta-IN" },
  { id: "telugu",  label: "Telugu",  speechCode: "te-IN" },
  { id: "kannada", label: "Kannada", speechCode: "kn-IN" },
];

const LANG_LABEL = { hindi: "Hindi", tamil: "Tamil", telugu: "Telugu", kannada: "Kannada" };

// ─── Subtitle cues per story per language ─────────────────────────────────────
// Each story has subtitle cues in all 4 languages so switching language
// actually changes the on-screen text.
const SUBTITLE_MAP = {
  "festival-lanterns": {
    hindi: [
      { start: 0,   end: 14,  text: "इतिहास आमतौर पर वह होता है जिसे हम पढ़ते हैं — तारीखों, नामों से भरे पन्ने।" },
      { start: 14,  end: 30,  text: "लेकिन हर पन्ने में कभी असली ज़िंदगियाँ थीं, जो राज्यों और सीमाओं से पहले की थीं।" },
      { start: 30,  end: 50,  text: "साम्राज्य स्थापित हुए। ज्ञान खामोश हुआ। आवाज़ें दबाई गईं। किताबें जलाई गईं।" },
      { start: 50,  end: 75,  text: "फिर भी वह संस्कृति परिवारों में, चुपचाप सुनाई जाने वाली कहानियों में जीवित रही।" },
      { start: 75,  end: 100, text: "क्या होगा अगर अतीत सिर्फ याद रखने की नहीं, बल्कि अनुभव करने की चीज़ हो?" },
      { start: 100, end: 124, text: "सिर्फ इतिहास नहीं — जुड़ाव। सिर्फ कहानियाँ नहीं — उपस्थिति।" },
    ],
    tamil: [
      { start: 0,   end: 14,  text: "வரலாறு என்பது பொதுவாக நாம் படிக்கும் ஒன்று — தேதிகள், பெயர்கள் நிரம்பிய பக்கங்கள்." },
      { start: 14,  end: 30,  text: "ஆனால் ஒவ்வொரு பக்கத்திலும் ஒருகாலத்தில் உண்மையான வாழ்க்கைகள் இருந்தன." },
      { start: 30,  end: 50,  text: "பேரரசுகள் வந்தன. அறிவு மௌனமாக்கப்பட்டது. குரல்கள் அடக்கப்பட்டன. புத்தகங்கள் எரிக்கப்பட்டன." },
      { start: 50,  end: 75,  text: "ஆனாலும் கலாச்சாரம் குடும்பங்களில், மெல்ல சொல்லப்படும் கதைகளில் உயிர் வாழ்ந்தது." },
      { start: 75,  end: 100, text: "கடந்த காலம் நினைவில் மட்டும் இல்லாமல் அனுபவிக்கக்கூடியதாக இருந்தால் என்ன?" },
      { start: 100, end: 124, text: "வெறும் வரலாறு மட்டுமல்ல — தொடர்பு. கதைகள் மட்டுமல்ல — இருப்பு." },
    ],
    telugu: [
      { start: 0,   end: 14,  text: "చరిత్ర అంటే సాధారణంగా మనం చదివేది — తేదీలు, పేర్లు నిండిన పేజీలు." },
      { start: 14,  end: 30,  text: "కానీ ప్రతి పేజీలో ఒకప్పుడు నిజమైన జీవితాలు ఉండేవి, రాజ్యాలకు ముందు." },
      { start: 30,  end: 50,  text: "సామ్రాజ్యాలు వచ్చాయి. జ్ఞానం మూగబోయింది. స్వరాలు అణచివేయబడ్డాయి." },
      { start: 50,  end: 75,  text: "అయినా సంస్కృతి కుటుంబాలలో, నిశ్శబ్దంగా చెప్పబడే కథలలో బతికింది." },
      { start: 75,  end: 100, text: "గతం కేవలం గుర్తుంచుకోవడానికి కాకుండా అనుభవించగలిగితే?" },
      { start: 100, end: 124, text: "కేవలం చరిత్ర కాదు — అనుబంధం. కేవలం కథలు కాదు — ఉనికి." },
    ],
    kannada: [
      { start: 0,   end: 14,  text: "ಇತಿಹಾಸ ಸಾಮಾನ್ಯವಾಗಿ ನಾವು ಓದುವಂಥದ್ದು — ದಿನಾಂಕ, ಹೆಸರುಗಳ ಪುಟಗಳು." },
      { start: 14,  end: 30,  text: "ಆದರೆ ಪ್ರತಿ ಪುಟದಲ್ಲೂ ಒಂದು ಕಾಲದಲ್ಲಿ ನಿಜವಾದ ಜೀವನಗಳಿದ್ದವು, ರಾಜ್ಯಗಳಿಗಿಂತ ಮುಂಚೆ." },
      { start: 30,  end: 50,  text: "ಸಾಮ್ರಾಜ್ಯಗಳು ಬಂದವು. ಜ್ಞಾನ ಮೌನವಾಯಿತು. ದನಿಗಳನ್ನು ಅಡಗಿಸಲಾಯಿತು." },
      { start: 50,  end: 75,  text: "ಆದರೂ ಸಂಸ್ಕೃತಿ ಕುಟುಂಬಗಳಲ್ಲಿ, ಮೆಲ್ಲಗೆ ಹೇಳಲ್ಪಡುವ ಕತೆಗಳಲ್ಲಿ ಬದುಕಿತು." },
      { start: 75,  end: 100, text: "ಭೂತಕಾಲ ಕೇವಲ ನೆನಪಿಗಷ್ಟೇ ಅಲ್ಲ, ಅನುಭವಿಸಬಹುದಾದದ್ದಾಗಿದ್ದರೆ?" },
      { start: 100, end: 124, text: "ಕೇವಲ ಇತಿಹಾಸ ಅಲ್ಲ — ಸಂಬಂಧ. ಕೇವಲ ಕತೆಗಳಲ್ಲ — ಉಪಸ್ಥಿತಿ." },
    ],
  },
};

// For non-video stories, generate cues from the content in all 4 languages
const DEFAULT_CUES = {
  hindi: [
    { start: 0,  end: 10, text: "एक छोटे से गाँव में एक बच्चा रहता था जो हमेशा नई चीज़ें सीखना चाहता था।" },
    { start: 10, end: 22, text: "वह बहुत जिज्ञासु था — हर रोज़ जंगल, नदी और बड़े-बुज़ुर्गों से कुछ न कुछ सीखता था।" },
    { start: 22, end: 34, text: "एक दिन उसे एक बड़ी चुनौती का सामना करना पड़ा जिसने उसे डरा दिया।" },
    { start: 34, end: 46, text: "लेकिन उसने हिम्मत नहीं हारी और धैर्य से काम लिया।" },
    { start: 46, end: 56, text: "उसके गाँव वालों ने उसकी मदद की और मिलकर वे सफल हुए।" },
    { start: 56, end: 60, text: "उस दिन से सबने सीखा कि मेहनत और दयालुता से हर मुश्किल हल हो सकती है।" },
  ],
  tamil: [
    { start: 0,  end: 10, text: "ஒரு சிறிய கிராமத்தில் ஒரு குழந்தை வாழ்ந்தது, எப்போதும் புதியவற்றை கற்க விரும்பியது." },
    { start: 10, end: 22, text: "அது மிகவும் ஆர்வமுள்ளதாகவும் — காடு, நதி, முதியவர்களிடம் இருந்து கற்றுக்கொண்டும் இருந்தது." },
    { start: 22, end: 34, text: "ஒரு நாள் ஒரு பெரிய சவாலை எதிர்கொண்டது, அது பயந்தது." },
    { start: 34, end: 46, text: "ஆனால் தைரியத்தை இழக்கவில்லை, பொறுமையுடன் செயல்பட்டது." },
    { start: 46, end: 56, text: "கிராமத்தினர் உதவினர், ஒன்றாக வெற்றி பெற்றனர்." },
    { start: 56, end: 60, text: "அன்றிலிருந்து அனைவரும் உழைப்பும் கருணையும் எந்த சிக்கலையும் தீர்க்கும் என அறிந்தனர்." },
  ],
  telugu: [
    { start: 0,  end: 10, text: "ఒక చిన్న గ్రామంలో ఒక పిల్లవాడు నివసించేవాడు, ఎప్పుడూ కొత్తవి నేర్చుకోవాలని ఉండేది." },
    { start: 10, end: 22, text: "అతను చాలా కుతూహలంగా ఉండేవాడు — అడవి, నది, పెద్దవాళ్ళ నుండి నేర్చుకుంటూ." },
    { start: 22, end: 34, text: "ఒక రోజు ఒక పెద్ద సవాలు ఎదుర్కొన్నాడు, అది అతన్ని భయపెట్టింది." },
    { start: 34, end: 46, text: "కానీ ధైర్యం వదలలేదు, ఓపికగా పని చేశాడు." },
    { start: 46, end: 56, text: "గ్రామస్తులు సహాయం చేశారు, కలిసి విజయం సాధించారు." },
    { start: 56, end: 60, text: "ఆ రోజు నుండి అందరూ కష్టపడటం మరియు దయ ఏ కష్టాన్నైనా పరిష్కరిస్తాయని నేర్చుకున్నారు." },
  ],
  kannada: [
    { start: 0,  end: 10, text: "ಒಂದು ಸಣ್ಣ ಹಳ್ಳಿಯಲ್ಲಿ ಒಂದು ಮಗು ವಾಸಿಸುತ್ತಿತ್ತು, ಯಾವಾಗಲೂ ಹೊಸದನ್ನು ಕಲಿಯಲು ಬಯಸುತ್ತಿತ್ತು." },
    { start: 10, end: 22, text: "ಅದು ತುಂಬಾ ಕುತೂಹಲಿಯಾಗಿತ್ತು — ಕಾಡು, ನದಿ, ಹಿರಿಯರಿಂದ ಕಲಿಯುತ್ತಿತ್ತು." },
    { start: 22, end: 34, text: "ಒಂದು ದಿನ ಒಂದು ದೊಡ್ಡ ಸವಾಲನ್ನು ಎದುರಿಸಿತು, ಅದು ಭಯಗೊಂಡಿತು." },
    { start: 34, end: 46, text: "ಆದರೆ ಧೈರ್ಯ ಕಳೆದುಕೊಳ್ಳಲಿಲ್ಲ, ತಾಳ್ಮೆಯಿಂದ ಕೆಲಸ ಮಾಡಿತು." },
    { start: 46, end: 56, text: "ಹಳ್ಳಿಗರು ಸಹಾಯ ಮಾಡಿದರು, ಒಟ್ಟಾಗಿ ಯಶಸ್ವಿಯಾದರು." },
    { start: 56, end: 60, text: "ಆ ದಿನದಿಂದ ಎಲ್ಲರೂ ಶ್ರಮ ಮತ್ತು ದಯೆಯಿಂದ ಯಾವ ತೊಂದರೆಯನ್ನೂ ಪರಿಹರಿಸಬಹುದೆಂದು ತಿಳಿದರು." },
  ],
};

function getCues(storyId, langId) {
  return SUBTITLE_MAP[storyId]?.[langId] ?? DEFAULT_CUES[langId] ?? DEFAULT_CUES.hindi;
}

const PAUSE_MOMENTS = [
  "What do you think happens next?",
  "Can you say the new word with Buddy?",
  "How does the character feel right now?",
];

// ─── GPT helpers ──────────────────────────────────────────────────────────────
function buildQuizPrompt(langLabel, ageGroup) {
  return `You are a comprehension quiz teacher for Indian children aged ${ageGroup}.
You will be given the full story text below. Generate exactly 3 comprehension questions based ONLY on the specific events, characters, and moral in this story.
Write the questions in ${langLabel} script${langLabel === "English" ? "" : " (no Roman letters or English words)"}.
Return ONLY the 3 questions, one per line, numbered 1. 2. 3.
Ask about: a character's action, a specific event, and the moral.`;
}

function buildEvalPrompt(langLabel, ageGroup, question, content) {
  return `You are a warm and encouraging language teacher for Indian children aged ${ageGroup}.
The child just watched a story about: "${content.slice(0, 200)}..."

The question asked was: "${question}"
Evaluate the child's spoken answer:
1. Was it correct based on the story?
2. Gently correct any language or grammar mistake (one sentence max)
3. Give warm praise and encouragement

Respond in 2–3 sentences in English. Always start with either "Great job!" or "Good try!".`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function StoryPlayer() {
  const { id } = useParams();
  const { childProfile, setChildProfile } = useSession();
  const story = useMemo(() => stories.find((s) => s.id === id) || stories[0], [id]);
  const ageGroup = childProfile?.age
    ? childProfile.age <= 7 ? "5–7" : childProfile.age <= 11 ? "8–11" : "12–15"
    : "8–11";

  const defaultLang = useMemo(() => {
    const pref = (childProfile?.preferred_language || "hindi").toLowerCase();
    return languages.find((l) => l.id === pref) || languages[0];
  }, [childProfile?.preferred_language]);

  const [selected, setSelected] = useState(defaultLang);

  // Phase: watching | quizLoading | quiz | evaluating | complete
  const [phase, setPhase] = useState("watching");
  const phaseRef = useRef("watching"); // always in sync, avoids stale closure
  const setPhaseSync = (p) => { phaseRef.current = p; setPhase(p); };

  // Video state
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [playTime, setPlayTime] = useState(0);
  const videoRef = useRef(null);
  const timerRef = useRef(null);
  const loggedRef = useRef(null);

  // Animated timer duration (for non-video stories, simulate 60s playthrough)
  const ANIM_DURATION = 60;

  // Pause moments
  const [momentIdx, setMomentIdx] = useState(0);
  const [showMoment, setShowMoment] = useState(false);

  // Translate popup
  const [translatePopup, setTranslatePopup] = useState(null);
  const translateCache = useRef({});

  // Quiz state
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [childAnswer, setChildAnswer] = useState("");
  const [interimAnswer, setInterimAnswer] = useState("");
  const [answerListening, setAnswerListening] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const answerRecRef = useRef(null);

  // ── Cues / subtitles ───────────────────────────────────────────────────────
  const cues = useMemo(() => getCues(story.id, selected.id), [story.id, selected.id]);

  const activeSubtitle = useMemo(() => {
    const cue = cues.find((c) => playTime >= c.start && playTime < c.end)
      ?? cues[cues.length - 1];
    return cue?.text ?? "";
  }, [cues, playTime]);

  // ── Animated timer (for poster-only stories) ───────────────────────────────
  useEffect(() => {
    if (story.video) return;
    if (phase !== "watching" || !videoPlaying) return;
    timerRef.current = setInterval(() => {
      setPlayTime((t) => {
        const next = parseFloat((t + 0.25).toFixed(2));
        if (next >= ANIM_DURATION) { clearInterval(timerRef.current); return ANIM_DURATION; }
        return next;
      });
    }, 250);
    return () => clearInterval(timerRef.current);
  }, [videoPlaying, story.video, phase]);

  // Detect animated story end
  useEffect(() => {
    if (story.video) return;
    if (phase !== "watching") return;
    if (playTime >= ANIM_DURATION) startQuiz();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playTime]);

  // ── Sync real video currentTime → playTime ─────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const update = () => setPlayTime(video.currentTime);
    video.addEventListener("timeupdate", update);
    return () => video.removeEventListener("timeupdate", update);
  }, []);

  // Show first frame: seek to 0.1s when metadata loads
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onMeta = () => { video.currentTime = 0.1; };
    video.addEventListener("loadedmetadata", onMeta);
    return () => video.removeEventListener("loadedmetadata", onMeta);
  }, []);

  // ── Pause moments ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "watching") return;
    let alive = true;
    const cycle = () => {
      setShowMoment(false);
      setTimeout(() => {
        if (!alive) return;
        setShowMoment(true);
        setTimeout(() => {
          if (!alive) return;
          setShowMoment(false);
          setMomentIdx((i) => (i + 1) % PAUSE_MOMENTS.length);
        }, 2500);
      }, 4000);
    };
    cycle();
    const iv = setInterval(cycle, 8000);
    return () => { alive = false; clearInterval(iv); };
  }, [phase]);

  // ── DB logging ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!childProfile?.id || loggedRef.current === story.id) return;
    loggedRef.current = story.id;
    logEvent(childProfile.id, "story_start", { storyId: story.id, language: selected.id });
    updateProgressSummary(childProfile.id, {
      ...(childProfile.progress_summary || {}),
      lastStoryId: story.id,
    })
      .then((u) => u && setChildProfile(u))
      .catch(() => undefined);
  }, [childProfile?.id, selected.id, story.id]);

  // ── Video play/pause ───────────────────────────────────────────────────────
  const toggleVideoPlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => undefined);
      setVideoPlaying(true);
    } else {
      video.pause();
      setVideoPlaying(false);
    }
  };

  const handleVideoEnded = useCallback(() => {
    setVideoPlaying(false);
    if (phaseRef.current === "watching") startQuiz();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Tap-to-translate ───────────────────────────────────────────────────────
  const handleWordTap = useCallback(async (word) => {
    const clean = word.replace(/[.,!?;:"''""()\-।]/g, "").trim();
    if (!clean) return;
    const key = `${selected.id}:${clean}`;
    if (translateCache.current[key]) {
      setTranslatePopup({ word: clean, result: translateCache.current[key], loading: false });
      return;
    }
    setTranslatePopup({ word: clean, result: null, loading: true });
    try {
      const reply = await chatCompletion([
        {
          role: "system",
          content: `You are a language helper for Indian children. Translate the given word and give a phonetic guide.
Reply ONLY in this exact format (two lines, nothing else):
Meaning: [English meaning]
Say it: [simple phonetic pronunciation for a child]`,
        },
        { role: "user", content: `The word is "${clean}" in ${selected.label}. Translate it.` },
      ], { max_tokens: 60, temperature: 0.3 });
      translateCache.current[key] = reply;
      setTranslatePopup({ word: clean, result: reply, loading: false });
    } catch {
      setTranslatePopup({ word: clean, result: "Meaning: Could not load\nSay it: —", loading: false });
    }
  }, [selected]);

  // ── Start quiz (called when story finishes) ────────────────────────────────
  const startQuiz = useCallback(async () => {
    if (phaseRef.current !== "watching") return;
    setPhaseSync("quizLoading");
    setError("");
    try {
      const langLabel = LANG_LABEL[selected.id] || "Hindi";
      const raw = await chatCompletion([
        { role: "system", content: buildQuizPrompt(langLabel, ageGroup) },
        { role: "user", content: `Here is the full story:\n\n${story.content}` },
      ], { max_tokens: 350, temperature: 0.5 });
      const qs = raw
        .split("\n")
        .map((l) => l.replace(/^\d+[\.\)]\s*/, "").trim())
        .filter((l) => l.length > 5);
      if (!qs.length) throw new Error("No questions parsed");
      setQuestions(qs);
      setCurrentQ(0);
      setChildAnswer("");
      setFeedback("");
      setResults([]);
      setPhaseSync("quiz");
    } catch {
      setError("Could not load questions. Check your OpenAI API key.");
      setPhaseSync("watching");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected.id, ageGroup, story.content]);

  // ── Answer listening ───────────────────────────────────────────────────────
  const startAnswerListening = () => {
    const SR = getSpeechRecognition();
    if (!SR) { setError("Speech recognition requires Chrome."); return; }
    const langMeta = VOICE_LANGUAGES.find((l) => l.id === selected.id) || VOICE_LANGUAGES[0];
    const rec = new SR();
    rec.lang = langMeta.speechCode;
    rec.interimResults = true;
    rec.continuous = true;
    let finalText = "";
    rec.onresult = (e) => {
      let interim = "";
      for (const r of e.results) {
        if (r.isFinal) finalText += r[0].transcript + " ";
        else interim += r[0].transcript;
      }
      setChildAnswer(finalText.trim());
      setInterimAnswer(interim);
    };
    rec.onerror = () => { setAnswerListening(false); setInterimAnswer(""); };
    rec.onend = () => { setAnswerListening(false); setInterimAnswer(""); };
    answerRecRef.current = rec;
    setAnswerListening(true);
    setChildAnswer("");
    setInterimAnswer("");
    rec.start();
  };

  const stopAnswerListening = () => {
    answerRecRef.current?.stop();
    setAnswerListening(false);
    setInterimAnswer("");
  };

  // ── Evaluate answer ────────────────────────────────────────────────────────
  const evaluateAnswer = async () => {
    const answer = childAnswer.trim();
    if (!answer) return;
    setPhaseSync("evaluating");
    setError("");
    try {
      const langLabel = LANG_LABEL[selected.id] || "Hindi";
      const fb = await chatCompletion([
        { role: "system", content: buildEvalPrompt(langLabel, ageGroup, questions[currentQ], story.content) },
        { role: "user", content: `Child's spoken answer: "${answer}"` },
      ], { max_tokens: 150, temperature: 0.6 });
      setFeedback(fb);
      setResults((prev) => [...prev, { question: questions[currentQ], answer, feedback: fb }]);
      setPhaseSync("quiz");
    } catch {
      setError("Could not evaluate. Try again.");
      setPhaseSync("quiz");
    }
  };

  const nextQuestion = () => {
    if (currentQ + 1 >= questions.length) {
      setPhaseSync("complete");
    } else {
      setCurrentQ((i) => i + 1);
      setChildAnswer("");
      setFeedback("");
    }
  };

  // ── Progress bar value ─────────────────────────────────────────────────────
  const progress = story.video
    ? videoRef.current?.duration
      ? Math.min(1, playTime / videoRef.current.duration)
      : 0
    : Math.min(1, playTime / ANIM_DURATION);

  return (
    <div className="min-h-screen bg-sparkle px-6 py-10 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Story Player</p>
            <h1 className="mt-2 font-display text-3xl font-semibold text-buddy-cocoa">{story.title}</h1>
          </div>
          <Link to="/stories" className="rounded-full bg-white/80 px-4 py-2 text-xs font-semibold text-slate-600 shadow-soft transition hover:-translate-y-0.5">
            Back to library
          </Link>
        </header>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          {/* ── Media panel ── */}
          <div className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-card sm:p-6">
            <div className="relative overflow-hidden rounded-2xl bg-slate-900">
              {story.video ? (
                <>
                  <video
                    ref={videoRef}
                    preload="metadata"
                    onEnded={handleVideoEnded}
                    className="h-[220px] w-full object-cover sm:h-[280px] lg:h-[340px]"
                    style={{ display: "block" }}
                  >
                    <source src={story.video} type="video/mp4" />
                  </video>
                  {/* Play / Pause overlay */}
                  {phase === "watching" && (
                    <motion.button
                      type="button"
                      onClick={toggleVideoPlay}
                      whileTap={{ scale: 0.9 }}
                      className="absolute inset-0 flex items-center justify-center"
                      aria-label={videoPlaying ? "Pause" : "Play"}
                    >
                      <AnimatePresence mode="wait">
                        {!videoPlaying && (
                          <motion.div
                            key="play"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="flex h-16 w-16 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm"
                          >
                            <svg viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 ml-1">
                              <path d="M8 5v14l11-7z"/>
                            </svg>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  )}
                  {/* Small pause button (bottom-left) when playing */}
                  {phase === "watching" && videoPlaying && (
                    <motion.button
                      type="button"
                      onClick={toggleVideoPlay}
                      whileTap={{ scale: 0.9 }}
                      className="absolute bottom-4 left-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                        <rect x="6" y="4" width="4" height="16" rx="1"/>
                        <rect x="14" y="4" width="4" height="16" rx="1"/>
                      </svg>
                    </motion.button>
                  )}
                </>
              ) : (
                /* Animated player for poster-only stories */
                <div className="relative h-[220px] w-full sm:h-[280px] lg:h-[340px]">
                  <img src={story.poster} alt={story.title} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  {phase === "watching" && (
                    <motion.button
                      type="button"
                      onClick={() => setVideoPlaying((p) => !p)}
                      whileTap={{ scale: 0.9 }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <AnimatePresence mode="wait">
                        {!videoPlaying && (
                          <motion.div
                            key="play"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="flex h-16 w-16 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm"
                          >
                            <svg viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 ml-1">
                              <path d="M8 5v14l11-7z"/>
                            </svg>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  )}
                  {phase === "watching" && videoPlaying && (
                    <motion.button
                      type="button"
                      onClick={() => setVideoPlaying(false)}
                      whileTap={{ scale: 0.9 }}
                      className="absolute bottom-4 left-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                        <rect x="6" y="4" width="4" height="16" rx="1"/>
                        <rect x="14" y="4" width="4" height="16" rx="1"/>
                      </svg>
                    </motion.button>
                  )}
                </div>
              )}

              {/* Pause moment bubble */}
              {phase === "watching" && (
                <AnimatePresence>
                  {showMoment && (
                    <motion.div
                      key={momentIdx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.3 }}
                      className="absolute left-4 top-4 max-w-[200px] rounded-2xl bg-white/90 px-4 py-3 text-xs font-semibold text-slate-700 shadow-soft"
                    >
                      💬 {PAUSE_MOMENTS[momentIdx]}
                    </motion.div>
                  )}
                </AnimatePresence>
              )}

              {/* Mic button */}
              {phase === "watching" && (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  className="absolute bottom-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-buddy-coral text-white shadow-soft"
                >
                  <MicIcon />
                </motion.button>
              )}
            </div>

            {/* Progress bar */}
            {phase === "watching" && (
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <motion.div
                  className="h-full rounded-full bg-buddy-grape"
                  animate={{ width: `${(progress || 0) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            )}

            {/* Language selector + meta */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <span className="rounded-full bg-buddy-mint/70 px-3 py-1">{story.type}</span>
                <span className="rounded-full bg-white/80 px-3 py-1">{story.length}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {languages.map((lang) => (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => setSelected(lang)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                      selected.id === lang.id
                        ? "bg-buddy-grape text-white shadow-soft"
                        : "bg-white/80 text-slate-600"
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tap-to-translate subtitle */}
            {phase === "watching" && (
              <div className="relative mt-4">
                <div className="min-h-[60px] rounded-2xl bg-buddy-mint/70 px-4 py-3 text-center text-sm font-semibold text-slate-600 leading-relaxed">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    Tap any word to translate
                  </p>
                  <span>
                    {activeSubtitle.split(/(\s+)/).map((token, i) =>
                      token.trim().length > 0 ? (
                        <motion.button
                          key={i}
                          type="button"
                          onClick={() => handleWordTap(token)}
                          whileTap={{ scale: 0.9 }}
                          className="mx-0.5 inline rounded-full px-1 py-0.5 transition hover:bg-buddy-grape/20 hover:text-buddy-grape cursor-pointer"
                        >
                          {token}
                        </motion.button>
                      ) : (
                        <span key={i}>{token}</span>
                      )
                    )}
                  </span>
                </div>
                <AnimatePresence>
                  {translatePopup && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.95 }}
                      transition={{ duration: 0.18 }}
                      className="absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-2xl border border-white/70 bg-white/95 p-4 shadow-card"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-buddy-grape">{translatePopup.word}</p>
                        <button type="button" onClick={() => setTranslatePopup(null)} className="text-xs text-slate-400 hover:text-slate-600">✕</button>
                      </div>
                      {translatePopup.loading ? (
                        <p className="mt-2 text-xs text-slate-500 animate-pulse">Translating…</p>
                      ) : (
                        <div className="mt-2 space-y-1">
                          {translatePopup.result?.split("\n").map((line, i) => (
                            <p key={i} className="text-xs text-slate-600">{line}</p>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* ── Right panel ── */}
          <aside className="space-y-5">
            {/* Story hints while watching */}
            {phase === "watching" && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-card space-y-3"
              >
                <h2 className="font-display text-lg font-semibold text-buddy-cocoa">Watching guide</h2>
                <p className="text-sm text-slate-600">
                  Listen carefully! When it ends, Buddy will ask you 3 questions about the story.
                </p>
                <p className="text-xs text-slate-400">
                  Switch the language tabs below the video to hear subtitles in Hindi, Tamil, Telugu, or Kannada.
                </p>
                {!story.video && !videoPlaying && (
                  <motion.button
                    type="button"
                    onClick={() => setVideoPlaying(true)}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    className="w-full rounded-2xl bg-buddy-grape py-3 text-sm font-semibold text-white shadow-soft"
                  >
                    ▶ Start story
                  </motion.button>
                )}
              </motion.div>
            )}

            {/* Loading questions */}
            {phase === "quizLoading" && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl border border-buddy-grape/30 bg-white/90 p-6 shadow-card text-center space-y-3"
              >
                <div className="text-3xl">🎬</div>
                <p className="font-display text-lg font-semibold text-buddy-cocoa">Great watching!</p>
                <p className="text-sm text-slate-500 animate-pulse">Preparing your questions…</p>
              </motion.div>
            )}

            {/* Quiz */}
            <AnimatePresence mode="wait">
              {(phase === "quiz" || phase === "evaluating") && questions.length > 0 && (
                <motion.div
                  key={`q-${currentQ}`}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="rounded-3xl border border-buddy-grape/30 bg-white/90 p-5 shadow-card space-y-4"
                >
                  {/* Progress bar */}
                  <div className="flex items-center gap-3">
                    <p className="shrink-0 text-xs font-semibold uppercase tracking-widest text-slate-400">
                      Q {currentQ + 1}/{questions.length}
                    </p>
                    <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-buddy-grape"
                        animate={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
                        transition={{ duration: 0.4 }}
                      />
                    </div>
                  </div>

                  {/* Question */}
                  <div className="rounded-2xl bg-buddy-mint/30 px-4 py-3 text-sm font-semibold text-slate-700 leading-relaxed">
                    {questions[currentQ]}
                  </div>

                  {/* Answer (before feedback) */}
                  {!feedback && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <motion.button
                          type="button"
                          onClick={answerListening ? stopAnswerListening : startAnswerListening}
                          whileTap={{ scale: 0.92 }}
                          className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                            answerListening ? "bg-buddy-coral text-white" : "bg-buddy-grape text-white"
                          }`}
                        >
                          {answerListening ? (
                            <>
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                              </span>
                              Stop
                            </>
                          ) : "🎙️ Speak"}
                        </motion.button>
                        {childAnswer && phase !== "evaluating" && (
                          <motion.button
                            type="button"
                            onClick={evaluateAnswer}
                            whileTap={{ scale: 0.95 }}
                            className="rounded-2xl bg-buddy-mint px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-soft"
                          >
                            Submit ✓
                          </motion.button>
                        )}
                        {phase === "evaluating" && (
                          <span className="text-xs text-slate-400 font-semibold animate-pulse">Checking…</span>
                        )}
                      </div>
                      <AnimatePresence>
                        {(childAnswer || interimAnswer) && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="rounded-2xl bg-white/80 border border-white/70 px-3 py-2.5 text-sm min-h-[44px]"
                          >
                            <span className="font-semibold text-slate-700">{childAnswer}</span>
                            {interimAnswer && <span className="italic text-slate-400"> {interimAnswer}</span>}
                          </motion.div>
                        )}
                      </AnimatePresence>
                      {!childAnswer && !interimAnswer && !answerListening && (
                        <p className="text-xs text-slate-400">Tap the mic and speak your answer in {selected.label}.</p>
                      )}
                    </div>
                  )}

                  {/* Feedback */}
                  <AnimatePresence>
                    {feedback && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-3"
                      >
                        <div className="rounded-2xl bg-white/80 border border-white/70 px-3 py-2.5 text-xs text-slate-600">
                          <p className="font-semibold uppercase tracking-widest text-slate-400 mb-1 text-[10px]">Your answer</p>
                          <p className="font-semibold">{childAnswer}</p>
                        </div>
                        <div className="rounded-2xl bg-buddy-mint/40 border border-buddy-mint px-4 py-3 text-sm font-semibold text-slate-700 leading-relaxed">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1">Buddy says</p>
                          {feedback}
                        </div>
                        <motion.button
                          type="button"
                          onClick={nextQuestion}
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.97 }}
                          className="w-full rounded-2xl bg-buddy-grape py-2.5 text-sm font-semibold text-white shadow-soft"
                        >
                          {currentQ + 1 >= questions.length ? "See results →" : "Next question →"}
                        </motion.button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Results */}
            <AnimatePresence>
              {phase === "complete" && (
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-3xl border border-buddy-grape/20 bg-white/90 p-5 shadow-card space-y-4"
                >
                  <div className="text-center space-y-1">
                    <div className="text-3xl">🎉</div>
                    <h2 className="font-display text-lg font-semibold text-buddy-cocoa">Well done!</h2>
                    <p className="text-xs text-slate-500">Here's your story review:</p>
                  </div>
                  <div className="space-y-3">
                    {results.map((r, i) => (
                      <div key={i} className="rounded-2xl border border-white/70 bg-white/80 p-3 space-y-1.5">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Q{i + 1}</p>
                        <p className="text-xs font-semibold text-slate-700">{r.question}</p>
                        <p className="text-[11px] text-slate-500"><span className="font-semibold">You said: </span>{r.answer}</p>
                        <p className="text-[11px] font-semibold text-buddy-grape leading-snug">{r.feedback}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Link to="/stories" className="rounded-full bg-buddy-grape px-4 py-2 text-xs font-semibold text-white shadow-soft">
                      Next story
                    </Link>
                    <Link to="/home" className="rounded-full border border-white/70 bg-white/80 px-4 py-2 text-xs font-semibold text-slate-600 shadow-soft">
                      Back home
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="rounded-2xl bg-red-50 px-4 py-3 text-xs font-semibold text-red-600"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
          </aside>
        </div>
      </div>
    </div>
  );
}

function MicIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 64 64" fill="none">
      <rect x="22" y="10" width="20" height="30" rx="10" fill="#FFFFFF" />
      <path d="M16 30c0 9 7 16 16 16s16-7 16-16" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round"/>
      <path d="M32 46v8" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round"/>
      <path d="M24 56h16" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round"/>
    </svg>
  );
}
