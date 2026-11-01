import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { resetRateLimits } from "../api/_lib/guard.js";
import { POST as chat } from "../api/openai/chat.js";
import { POST as embeddings } from "../api/openai/embeddings.js";
import { POST as fineTune } from "../api/openai/fine-tune.js";
import { POST as youtube } from "../api/youtube.js";

const HOST = "bhashabuddy.test";
const realFetch = globalThis.fetch;
let calls;

function request(body, headers = {}) {
  return new Request(`https://${HOST}/api`, {
    method: "POST",
    headers: { host: HOST, origin: `https://${HOST}`, "x-forwarded-for": "1.1.1.1", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const messages = [{ role: "user", content: "hi" }];

beforeEach(() => {
  calls = [];
  resetRateLimits();
  process.env.OPENAI_API_KEY = "test-openai-value";
  process.env.YOUTUBE_API_KEY = "test-youtube-value";
  process.env.ADMIN_TOKEN = "test-admin-value";
  delete process.env.OPENAI_FINE_TUNED_MODEL;
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

test("chat adds the key on the server and never returns it", async () => {
  const res = await chat(request({ messages }));
  assert.equal(res.status, 200);
  assert.equal(calls[0].init.headers.Authorization, "Bearer test-openai-value");
  assert.ok(!(await res.text()).includes("test-openai-value"));
});

test("requests from another website are refused", async () => {
  const res = await chat(request({ messages }, { origin: "https://evil.example" }));
  assert.equal(res.status, 403);
  assert.equal(calls.length, 0);
});

test("requests with no origin are refused", async () => {
  const req = new Request(`https://${HOST}/api`, {
    method: "POST",
    headers: { host: HOST },
    body: JSON.stringify({ messages }),
  });
  assert.equal((await chat(req)).status, 403);
});

test("the browser cannot choose a costlier model or raise the token cap", async () => {
  await chat(request({ messages, model: "gpt-4.1", max_tokens: 999999 }));
  const sent = JSON.parse(calls[0].init.body);
  assert.equal(sent.model, "gpt-4o-mini");
  assert.equal(sent.max_tokens, 2500);
});

test("only the configured fine-tuned model is accepted", async () => {
  process.env.OPENAI_FINE_TUNED_MODEL = "ft:gpt-4o-mini:team::abc";
  await chat(request({ messages, model: "ft:gpt-4o-mini:team::abc" }));
  assert.equal(JSON.parse(calls[0].init.body).model, "ft:gpt-4o-mini:team::abc");
});

test("oversized and malformed bodies are refused", async () => {
  assert.equal((await chat(request({ messages: [{ role: "user", content: "x".repeat(40000) }] }))).status, 400);
  assert.equal((await chat(request("not json"))).status, 400);
  assert.equal((await chat(request({ messages: [{ role: "tool", content: "x" }] }))).status, 400);
  assert.equal(calls.length, 0);
});

test("rate limit applies per address", async () => {
  for (let i = 0; i < 40; i += 1) assert.equal((await chat(request({ messages }))).status, 200);
  assert.equal((await chat(request({ messages }))).status, 429);
  assert.equal((await chat(request({ messages }, { "x-forwarded-for": "2.2.2.2" }))).status, 200);
});

test("embeddings use a fixed model and limit input size", async () => {
  await embeddings(request({ input: "hello", model: "other" }));
  assert.equal(JSON.parse(calls[0].init.body).model, "text-embedding-3-small");
  assert.equal((await embeddings(request({ input: "x".repeat(4001) }))).status, 400);
});

test("youtube always forces safe search and keeps the key off the client", async () => {
  const res = await youtube(request({ path: "search", params: { q: "kids", safeSearch: "none", maxResults: 500 } }));
  const url = new URL(calls[0].url);
  assert.equal(url.searchParams.get("safeSearch"), "strict");
  assert.equal(url.searchParams.get("maxResults"), "25");
  assert.equal(url.searchParams.get("key"), "test-youtube-value");
  assert.ok(!(await res.text()).includes("test-youtube-value"));
});

test("youtube only allows known paths", async () => {
  assert.equal((await youtube(request({ path: "channels", params: {} }))).status, 400);
  assert.equal((await youtube(request({ path: "constructor", params: {} }))).status, 400);
  assert.equal((await youtube(request({ path: "videos", params: { id: "a&key=x" } }))).status, 400);
});

test("fine-tuning needs the admin token", async () => {
  const body = { action: "status", jobId: "ftjob-abc" };
  assert.equal((await fineTune(request(body))).status, 403);
  assert.equal((await fineTune(request(body, { "x-admin-token": "wrong" }))).status, 403);
  delete process.env.ADMIN_TOKEN;
  assert.equal((await fineTune(request(body, { "x-admin-token": "" }))).status, 403);
  assert.equal(calls.length, 0);
});

test("fine-tuning works with the admin token and checks ids", async () => {
  const headers = { "x-admin-token": "test-admin-value" };
  assert.equal((await fineTune(request({ action: "status", jobId: "ftjob-abc" }, headers))).status, 200);
  assert.equal((await fineTune(request({ action: "status", jobId: "../files" }, headers))).status, 400);
  assert.equal((await fineTune(request({ action: "toString" }, headers))).status, 400);
});

test("streamed stories pass through unchanged", async () => {
  const stream = "data: {\"choices\":[{\"delta\":{\"content\":\"Hi\"}}]}\n\ndata: [DONE]\n\n";
  globalThis.fetch = async () => new Response(stream, { status: 200 });
  const res = await chat(request({ messages, stream: true }));
  assert.equal(res.headers.get("content-type"), "text/event-stream");
  assert.equal(await res.text(), stream);
});

test("upstream error details are not shown to the browser", async () => {
  globalThis.fetch = async () => new Response("Incorrect API key provided: test-openai-value", { status: 401 });
  const res = await chat(request({ messages }));
  assert.equal(res.status, 502);
  assert.ok(!(await res.text()).includes("test-openai-value"));
});

test("a missing server key gives a clean error", async () => {
  delete process.env.OPENAI_API_KEY;
  assert.equal((await chat(request({ messages }))).status, 503);
});
