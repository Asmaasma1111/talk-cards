"""هيا نتعلم في الجزائر: writes algeria.json, the content of the trip (Mama's concept, approved 23 Oct 2026).

Only the gaps between Maria's Saudi Grade 3 books and the Algerian 3AP books (الجيل الثاني) are taught, city by city:
one Arabic step and one maths step a city, the city's culture cards, its postcard and its pictures of the day (real photos,
scripts/algeria_photos.py). Definitions follow the Algerian book (Arabic p. 12, 16, 20; maths p. 16, 86), in our own words.
Every Arabic line here is listed for Mama to check (Algeria_Week1_Checklist.md).

  python3 -I scripts/make_algeria.py        -> algeria.json (and the list of voice lines inside it)

Numbers are shown with Saudi (Arabic-Indic) digits and no separator, ٢٣٥١٩ (her rule, 23 Oct 2026: "I'm focusing more on the
content and learning rather than the symbols"). The maths practice is generated in algeria.js (as much as she wants).
Only the lines the voice really says are listed for recording: the voice reads a text once, never what she reads herself.
"""
import hashlib, json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'algeria.json')
wid = lambda w: 'k-' + hashlib.md5(w.encode('utf-8')).hexdigest()[:8]   # single words: recorded 40 to a take
AR = lambda t: str(t).translate(str.maketrans('0123456789', '٠١٢٣٤٥٦٧٨٩'))   # Saudi digits (her rule)
num = lambda n: AR(n)                                # 23519 -> "٢٣٥١٩"

DECKS = {'qw': 'قواعدي', 'dz': 'جزائري', 'nm': 'أكتب العدد'}

# the route home: north coast west to east, then the south. Only the cities marked ready have their content yet.
# x, y = place on the map picture, in % of its width and height (set again when the ChatGPT map arrives)
CITIES = [
    ('alg', 'الجزائر العاصمة', 'الجزائر البيضاء', 3.06, 36.75),
    ('orn', 'وهران', 'وهران الباهية', -0.64, 35.70),
    ('tlm', 'تلمسان', 'لؤلؤة المغرب', -1.32, 34.88),
    ('bja', 'بجاية', 'بجاية الناصرية', 5.08, 36.75),
    ('stf', 'سطيف', 'عاصمة الهضاب العليا', 5.41, 36.19),     # Maria lived here (Mama, 23 Oct 2026): her own city on the map
    ('cst', 'قسنطينة', 'مدينة الجسور المعلّقة', 6.61, 36.36),
    ('btn', 'باتنة', 'عاصمة الأوراس', 6.17, 35.56),
    ('bsk', 'بسكرة', 'عروس الزيبان', 5.73, 34.85),
    ('ghr', 'غرداية', 'وادي ميزاب', 3.67, 32.49),
    ('tmr', 'تمنراست', 'الهقار', 5.52, 22.79),
]
# Algeria's box on the map: longitude -8.7 to 12.0, latitude 19.0 to 37.1
def place(lon, lat):
    return round((lon + 8.7) / 20.7 * 100, 1), round((37.1 - lat) / 18.1 * 100, 1)

# ---------------------------------------------------------------------------------------------------------------------
# City 1: الجزائر العاصمة
# ---------------------------------------------------------------------------------------------------------------------
POST_ALG = [   # fully vowelled: the first city (later cities lose the vowels little by little)
    'مَرْحَبًا بِكِ في الجَزائِرِ العاصِمَةِ!',
    'يُسَمِّيها النّاسُ «الجَزائِرَ البَيْضاءَ»، لِأَنَّ بُيوتَها بَيْضاءُ تُطِلُّ عَلى البَحْرِ.',
    'فَوْقَ تَلَّةٍ عالِيَةٍ يَقِفُ مَقامُ الشَّهيدِ.',
    'وَفي القَصَبَةِ القَديمَةِ أَزِقَّةٌ ضَيِّقَةٌ وَدَرَجٌ كَثيرٌ.',
    'وَفي كُلِّ مَكانٍ يُرَفْرِفُ العَلَمُ الجَزائِرِيُّ: أَخْضَرُ وَأَبْيَضُ، وَفي وَسَطِهِ هِلالٌ وَنَجْمَةٌ بِاللَّوْنِ الأَحْمَرِ.',
]

# culture cards: f = front (a question), b = back (the answer), s = one more line under it
CARDS = {
    'dz1': dict(deck='dz', f='ما لقبُ مدينةِ الجزائرِ العاصمة؟', b='الجزائرُ البيضاء', s='لأنَّ بيوتَها بيضاءُ تُطِلُّ على البحر.'),
    'dz2': dict(deck='dz', f='ما ألوانُ العلمِ الجزائريّ؟', b='الأخضرُ والأبيض', s='وفي وسطِه هلالٌ ونجمةٌ باللونِ الأحمر.', photo='flag'),
    'dz3': dict(deck='dz', f='ماذا يعني اللونُ الأحمرُ في العلم؟', b='دماءَ الشهداء', s='والأخضرُ أرضُ الجزائرِ الخضراء، والأبيضُ السلام.'),
    'dz4': dict(deck='dz', f='ما اسمُ النشيدِ الوطنيِّ الجزائريّ؟', b='قَسَمًا', s='كتبَه الشاعرُ مفدي زكريا.'),
    'dz5': dict(deck='dz', f='متى بدأتِ الثورةُ التحريريّة؟', b='أوّل نوفمبر 1954', s=''),
    'dz6': dict(deck='dz', f='متى عيدُ الاستقلال؟', b='5 جويلية 1962', s=''),
    'dz7': dict(deck='dz', f='ما اسمُ الشهرِ السابعِ في الجزائر؟', b='جويلية', s='ونسمّيه في السعودية: يوليو.'),
    'dz8': dict(deck='dz', f='ما اسمُ هذا المَعْلَم؟', b='مقامُ الشهيد', s='بُنيَ لنتذكّرَ شهداءَ الثورة.', photo='alg1'),
    'dz9': dict(deck='dz', f='ما اسمُ هذا الحيِّ القديم؟', b='القصبة', s='أزقّتُها ضيّقةٌ ودرجُها كثير.', photo='alg2'),
    'dz10': dict(deck='dz', f='ما اسمُ هذا الجامع؟', b='جامعُ الجزائر', s='مئذنتُه أعلى مئذنةٍ في العالم.', photo='alg3'),
    # grammar (after the first lesson of الاسم والفعل والحرف)
    'qw1': dict(deck='qw', f='ما الاسم؟', b='كلمةٌ نُسمّي بها إنسانًا أو حيوانًا أو شيئًا أو مكانًا.', s='مثل: ماريا، القِطّ، العلَم، العاصمة'),
    'qw2': dict(deck='qw', f='ما الفعل؟', b='كلمةٌ تدلُّ على القيامِ بعمل.', s='مثل: زارَ، يَطيرُ، رسمَتْ'),
    'qw3': dict(deck='qw', f='ما الحرف؟', b='كلمةٌ صغيرةٌ تربطُ الكلمات.', s='مثل: مِنْ، إلى، في، على، عَنْ'),
    # grammar practice (after the first day she gets the step right)
    'qw4': dict(deck='qw', f='يَطيرُ الحمامُ إلى البحرِ.', mark='إلى', ask='ما نوعُ الكلمةِ الملوّنة؟', b='حرف', s='يربطُ الكلمات.'),
    'qw5': dict(deck='qw', f='يَطيرُ الحمامُ إلى البحرِ.', mark='يَطيرُ', ask='ما نوعُ الكلمةِ الملوّنة؟', b='فعل', s='عملٌ يقومُ به الحمام.'),
    'qw6': dict(deck='qw', f='جلسَ جدّي على الكرسيِّ.', mark='جدّي', ask='ما نوعُ الكلمةِ الملوّنة؟', b='اسم', s='اسمُ إنسان.'),
    # number words (after the first lesson of the maths step)
    'nm1': dict(deck='nm', n=1962, f='اقرئي العدد:', b='ألف وتسعمائة واثنان وستون', s='سنةُ الاستقلال.'),
    'nm2': dict(deck='nm', n=1954, f='اقرئي العدد:', b='ألف وتسعمائة وأربعة وخمسون', s='سنةُ بدايةِ الثورة.'),
    'nm3': dict(deck='nm', n=23519, f='اقرئي العدد:', b='ثلاثة وعشرون ألفًا وخمسمائة وتسعة عشر', s=''),
    'nm4': dict(deck='nm', n=265, f='اقرئي العدد:', b='مئتان وخمسة وستون', s='طولُ مئذنةِ جامعِ الجزائرِ بالمتر.'),
    'nm5': dict(deck='nm', f='في العدد ٢٣٥١٩، ما رقمُ الآلاف؟', b='٣', s='٢ عشراتُ الآلاف، ٣ آلاف، ٥ مئات، ١ عشرات، ٩ آحاد.'),
    'nm6': dict(deck='nm', n=4205, f='اقرئي العدد:', b='أربعة آلاف ومئتان وخمسة', s=''),
}

# the pictures of the day: real photos; cues = what to talk about (one per line); model = six sentences, the first N
# are shown and heard at level N (one sentence in weeks 1-2, growing to six lines)
PICS = {
    'alg1': dict(cues=['ماذا ترين؟', 'ما لونُ السماء؟', 'ماذا يوجدُ أمامَه؟'], teach=['dz8'], model=[
        'أرى مقامَ الشهيدِ عاليًا تحتَ السماءِ الزرقاء.',
        'أمامَه طريقٌ طويلٌ تسيرُ فيه السيّارات.',
        'وعلى جانبِ الطريقِ أشجارُ نخيلٍ خضراء.',
        'شكلُ المقامِ مثلُ ثلاثِ أوراقِ نخيلٍ مرفوعة.',
        'بُنيَ المقامُ لنتذكّرَ شهداءَ الثورة.',
        'ليتني أصعدُ إليه وأرى المدينةَ كلَّها من فوق!']),
    'alg2': dict(cues=['مَن ترين؟', 'ماذا تفعل؟', 'ما لونُ الجدران؟'], teach=['dz9'], model=[
        'أرى امرأةً تصعدُ درجًا في زقاقٍ ضيّق.',
        'هذا الزقاقُ في القصبة، الحيِّ القديمِ في العاصمة.',
        'الجدرانُ بيضاءُ وقديمة.',
        'بجانبِ الدرجِ بابٌ صغيرٌ وطاولةٌ زرقاء.',
        'تحملُ المرأةُ أكياسًا، ربّما عادَتْ من السوق.',
        'أحبُّ أن أمشيَ في أزقّةِ القصبةِ مع جدّتي.']),
    'alg3': dict(cues=['ماذا ترين؟', 'ما الذي يرفرف؟', 'ما لونُ القبّة؟'], teach=['dz10'], model=[
        'أرى مئذنةَ جامعِ الجزائرِ طويلةً جدًّا.',
        'بجانبِها علمُ الجزائرِ يرفرفُ فوقَ عمودٍ عالٍ.',
        'وفي الأسفلِ قبّةٌ ذهبيّةٌ جميلة.',
        'السماءُ زرقاءُ صافية، ولا أرى غيومًا.',
        'هذه المئذنةُ أعلى مئذنةٍ في العالم.',
        'عندما أصلُ إلى العاصمةِ أريدُ أن أصلّيَ في هذا الجامع.']),
    'alg4': dict(cues=['ماذا ترين في الماء؟', 'ما لونُ الشِّباك؟', 'ماذا يوجدُ خلفَ الميناء؟'], teach=[], model=[
        'أرى قاربًا أزرقَ في ماءِ الميناء.',
        'على الرصيفِ شِباكُ صيدٍ صفراءُ كثيرة.',
        'خلفَ الميناءِ بيوتٌ بيضاءُ فوقَ التلّة.',
        'يصطادُ الصيّادون السمكَ في الصباحِ الباكر، ثمّ يعودون إلى الميناء.',
        'الماءُ أزرقُ وهادئ، والسماءُ صافية.',
        'لهذا نسمّي العاصمةَ «الجزائرَ البيضاء».']),
    'alg5': dict(cues=['مَن ترين؟', 'ماذا يفعلون؟', 'ما لونُ السماء؟'], teach=[], model=[
        'أرى ناسًا كثيرين يمشون في الشارع.',
        'في وسطِ الصورةِ مئذنةٌ قديمةٌ عالية.',
        'وعلى جانبَيِ الشارعِ مبانٍ بيضاءُ عالية.',
        'بعضُ الناسِ يشترون، وبعضُهم يتحدّثون.',
        'السماءُ رماديّة، ربّما ستمطرُ بعدَ قليل.',
        'هذا الشارعُ قريبٌ من القصبة، وفيه دكاكينُ كثيرة.']),
    'alg6': dict(cues=['ماذا ترين في الوسط؟', 'ماذا يوجدُ حولَها؟', 'ماذا ترين في البعيد؟'], teach=[], model=[
        'أرى نافورةً في وسطِ حديقةٍ خضراء.',
        'حولَ النافورةِ عشبٌ أخضرُ وأشجارُ نخيلٍ طويلة.',
        'هذه حديقةُ التجاربِ في الحامّة، في العاصمة.',
        'وفي البعيدِ أرى مقامَ الشهيدِ فوقَ التلّة.',
        'يرتفعُ الماءُ إلى أعلى، ثمّ يسقطُ في الحوض.',
        'ليتني أجلسُ هنا وأقرأُ قصّةً تحتَ النخلة.']),
    'alg7': dict(cues=['ماذا ترين معلّقًا؟', 'ما ألوانُه؟', 'ما لونُ الجدران؟'], teach=[], model=[
        'أرى علمَ الجزائرِ معلّقًا في سوق.',
        'العلمُ أخضرُ وأبيض، وفي وسطِه هلالٌ ونجمةٌ باللونِ الأحمر.',
        'الجدرانُ والأقواسُ ورديّةُ اللون.',
        'تحتَ الأقواسِ دكاكينُ صغيرة، ورجلٌ يمشي في الممرّ.',
        'يعلّقُ الناسُ الأعلامَ في عيدِ الاستقلال، يومَ 5 جويلية.',
        'أحبُّ علمَ بلادي، وأرسمُه في كرّاستي.']),
    'alg8': dict(cues=['ماذا ترين؟', 'ما لونُ المبنى؟', 'ماذا يوجدُ أمامَه؟'], teach=[], model=[
        'أرى مبنى البريدِ المركزيِّ الأبيض.',
        'للمبنى أقواسٌ كبيرة، وفوقَه قِبابٌ صغيرة.',
        'أمامَ المبنى ساحةٌ ودرجٌ طويلٌ ينزلُ إلى الأسفل.',
        'السماءُ مليئةٌ بالغيوم.',
        'البريدُ المركزيُّ من أجملِ مباني العاصمة.',
        'قديمًا كان الناسُ يُرسلون منه الرسائلَ إلى كلِّ مكان.']),
}

# ---------------------------------------------------------------------------------------------------------------------
# The steps. Each day: one worked example (watch and listen), one item with one part to fill, then items alone.
# The step is passed after two different days with at most one mistake alone.
# ---------------------------------------------------------------------------------------------------------------------
# Arabic 1: الاسم والفعل والحرف. A sentence is a list of (word, kind): f = فعل, h = حرف, or a noun's kind
# (ins إنسان, hay حيوان, shay شيء, mak مكان); every word is a clip of its own.
def S(*ws):
    return [{'w': w, 'k': k} for w, k in ws]

SENT = {
    's1': S(('زارَتْ', 'f'), ('ماريا', 'ins'), ('القصبةَ', 'mak'), ('في', 'h'), ('العاصمةِ', 'mak')),
    's2': S(('يَطيرُ', 'f'), ('الحمامُ', 'hay'), ('إلى', 'h'), ('البحرِ', 'mak')),
    's3': S(('جلسَ', 'f'), ('جدّي', 'ins'), ('على', 'h'), ('الكرسيِّ', 'shay')),
    's4': S(('يُرَفْرِفُ', 'f'), ('العلَمُ', 'shay'), ('في', 'h'), ('السماءِ', 'mak')),
    's5': S(('ذهبَ', 'f'), ('أبي', 'ins'), ('إلى', 'h'), ('البريدِ', 'mak')),
    's6': S(('تَسبَحُ', 'f'), ('السمكةُ', 'hay'), ('في', 'h'), ('البحرِ', 'mak')),
    's7': S(('رسمَتْ', 'f'), ('ماريا', 'ins'), ('العلَمَ', 'shay')),
    's8': S(('خرجَ', 'f'), ('الأطفالُ', 'ins'), ('مِنَ', 'h'), ('المدرسةِ', 'mak')),
    's9': S(('يَشربُ', 'f'), ('القِطُّ', 'hay'), ('الحليبَ', 'shay')),
    's10': S(('نظرَتْ', 'f'), ('أمّي', 'ins'), ('إلى', 'h'), ('السفينةِ', 'shay')),
    's11': S(('سافرَ', 'f'), ('خالي', 'ins'), ('إلى', 'h'), ('وهرانَ', 'mak')),
    's12': S(('أكلَ', 'f'), ('جدّي', 'ins'), ('الكسكسَ', 'shay')),
    's13': S(('فتحَ', 'f'), ('أخي', 'ins'), ('البابَ', 'shay')),
    's14': S(('عادَ', 'f'), ('الصيّادُ', 'ins'), ('مِنَ', 'h'), ('البحرِ', 'mak')),
    's15': S(('تلعبُ', 'f'), ('البنتُ', 'ins'), ('في', 'h'), ('الحديقةِ', 'mak')),
    's16': S(('وقفَ', 'f'), ('العصفورُ', 'hay'), ('على', 'h'), ('النافذةِ', 'shay')),
}
WHY = {'f': 'فعلٌ: عملٌ نقومُ به.', 'h': 'حرفٌ: يربطُ الكلمات.', 'ins': 'اسمٌ: اسمُ إنسان.', 'hay': 'اسمٌ: اسمُ حيوان.',
       'shay': 'اسمٌ: اسمُ شيء.', 'mak': 'اسمٌ: اسمُ مكان.'}

AR1 = dict(
    id='ar1', subj='ar', kind='tag', title='الاسم والفعل والحرف', city='alg',
    cats=[['n', 'اسم'], ['f', 'فعل'], ['h', 'حرف']],
    rule=[dict(id='r-ar1-1', k='n', t='الاسمُ كلمةٌ نُسمّي بها إنسانًا أو حيوانًا أو شيئًا أو مكانًا.'),
          dict(id='r-ar1-2', k='f', t='الفعلُ كلمةٌ تدلُّ على القيامِ بعمل.'),
          dict(id='r-ar1-3', k='h', t='الحرفُ كلمةٌ صغيرةٌ تربطُ الكلمات، مثل: مِنْ، إلى، في، على، عَنْ.')],
    worked=['s1', 's2', 's3', 's4'],                       # one a day, in turn
    guided=[['s5', 2], ['s6', 0], ['s7', 2], ['s8', 2]],    # a sentence and the one word she labels
    alone=[['s9', 's10'], ['s11', 's12'], ['s13', 's14'], ['s15', 's16']],
    easy=[dict(ask='أيُّ الكلمتين حرف؟', opts=['في', 'البحر'], ok=0),
          dict(ask='أيُّ الكلمتين فعل؟', opts=['الحمام', 'يطير'], ok=1),
          dict(ask='أيُّ الكلمتين اسم؟', opts=['ماريا', 'على'], ok=0)],
    teachDay1=['qw1', 'qw2', 'qw3'], teachPass=['qw4', 'qw5', 'qw6'])

# Maths 1: writing numbers in words up to 99 999, and the space between the thousands and the hundreds.
WORDS = {
    23519: 'ثلاثة وعشرون ألفًا وخمسمائة وتسعة عشر', 1962: 'ألف وتسعمائة واثنان وستون', 4205: 'أربعة آلاف ومئتان وخمسة',
    15540: 'خمسة عشر ألفًا وخمسمائة وأربعون', 2640: 'ألفان وستمائة وأربعون', 30708: 'ثلاثون ألفًا وسبعمائة وثمانية',
    1954: 'ألف وتسعمائة وأربعة وخمسون', 12350: 'اثنا عشر ألفًا وثلاثمائة وخمسون', 265: 'مئتان وخمسة وستون',
    1830: 'ألف وثمانمائة وثلاثون', 7042: 'سبعة آلاف واثنان وأربعون', 48600: 'ثمانية وأربعون ألفًا وستمائة',
    10001: 'عشرة آلاف وواحد', 90417: 'تسعون ألفًا وأربعمائة وسبعة عشر', 5300: 'خمسة آلاف وثلاثمائة',
    52390: 'اثنان وخمسون ألفًا وثلاثمائة وتسعون', 88096: 'ثمانية وثمانون ألفًا وستة وتسعون', 2897: 'ألفان وثمانمائة وسبعة وتسعون',
    1000: 'ألف', 100: 'مائة', 2000: 'ألفان',
}
def split(n):          # the thousands and the rest, each with its words: the worked example shows them apart
    th, rest = divmod(n, 1000)
    w = WORDS[n]
    if not th:
        return [[None, None], [num(n), w]]
    k = w.find(' و', w.find('ألف'))
    return [[str(th), w[:k] if k > 0 else w], [f'{rest:03d}', w[k + 1:] if k > 0 else '']]

MA1 = dict(
    id='ma1', subj='ma', kind='numwords', title='أكتب العدد بالحروف', city='alg', corner='words',
    rule=[dict(id='r-ma2-1', t='نقسمُ العددَ منزلتين: منزلةَ الآلافِ ومنزلةَ الوحدات.'),
          dict(id='r-ma2-2', t='نقرأُ الآلافَ أوّلًا، ونقولُ بعدَها: ألف.'),
          dict(id='r-ma2-3', t='ثمّ نقرأُ المئاتِ والعشراتِ والآحاد.')],
    worked=[dict(n=n, parts=split(n)) for n in (23519, 1962, 4205, 15540)],   # worked parts keep plain digits; the app shows Saudi ones
    guided=[dict(n=2640, parts=['ألفان', 'وستمائة', 'وأربعون'], blank=1, opts=['وستمائة', 'وستون', 'وستة']),
            dict(n=30708, parts=['ثلاثون ألفًا', 'وسبعمائة', 'وثمانية'], blank=1, opts=['وسبعون', 'وسبعمائة', 'وسبعة']),
            dict(n=1954, parts=['ألف', 'وتسعمائة', 'وأربعة', 'وخمسون'], blank=2, opts=['وأربعون', 'وأربعمائة', 'وأربعة']),
            dict(n=12350, parts=['اثنا عشر ألفًا', 'وثلاثمائة', 'وخمسون'], blank=0, opts=['اثنا عشر ألفًا', 'اثنان ألفًا', 'عشرون ألفًا'])],
    # alone: generated in algeria.js (core.mathItems): eight a day, from three-digit numbers on her first day to five digits;
    # then «تدرّبي أكثر» gives more, as often as she likes
    practice=dict(perDay=8, more=6, digits=[[3, 4], [4, 4], [4, 5], [5, 5]]),
    easy=[dict(ask='ما رقمُ المئات في العدد ٣٥٢؟', opts=['٣', '٥'], ok=0),
          dict(ask='كم هو: ألف؟', opts=['١٠٠', '١٠٠٠'], ok=1),
          dict(ask='كيف نقرأ: ٢٠٠٠؟', opts=['ألفان', 'ألف'], ok=0)],
    teachDay1=['nm1', 'nm5', 'nm2'], teachPass=['nm3', 'nm4', 'nm6'])

# the place-value table of the Algerian book (p. 86): منزلة الآلاف (ع.آ، آ) and منزلة الوحدات (م، ع، و)
PLACES = [['ع.آ', 'عشرات الآلاف'], ['آ', 'الآلاف'], ['م', 'المئات'], ['ع', 'العشرات'], ['و', 'الوحدات']]

# what she is asked to say or write about the picture, by level (one sentence ... six lines)
SAY = ['قولي جملةً واحدةً عن الصورة.', 'قولي جملتين عن الصورة.', 'قولي ثلاثَ جملٍ عن الصورة.', 'قولي أربعَ جملٍ عن الصورة.',
       'قولي خمسَ جملٍ عن الصورة.', 'قولي ستَّ جملٍ عن الصورة.']
WRITE = ['اكتبي في كرّاستِكِ جملةً واحدةً عن الصورة.', 'اكتبي في كرّاستِكِ جملتين عن الصورة.', 'اكتبي في كرّاستِكِ ثلاثَ جملٍ عن الصورة.',
         'اكتبي في كرّاستِكِ أربعَ جملٍ عن الصورة.', 'اكتبي في كرّاستِكِ خمسةَ أسطرٍ عن الصورة.', 'اكتبي في كرّاستِكِ ستّةَ أسطرٍ عن الصورة.']


def build():
    lines = []                                   # [clip id, words said]: only what the voice says (her rule: a text once,
    add = lambda i, t: lines.append([i, t]) if all(x[0] != i for x in lines) else None   # never what she reads herself)
    cities = []
    for k, (cid, name, nick, lon, lat) in enumerate(CITIES):
        x, y = place(lon, lat)
        c = dict(id=cid, n=k + 1, name=name, nick=nick, x=x, y=y, ready=cid == 'alg', **({'mine': True} if cid == 'stf' else {}))
        if cid == 'alg':
            c.update(steps=['ar1'], pics=list(PICS),   # the trip is the Arabic door; the maths has its own (the train)
                     cards=['dz1', 'dz2', 'dz3', 'dz4', 'dz5', 'dz6', 'dz7'],
                     post=[dict(id=f'pc-alg-{i + 1}', t=AR(t)) for i, t in enumerate(POST_ALG)])     # she reads it herself
        cities.append(c)
    cards = {}
    for cid_, c in CARDS.items():                # she reads her cards herself: no voice
        c = dict(c); c['id'] = cid_
        for k in ('f', 'b', 's'):
            if c.get(k):
                c[k] = AR(c[k])
        if c.get('photo'):
            c['photo'] = f"assets/algeria/photos/{c['photo']}.webp"
        if c.get('n'):
            c['num'] = num(c.pop('n'))
        cards[cid_] = c
    pics = {}
    for pid, p in PICS.items():                  # the model description: heard once
        for i, t in enumerate(p['model']):
            add(f'm-{pid}-{i + 1}', t)
        pics[pid] = dict(p, id=pid, photo=f'assets/algeria/photos/{pid}.webp', model=[AR(t) for t in p['model']])
    sent = {sid: [dict(w, id=wid(w['w'])) for w in ws] for sid, ws in SENT.items()}
    for sid in AR1['worked']:                    # the worked examples are read; the practice sentences she reads herself
        add(f's-{sid}', ' '.join(w['w'] for w in SENT[sid]) + '.')
        for w in sent[sid]:
            add(w['id'], w['w'])
    for k, t in WHY.items():
        add(f'y-{k}', t)
    for st in (AR1, MA1):
        for r in st['rule']:
            add(r['id'], r['t'])
    for w in MA1['worked']:
        add(f"n-{w['n']}", WORDS[w['n']])
    for i, t in enumerate(SAY):
        add(f'lv-say-{i + 1}', t)
    for i, t in enumerate(WRITE):
        add(f'lv-write-{i + 1}', t)
    D = dict(v=1, decks=DECKS, cities=cities, cards=cards, pics=pics, sent=sent, why=WHY, steps={'ar1': AR1, 'ma1': MA1},
             places=PLACES, say=SAY, write=WRITE, words={str(n): w for n, w in WORDS.items()},
             photos=sorted({p['photo'] for p in pics.values()} | {c['photo'] for c in cards.values() if c.get('photo')}),
             lines=lines)
    json.dump(D, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(OUT, len(lines), 'voice lines,', len(cards), 'cards,', len(pics), 'pictures')


if __name__ == '__main__':
    build()
