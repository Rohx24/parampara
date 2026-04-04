import { chatCompletion } from "./openai";

function buildPrompt({ title, description, channelTitle, transcript, language, difficulty }) {
  const hasTranscript = !!transcript?.trim();
  const contentBlock = hasTranscript
    ? `TRANSCRIPT (primary source):\n${transcript.slice(0, 5000)}`
    : "(No transcript — infer from title, description, and channel only.)";

  return `VIDEO TITLE: ${title}
CHANNEL: ${channelTitle ?? ""}
LANGUAGE: ${language}
DIFFICULTY: ${difficulty}
DESCRIPTION: ${(description ?? "").slice(0, 400)}

${contentBlock}

Generate a children's language lesson JSON with EXACTLY this structure:
{
  "summary": "2-3 sentence summary",
  "vocabulary": [
    { "word": "target-language word", "meaning": "English meaning", "example": "simple sentence" }
  ],
  "mcq": [
    { "question": "question", "options": ["A", "B", "C", "D"], "answer": "exact correct option text" }
  ],
  "fill_blanks": [
    { "question": "sentence with ____ for blank", "answer": "word" }
  ],
  "speaking_prompts": ["prompt 1", "prompt 2"],
  "comprehension_questions": ["q1", "q2", "q3", "q4", "q5"],
  "confidence": "${hasTranscript ? "high" : "low"}"
}

Rules: vocabulary = 6 items, mcq = 3 items each with 4 options, fill_blanks = 2, speaking_prompts = 2, comprehension_questions = 5.
Keep content child-safe and educational. Difficulty is ${difficulty}. No markdown. Return only valid JSON.`;
}

export async function generateLesson({ title, description, channelTitle, transcript, language, difficulty }) {
  const raw = await chatCompletion(
    [
      {
        role: "system",
        content: "You are BashaBuddy, an Indian-language curriculum designer for children. Return only valid JSON with no markdown or explanation.",
      },
      { role: "user", content: buildPrompt({ title, description, channelTitle, transcript, language, difficulty }) },
    ],
    { max_tokens: 2200, temperature: 0.6 }
  );

  try {
    // Strip any accidental markdown fences
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    return JSON.parse(cleaned);
  } catch {
    throw new Error("GPT returned invalid JSON. Try regenerating.");
  }
}
