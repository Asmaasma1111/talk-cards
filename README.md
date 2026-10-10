# Talk Cards

Flashcards with spaced repetition and a recorded voice, made for the iPad, for Maria's spoken English (`sets.json`): 26 sets that unlock one by one, with stars and prizes.

Maria also has a second deck, **جدول الضرب** (times tables 1 × 1 to 10 × 10): tap the pink chip at the top left of Home. See *Times tables* below.

Mama's prepositions deck has its own shareable app, **Prepositions**: https://asmaasma1111.github.io/prepositions/. It is built from this same folder with `python3 scripts/export_prepositions.py` (then commit and push `~/Downloads/06_Projects_and_Code/prepositions-app`).

**Link:** https://asmaasma1111.github.io/talk-cards/

## Put it on the iPad

1. Open the link in **Safari** while online.
2. Tap the **Share** button, then **Add to Home Screen**, then **Add**.
3. From now on, open it from the **Talk Cards** icon on the Home Screen. It works offline, so it's fine in the car.

Always use the Home Screen icon. The icon and a Safari tab keep separate progress.

## Everyday use

- The gear at the top right opens the parent area. **Press and hold it for 2 seconds.**
- **Back up progress** (the line under "Designed by" at the bottom of each Home screen, and in the parent area) saves all progress, English cards and times tables, in one file. Do this now and then. **Restore** (in the parent area) brings it back.

## Times tables (جدول الضرب)

- The code is `maths.js` (styles at the end of `style.css`, font Tajawal in `fonts/`). Everything Maria sees is in Arabic with Arabic-Indic digits, and each sum is written right to left as in her school book (a hidden switch under **Advanced** in its parent area turns it left to right).
- She types the answer on the number pad and taps تحقّق. Right within 4 seconds = Easy (two stars), right but slower = Good (one star), wrong = the answer and its dot picture, calmly, and the fact comes back a few cards later.
- New facts come three or four at a time, in the order 1, 10, 2, 5, 3, 4, 9, 6, 7, 8, and only when the last set is mostly learned. Learned facts come back after 1, 2, 4, 7, 14 and 30 days. A table's sticker comes when all ten facts are a week or more apart.
- Its parent area: press and hold the gear on its Home for 2 seconds (weakest facts, accuracy per table, days practised, settings, backup).
- Progress is saved in its own place (`tc:maria:math`), so the English cards are never touched. **Back up progress** saves both decks in one file.
- Tests: `node scripts/test_maths.js`.

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
