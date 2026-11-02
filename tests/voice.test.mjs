import assert from "node:assert/strict";
import { test } from "node:test";
import { phonemeEditDistance, phonemeSimilarity, wordToPhonemes } from "../src/lib/phoneme.js";
import {
  VOICE_LANGUAGES,
  buildFreeTalkNotes,
  buildGuidedNotes,
  checkVoiceFor,
  decideNextStep,
  evaluateTranscript,
  getBuddyReply,
  getGuidedPrompts,
  getSimplifiedPrompt,
  hasVoiceFor,
  isInLanguage,
  normalizeLanguageId,
  pickFollowUpQuestion,
  tokenize,
} from "../src/lib/voice.js";

const LANGUAGES = VOICE_LANGUAGES.map((l) => l.id);
const AGE_GROUPS = ["5-7", "8-11", "12-15"];
const UNRELATED = {
  tamil: "பறவை வானத்தில் பறக்கிறது",
  telugu: "పక్షి ఆకాశంలో ఎగురుతుంది",
  hindi: "चिड़िया आसमान में उड़ती है",
  kannada: "ಹಕ್ಕಿ ಆಕಾಶದಲ್ಲಿ ಹಾರುತ್ತದೆ",
  malayalam: "പക്ഷി ആകാശത്തിൽ പറക്കുന്നു",
  english: "bananas are purple",
};

test("every language and age group has at least six different sentences", () => {
  for (const language of LANGUAGES) {
    for (const ageGroup of AGE_GROUPS) {
      const prompts = getGuidedPrompts(language, ageGroup);
      assert.ok(prompts.length >= 6, `${language} ${ageGroup}: ${prompts.length}`);
      assert.equal(new Set(prompts.map((p) => p.nativeText)).size, prompts.length);
      assert.ok(prompts.every((p) => p.language === language));
    }
  }
});

test("every keyword appears in its own sentence and script", () => {
  for (const language of LANGUAGES) {
    for (const ageGroup of AGE_GROUPS) {
      for (const prompt of getGuidedPrompts(language, ageGroup)) {
        assert.ok(isInLanguage(prompt.nativeText, language), prompt.id);
        for (const keyword of prompt.keywords) {
          assert.ok(prompt.nativeText.toLowerCase().includes(keyword.toLowerCase()), `${prompt.id}: ${keyword}`);
        }
      }
    }
  }
});

for (const language of LANGUAGES) {
  test(`${language}: saying the sentence matches and unrelated speech does not`, () => {
    for (const ageGroup of AGE_GROUPS) {
      for (const prompt of getGuidedPrompts(language, ageGroup)) {
        const right = evaluateTranscript(prompt.nativeText, prompt.nativeText, prompt.keywords, language);
        assert.equal(right.score, 100, prompt.id);
        assert.deepEqual(right.missingKeywords, []);

        const wrong = evaluateTranscript(prompt.nativeText, UNRELATED[language], prompt.keywords, language);
        assert.ok(wrong.score < 60, `${prompt.id} scored ${wrong.score}`);
        assert.ok(wrong.missingKeywords.length > 0, prompt.id);
      }
    }
  });
}

test("the sentence always moves on after speaking, in every language", () => {
  for (const language of LANGUAGES) {
    const prompts = getGuidedPrompts(language, "8-11");
    const shown = new Set();
    let index = 0;
    for (let turn = 0; turn < prompts.length; turn += 1) {
      const prompt = prompts[index % prompts.length];
      shown.add(prompt.id);
      const { score } = evaluateTranscript(prompt.nativeText, prompt.nativeText, prompt.keywords, language);
      if (decideNextStep({ mode: "guided", score, attempts: 0 }).action === "ADVANCE") index += 1;
    }
    assert.equal(shown.size, prompts.length, language);
  }
});

test("a similar short word does not count as the key word", () => {
  const [, , , , prompt] = getGuidedPrompts("hindi", "5-7");
  assert.equal(prompt.keywords[0], "माँ");
  assert.equal(evaluateTranscript(prompt.nativeText, "घर में", prompt.keywords, "hindi").missingKeywords.length, 1);
  assert.deepEqual(evaluateTranscript(prompt.nativeText, "मेरी माँ", prompt.keywords, "hindi").missingKeywords, []);
});

test("scoring refuses to guess the language", () => {
  assert.throws(() => evaluateTranscript("a", "a", []));
});

test("speech in the wrong script never scores as a match", () => {
  const [prompt] = getGuidedPrompts("tamil", "8-11");
  const result = evaluateTranscript(prompt.nativeText, "I am going to school", prompt.keywords, "tamil");
  assert.equal(result.score, 0);
});

test("English key words ignore capital letters", () => {
  const result = evaluateTranscript("Hello! My name is Buddy.", "Hello my name is Buddy", ["hello", "buddy"], "english");
  assert.deepEqual(result.missingKeywords, []);
});

test("phonemes are single sounds, so near-misses score as near-misses", () => {
  assert.deepEqual(wordToPhonemes("दादी", "hindi"), ["d", "aa", "d", "ii"]);
  assert.deepEqual(wordToPhonemes("नमस्ते", "hindi"), ["n", "a", "m", "a", "s", "t", "e"]);
  assert.deepEqual(wordToPhonemes("మజ", "telugu"), ["m", "a", "j", "a"]);
  assert.deepEqual(wordToPhonemes("మం", "telugu"), ["m", "a", "n"]);
  assert.deepEqual(wordToPhonemes("मज़ा", "hindi"), ["m", "a", "j", "aa"]);
  assert.ok(phonemeSimilarity("दादी", "डाडी", "hindi") > 0.7);
});

test("a shorter sentence only requires words it still contains", () => {
  const prompt = getGuidedPrompts("telugu", "12-15")[0];
  const short = getSimplifiedPrompt(prompt);
  assert.notEqual(short.id, prompt.id);
  assert.ok(short.nativeText.length < prompt.nativeText.length);
  for (const keyword of short.keywords) assert.ok(short.nativeText.includes(keyword));
  assert.ok(short.keywords.length > 0);
});

test("notes report only what was heard, not how it sounded", () => {
  const prompt = getGuidedPrompts("kannada", "8-11")[0];
  const said = prompt.keywords[0];
  const evaluation = evaluateTranscript(prompt.nativeText, said, prompt.keywords, "kannada");
  const notes = buildGuidedNotes({ prompt, evaluation, transcript: said, language: "kannada", startedAfterMs: 1500 });
  assert.equal(notes.heard, said);
  assert.match(notes.positives[0], /1 of 3 key words/);
  assert.match(notes.improvement, /did not hear/);
  assert.deepEqual(notes.chips.map((c) => c.label), ["Key words", "Sentence match", "Started after"]);
  assert.doesNotMatch(JSON.stringify(notes), /pronunciation|confident|fluency/i);
});

test("nothing is praised when no key word was heard", () => {
  const prompt = getGuidedPrompts("tamil", "8-11")[0];
  const evaluation = evaluateTranscript(prompt.nativeText, UNRELATED.tamil, prompt.keywords, "tamil");
  const notes = buildGuidedNotes({ prompt, evaluation, transcript: UNRELATED.tamil, language: "tamil" });
  assert.deepEqual(notes.positives, []);
});

test("notes say so when the speech was in another language", () => {
  const prompt = getGuidedPrompts("tamil", "8-11")[0];
  const evaluation = evaluateTranscript(prompt.nativeText, "hello there", prompt.keywords, "tamil");
  const notes = buildGuidedNotes({ prompt, evaluation, transcript: "hello there", language: "tamil" });
  assert.match(notes.improvement, /did not hear Tamil words/);
});

test("free talk notes have no made-up score", () => {
  const notes = buildFreeTalkNotes({ transcript: UNRELATED.telugu, language: "telugu" });
  assert.deepEqual(notes.chips, [{ label: "Words", value: "3" }]);
  assert.equal("score" in notes, false);
});

test("follow-up questions are in the child's language and do not repeat", () => {
  for (const language of LANGUAGES) {
    const asked = [];
    for (let i = 0; i < 5; i += 1) {
      const question = pickFollowUpQuestion(language, asked);
      assert.ok(isInLanguage(question, language), question);
      assert.ok(!asked.includes(question));
      asked.push(question);
    }
  }
});

test("Buddy falls back to a new question when the AI is unavailable or repeats", async () => {
  const realFetch = globalThis.fetch;
  const history = [{ role: "assistant", text: "same line" }];
  try {
    globalThis.fetch = async () => new Response("{}", { status: 503 });
    const offline = await getBuddyReply({ language: "tamil", ageGroup: "8-11", history, text: "x" });
    assert.ok(isInLanguage(offline, "tamil"));

    globalThis.fetch = async () =>
      Response.json({ choices: [{ message: { content: "same line" } }] });
    const repeated = await getBuddyReply({ language: "tamil", ageGroup: "8-11", history, text: "x" });
    assert.notEqual(repeated, "same line");

    globalThis.fetch = async () =>
      Response.json({ choices: [{ message: { content: "நல்லது! உனக்கு என்ன பிடிக்கும்?" } }] });
    const fresh = await getBuddyReply({ language: "tamil", ageGroup: "8-11", history, text: "x" });
    assert.equal(fresh, "நல்லது! உனக்கு என்ன பிடிக்கும்?");
  } finally {
    globalThis.fetch = realFetch;
  }
});

const ml = (word) => wordToPhonemes(word, "malayalam");
const ZWJ = "\u200D";
const ZWNJ = "\u200C";

test("Malayalam: every prompt has the same fields as the other languages", () => {
  const fields = Object.keys(getGuidedPrompts("tamil", "5-7")[0]);
  for (const ageGroup of AGE_GROUPS) {
    getGuidedPrompts("malayalam", ageGroup).forEach((prompt, index) => {
      assert.deepEqual(Object.keys(prompt), fields);
      assert.equal(prompt.id, `ml-${ageGroup.split("-")[0]}-${index + 1}`);
      assert.ok(prompt.englishMeaning, prompt.id);
      assert.ok(prompt.keywords.length > 0, prompt.id);
    });
  }
  assert.equal(VOICE_LANGUAGES.find((l) => l.id === "malayalam").speechCode, "ml-IN");
});

test("Malayalam sentences use atomic chillus and no joiners", () => {
  for (const ageGroup of AGE_GROUPS) {
    for (const prompt of getGuidedPrompts("malayalam", ageGroup)) {
      assert.doesNotMatch(prompt.nativeText + prompt.keywords.join(""), /[\u200C\u200D]/, prompt.id);
    }
  }
});

test("Malayalam: chillus have no inherent vowel, in either encoding", () => {
  const chillus = [
    ["ൺ", "ണ്", "N"],
    ["ൻ", "ന്", "n"],
    ["ർ", "ര്", "r"],
    ["ൽ", "ല്", "l"],
    ["ൾ", "ള്", "ll"],
    ["ൿ", "ക്", "k"],
  ];
  for (const [atomic, old, sound] of chillus) {
    assert.deepEqual(ml(`ക${atomic}`), ["k", "a", sound], atomic);
    assert.deepEqual(ml(`ക${old}${ZWJ}`), ["k", "a", sound], old);
  }
  assert.deepEqual(ml(`ഞാന്${ZWJ}`), ml("ഞാൻ"));
  assert.deepEqual(ml(`എന്${ZWJ}റെ`), ml("എന്റെ"));
  assert.deepEqual(ml("എൻറെ"), ml("എന്റെ"));
});

test("Malayalam: an old chillu is not read as a final virama", () => {
  assert.deepEqual(ml("അവൻ"), ["a", "v", "a", "n"]); // he
  assert.deepEqual(ml("അവന്"), ["a", "v", "a", "n", "u"]); // to him
  assert.deepEqual(ml(`അവന്${ZWJ}`), ml("അവൻ"));
});

test("Malayalam: joiners do not change the sounds", () => {
  assert.deepEqual(ml(`സ്${ZWNJ}നേഹം`), ml("സ്നേഹം"));
  assert.deepEqual(ml(`സ്${ZWJ}നേഹം`), ml("സ്നേഹം"));
  const prompt = getGuidedPrompts("malayalam", "8-11")[0];
  const said = prompt.nativeText.replaceAll("ൻ", `ന്${ZWJ}`).replaceAll("ൽ", `ല്${ZWJ}`);
  assert.notEqual(said, prompt.nativeText);
  assert.equal(evaluateTranscript(prompt.nativeText, said, prompt.keywords, "malayalam").score, 100);
});

test("Malayalam: two-part vowel signs read the same as the single sign", () => {
  assert.deepEqual(ml("കെ\u0D3Eടി"), ml("കൊടി"));
  assert.deepEqual(ml("കേ\u0D3Eടി"), ml("കോടി"));
  assert.deepEqual(ml("കൗതുകം"), ml("കൌതുകം"));
});

test("Malayalam: anusvara is m and keeps the vowel before it", () => {
  assert.deepEqual(ml("മലയാളം"), ["m", "a", "l", "a", "y", "aa", "ll", "a", "m"]);
  assert.deepEqual(ml("അം"), ["a", "m"]);
  assert.deepEqual(ml("കിം"), ["k", "i", "m"]);
  assert.deepEqual(wordToPhonemes("మం", "telugu"), ["m", "a", "n"]);
});

test("Malayalam: visarga is its own sound", () => {
  assert.deepEqual(ml("നമഃ"), ["n", "a", "m", "a", "h"]);
  assert.deepEqual(ml("ദുഃഖം"), ["d", "u", "h", "kh", "a", "m"]);
});

test("Malayalam: samvruthokaram is a u, in the old and the modern spelling", () => {
  assert.deepEqual(ml("അതു്"), ["a", "t", "u"]);
  assert.deepEqual(ml("അത്"), ["a", "t", "u"]);
  assert.deepEqual(ml("വീട്"), ml("വീടു്"));
  assert.deepEqual(ml("ഇന്ന്"), ["i", "n", "n", "u"]);
  assert.deepEqual(ml("അമ്മ"), ["a", "m", "m", "a"]);
});

test("Malayalam: doubled consonants stay doubled and cost one sound", () => {
  assert.deepEqual(ml("പട്ടി"), ["p", "a", "T", "T", "i"]);
  assert.equal(phonemeEditDistance(ml("പടി"), ml("പട്ടി")), 1);
});

test("Malayalam: similar sounds are near misses, and different ones are not", () => {
  const cost = (a, b) => phonemeEditDistance(ml(a), ml(b));
  const nearMisses = [["കര", "കറ"], ["കല", "കള"], ["വാള", "വാഴ"], ["കന", "കണ"], ["ശ", "ഷ"], ["ശ", "സ"], ["ഷ", "സ"]];
  for (const [a, b] of nearMisses) {
    assert.ok(cost(a, b) > 0 && cost(a, b) <= 0.4, `${a}/${b}: ${cost(a, b)}`);
    assert.equal(cost(b, a), cost(a, b));
  }
  assert.ok(cost("കര", "കറ") < cost("കര", "കല"));
  assert.ok(cost("വാള", "വാഴ") < cost("വാള", "വായ"));
  assert.equal(cost("ക", "മ"), 1);
});

test("Malayalam: characters that are not letters do not crash", () => {
  assert.deepEqual(ml("മ1?ഴ"), ["m", "a", "zh", "a"]);
  assert.deepEqual(ml("hello 😀"), []);
  assert.deepEqual(ml(ZWJ + ZWNJ), []);
  assert.deepEqual(ml("്ം"), ["m"]);
  assert.deepEqual(ml(""), []);
});

test("Malayalam: a perfect transcript scores 100, without its punctuation too", () => {
  for (const ageGroup of AGE_GROUPS) {
    for (const prompt of getGuidedPrompts("malayalam", ageGroup)) {
      const said = prompt.nativeText.replace(/[.,?!]/g, "");
      const result = evaluateTranscript(prompt.nativeText, said, prompt.keywords, "malayalam");
      assert.equal(result.score, 100, prompt.id);
    }
  }
});

test("Malayalam: one changed sound still scores high", () => {
  const prompt = getGuidedPrompts("malayalam", "8-11")[2];
  const said = prompt.nativeText.replace("മാമ്പഴം", "മാമ്പളം");
  const result = evaluateTranscript(prompt.nativeText, said, prompt.keywords, "malayalam");
  assert.ok(result.score >= 95, `scored ${result.score}`);
  assert.deepEqual(result.missingKeywords, []);
});

test("Malayalam: spoken forms of a key word count, and opposite words do not", () => {
  const keyword = (word, said) =>
    evaluateTranscript(word, said, [word], "malayalam").missingKeywords.length === 0;
  assert.ok(keyword("ഇഷ്ടമാണ്", "ഇഷ്ടാണ്"));
  assert.ok(keyword("മഴയാണ്", "മഴയാ"));
  assert.ok(!keyword("വേണം", "വേണ്ട"));
  assert.ok(!keyword("ഇഷ്ടമാണ്", "ഇഷ്ടമല്ല"));
  assert.ok(!keyword("വിശക്കുന്നു", "പറക്കുന്നു"));
});

test("Malayalam: an unrelated sentence gets no key words", () => {
  for (const ageGroup of AGE_GROUPS) {
    for (const prompt of getGuidedPrompts("malayalam", ageGroup)) {
      const result = evaluateTranscript(prompt.nativeText, UNRELATED.malayalam, prompt.keywords, "malayalam");
      assert.ok(result.score < 35, `${prompt.id} scored ${result.score}`);
      assert.deepEqual(result.missingKeywords, prompt.keywords, prompt.id);
    }
  }
});

test("Malayalam: an English transcript is not treated as Malayalam", () => {
  const prompt = getGuidedPrompts("malayalam", "8-11")[0];
  const result = evaluateTranscript(prompt.nativeText, "I am going to school", prompt.keywords, "malayalam");
  assert.equal(result.score, 0);
  assert.equal(isInLanguage("I am going to school", "malayalam"), false);
  const notes = buildGuidedNotes({ prompt, evaluation: result, transcript: "hello there", language: "malayalam" });
  assert.match(notes.improvement, /did not hear Malayalam words/);
});

test("Malayalam: chillus and marks count as Malayalam letters", () => {
  assert.equal(isInLanguage("ൺൻർൽൾൿ", "malayalam"), true);
  assert.equal(isInLanguage(`ഞാന്${ZWJ} പോയി`, "malayalam"), true);
  assert.equal(isInLanguage("நான் போனேன்", "malayalam"), false);
  assert.deepEqual(tokenize("ഞാൻ, സ്കൂളിൽ! പോവുകയാണ്."), ["ഞാൻ", "സ്കൂളിൽ", "പോവുകയാണ്"]);
});

test("Malayalam: a shorter sentence keeps the verb and its key words", () => {
  const prompts = AGE_GROUPS.flatMap((ageGroup) => getGuidedPrompts("malayalam", ageGroup));
  const short = (id) => getSimplifiedPrompt(prompts.find((p) => p.id === id));
  assert.equal(short("ml-5-2").nativeText, "പാൽ വേണം.");
  assert.equal(short("ml-12-5").nativeText, "പത്രം വായിക്കും.");
  for (const prompt of prompts) {
    const result = getSimplifiedPrompt(prompt);
    assert.ok(result.nativeText.endsWith(prompt.nativeText.split(" ").at(-1)), prompt.id);
    for (const keyword of result.keywords) assert.ok(result.nativeText.includes(keyword), prompt.id);
    assert.equal(evaluateTranscript(result.nativeText, result.nativeText, result.keywords, "malayalam").score, 100);
  }
});

test("Malayalam: notes and free talk read the words the child said", () => {
  const prompt = getGuidedPrompts("malayalam", "8-11")[1];
  const said = "അച്ഛൻ ഒരു കഥ";
  const evaluation = evaluateTranscript(prompt.nativeText, said, prompt.keywords, "malayalam");
  const notes = buildGuidedNotes({ prompt, evaluation, transcript: said, language: "malayalam" });
  assert.match(notes.positives[0], /2 of 3 key words: അച്ഛൻ, കഥ/);
  assert.match(notes.improvement, /പറഞ്ഞു/);

  const free = buildFreeTalkNotes({ transcript: `ഞാന്${ZWJ} ഇന്ന് സ്കൂളിൽ പോയി`, language: "malayalam" });
  assert.deepEqual(free.chips, [{ label: "Words", value: "4" }]);
  assert.deepEqual(free.positives, ["You said 4 Malayalam words."]);
  assert.match(buildFreeTalkNotes({ transcript: "school", language: "malayalam" }).improvement, /answering in Malayalam/);
});

test("Malayalam never falls back to Tamil", () => {
  assert.equal(normalizeLanguageId("Malayalam"), "malayalam");
  assert.equal(normalizeLanguageId("malayalam"), "malayalam");
  assert.equal(normalizeLanguageId(""), "tamil");
});

test("the voice check finds the language however the device spells it", async () => {
  const realWindow = globalThis.window;
  const withVoices = (voices) => {
    globalThis.window = { speechSynthesis: { getVoices: () => voices } };
  };
  try {
    delete globalThis.window;
    assert.equal(hasVoiceFor("ml-IN"), false);
    assert.equal(await checkVoiceFor("ml-IN"), false);

    withVoices([{ name: "Samantha", lang: "en-US" }]);
    assert.equal(hasVoiceFor("ml-IN"), false);
    assert.equal(hasVoiceFor("en-IN"), true);

    withVoices([{ name: "Malayalam India", lang: "ml_IN" }]);
    assert.equal(hasVoiceFor("ml-IN"), true);

    withVoices([{ name: "Google മലയാളം", lang: "ml-IN" }]);
    assert.equal(await checkVoiceFor("ml-IN"), true);
  } finally {
    if (realWindow === undefined) delete globalThis.window;
    else globalThis.window = realWindow;
  }
});

test("the voice check waits for voices that load late", async () => {
  const realWindow = globalThis.window;
  let voices = [];
  let listener = null;
  globalThis.window = {
    speechSynthesis: {
      getVoices: () => voices,
      addEventListener: (_, fn) => { listener = fn; },
      removeEventListener: () => { listener = null; },
    },
  };
  try {
    const pending = checkVoiceFor("ml-IN");
    assert.equal(hasVoiceFor("ml-IN"), false);
    voices = [{ name: "Google മലയാളം", lang: "ml-IN" }];
    listener();
    assert.equal(await pending, true);
    assert.equal(listener, null);

    // Nothing ever loads: answers no rather than hanging
    voices = [];
    assert.equal(await checkVoiceFor("ml-IN", 5), false);
  } finally {
    if (realWindow === undefined) delete globalThis.window;
    else globalThis.window = realWindow;
  }
});
