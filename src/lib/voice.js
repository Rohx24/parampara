import { chatCompletion, openaiSpeak } from "./openai.js";
import { evaluateTranscriptPhoneme, phonemeSimilarity, phoneticBreakdown } from "./phoneme.js";

const CLEAN_PUNCT = /[.,!?;:”’’””()\-]/g;

export const VOICE_LANGUAGES = [
  { id: "tamil", label: "Tamil", speechCode: "ta-IN" },
  { id: "telugu", label: "Telugu", speechCode: "te-IN" },
  { id: "hindi", label: "Hindi", speechCode: "hi-IN" },
  { id: "kannada", label: "Kannada", speechCode: "kn-IN" },
  { id: "english", label: "English", speechCode: "en-IN" },
];

const GUIDED_PROMPTS = [
  { id: "ta-5-1", language: "tamil", ageGroup: "5-7", nativeText: "வணக்கம் பாட்டி!", englishMeaning: "Hello grandma!", keywords: ["வணக்கம்", "பாட்டி"] },
  { id: "ta-5-2", language: "tamil", ageGroup: "5-7", nativeText: "எனக்கு பால் வேண்டும்.", englishMeaning: "I want milk.", keywords: ["எனக்கு", "பால்", "வேண்டும்"] },
  { id: "ta-5-3", language: "tamil", ageGroup: "5-7", nativeText: "என் பெயர் பட்டி.", englishMeaning: "My name is Buddy.", keywords: ["பெயர்"] },
  { id: "ta-5-4", language: "tamil", ageGroup: "5-7", nativeText: "எனக்கு சாப்பிட வேண்டும்.", englishMeaning: "I want to eat.", keywords: ["சாப்பிட", "வேண்டும்"] },
  { id: "ta-5-5", language: "tamil", ageGroup: "5-7", nativeText: "இது என் அம்மா.", englishMeaning: "This is my mother.", keywords: ["அம்மா"] },
  { id: "ta-5-6", language: "tamil", ageGroup: "5-7", nativeText: "நான் விளையாட போகிறேன்.", englishMeaning: "I am going to play.", keywords: ["விளையாட", "போகிறேன்"] },
  { id: "ta-8-1", language: "tamil", ageGroup: "8-11", nativeText: "நான் பள்ளிக்குச் செல்கிறேன்.", englishMeaning: "I am going to school.", keywords: ["நான்", "பள்ளிக்குச்", "செல்கிறேன்"] },
  { id: "ta-8-2", language: "tamil", ageGroup: "8-11", nativeText: "அப்பா எனக்கு கதை சொன்னார்.", englishMeaning: "Dad told me a story.", keywords: ["அப்பா", "கதை", "சொன்னார்"] },
  { id: "ta-8-3", language: "tamil", ageGroup: "8-11", nativeText: "எனக்கு மாம்பழம் மிகவும் பிடிக்கும்.", englishMeaning: "I like mangoes very much.", keywords: ["மாம்பழம்", "பிடிக்கும்"] },
  { id: "ta-8-4", language: "tamil", ageGroup: "8-11", nativeText: "இன்று வானிலை நன்றாக இருக்கிறது.", englishMeaning: "The weather is good today.", keywords: ["வானிலை", "நன்றாக"] },
  { id: "ta-8-5", language: "tamil", ageGroup: "8-11", nativeText: "அம்மா சமையல் செய்கிறார்.", englishMeaning: "Mom is cooking.", keywords: ["அம்மா", "சமையல்"] },
  { id: "ta-8-6", language: "tamil", ageGroup: "8-11", nativeText: "என் நண்பன் மிகவும் நல்லவன்.", englishMeaning: "My friend is very good.", keywords: ["நண்பன்", "நல்லவன்"] },
  { id: "ta-12-1", language: "tamil", ageGroup: "12-15", nativeText: "பண்டிகைக்கு நாங்கள் சிறப்பு உணவு செய்தோம்.", englishMeaning: "We cooked special food for the festival.", keywords: ["பண்டிகைக்கு", "சிறப்பு", "உணவு"] },
  { id: "ta-12-2", language: "tamil", ageGroup: "12-15", nativeText: "புத்தகம் படித்த பிறகு கேள்விகளுக்கு பதிலளித்தேன்.", englishMeaning: "After reading, I answered questions.", keywords: ["புத்தகம்", "கேள்விகளுக்கு", "பதிலளித்தேன்"] },
  { id: "ta-12-3", language: "tamil", ageGroup: "12-15", nativeText: "நாம் சுற்றுச்சூழலை பாதுகாக்க வேண்டும்.", englishMeaning: "We must protect the environment.", keywords: ["சுற்றுச்சூழலை", "பாதுகாக்க"] },
  { id: "ta-12-4", language: "tamil", ageGroup: "12-15", nativeText: "தேர்வுக்கு கடினமாக படிப்பது முக்கியம்.", englishMeaning: "Studying hard for exams is important.", keywords: ["தேர்வுக்கு", "படிப்பது", "முக்கியம்"] },
  { id: "ta-12-5", language: "tamil", ageGroup: "12-15", nativeText: "நான் தினமும் செய்தித்தாள் படிக்கிறேன்.", englishMeaning: "I read the newspaper every day.", keywords: ["தினமும்", "செய்தித்தாள்", "படிக்கிறேன்"] },
  { id: "ta-12-6", language: "tamil", ageGroup: "12-15", nativeText: "என் கனவு ஒரு மருத்துவர் ஆவது.", englishMeaning: "My dream is to become a doctor.", keywords: ["கனவு", "மருத்துவர்"] },

  { id: "te-5-1", language: "telugu", ageGroup: "5-7", nativeText: "నమస్కారం అమ్మమ్మ!", englishMeaning: "Hello grandma!", keywords: ["నమస్కారం", "అమ్మమ్మ"] },
  { id: "te-5-2", language: "telugu", ageGroup: "5-7", nativeText: "నాకు పాలు కావాలి.", englishMeaning: "I want milk.", keywords: ["నాకు", "పాలు", "కావాలి"] },
  { id: "te-5-3", language: "telugu", ageGroup: "5-7", nativeText: "నా పేరు బడ్డీ.", englishMeaning: "My name is Buddy.", keywords: ["పేరు"] },
  { id: "te-5-4", language: "telugu", ageGroup: "5-7", nativeText: "నాకు అన్నం కావాలి.", englishMeaning: "I want rice.", keywords: ["అన్నం", "కావాలి"] },
  { id: "te-5-5", language: "telugu", ageGroup: "5-7", nativeText: "ఇది మా అమ్మ.", englishMeaning: "This is my mother.", keywords: ["అమ్మ"] },
  { id: "te-5-6", language: "telugu", ageGroup: "5-7", nativeText: "నేను ఆడుకుంటాను.", englishMeaning: "I will play.", keywords: ["ఆడుకుంటాను"] },
  { id: "te-8-1", language: "telugu", ageGroup: "8-11", nativeText: "నేను పాఠశాలకు వెళ్తున్నాను.", englishMeaning: "I am going to school.", keywords: ["నేను", "పాఠశాలకు", "వెళ్తున్నాను"] },
  { id: "te-8-2", language: "telugu", ageGroup: "8-11", nativeText: "నాన్న నాకు కథ చదివారు.", englishMeaning: "Dad read me a story.", keywords: ["నాన్న", "కథ", "చదివారు"] },
  { id: "te-8-3", language: "telugu", ageGroup: "8-11", nativeText: "నాకు మామిడి పండు చాలా ఇష్టం.", englishMeaning: "I really like mangoes.", keywords: ["మామిడి", "ఇష్టం"] },
  { id: "te-8-4", language: "telugu", ageGroup: "8-11", nativeText: "ఈ రోజు వాతావరణం చాలా బాగుంది.", englishMeaning: "The weather is very nice today.", keywords: ["వాతావరణం", "బాగుంది"] },
  { id: "te-8-5", language: "telugu", ageGroup: "8-11", nativeText: "అమ్మ వంట చేస్తున్నారు.", englishMeaning: "Mom is cooking.", keywords: ["అమ్మ", "వంట"] },
  { id: "te-8-6", language: "telugu", ageGroup: "8-11", nativeText: "నా స్నేహితుడు చాలా మంచివాడు.", englishMeaning: "My friend is very good.", keywords: ["స్నేహితుడు", "మంచివాడు"] },
  { id: "te-12-1", language: "telugu", ageGroup: "12-15", nativeText: "పండుగ రోజు మా ఇంట్లో ప్రత్యేక వంటలు చేశాం.", englishMeaning: "We made special dishes for the festival.", keywords: ["పండుగ", "ప్రత్యేక", "వంటలు"] },
  { id: "te-12-2", language: "telugu", ageGroup: "12-15", nativeText: "పుస్తకం చదివిన తర్వాత ప్రశ్నలకు సమాధానం ఇచ్చాను.", englishMeaning: "After reading, I answered questions.", keywords: ["పుస్తకం", "ప్రశ్నలకు", "సమాధానం"] },
  { id: "te-12-3", language: "telugu", ageGroup: "12-15", nativeText: "పరీక్షల కోసం కష్టపడి చదవడం ముఖ్యం.", englishMeaning: "Studying hard for exams is important.", keywords: ["పరీక్షల", "చదవడం", "ముఖ్యం"] },
  { id: "te-12-4", language: "telugu", ageGroup: "12-15", nativeText: "మనం పర్యావరణాన్ని కాపాడాలి.", englishMeaning: "We must protect the environment.", keywords: ["పర్యావరణాన్ని", "కాపాడాలి"] },
  { id: "te-12-5", language: "telugu", ageGroup: "12-15", nativeText: "నేను ప్రతిరోజూ వార్తాపత్రిక చదువుతాను.", englishMeaning: "I read the newspaper every day.", keywords: ["ప్రతిరోజూ", "వార్తాపత్రిక"] },
  { id: "te-12-6", language: "telugu", ageGroup: "12-15", nativeText: "నా కల వైద్యుడు కావడం.", englishMeaning: "My dream is to become a doctor.", keywords: ["కల", "వైద్యుడు"] },

  { id: "hi-5-1", language: "hindi", ageGroup: "5-7", nativeText: "नमस्ते दादी!", englishMeaning: "Hello grandma!", keywords: ["नमस्ते", "दादी"] },
  { id: "hi-5-2", language: "hindi", ageGroup: "5-7", nativeText: "मुझे दूध चाहिए।", englishMeaning: "I want milk.", keywords: ["मुझे", "दूध", "चाहिए"] },
  { id: "hi-5-3", language: "hindi", ageGroup: "5-7", nativeText: "मेरा नाम बडी है।", englishMeaning: "My name is Buddy.", keywords: ["मेरा", "नाम"] },
  { id: "hi-5-4", language: "hindi", ageGroup: "5-7", nativeText: "मुझे खाना खाना है।", englishMeaning: "I want to eat food.", keywords: ["खाना", "खाना"] },
  { id: "hi-5-5", language: "hindi", ageGroup: "5-7", nativeText: "यह मेरी माँ है।", englishMeaning: "This is my mother.", keywords: ["माँ"] },
  { id: "hi-5-6", language: "hindi", ageGroup: "5-7", nativeText: "मैं खेलने जा रहा हूँ।", englishMeaning: "I am going to play.", keywords: ["खेलने"] },
  { id: "hi-8-1", language: "hindi", ageGroup: "8-11", nativeText: "मैं स्कूल जा रहा हूँ।", englishMeaning: "I am going to school.", keywords: ["मैं", "स्कूल", "जा"] },
  { id: "hi-8-2", language: "hindi", ageGroup: "8-11", nativeText: "पापा ने मुझे कहानी सुनाई।", englishMeaning: "Dad told me a story.", keywords: ["पापा", "कहानी", "सुनाई"] },
  { id: "hi-8-3", language: "hindi", ageGroup: "8-11", nativeText: "मुझे आम बहुत पसंद है।", englishMeaning: "I really like mangoes.", keywords: ["आम", "पसंद"] },
  { id: "hi-8-4", language: "hindi", ageGroup: "8-11", nativeText: "आज मौसम बहुत अच्छा है।", englishMeaning: "The weather is very nice today.", keywords: ["मौसम", "अच्छा"] },
  { id: "hi-8-5", language: "hindi", ageGroup: "8-11", nativeText: "माँ खाना बना रही हैं।", englishMeaning: "Mom is cooking food.", keywords: ["माँ", "खाना"] },
  { id: "hi-8-6", language: "hindi", ageGroup: "8-11", nativeText: "मेरा दोस्त बहुत मज़ेदार है।", englishMeaning: "My friend is very funny.", keywords: ["दोस्त", "मज़ेदार"] },
  { id: "hi-12-1", language: "hindi", ageGroup: "12-15", nativeText: "त्योहार पर हमने विशेष भोजन बनाया।", englishMeaning: "We cooked special food for the festival.", keywords: ["त्योहार", "विशेष", "भोजन"] },
  { id: "hi-12-2", language: "hindi", ageGroup: "12-15", nativeText: "किताब पढ़ने के बाद मैंने सवालों के जवाब दिए।", englishMeaning: "After reading, I answered questions.", keywords: ["किताब", "सवालों", "जवाब"] },
  { id: "hi-12-3", language: "hindi", ageGroup: "12-15", nativeText: "परीक्षा में मेहनत करना ज़रूरी है।", englishMeaning: "Working hard in exams is important.", keywords: ["परीक्षा", "मेहनत"] },
  { id: "hi-12-4", language: "hindi", ageGroup: "12-15", nativeText: "हमें पर्यावरण की रक्षा करनी चाहिए।", englishMeaning: "We should protect the environment.", keywords: ["पर्यावरण", "रक्षा"] },
  { id: "hi-12-5", language: "hindi", ageGroup: "12-15", nativeText: "मैं रोज़ अख़बार पढ़ता हूँ।", englishMeaning: "I read the newspaper every day.", keywords: ["अख़बार", "पढ़ता"] },
  { id: "hi-12-6", language: "hindi", ageGroup: "12-15", nativeText: "मेरा सपना डॉक्टर बनना है।", englishMeaning: "My dream is to become a doctor.", keywords: ["सपना", "डॉक्टर"] },

  { id: "kn-5-1", language: "kannada", ageGroup: "5-7", nativeText: "ನಮಸ್ಕಾರ ಅಜ್ಜಿ!", englishMeaning: "Hello grandma!", keywords: ["ನಮಸ್ಕಾರ", "ಅಜ್ಜಿ"] },
  { id: "kn-5-2", language: "kannada", ageGroup: "5-7", nativeText: "ನನಗೆ ಹಾಲು ಬೇಕು.", englishMeaning: "I want milk.", keywords: ["ನನಗೆ", "ಹಾಲು", "ಬೇಕು"] },
  { id: "kn-5-3", language: "kannada", ageGroup: "5-7", nativeText: "ನನ್ನ ಹೆಸರು ಬಡ್ಡಿ.", englishMeaning: "My name is Buddy.", keywords: ["ಹೆಸರು"] },
  { id: "kn-5-4", language: "kannada", ageGroup: "5-7", nativeText: "ನನಗೆ ಊಟ ಬೇಕು.", englishMeaning: "I want food.", keywords: ["ಊಟ", "ಬೇಕು"] },
  { id: "kn-5-5", language: "kannada", ageGroup: "5-7", nativeText: "ಇವರು ನನ್ನ ಅಮ್ಮ.", englishMeaning: "This is my mother.", keywords: ["ಅಮ್ಮ"] },
  { id: "kn-5-6", language: "kannada", ageGroup: "5-7", nativeText: "ನಾನು ಆಟ ಆಡುತ್ತೇನೆ.", englishMeaning: "I will play.", keywords: ["ಆಟ", "ಆಡುತ್ತೇನೆ"] },
  { id: "kn-8-1", language: "kannada", ageGroup: "8-11", nativeText: "ನಾನು ಶಾಲೆಗೆ ಹೋಗುತ್ತಿದ್ದೇನೆ.", englishMeaning: "I am going to school.", keywords: ["ನಾನು", "ಶಾಲೆಗೆ", "ಹೋಗುತ್ತಿದ್ದೇನೆ"] },
  { id: "kn-8-2", language: "kannada", ageGroup: "8-11", nativeText: "ಅಪ್ಪ ನನಗೆ ಕಥೆ ಹೇಳಿದನು.", englishMeaning: "Dad told me a story.", keywords: ["ಅಪ್ಪ", "ಕಥೆ", "ಹೇಳಿದನು"] },
  { id: "kn-8-3", language: "kannada", ageGroup: "8-11", nativeText: "ನನಗೆ ಮಾವಿನ ಹಣ್ಣು ತುಂಬಾ ಇಷ್ಟ.", englishMeaning: "I really like mangoes.", keywords: ["ಮಾವಿನ", "ಇಷ್ಟ"] },
  { id: "kn-8-4", language: "kannada", ageGroup: "8-11", nativeText: "ಇಂದು ಹವಾಮಾನ ತುಂಬಾ ಚೆನ್ನಾಗಿದೆ.", englishMeaning: "The weather is very nice today.", keywords: ["ಹವಾಮಾನ", "ಚೆನ್ನಾಗಿದೆ"] },
  { id: "kn-8-5", language: "kannada", ageGroup: "8-11", nativeText: "ಅಮ್ಮ ಅಡುಗೆ ಮಾಡುತ್ತಿದ್ದಾರೆ.", englishMeaning: "Mom is cooking.", keywords: ["ಅಮ್ಮ", "ಅಡುಗೆ"] },
  { id: "kn-8-6", language: "kannada", ageGroup: "8-11", nativeText: "ನನ್ನ ಗೆಳೆಯ ತುಂಬಾ ಒಳ್ಳೆಯವನು.", englishMeaning: "My friend is very good.", keywords: ["ಗೆಳೆಯ", "ಒಳ್ಳೆಯವನು"] },
  { id: "kn-12-1", language: "kannada", ageGroup: "12-15", nativeText: "ಹಬ್ಬದ ದಿನ ನಾವು ವಿಶೇಷ ಊಟ ಮಾಡಿದ್ದೇವೆ.", englishMeaning: "We made special food for the festival.", keywords: ["ಹಬ್ಬದ", "ವಿಶೇಷ", "ಊಟ"] },
  { id: "kn-12-2", language: "kannada", ageGroup: "12-15", nativeText: "ಪುಸ್ತಕ ಓದಿದ ನಂತರ ಪ್ರಶ್ನೆಗಳಿಗೆ ಉತ್ತರ ನೀಡಿದೆ.", englishMeaning: "After reading, I answered questions.", keywords: ["ಪುಸ್ತಕ", "ಪ್ರಶ್ನೆಗಳಿಗೆ", "ಉತ್ತರ"] },
  { id: "kn-12-3", language: "kannada", ageGroup: "12-15", nativeText: "ಪರೀಕ್ಷೆಗೆ ಕಷ್ಟಪಟ್ಟು ಓದುವುದು ಮುಖ್ಯ.", englishMeaning: "Studying hard for exams is important.", keywords: ["ಪರೀಕ್ಷೆಗೆ", "ಓದುವುದು", "ಮುಖ್ಯ"] },
  { id: "kn-12-4", language: "kannada", ageGroup: "12-15", nativeText: "ನಾವು ಪರಿಸರವನ್ನು ರಕ್ಷಿಸಬೇಕು.", englishMeaning: "We must protect the environment.", keywords: ["ಪರಿಸರವನ್ನು", "ರಕ್ಷಿಸಬೇಕು"] },
  { id: "kn-12-5", language: "kannada", ageGroup: "12-15", nativeText: "ನಾನು ಪ್ರತಿದಿನ ಪತ್ರಿಕೆ ಓದುತ್ತೇನೆ.", englishMeaning: "I read the newspaper every day.", keywords: ["ಪ್ರತಿದಿನ", "ಪತ್ರಿಕೆ"] },
  { id: "kn-12-6", language: "kannada", ageGroup: "12-15", nativeText: "ನನ್ನ ಕನಸು ವೈದ್ಯನಾಗುವುದು.", englishMeaning: "My dream is to become a doctor.", keywords: ["ಕನಸು", "ವೈದ್ಯನಾಗುವುದು"] },

  { id: "en-5-1", language: "english", ageGroup: "5-7", nativeText: "Hello! My name is Buddy.", englishMeaning: "", keywords: ["hello", "buddy"] },
  { id: "en-8-1", language: "english", ageGroup: "8-11", nativeText: "I like to read stories with my family.", englishMeaning: "", keywords: ["read", "stories", "family"] },
  { id: "en-5-2", language: "english", ageGroup: "5-7", nativeText: "I want some milk.", englishMeaning: "", keywords: ["want", "milk"] },
  { id: "en-5-3", language: "english", ageGroup: "5-7", nativeText: "This is my mother.", englishMeaning: "", keywords: ["mother"] },
  { id: "en-5-4", language: "english", ageGroup: "5-7", nativeText: "I like to play.", englishMeaning: "", keywords: ["like", "play"] },
  { id: "en-5-5", language: "english", ageGroup: "5-7", nativeText: "The sun is very hot.", englishMeaning: "", keywords: ["sun", "hot"] },
  { id: "en-5-6", language: "english", ageGroup: "5-7", nativeText: "I can see a big dog.", englishMeaning: "", keywords: ["see", "big", "dog"] },
  { id: "en-8-2", language: "english", ageGroup: "8-11", nativeText: "I am going to school today.", englishMeaning: "", keywords: ["going", "school"] },
  { id: "en-8-3", language: "english", ageGroup: "8-11", nativeText: "My dad told me a story.", englishMeaning: "", keywords: ["dad", "told", "story"] },
  { id: "en-8-4", language: "english", ageGroup: "8-11", nativeText: "I really like sweet mangoes.", englishMeaning: "", keywords: ["like", "mangoes"] },
  { id: "en-8-5", language: "english", ageGroup: "8-11", nativeText: "The weather is very nice today.", englishMeaning: "", keywords: ["weather", "nice"] },
  { id: "en-8-6", language: "english", ageGroup: "8-11", nativeText: "My friend makes me laugh.", englishMeaning: "", keywords: ["friend", "laugh"] },
  { id: "en-12-1", language: "english", ageGroup: "12-15", nativeText: "I can tell a short story about my day.", englishMeaning: "", keywords: ["short", "story", "day"] },
  { id: "en-12-2", language: "english", ageGroup: "12-15", nativeText: "We cooked special food for the festival.", englishMeaning: "", keywords: ["cooked", "special", "festival"] },
  { id: "en-12-3", language: "english", ageGroup: "12-15", nativeText: "After reading, I answered the questions.", englishMeaning: "", keywords: ["reading", "answered", "questions"] },
  { id: "en-12-4", language: "english", ageGroup: "12-15", nativeText: "We should protect the environment.", englishMeaning: "", keywords: ["protect", "environment"] },
  { id: "en-12-5", language: "english", ageGroup: "12-15", nativeText: "Working hard for exams is important.", englishMeaning: "", keywords: ["working", "exams", "important"] },
  { id: "en-12-6", language: "english", ageGroup: "12-15", nativeText: "My dream is to become a doctor.", englishMeaning: "", keywords: ["dream", "doctor"] },
];

const FREE_TALK_QUESTIONS = {
  tamil: ["இன்று நீ என்ன செய்தாய்?", "உனக்கு பிடித்த உணவு என்ன?", "உன் நண்பர்கள் பற்றி சொல்.", "உனக்கு பிடித்த விளையாட்டு எது?", "உன் குடும்பம் பற்றி சொல்."],
  telugu: ["ఈ రోజు నువ్వు ఏం చేశావు?", "నీకు ఇష్టమైన ఆహారం ఏమిటి?", "నీ స్నేహితుల గురించి చెప్పు.", "నీకు ఇష్టమైన ఆట ఏది?", "నీ కుటుంబం గురించి చెప్పు."],
  hindi: ["आज तुमने क्या किया?", "तुम्हारा पसंदीदा खाना क्या है?", "अपने दोस्तों के बारे में बताओ।", "तुम्हारा पसंदीदा खेल कौन सा है?", "अपने परिवार के बारे में बताओ।"],
  kannada: ["ಇಂದು ನೀನು ಏನು ಮಾಡಿದೆ?", "ನಿನಗೆ ಇಷ್ಟವಾದ ಊಟ ಯಾವುದು?", "ನಿನ್ನ ಗೆಳೆಯರ ಬಗ್ಗೆ ಹೇಳು.", "ನಿನಗೆ ಇಷ್ಟವಾದ ಆಟ ಯಾವುದು?", "ನಿನ್ನ ಕುಟುಂಬದ ಬಗ್ಗೆ ಹೇಳು."],
  english: ["What did you do today?", "What is your favourite food?", "Tell me about your friends.", "Which game do you like best?", "Tell me about your family."],
};

const SCRIPT_RANGES = {
  tamil: /[\u0B80-\u0BFF]/,
  telugu: /[\u0C00-\u0C7F]/,
  hindi: /[\u0900-\u097F]/,
  kannada: /[\u0C80-\u0CFF]/,
  english: /[a-z]/i,
};

export function normalizeText(text) {
  return text
    ? text
        .trim()
        .toLowerCase()
        .replace(CLEAN_PUNCT, " ")
        .replace(/\s+/g, " ")
        .normalize("NFKC")
    : "";
}

export function tokenize(text) {
  return normalizeText(text).split(" ").filter(Boolean);
}

/**
 * Character-level Levenshtein distance (kept for English fallback / legacy use).
 * For Indian languages, prefer phonemeEditDistance from phoneme.js.
 */
export function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i += 1) dp[i][0] = i;
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

/**
 * Character-level similarity (0–1). Used as English fallback.
 * For Indian languages use phonemeSimilarity() from phoneme.js instead.
 */
export function similarityScore(a, b) {
  const aNorm = normalizeText(a);
  const bNorm = normalizeText(b);
  if (!aNorm && !bNorm) return 1;
  const distance = levenshtein(aNorm, bNorm);
  const maxLen = Math.max(aNorm.length, bNorm.length) || 1;
  return 1 - distance / maxLen;
}

/**
 * Evaluate a transcript against the expected sentence.
 *
 * For Indian languages (hindi, tamil, telugu, kannada):
 *   Uses phoneme-level edit distance — linguistically superior because it
 *   recognises aspirated/unaspirated near-misses (क/ख), retroflex/dental
 *   confusions (ट/त), and long/short vowel substitutions (a/aa, i/ii).
 *
 * For English:
 *   Falls back to character-level Levenshtein (phoneme tables not needed).
 *
 * @param {string}   expectedRaw
 * @param {string}   userRaw
 * @param {string[]} keywords
 * @param {string}   language
 * @returns {{ score, similarity, missingKeywords, extraWords, phonemeBased }}
 */
export function evaluateTranscript(expectedRaw, userRaw, keywords = [], language) {
  if (!VOICE_LANGUAGES.some((l) => l.id === language)) {
    throw new Error(`evaluateTranscript needs a known language, got: ${language}`);
  }

  // For Indian languages, delegate to the phoneme-aware evaluator
  if (language !== "english") {
    const result = evaluateTranscriptPhoneme(expectedRaw, userRaw, keywords, language);
    return { ...result, extraWords: [] };
  }

  // English path: character-level (original behaviour)
  const expectedTokens = tokenize(expectedRaw);
  const userTokens     = tokenize(userRaw);
  const expectedSet    = new Set(expectedTokens);
  const missingKeywords = keywords.filter((k) => !userTokens.includes(normalizeText(k)));
  const extraWords      = userTokens.filter((token) => !expectedSet.has(token));
  const keywordCoverage = keywords.length === 0 ? 1 : (keywords.length - missingKeywords.length) / keywords.length;
  const similarity      = similarityScore(expectedRaw, userRaw);
  const score           = Math.round(100 * (0.7 * keywordCoverage + 0.3 * similarity));
  return { score, similarity, missingKeywords, extraWords, phonemeBased: false };
}

/**
 * Return a phonetic breakdown string for a word (for UI tooltips).
 * Delegates to phoneme.js phoneticBreakdown.
 */
export { phonemeSimilarity, phoneticBreakdown };

export function getAgeGroup(age) {
  if (!age || Number.isNaN(age)) return "8-11";
  if (age <= 7) return "5-7";
  if (age <= 11) return "8-11";
  return "12-15";
}

export function getGuidedPrompts(language, ageGroup) {
  const prompts = GUIDED_PROMPTS.filter(
    (item) => item.language === language && item.ageGroup === ageGroup
  );
  if (prompts.length) return prompts;
  return GUIDED_PROMPTS.filter((item) => item.language === "english" && item.ageGroup === ageGroup);
}

export function getSimplifiedPrompt(prompt) {
  if (!prompt?.nativeText) return prompt;
  const parts = prompt.nativeText.split(" ");
  const shortText = parts.slice(0, Math.max(2, Math.floor(parts.length / 2))).join(" ");
  if (shortText === prompt.nativeText) return prompt;
  const keywords = (prompt.keywords || []).filter((k) => shortText.toLowerCase().includes(k.toLowerCase()));
  return {
    ...prompt,
    id: `${prompt.id}-short`,
    nativeText: shortText,
    englishMeaning: "",
    keywords: keywords.length ? keywords : [parts[0]],
  };
}

/** True when most letters in the text belong to the language's script. */
export function isInLanguage(text, language) {
  const letters = [...(text || "")].filter((ch) => /\p{L}|\p{M}/u.test(ch));
  if (!letters.length) return false;
  const matching = letters.filter((ch) => SCRIPT_RANGES[language]?.test(ch)).length;
  return matching / letters.length >= 0.5;
}

/**
 * Coach notes for a guided sentence. Scoring only sees the words speech
 * recognition returned, so notes describe those words and never claim to
 * judge how the child sounded.
 */
export function buildGuidedNotes({ prompt, evaluation, transcript, language, startedAfterMs }) {
  const keywords = prompt?.keywords || [];
  const missing = evaluation.missingKeywords || [];
  const found = keywords.filter((k) => !missing.includes(k));
  const label = VOICE_LANGUAGES.find((l) => l.id === language)?.label ?? language;
  const chips = [
    { label: "Key words", value: `${found.length}/${keywords.length}` },
    { label: "Sentence match", value: `${Math.round(evaluation.similarity * 100)}%` },
  ];
  if (startedAfterMs > 0) {
    chips.push({ label: "Started after", value: `${(startedAfterMs / 1000).toFixed(1)}s` });
  }

  if (!isInLanguage(transcript, language)) {
    return {
      heard: transcript,
      positives: [],
      improvement: `Buddy did not hear ${label} words. Check the mic language, then try the sentence again.`,
      chips,
    };
  }

  const positives = found.length ? [`You said ${found.length} of ${keywords.length} key words: ${found.join(", ")}`] : [];
  let improvement = "All the words matched. Now try saying it without looking.";
  if (missing.length) {
    improvement = `Buddy did not hear: ${missing.slice(0, 2).join(", ")}. Press "Hear it", then say the sentence again.`;
  } else if (evaluation.similarity < 0.8) {
    improvement = "You got the key words. Now try saying the whole sentence.";
  }
  return { heard: transcript, positives, improvement, chips };
}

/** Coach notes for free talk, which has no target sentence and so no score. */
export function buildFreeTalkNotes({ transcript, language }) {
  const count = tokenize(transcript).length;
  const label = VOICE_LANGUAGES.find((l) => l.id === language)?.label ?? language;
  const inLanguage = isInLanguage(transcript, language);
  let improvement = "Try adding why or when it happened.";
  if (!inLanguage) improvement = `Buddy did not hear ${label} words. Try answering in ${label}.`;
  else if (count < 4) improvement = "Try saying a full sentence next time.";
  return {
    heard: transcript,
    positives: inLanguage ? [`You said ${count} ${label} word${count === 1 ? "" : "s"}.`] : [],
    improvement,
    chips: [{ label: "Words", value: String(count) }],
  };
}

/** A question in the child's language that Buddy has not asked yet. */
export function pickFollowUpQuestion(language, alreadySaid = []) {
  const questions = FREE_TALK_QUESTIONS[language] || FREE_TALK_QUESTIONS.english;
  const fresh = questions.filter((q) => !alreadySaid.includes(q));
  const pool = fresh.length ? fresh : questions;
  return pool[Math.floor(Math.random() * pool.length)];
}

function buddySystemPrompt({ language, ageGroup, nickname }) {
  const label = VOICE_LANGUAGES.find((l) => l.id === language)?.label ?? language;
  return `You are Buddy, a friendly speaking partner for ${nickname || "a child"}, aged ${ageGroup}, who is learning ${label}.
Reply only in ${label}${language === "english" ? "" : " script"}, in 1-2 short, simple sentences.
First respond to what the child actually said, then ask one new question about it.
Never repeat a question from this conversation.
You only receive text from speech recognition, so never comment on pronunciation.
If the text is unclear, gently ask the child to say it again. Keep everything child-safe.`;
}

/** Buddy's reply in free talk. Falls back to a stored question if the AI is unavailable. */
export async function getBuddyReply({ language, ageGroup, nickname, history, text }) {
  const alreadySaid = history.filter((m) => m.role === "assistant").map((m) => m.text);
  try {
    const reply = (await chatCompletion(
      [
        { role: "system", content: buddySystemPrompt({ language, ageGroup, nickname }) },
        ...history.slice(-6).map((m) => ({ role: m.role, content: m.text })),
        { role: "user", content: text },
      ],
      { max_tokens: 120, temperature: 0.8 }
    )).trim();
    if (reply && !alreadySaid.includes(reply)) return reply;
  } catch {
    // Handled by the fallback below
  }
  return pickFollowUpQuestion(language, alreadySaid);
}

export function decideNextStep(context) {
  const { mode, score, hesitationMs, attempts } = context;

  if (mode === "free") {
    return { action: "PRAISE", message: "Nice sharing! Want to try another thought?", nextPrompt: null };
  }

  // After 2 attempts on the same prompt, always move on — never keep a child stuck
  if (attempts >= 2) {
    return { action: "ADVANCE", message: "Well tried! Let’s move to the next one. 🚀", nextPrompt: "next" };
  }

  // Good enough score on any attempt → advance
  if (score >= 60) {
    return { action: "ADVANCE", message: "Great job! Let’s try the next one. 🌟", nextPrompt: "next" };
  }

  // First try, decent score → one more chance
  if (attempts === 0 && score >= 35) {
    return { action: "RETRY_SAME", message: "So close! Give it one more go.", nextPrompt: null };
  }

  // Took too long to start speaking → English tip
  if (hesitationMs > 5000) {
    return { action: "SWITCH_TO_ENGLISH_HELP", message: "Let’s try with a quick English hint.", nextPrompt: null };
  }

  // First attempt, low score → simplify
  if (attempts === 0) {
    return { action: "SIMPLIFY", message: "Let’s try a shorter version first.", nextPrompt: "simplify" };
  }

  // Second attempt still low → advance anyway
  return { action: "ADVANCE", message: "Great effort! Moving to the next one. 🚀", nextPrompt: "next" };
}

export function pickVoice(langCode) {
  return pickBestVoice(langCode);
}

function pickBestVoice(langCode) {
  if (!window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  // Prefer Google or Microsoft neural voices for the language
  const googleExact = voices.find((v) => /google/i.test(v.name) && v.lang === langCode);
  if (googleExact) return googleExact;
  const msExact = voices.find((v) => /microsoft/i.test(v.name) && v.lang === langCode);
  if (msExact) return msExact;
  const exact = voices.find((v) => v.lang === langCode);
  if (exact) return exact;
  const prefix = langCode.split("-")[0];
  const googlePrefix = voices.find((v) => /google/i.test(v.name) && v.lang.startsWith(prefix));
  if (googlePrefix) return googlePrefix;
  return voices.find((v) => v.lang.startsWith(prefix)) ?? null;
}

export function speakText(text, langCode, style = "gentle") {
  if (!text || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = langCode;
  utter.rate = style === "funny" ? 1.1 : style === "adventurous" ? 1.05 : 0.92;
  utter.pitch = style === "funny" ? 1.2 : style === "adventurous" ? 1.05 : 1;
  const doSpeak = () => {
    const voice = pickBestVoice(langCode);
    if (voice) utter.voice = voice;
    window.speechSynthesis.speak(utter);
  };
  if (window.speechSynthesis.getVoices().length > 0) {
    doSpeak();
  } else {
    window.speechSynthesis.onvoiceschanged = doSpeak;
  }
}

function _browserSpeak(text, langCode, style) {
  if (!window.speechSynthesis) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = langCode;
  utter.rate = style === "funny" ? 1.1 : style === "adventurous" ? 1.05 : 0.92;
  utter.pitch = style === "funny" ? 1.2 : style === "adventurous" ? 1.05 : 1;
  const voice = pickBestVoice(langCode);
  if (voice) utter.voice = voice;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

export function getSpeechRecognition() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function normalizeLanguageId(label) {
  const lower = String(label || "").toLowerCase();
  if (lower.includes("tamil")) return "tamil";
  if (lower.includes("telugu")) return "telugu";
  if (lower.includes("hindi")) return "hindi";
  if (lower.includes("kannada")) return "kannada";
  if (lower.includes("english")) return "english";
  return "tamil";
}
