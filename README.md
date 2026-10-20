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

## Practice days

- Both Home screens show how many days in a row she has practised. A day counts when she answers a card. The English cards have no minutes goal: they are about finishing sets and moving on.
- Each parent area has a practice calendar for the last five weeks. Progress from before day tracking (October 2026) was registered from what the app had stored: the English cards' own dates, and every answer in the times tables. Tap a day to register it by hand, or tap again to take it off.

## Sticker book (English cards)

- One sticker for every 2 days in a row of practice on the English cards (the 2nd, 4th, 6th... day of a run; the parent area can change the 2). Home shows **My Sticker Book** with the dots for the next one.
- A new sticker comes at the end of the session that completes the 7th day ("Stick it in my book": it flies into its place). Stickers she earned before the book existed (registered days) are given the next time Home opens. A sticker is never taken away.
- 80 stickers in `stickers/` (order and names in `stickers/stickers.json`): 16 glitter squishies drawn for the app, food squishies, animals and other surprises from Microsoft Fluent Emoji (MIT, see `stickers/LICENSE.txt`), and a sparkly one every 4th. Each sticker she gets keeps its picture (`file`), so the order can change without changing her book. After 80 they start again (×2).
- **Star Friends:** every 7th reward (about every 2 weeks) is a big Star Friend instead of a sticker: a woman who dances on her own page in the book (Princess, Doctor, Fairy, Astronaut, Cartwheel girl, Scientist, Superwoman, Artist, Pilot: about 4 months). They are in `stickers/friends/` and the `friends` list of `stickers/stickers.json` (`dance`: bounce, twirl, fly, sway, spin or jump). To add more, put a picture there and add it to the list; when all are collected, a sticker comes instead and the parent area says so. 21 more candidates were approved in October 2026 (judge, chef, teacher, engineer, cartwheel...): Fluent Emoji "Woman …" pictures, Medium-Light skin.
- **Counting:** every award says how many she has now ("You have 8 stickers now!", "You have 2 Star Friends now!") and how many stickers to the next Star Friend; the book's two tabs show both numbers, and the Home card too.
- Code: `stickerbook.js` (styles at the end of `style.css`). Collected stickers and Star Friends are in Maria's profile, so the backup file carries them. Tests: `node scripts/test_stickers.js`.

## Times tables (جدول الضرب)

- The code is `maths.js` (styles at the end of `style.css`, font Tajawal in `fonts/`). Everything Maria sees is in Arabic with Arabic-Indic digits, and each sum is written right to left as in her school book (a hidden switch under **Advanced** in its parent area turns it left to right).
- She types the answer on the number pad and taps تحقّق. Right within 4 seconds = Easy (two stars), right but slower = Good (one star), wrong = the answer and its dot picture, calmly, and the fact comes back a few cards later.
- New facts come three or four at a time, in the order 1, 10, 2, 5, 3, 4, 9, 6, 7, 8, and only when the last set is mostly learned. Learned facts come back after 1, 2, 4, 7, 14 and 30 days. A table's sticker comes when all ten facts are a week or more apart.
- Its Home has a daily goal ring: minutes with a card on screen (5 by default, at most 2 minutes a card, paused in the background); reaching it gives a bonus star.
- Its parent area: press and hold the gear on its Home for 2 seconds (weakest facts, accuracy per table, practice calendar, settings, backup).
- Progress is saved in its own place (`tc:maria:math`), so the English cards are never touched. **Back up progress** saves both decks in one file.
- Tests: `node scripts/test_maths.js`.

## Science garden (حديقة العالِمة ماريا), the times tables' reward

- Every 50 stars in the times tables is one step in her garden. The steps follow her Grade 3 term-1 science book (chapters 1-3 and 6), with the book's own words:
  1. Three flowering plants, 6 steps each: بذرة، إنبات، نبتة صغيرة، نبات مزهر، تلقيح (the bee comes), ثمرة وبذور. The plants are الرمّان, then عبّاد الشمس, then الفراولة.
  2. When the plants are grown, the insects and animals come, 4 steps each:
     - the butterfly: بيضة، يرقة، عذراء، فراشة;
     - the frog: البيضة، أبو ذُنَيبة، الضفدع الصغير، الضفدع المكتمل النمو;
     - a sparrow's nest in the tree: البيض في العش، الأم ترقد، الفرخ، العصفور.
  3. Then one step each for four visitors and ideas:
     - the hedgehog (التكيّف);
     - the grasshopper (a food chain: الشمس ← النبات ← الجرادة ← العصفور, مُنتِج / مُستهلِك);
     - fallen leaves and an earthworm (المحلّلات);
     - rich soil (الدبال).
  4. That makes 34 steps, about 4 months. Then a new round begins: the plants grow again from seed, and the counts keep growing.
- **Each step:** the watering (or the surprise), the new stage, a 🔬 fact from the book, the life-cycle strip and a count ("عدد الحشرات في حديقتكِ: ٣").
- **The garden screen:** counts at the top (plants, insects, frogs, birds). Tapping anything (the sun, a plant, the bee, the pond, the worm...) gives a fact from the book; a grown plant also shows its parts (الجذور، الساق، الأوراق، الزهرة). **دورات الحياة** shows the four life-cycle wheels, the food chain, the decomposers and adaptation.
- **The way in:** the card **حديقتي** on the times-tables Home. When a round passes a 50, the Done screen says so («إلى حديقتي» / «لاحقًا») and keeps a button to the garden. Stars from before the garden count too.
- **Parent area:** the parent area shows the step, the counts and a button to open the garden.
- **Code:** `garden.js`, with styles at the end of `style.css`. The drawings are SVG inside `garden.js`. The sounds are Web Audio. Progress is `garden.done` in `tc:maria:math`, so the backup file carries it.
- **Tests:** `node scripts/test_garden.js`.

## مكتبتي (Maria's story library)

- A green «مكتبتي» chip on both Homes opens a reading room. It has a wooden bookcase with three shelves of ten books, a reading path of 30 circles, and a lamp and window. Dust floats in the lamp light, and a quiet room tone plays (the sound button turns it off).
- **Opening a book:** any book on the open shelf, in any order, but only one new book a day ("كتاب جديد غداً!"). Rereading is always allowed and gives nothing new. Day 30 opens after the other nine on its shelf. The next shelf's glass door swings open when a shelf is finished.
- **Picking a book:** it slides out, turns to its cover, floats to the middle and opens on its right-hand hinge.
- **Reading:** pages turn like an Arabic book. Swipe to the right (or tap the left side) for the next page. The page follows the finger. Sideways iPad shows two pages; upright shows one.
- **In the book:**
  - Pause questions have three buttons and nothing right or wrong.
  - The five end pages: من الجهة الأخرى، جملة سحرية (into her notebook), كلمة الشعور (into her feelings dictionary), أداة جديدة للمرسم (into the studio), and مهمّة اليوم («فعلتها!» with a feeling, or «لاحقاً»).
  - The book then goes back on its shelf with a gold ribbon and a «قرأتُه ✓» seal, and the next circle on the path fills with its tool.
  - At 10, 20 and 30 books there is a bigger celebration.
- **Stories:** `stories.json`, built by `python3 scripts/build_stories.py` from the story files in `content/stories/`. Those files and the roadmap are kept off GitHub (`.gitignore`). Every word is copied exactly, tashkeel included; the script prints a validation report.
  - To add stories later, follow section 7 of the roadmap: add the new file, rebuild, and never reorder.
- **Pictures:** `assets/stories/dXX/pYY.webp` and `cover.webp`. Soft placeholders show until they exist; `?dev=1` shows each page's scene note. Rebuild `stories.json` after adding pictures so they are listed and cached offline.
- **Sounds:** real CC0 recordings in `assets/audio/` (sources in `assets/audio/CREDITS.md`). The glass chime and the celebrations are made in code.
- **Fonts:** Noto Naskh Arabic for the story text, Baloo Bhaijaan 2 for titles and buttons (OFL, in `fonts/`).
- **Code:** `library.js`, with styles at the end of `style.css`. Progress is in `tc:maria:lib` and goes in the same backup file.
- **Tests:** `node scripts/test_library.js`.
- **Next phases:** the studio (مرسمي) with its shelves, notebook, dictionary and mission board; the parent area on the lamp with a PIN; Baba's messages; the craft projects; voice recording; the reading-path design from her reference.

## ماريا تقرأ (Maria Reads, her phonics path)

- The fourth tile on her entrance page. One path of 65 lessons in the order of *Children Learning Reading*; every word, sentence and story is our own (`reads.json`, written by `scripts/make_reads.py`; Asma approved the word list for lessons 9 to 24 on 20 October 2026). A lesson opens only when all its voice clips exist.
- **Code:** `reads.js` (rules in `MariaReads.core`, tested by `scripts/test_reads.js`), styles under "Maria Reads" in `style.css`. Progress is `tc:maria:reads`; Done, Current and Locked come from the current lesson number. The backup file carries it (key `reads`), with Mama's own sound recordings if she makes any.
- **Sessions:** a timer ring (3, 5 or 7 minutes), the lesson's steps in order (review cards, new sound and tracing, ear games, point and swipe with the help ladder, what's the difference, swaps, spelling, sentences, stories, recording herself), then Mama's tap. Mama's view: hold the gear for 2 seconds.
- **Rewards:** stars, the flame streak, the Speed Round, and a puzzle a week: one piece a day of use, which she drags into place over a faint picture; the last two come on day 7. Finished puzzles go into her puzzle book (كتاب ألغازي).
- **Voice:** words and sentences in Kore (`gemini-3.8-flash-tts`) with a clean ending, by `scripts/reads_voice.py` (clips in `audio/rd/`, deck `reads` in `audio/voice.json`). Single sounds are built in, cut from those approved takes (`scripts/reads_cut_sounds.py`), so no "uh" follows a stop sound; Mama may record her own instead.
- **Photos:** real photos (Pexels, free licence) by `scripts/reads_photos.py`; choices in `scripts/reads_photo_picks.json`, credits in `assets/reads/photos/CREDITS.md`.

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
