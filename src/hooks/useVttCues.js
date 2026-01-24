import { useEffect, useState } from "react";

export function parseTimecode(value) {
  if (!value) return NaN;
  const trimmed = value.trim();
  const [time, msRaw] = trimmed.split(".");
  const parts = time.split(":").map(Number);
  const ms = msRaw ? Number(msRaw.padEnd(3, "0")) : 0;
  if (parts.some((part) => Number.isNaN(part))) return NaN;
  let seconds = 0;
  if (parts.length === 3) {
    seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    seconds = parts[0] * 60 + parts[1];
  } else if (parts.length === 1) {
    seconds = parts[0];
  }
  return seconds + ms / 1000;
}

export function parseVtt(text) {
  const lines = text.replace(/\r/g, "").split("\n");
  const cues = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) {
      index += 1;
      continue;
    }
    if (line.startsWith("WEBVTT")) {
      index += 1;
      continue;
    }
    if (!line.includes("-->") && lines[index + 1]?.includes("-->")) {
      index += 1;
      continue;
    }
    const timeLine = line.includes("-->") ? line : lines[index + 1];
    if (!timeLine || !timeLine.includes("-->")) {
      index += 1;
      continue;
    }
    const [startRaw, endRaw] = timeLine.split("-->");
    const start = parseTimecode(startRaw);
    const end = parseTimecode(endRaw.trim().split(" ")[0]);
    index += line.includes("-->") ? 1 : 2;
    const textLines = [];
    while (index < lines.length && lines[index].trim() !== "") {
      textLines.push(lines[index].trim());
      index += 1;
    }
    if (!Number.isNaN(start) && !Number.isNaN(end) && textLines.length) {
      cues.push({ start, end, text: textLines.join(" ").trim() });
    }
  }
  return cues;
}

export async function loadVtt(url) {
  if (!url) return [];
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load VTT: ${url}`);
  }
  const text = await response.text();
  return parseVtt(text);
}

export function getActiveCue(cues, currentTime) {
  if (!cues?.length) return null;
  return (
    cues.find((cue) => currentTime >= cue.start && currentTime < cue.end) ||
    cues[cues.length - 1]
  );
}

export function useVttCues(url) {
  const [cues, setCues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    if (!url) {
      setCues([]);
      setError(null);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    loadVtt(url)
      .then((data) => {
        if (!mounted) return;
        setCues(data || []);
        setError(null);
      })
      .catch((err) => {
        if (!mounted) return;
        setCues([]);
        setError(err);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [url]);

  return { cues, loading, error };
}
