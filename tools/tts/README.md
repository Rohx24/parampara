# Local Coqui TTS (offline generation)

This folder generates narration MP3s using open-source Coqui TTS.

## Setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Generate audio

```bash
python generate_tts.py --lang hi --text_file ../../public/narration/hi.txt --out ../../public/audio/hi.mp3
python generate_tts.py --lang ta --text_file ../../public/narration/ta.txt --out ../../public/audio/ta.mp3
python generate_tts.py --lang te --text_file ../../public/narration/te.txt --out ../../public/audio/te.mp3
python generate_tts.py --lang kn --text_file ../../public/narration/kn.txt --out ../../public/audio/kn.mp3
```

Notes:
- The script auto-selects the best available model. If no language-specific model
  is found, it falls back to a multilingual model.
- MP3 export uses `ffmpeg`. Install it if not already available.
- For hackathon demos, pre-generate and commit `public/audio/*.mp3`.
