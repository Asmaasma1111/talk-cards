# Talk Cards

Flashcards with spaced repetition and a recorded voice, made for the iPad, for Maria's spoken English (`sets.json`): 26 sets that unlock one by one, with stars and prizes.

Mama's prepositions deck has its own shareable app, **Prepositions**: https://asmaasma1111.github.io/prepositions/. It is built from this same folder with `python3 scripts/export_prepositions.py` (then commit and push `~/Downloads/06_Projects_and_Code/prepositions-app`).

**Link:** https://asmaasma1111.github.io/talk-cards/

## Put it on the iPad

1. Open the link in **Safari** while online.
2. Tap the **Share** button, then **Add to Home Screen**, then **Add**.
3. From now on, open it from the **Talk Cards** icon on the Home Screen. It works offline, so it's fine in the car.

Always use the Home Screen icon. The icon and a Safari tab keep separate progress.

## Everyday use

- The gear at the top right opens the parent area. **Press and hold it for 2 seconds.**
- In the parent area, **Back up progress** saves the progress in one file. Do this now and then. **Restore** brings it back.

## Changing the cards

- Maria's cards are in `sets.json`; add new sets at the end. Mama's are in `prepositions.json` (keep each card `id` unchanged, because progress is stored by `id`), then run the export script for the Prepositions app.
- After changing any text, record the new lines (below), then raise `VERSION` in `sw.js` (for example `talk-cards-v2`) so the iPad picks up the change.

## Recording the voice

Every spoken line is a clip recorded with Gemini TTS: the American voice **Kore** on `gemini-3.8-flash-tts`. The script is `scripts/voice.py`, and the key goes in `.env` as `GEMINI_API_KEY` (never committed). The free tier allows 10 recordings a day per model, so lines are recorded in batches of about 41.

```bash
PY=~/Downloads/06_Projects_and_Code/maria-tenses/.venv/bin/python
```

```bash
$PY scripts/voice.py lines
```

```bash
$PY scripts/voice.py record && $PY scripts/voice.py split && $PY scripts/voice.py verify && $PY scripts/voice.py align && $PY scripts/voice.py build
```

- `record` stops with exit code 11 when the day's quota runs out. Run it again after the reset (about 10:00 Riyadh time) and it carries on where it stopped.
- `verify` transcribes every clip and lists any that do not match their text, with the exact `record --lines ...` command to redo them.
- Lines without a clip are spoken by the iPad's own voice, so the app always works.

## Testing

- `python3 -m http.server 8150 --bind 127.0.0.1` in this folder, then open `http://localhost:8150/?dev=1`.
- `?dev=1` adds a bar with **+1 day** to simulate days.
- `_dev_mock.js` is a local test helper. It is not published.
