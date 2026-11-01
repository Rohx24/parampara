// Fails the build if a secret key reaches the files sent to the browser.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const DIST = "dist";
const SECRETS = {
  OpenAI: /\bsk-(?:proj-|svcacct-|admin-|ant-)?[A-Za-z0-9_-]{20,}/,
  Google: /\bAIza[0-9A-Za-z_-]{30,}/,
};
const TEXT_FILE = /\.(js|mjs|css|html|map|json|txt)$/;

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (TEXT_FILE.test(name)) yield path;
  }
}

let leaks = 0;
for (const path of files(DIST)) {
  const text = readFileSync(path, "utf8");
  for (const [kind, pattern] of Object.entries(SECRETS)) {
    if (pattern.test(text)) {
      console.error(`Secret leak: ${kind} key found in ${path}`);
      leaks += 1;
    }
  }
}

if (leaks) process.exit(1);
console.log("Bundle check passed: no API keys in dist/");
