import argparse
import os
import shutil
import subprocess
import tempfile

from TTS.api import TTS
from TTS.utils.manage import ModelManager

LANGUAGE_MAP = {
    "ta": "ta",
    "te": "te",
    "hi": "hi",
    "kn": "kn",
}

DEFAULT_FALLBACKS = [
    "tts_models/multilingual/multi-dataset/your_tts",
    "tts_models/multilingual/multi-dataset/xtts_v2",
]

PREFERRED_MODELS = {
    "hi": ["tts_models/hi/css10/vits"],
    "ta": ["tts_models/ta/css10/vits"],
    "te": ["tts_models/te/css10/vits"],
    "kn": ["tts_models/kn/css10/vits"],
}


def resolve_model(lang):
    manager = ModelManager()
    all_models = manager.list_models()
    preferred = [m for m in PREFERRED_MODELS.get(lang, []) if m in all_models]
    lang_specific = [m for m in all_models if m.startswith(f"tts_models/{lang}/")]
    candidates = preferred + lang_specific + DEFAULT_FALLBACKS

    for name in candidates:
        try:
            tts = TTS(model_name=name, progress_bar=False, gpu=False)
            print(f"Using model: {name}")
            return tts, name
        except Exception as err:  # noqa: BLE001
            print(f"Model failed: {name} ({err})")

    raise RuntimeError("No compatible TTS model found.")


def convert_wav_to_mp3(wav_path, mp3_path):
    if shutil.which("ffmpeg") is None:
        print("ffmpeg not found. Copying WAV to requested output.")
        shutil.copyfile(wav_path, mp3_path)
        return
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            wav_path,
            "-codec:a",
            "libmp3lame",
            "-qscale:a",
            "2",
            mp3_path,
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def main():
    parser = argparse.ArgumentParser(description="Generate narration audio using Coqui TTS")
    parser.add_argument("--lang", required=True, choices=LANGUAGE_MAP.keys())
    parser.add_argument("--text_file", required=True, help="Path to narration text file")
    parser.add_argument("--out", required=True, help="Output mp3 path")
    parser.add_argument("--speaker_wav", help="Optional speaker WAV for XTTS")
    args = parser.parse_args()

    if not os.path.exists(args.text_file):
        raise FileNotFoundError(args.text_file)

    with open(args.text_file, "r", encoding="utf-8") as handle:
        text = handle.read().strip()

    if not text:
        raise ValueError("Narration text file is empty")

    os.makedirs(os.path.dirname(args.out), exist_ok=True)

    tts, model_name = resolve_model(args.lang)
    language = LANGUAGE_MAP[args.lang]

    with tempfile.TemporaryDirectory() as tmp_dir:
        wav_path = os.path.join(tmp_dir, "output.wav")
        if tts.is_multi_lingual:
            tts.tts_to_file(
                text=text,
                file_path=wav_path,
                language=language,
                speaker_wav=args.speaker_wav,
            )
        else:
            tts.tts_to_file(text=text, file_path=wav_path)

        if args.out.endswith(".mp3"):
            convert_wav_to_mp3(wav_path, args.out)
        else:
            shutil.copyfile(wav_path, args.out)

    print(f"Saved narration to {args.out} (model: {model_name})")


if __name__ == "__main__":
    main()
