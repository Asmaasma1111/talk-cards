# مسرح المسائل: ChatGPT pictures

Clay style, like her other apps' pictures. Khaled's ChatGPT ran out of images on 7 Nov 2026 (back 8 Nov, 3:52 pm).
Until these exist the stage is drawn in CSS (theatre/css/theatre.css, "the stage").

1. `stage/stage.webp` (1536 x 1024): a children's theatre stage in soft 3D clay style. Front view, centred, symmetrical.
   Gold ornate arch, deep red velvet valance with gold fringe and tassels, red side curtains tied back with gold ropes (OPEN),
   honey wood floor, small glowing footlights, soft plum back wall with a warm spotlight glow and a few tiny gold stars.
   Middle EMPTY: no characters, props, text, letters or numbers (the app puts its title and button there).
2. `stage/curtain.webp` (1024 x 1536, transparent background): ONE closed red velvet stage curtain panel in the same clay
   style, rich vertical folds, gold fringe along the bottom hem, filling the whole picture top to bottom. The app uses it
   twice (mirrored) and slides the two panels open.
3. (still to make) `theatre_tile.png` (her apps page tile, same look as the other tiles): a small clay theatre with red curtains and a gold star.

When 1 and 2 are both in theatre/assets/stage/, the app uses them automatically (run scripts/build_theatre.py so files.json lists them).

## Made 8 Nov 2026 (story stage redrawn from scratch)

All sprite sheets begin: "Please create one square image (1024 x 1024): a sprite sheet of 16 separate objects for a
children's maths app, arranged in an exact 4 x 4 grid (4 rows, 4 columns), each object centred in its own equal square
cell, all about the same size, with wide empty space between them so they never touch. Style: soft 3D clay style (like
plasticine claymation toys), rounded chunky shapes, soft gentle lighting, bright friendly colours, cute but simple.
Every object whole, front view, alone. Transparent background (PNG). No text, no letters, no numbers, no labels, no grid
lines, no frames, no ground shadows." Then the objects row by row, in the order scripts/theatre_sheets.py names them:

- A (things): Saudi schoolgirl about 8 in a pink pinafore; Saudi schoolboy in a white thobe; mother in black abaya and
  hijab; man in white thobe and red-and-white ghutra; woman traveller with a small suitcase; sheep; goat; hen; egg; date
  palm; round leafy tree; water drop; pair of footprints; round glasses; wrapped pink sweet; pastel squishy bun with a face.
- B (things): gold coin with a plain rim; star sticker; sheet of lined paper; red book; green book; blue book; blue toy
  cube; playing card with one red heart; football; red ball; blue ball; yellow pencil; red crayon; wooden crate; date; cupcake.
- C (things): apple; orange; lemon; banana; strawberry; red balloon; wooden chair; chocolate bar; calendar page (no
  writing); rainbow bead necklace; brown paw print; sprout in a pot; red cinema seat; gold star; pale blue floor tile; wheel.
- D (packs, "containers that hold many small things", three-quarter view, no people): shopping bag; cardboard box;
  delivery lorry; stack of books tied with a ribbon; spiral notebook; very thick book; sticker album with a star; nest of
  eggs; wicker basket; small wooden farm pen with a roof; red barn; white minibus; yellow bus; round football stadium;
  bucket of water; bathtub of water.
- E (packs, 2 rows x 3 columns): sandy island with two palms; grove of three palms on grass; pickup truck; pencil cup;
  staircase of five steps; blue water tank on legs.

Stage backdrops: "the inside of a small children's puppet theatre stage, seen straight from the front, as an EMPTY
background ... soft 3D clay style ... a pale warm cream back wall with a very soft round warm spotlight glow in the middle;
a honey-coloured wooden stage floor across the bottom [fifth | eighth]; a narrow strip of red velvet curtain gathered at
the far left and right edges, and a slim red velvet valance with a little gold fringe along the very top edge. A thin gold
frame line ... The whole middle must be completely EMPTY and plain ... soft and light (pastel), low contrast."
board.webp is 1536 x 1024; board-tall.webp is 1024 x 1536. The app keeps the things between the curtains (story.js, split()).

## Made 8 Nov 2026, later (her words: "change the curtains ... use ChatGPT")

- stage/stage.webp (1536 x 1024): the front of a small magical puppet theatre, rounded gold clay arch with a star, red
  valance with gold fringe and tassels, honey floor with footlights, plum back wall with a spotlight glow, NO side curtains,
  middle empty. Its white corners are cleared to transparent when it is saved.
- stage/curtain.webp (1024 x 1536, transparent): one closed red velvet clay curtain panel, vertical folds, scalloped gold
  fringe and tassels on the hem, no rod or rope. js/opening.js hangs it twice (one mirrored) inside the arch.
- Keypad mock-up (content/theatre/sheets/keypad.png, for her approval, not used by the app): plump pastel clay keys on a
  cream tray with a gold edge, ١ ٢ ٣ on the top row written right to left, ⌫ ٠ ✓ at the bottom.
