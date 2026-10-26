"""ماريا تقرأ: the weekly puzzles (one piece a day, the whole puzzle in a week), drawn in Khaled's ChatGPT in the clean
kawaii style of p01 (her approved look, 20 Oct 2026: cream-white background, eight separate friends, one per piece).

    python3 -I scripts/reads_puzzles.py prompts     # every puzzle still to draw, as JSON [{name, prompt}] for the page queue
    python3 -I scripts/reads_puzzles.py take        # file the saved pictures from ~/Downloads and make the app's .webp

Originals go to content/reads/puzzles/pNN.png (local), the app's pictures to assets/reads/puzzles/pNN.webp (1200 x 800).
make_reads.py lists them with the Arabic titles below.
"""
import glob, json, os, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIG = os.path.join(ROOT, 'content', 'reads', 'puzzles')
OUT = os.path.join(ROOT, 'assets', 'reads', 'puzzles')
DL = os.path.expanduser('~/Downloads')

# id, Arabic title, what the eight friends are (top row, then bottom row); 'giant' = one big squishy fills the picture
PUZZLES = [
    ('p01', 'أصدقاء لطاف', None), ('p02', 'حلويات سعيدة', None), ('p03', 'حديقة مبتسمة', None), ('p04', 'كنوز السكويشي', None),
    ('p05', 'أصدقاء البحر', 'Top row: a round blue whale, a pink octopus, an orange clownfish, a yellow starfish. Bottom row: a red crab, a green sea turtle, a purple seahorse, a lilac jellyfish.'),
    ('p06', 'صغار المزرعة', 'Top row: a fluffy yellow chick, a woolly white lamb, a brown calf, a baby goat. Bottom row: a little foal, a grey bunny, a duckling, a tabby kitten.'),
    ('p07', 'رحلة إلى الفضاء', 'Top row: a smiling crescent moon, a red-and-white rocket, a ringed planet, a shining star. Bottom row: a little astronaut bear, a comet with a sparkly tail, the Earth, a tiny satellite.'),
    ('p08', 'سلة الفواكه', 'Top row: a watermelon slice, a bunch of purple grapes, two cherries, an orange. Bottom row: a pineapple, a green pear, a peach, a kiwi half.'),
    ('p09', 'خضار نشيطة', 'Top row: a carrot, a broccoli, a tomato, a corn cob. Bottom row: a pea pod, a little pumpkin, a cucumber, a potato.'),
    ('p10', 'أدوات المدرسة', 'Top row: a yellow pencil, a pink eraser, an open book, a blue crayon. Bottom row: a ruler, a small backpack, a glue stick, a pencil case.'),
    ('p11', 'ألوان الطقس', 'Top row: a smiling sun, a fluffy cloud, a raindrop, a rainbow. Bottom row: a snowflake, a little wind swirl, an umbrella, a snowman.'),
    ('p12', 'سكويشي كبير', 'giant: ONE giant squishy fills the whole picture: a big round kawaii strawberry squishy with a happy face, soft and squeezy, small sparkles round it.'),
    ('p13', 'صحرائي الجميلة', 'Top row: a camel, a palm tree, a bowl of dates, a falcon. Bottom row: an Arabian oryx, a little sand dune with a sun, a Ramadan lantern, an Arabic coffee pot (dallah).'),
    ('p14', 'ألعابي', 'Top row: a teddy bear, a bouncy ball, a kite, a stack of toy blocks. Bottom row: a yo-yo, a spinning top, a toy car, a rubber duck.'),
    ('p15', 'طيور ملونة', 'Top row: an owl, a green parrot, a penguin, a pink flamingo. Bottom row: a sparrow, a peacock, a hen, a toucan.'),
    ('p16', 'سكويشي القطة', 'giant: ONE giant squishy fills the whole picture: a big round kawaii cat squishy (pastel pink, with little ears and paws) with a happy face, soft and squeezy, small sparkles round it.'),
    ('p17', 'أصدقاء حديقة الحيوان', 'Top row: a lion, a giraffe, an elephant, a zebra. Bottom row: a monkey, a panda, a hippo, a tiger cub.'),
    ('p18', 'فرقة الموسيقى', 'Top row: a drum, a guitar, a little piano, a trumpet. Bottom row: two maracas, a xylophone, a bell, a pair of music notes.'),
    ('p19', 'وقت النوم', 'Top row: a fluffy pillow, a moon night-light, a pair of bunny slippers, a toothbrush. Bottom row: a cuddly blanket, a cup of warm milk, a sleepy star, a bedtime storybook.'),
    ('p20', 'سكويشي الكعكة', 'giant: ONE giant squishy fills the whole picture: a big kawaii birthday-cake squishy with pink icing and a cherry, a happy face, soft and squeezy, small sparkles round it.'),
    ('p21', 'وسائل النقل', 'Top row: a car, a bus, a train, a plane. Bottom row: a boat, a bicycle, a hot-air balloon, a helicopter.'),
    ('p22', 'زهور مبتسمة', 'Top row: a rose, a tulip, a daisy, a cactus with a flower. Bottom row: a lotus, a lily, a cherry blossom, a bluebell.'),
    ('p23', 'حيوانات الثلج', 'Top row: a polar bear, a baby seal, a penguin chick, an arctic fox. Bottom row: a snowy owl, a husky puppy, a reindeer, a walrus.'),
    ('p24', 'سكويشي الباندا', 'giant: ONE giant squishy fills the whole picture: a big round kawaii panda squishy hugging a bamboo leaf, a happy face, soft and squeezy, small sparkles round it.'),
]
STYLE = ('Next puzzle picture, in exactly the same style as my reference: cute kawaii 3D friends with happy faces, glossy soft clay '
         'look, gentle pastel colours, a clean cream-white background with a few tiny stars and sparkles, wide 3:2, no text, '
         'letters or numbers anywhere.')
EIGHT = ' Eight separate friends in two rows of four, each well apart from the others and wholly inside its own eighth of the picture: '


def prompt(friends):
    if friends.startswith('giant: '):
        return STYLE + ' ' + friends[len('giant: '):]
    return STYLE + EIGHT + friends


def cmd_prompts():
    have = {os.path.basename(f)[:-4] for f in glob.glob(os.path.join(ORIG, 'p*.png'))}
    print(json.dumps([{'name': f'puzzle-{i}.png', 'prompt': prompt(f)} for i, t, f in PUZZLES if f and i not in have], ensure_ascii=False))


def cmd_take():
    from PIL import Image
    os.makedirs(ORIG, exist_ok=True); os.makedirs(OUT, exist_ok=True)
    for f in sorted(glob.glob(os.path.join(DL, 'puzzle-p*.png'))):
        pid = os.path.basename(f)[len('puzzle-'):-4]
        if pid not in {i for i, _, _ in PUZZLES}:
            print('not in the list, left in Downloads:', os.path.basename(f)); continue
        dest = os.path.join(ORIG, pid + '.png'); shutil.move(f, dest)
        im = Image.open(dest).convert('RGB').resize((1200, 800), Image.LANCZOS)
        im.save(os.path.join(OUT, pid + '.webp'), 'WEBP', quality=84, method=6)
        print(pid, os.path.getsize(os.path.join(OUT, pid + '.webp')) // 1024, 'KB')


if __name__ == '__main__':
    {'prompts': cmd_prompts, 'take': cmd_take}[sys.argv[1]]()
