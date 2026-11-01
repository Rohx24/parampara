import assert from "node:assert/strict";
import { test } from "node:test";
import { phonemeSimilarity, wordToPhonemes } from "../src/lib/phoneme.js";
import {
  VOICE_LANGUAGES,
  buildFreeTalkNotes,
  buildGuidedNotes,
  decideNextStep,
  evaluateTranscript,
  getBuddyReply,
  getGuidedPrompts,
  getSimplifiedPrompt,
  isInLanguage,
  pickFollowUpQuestion,
} from "../src/lib/voice.js";

const LANGUAGES = VOICE_LANGUAGES.map((l) => l.id);
const AGE_GROUPS = ["5-7", "8-11", "12-15"];
const UNRELATED = {
  tamil: "பறவை வானத்தில் பறக்கிறது",
  telugu: "పక్షి ఆకాశంలో ఎగురుతుంది",
  hindi: "चिड़िया आसमान में उड़ती है",
  kannada: "ಹಕ್ಕಿ ಆಕಾಶದಲ್ಲಿ ಹಾರುತ್ತದೆ",
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
