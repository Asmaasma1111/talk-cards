/* حديقة العالِمة ماريا: the times-tables reward, built on Maria's term-1 science book (Grade 3, 1448 AH).
   Every 50 stars in جدول الضرب is one step in her garden. The steps follow the book: a flowering plant's life cycle
   (three plants, the bee for pollination), the butterfly and the frog (metamorphosis), a bird's nest (eggs, care of the
   young), a hedgehog (adaptation), a food chain (producer, consumers), and decomposers that make the soil rich for
   the next seeds. Then a new round begins. Facts and stage names are the book's own words.
   Loaded before maths.js; maths.js calls ScienceGarden.mount(api). Progress: m.garden.done in the times tables. */
(function (root) {
'use strict';

const PER = 50;   // stars for one step
// the drawings that have their ChatGPT picture (assets/garden/<id>.webp); sw.js caches the same list
const PICS = new Set('p0 p1 p3 p4 pp p5 rumF rumP rum strF strP straw b0 b1 b2 b3 f0 f1 f3 f4 nest0 nest1 nest2 sparrow hog hopper worm leaves humus bee can sun cloud tree mag'.split(' '));
const SPRITE = `<svg id="gdSprite" width="0" height="0" style="position:absolute" aria-hidden="true">
<defs>
  <radialGradient id="g-gSoil" cx="50%" cy="30%" r="70%"><stop offset="0" stop-color="#B07A52"/><stop offset="1" stop-color="#6E4127"/></radialGradient>
  <linearGradient id="g-gLeaf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9BEA8A"/><stop offset="1" stop-color="#34A353"/></linearGradient>
  <linearGradient id="g-gStem" gradientUnits="userSpaceOnUse" x1="92" y1="0" x2="110" y2="0"><stop offset="0" stop-color="#6FD07A"/><stop offset="1" stop-color="#2E9150"/></linearGradient>
  <radialGradient id="g-gPetal" cx="50%" cy="20%" r="90%"><stop offset="0" stop-color="#FFF08A"/><stop offset="1" stop-color="#FFB21E"/></radialGradient>
  <radialGradient id="g-gCenter" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#A06A3C"/><stop offset="1" stop-color="#5A3720"/></radialGradient>
  <radialGradient id="g-gSeed" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#E3B98B"/><stop offset="1" stop-color="#8A5A33"/></radialGradient>
  <radialGradient id="g-gPink" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="#FFC4E0"/><stop offset="1" stop-color="#F0458F"/></radialGradient>
  <radialGradient id="g-gRed" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#FF8A8A"/><stop offset="1" stop-color="#D62A3D"/></radialGradient>
  <radialGradient id="g-gCater" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="#D4F78A"/><stop offset="1" stop-color="#5DB534"/></radialGradient>
  <linearGradient id="g-gWing" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFC4EC"/><stop offset=".5" stop-color="#FF8CC8"/><stop offset="1" stop-color="#B892F2"/></linearGradient>
  <radialGradient id="g-gFrog" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="#B8F59A"/><stop offset="1" stop-color="#3FA552"/></radialGradient>
  <radialGradient id="g-gTad" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="#7A8A5C"/><stop offset="1" stop-color="#3A4228"/></radialGradient>
  <radialGradient id="g-gSpawn" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".95"/><stop offset="1" stop-color="#BFE6FF" stop-opacity=".7"/></radialGradient>
  <radialGradient id="g-gChrys" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="#C9EF9C"/><stop offset="1" stop-color="#6FB34A"/></radialGradient>
  <linearGradient id="g-gCan" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFB3D6"/><stop offset="1" stop-color="#E84C8E"/></linearGradient>
  <radialGradient id="g-gSun" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#FFF6A8"/><stop offset="1" stop-color="#FFC21E"/></radialGradient>
</defs>
<!-- a small kawaii face, used by many drawings: x, y via transform -->
<symbol id="g-face" viewBox="-20 -12 40 24"><ellipse cx="-9" cy="-2" rx="3.4" ry="4.2" fill="#2B2340"/><ellipse cx="9" cy="-2" rx="3.4" ry="4.2" fill="#2B2340"/><circle cx="-10" cy="-3.5" r="1.3" fill="#fff"/><circle cx="8" cy="-3.5" r="1.3" fill="#fff"/><path d="M-4 3 Q0 7 4 3" fill="none" stroke="#2B2340" stroke-width="2" stroke-linecap="round"/><ellipse cx="-15" cy="4" rx="4" ry="2.4" fill="#FF6F9C" opacity=".55"/><ellipse cx="15" cy="4" rx="4" ry="2.4" fill="#FF6F9C" opacity=".55"/></symbol>

<!-- ======== the plant's life (sunflower) ======== -->
<symbol id="g-p0" viewBox="0 0 200 200"><ellipse cx="100" cy="178" rx="78" ry="20" fill="url(#g-gSoil)"/><path d="M100 140 C120 150 120 175 100 178 C80 175 80 150 100 140 Z" fill="url(#g-gSeed)" stroke="#5A3720" stroke-width="2"/><path d="M100 146 L100 172" stroke="#F3D7B3" stroke-width="3" stroke-linecap="round" opacity=".7"/></symbol>
<symbol id="g-p1" viewBox="0 0 200 200"><rect x="22" y="128" width="156" height="66" rx="20" fill="url(#g-gSoil)"/><circle cx="60" cy="150" r="4" fill="#8E5E3A"/><circle cx="140" cy="175" r="5" fill="#8E5E3A"/><circle cx="150" cy="140" r="3" fill="#8E5E3A"/><path d="M100 160 C 96 172, 108 180, 98 192" fill="none" stroke="#FFF6E8" stroke-width="5" stroke-linecap="round"/><path d="M98 182 L88 188 M102 176 L112 182" stroke="#FFF6E8" stroke-width="3" stroke-linecap="round"/><path d="M100 138 C116 146 116 166 100 168 C84 166 84 146 100 138 Z" fill="url(#g-gSeed)" stroke="#5A3720" stroke-width="2"/><path d="M100 140 C 100 120, 108 112, 116 110" fill="none" stroke="url(#g-gStem)" stroke-width="7" stroke-linecap="round"/><path d="M116 110 C 124 104, 130 112, 122 116 C 118 118, 116 114, 116 110 Z" fill="url(#g-gLeaf)"/></symbol>
<symbol id="g-p3" viewBox="0 0 200 200"><ellipse cx="100" cy="178" rx="78" ry="20" fill="url(#g-gSoil)"/><path d="M100 176 C 96 140, 104 110, 100 70" fill="none" stroke="url(#g-gStem)" stroke-width="10" stroke-linecap="round"/><g fill="url(#g-gLeaf)"><path d="M99 150 C 66 132, 48 154, 62 164 C 76 172, 96 162, 99 150 Z"/><path d="M101 128 C 134 108, 154 130, 140 142 C 126 150, 104 140, 101 128 Z"/><path d="M100 100 C 72 80, 54 100, 68 112 C 80 120, 98 112, 100 100 Z"/><path d="M100 76 C 116 58, 134 66, 126 80 C 118 90, 104 86, 100 76 Z"/></g></symbol>
<symbol id="g-p4" viewBox="0 0 200 200"><ellipse cx="100" cy="182" rx="78" ry="16" fill="url(#g-gSoil)"/><path d="M100 180 C 96 140, 104 110, 100 64" fill="none" stroke="url(#g-gStem)" stroke-width="10" stroke-linecap="round"/><g fill="url(#g-gLeaf)"><path d="M99 156 C 64 136, 46 160, 60 170 C 76 178, 96 168, 99 156 Z"/><path d="M101 130 C 136 110, 156 134, 142 146 C 126 154, 104 142, 101 130 Z"/><path d="M100 104 C 70 86, 52 106, 66 118 C 80 126, 98 116, 100 104 Z"/></g>
  <g transform="translate(100 52)"><g fill="url(#g-gPetal)" stroke="#E89A10" stroke-width="1.5">
  <ellipse rx="10" ry="24" transform="rotate(0) translate(0 -30)"/><ellipse rx="10" ry="24" transform="rotate(26) translate(0 -30)"/><ellipse rx="10" ry="24" transform="rotate(52) translate(0 -30)"/><ellipse rx="10" ry="24" transform="rotate(78) translate(0 -30)"/><ellipse rx="10" ry="24" transform="rotate(104) translate(0 -30)"/><ellipse rx="10" ry="24" transform="rotate(130) translate(0 -30)"/><ellipse rx="10" ry="24" transform="rotate(156) translate(0 -30)"/><ellipse rx="10" ry="24" transform="rotate(182) translate(0 -30)"/><ellipse rx="10" ry="24" transform="rotate(208) translate(0 -30)"/><ellipse rx="10" ry="24" transform="rotate(234) translate(0 -30)"/><ellipse rx="10" ry="24" transform="rotate(260) translate(0 -30)"/><ellipse rx="10" ry="24" transform="rotate(286) translate(0 -30)"/><ellipse rx="10" ry="24" transform="rotate(312) translate(0 -30)"/><ellipse rx="10" ry="24" transform="rotate(338) translate(0 -30)"/></g>
  <circle r="26" fill="url(#g-gCenter)"/><use href="#g-face" x="-20" y="-12" width="40" height="24"/></g></symbol>
<symbol id="g-p5" viewBox="0 0 200 200"><ellipse cx="100" cy="182" rx="78" ry="16" fill="url(#g-gSoil)"/><path d="M100 180 C 96 140, 104 110, 104 70" fill="none" stroke="url(#g-gStem)" stroke-width="10" stroke-linecap="round"/><g fill="url(#g-gLeaf)"><path d="M99 156 C 64 136, 46 160, 60 170 C 76 178, 96 168, 99 156 Z"/><path d="M101 130 C 136 110, 156 134, 142 146 C 126 154, 104 142, 101 130 Z"/></g>
  <g transform="translate(110 58) rotate(18)"><g fill="#F6C24A" stroke="#D99A10" stroke-width="1.5" opacity=".9"><ellipse rx="8" ry="18" transform="rotate(0) translate(0 -33)"/><ellipse rx="8" ry="18" transform="rotate(45) translate(0 -33)"/><ellipse rx="8" ry="18" transform="rotate(90) translate(0 -33)"/><ellipse rx="8" ry="18" transform="rotate(135) translate(0 -33)"/><ellipse rx="8" ry="18" transform="rotate(180) translate(0 -33)"/><ellipse rx="8" ry="18" transform="rotate(225) translate(0 -33)"/><ellipse rx="8" ry="18" transform="rotate(270) translate(0 -33)"/><ellipse rx="8" ry="18" transform="rotate(315) translate(0 -33)"/></g>
  <circle r="30" fill="url(#g-gCenter)"/><g fill="#2E1C10" opacity=".85"><ellipse cx="-12" cy="-10" rx="3" ry="5"/><ellipse cx="0" cy="-14" rx="3" ry="5"/><ellipse cx="12" cy="-10" rx="3" ry="5"/><ellipse cx="-16" cy="2" rx="3" ry="5"/><ellipse cx="-4" cy="-2" rx="3" ry="5"/><ellipse cx="8" cy="0" rx="3" ry="5"/><ellipse cx="18" cy="4" rx="3" ry="5"/><ellipse cx="-10" cy="12" rx="3" ry="5"/><ellipse cx="2" cy="12" rx="3" ry="5"/><ellipse cx="14" cy="16" rx="3" ry="5"/></g></g>
  <g fill="url(#g-gSeed)" stroke="#5A3720" stroke-width="1"><path d="M60 140 c6 3 6 12 0 13 c-6-1-6-10 0-13z"/><path d="M146 158 c6 3 6 12 0 13 c-6-1-6-10 0-13z"/><path d="M126 112 c6 3 6 12 0 13 c-6-1-6-10 0-13z"/></g></symbol>
<!-- other flowers for the garden: tulip and strawberry (grown) -->
<symbol id="g-straw" viewBox="0 0 200 200"><ellipse cx="100" cy="182" rx="76" ry="15" fill="url(#g-gSoil)"/><g fill="url(#g-gLeaf)"><path d="M100 170 C 60 150, 50 120, 70 108 C 90 120, 98 150, 100 170 Z"/><path d="M100 170 C 140 150, 150 120, 130 108 C 110 120, 102 150, 100 170 Z"/><path d="M100 168 C 90 130, 96 100, 110 92 C 118 112, 110 150, 100 168 Z"/></g><path d="M70 130 C 60 140, 58 150, 60 156" fill="none" stroke="#3E9C4B" stroke-width="3"/><path d="M60 156 C 44 160, 46 186, 62 186 C 78 186, 80 160, 60 156 Z" fill="url(#g-gRed)"/><path d="M138 128 C 146 138, 148 146, 146 152" fill="none" stroke="#3E9C4B" stroke-width="3"/><path d="M146 152 C 130 156, 132 182, 148 182 C 164 182, 166 156, 146 152 Z" fill="url(#g-gRed)"/><g fill="#FFE6A8"><circle cx="56" cy="166" r="1.6"/><circle cx="64" cy="172" r="1.6"/><circle cx="58" cy="178" r="1.6"/><circle cx="142" cy="162" r="1.6"/><circle cx="150" cy="168" r="1.6"/><circle cx="144" cy="174" r="1.6"/></g><g transform="translate(112 84)"><circle r="7" fill="#FFD84D"/><g fill="#fff" stroke="#EDE3F7"><circle cx="0" cy="-12" r="8"/><circle cx="11" cy="-4" r="8"/><circle cx="7" cy="10" r="8"/><circle cx="-7" cy="10" r="8"/><circle cx="-11" cy="-4" r="8"/></g><circle r="6" fill="#FFD84D"/></g><use href="#g-face" x="44" y="164" width="32" height="18"/></symbol>

<!-- ======== the butterfly's life ======== -->
<symbol id="g-b0" viewBox="0 0 200 200"><path d="M30 120 C 60 50, 150 50, 172 96 C 150 150, 60 160, 30 120 Z" fill="url(#g-gLeaf)"/><path d="M30 120 C 80 100, 130 96, 172 96" fill="none" stroke="#2E8B4A" stroke-width="3"/><g fill="#FFF3B0" stroke="#E8C24A" stroke-width="1.5"><circle cx="96" cy="94" r="7"/><circle cx="112" cy="90" r="7"/><circle cx="104" cy="108" r="7"/><circle cx="120" cy="104" r="7"/><circle cx="88" cy="110" r="7"/></g><g fill="#fff" opacity=".8"><circle cx="94" cy="92" r="2"/><circle cx="110" cy="88" r="2"/><circle cx="102" cy="106" r="2"/><circle cx="118" cy="102" r="2"/><circle cx="86" cy="108" r="2"/></g></symbol>
<symbol id="g-b1" viewBox="0 0 200 200"><path d="M20 150 C 60 110, 150 110, 186 140 C 150 176, 60 182, 20 150 Z" fill="url(#g-gLeaf)" opacity=".9"/><g fill="url(#g-gCater)" stroke="#4E9C2C" stroke-width="2"><circle cx="58" cy="120" r="16"/><circle cx="82" cy="114" r="18"/><circle cx="106" cy="114" r="19"/><circle cx="130" cy="112" r="20"/></g><g fill="#FFD84D"><circle cx="58" cy="114" r="3"/><circle cx="82" cy="106" r="3"/><circle cx="106" cy="106" r="3"/></g><circle cx="154" cy="104" r="24" fill="url(#g-gCater)" stroke="#4E9C2C" stroke-width="2"/><path d="M146 82 L140 64 M162 82 L168 64" stroke="#3E7E22" stroke-width="3" stroke-linecap="round"/><circle cx="140" cy="62" r="4" fill="#FF6FA8"/><circle cx="168" cy="62" r="4" fill="#FF6FA8"/><use href="#g-face" x="136" y="96" width="36" height="22"/></symbol>
<symbol id="g-b2" viewBox="0 0 200 200"><path d="M40 40 L160 40" stroke="#8A5A33" stroke-width="10" stroke-linecap="round"/><path d="M100 44 L100 58" stroke="#B5E07A" stroke-width="4"/><path d="M100 56 C 130 66, 132 140, 100 168 C 68 140, 70 66, 100 56 Z" fill="url(#g-gChrys)" stroke="#4E9C2C" stroke-width="2"/><path d="M84 96 C 96 102, 104 102, 116 96 M82 120 C 96 126, 104 126, 118 120" fill="none" stroke="#4E9C2C" stroke-width="2" opacity=".6"/><g fill="#FFD84D"><circle cx="90" cy="84" r="3"/><circle cx="110" cy="84" r="3"/><circle cx="100" cy="140" r="3"/></g><use href="#g-face" x="82" y="100" width="36" height="22" opacity=".9"/></symbol>
<symbol id="g-b3" viewBox="0 0 200 200"><g stroke="#B04C8E" stroke-width="2"><path d="M98 96 C 60 40, 18 56, 30 98 C 40 124, 80 118, 98 104 Z" fill="url(#g-gWing)"/><path d="M102 96 C 140 40, 182 56, 170 98 C 160 124, 120 118, 102 104 Z" fill="url(#g-gWing)"/><path d="M98 106 C 64 120, 50 160, 78 160 C 94 160, 100 130, 98 110 Z" fill="url(#g-gWing)"/><path d="M102 106 C 136 120, 150 160, 122 160 C 106 160, 100 130, 102 110 Z" fill="url(#g-gWing)"/></g><g fill="#fff" opacity=".7"><circle cx="54" cy="80" r="8"/><circle cx="146" cy="80" r="8"/><circle cx="76" cy="140" r="5"/><circle cx="124" cy="140" r="5"/></g><rect x="92" y="86" width="16" height="70" rx="8" fill="#5A3B7A"/><circle cx="100" cy="82" r="14" fill="#6D4A92"/><path d="M94 70 C 88 56, 80 52, 74 50 M106 70 C 112 56, 120 52, 126 50" fill="none" stroke="#5A3B7A" stroke-width="3" stroke-linecap="round"/><use href="#g-face" x="88" y="76" width="24" height="14"/></symbol>

<!-- ======== the frog's life ======== -->
<symbol id="g-f0" viewBox="0 0 200 200"><ellipse cx="100" cy="150" rx="86" ry="30" fill="#7CC6F2" opacity=".5"/><g fill="url(#g-gSpawn)" stroke="#9FCDEB" stroke-width="2"><circle cx="70" cy="110" r="18"/><circle cx="100" cy="100" r="18"/><circle cx="130" cy="110" r="18"/><circle cx="84" cy="136" r="18"/><circle cx="116" cy="136" r="18"/><circle cx="100" cy="72" r="18"/><circle cx="56" cy="138" r="16"/><circle cx="144" cy="138" r="16"/></g><g fill="#2B2340"><circle cx="70" cy="110" r="5"/><circle cx="100" cy="100" r="5"/><circle cx="130" cy="110" r="5"/><circle cx="84" cy="136" r="5"/><circle cx="116" cy="136" r="5"/><circle cx="100" cy="72" r="5"/><circle cx="56" cy="138" r="4.5"/><circle cx="144" cy="138" r="4.5"/></g></symbol>
<symbol id="g-f1" viewBox="0 0 200 200"><ellipse cx="100" cy="150" rx="86" ry="30" fill="#7CC6F2" opacity=".5"/><path d="M110 110 C 140 96, 166 120, 186 104 C 170 130, 146 126, 112 124 Z" fill="#4E5A34"/><ellipse cx="88" cy="114" rx="34" ry="26" fill="url(#g-gTad)"/><circle cx="74" cy="106" r="8" fill="#fff"/><circle cx="72" cy="106" r="4.5" fill="#2B2340"/><path d="M60 122 Q66 128 74 124" fill="none" stroke="#2B2340" stroke-width="2" stroke-linecap="round"/><ellipse cx="78" cy="96" rx="10" ry="5" fill="#fff" opacity=".25"/></symbol>
<symbol id="g-f2" viewBox="0 0 200 200"><ellipse cx="100" cy="150" rx="86" ry="30" fill="#7CC6F2" opacity=".5"/><path d="M110 110 C 140 98, 162 118, 180 106 C 166 128, 144 126, 112 124 Z" fill="#55663A"/><g stroke="#55663A" stroke-width="6" stroke-linecap="round" fill="none"><path d="M100 132 L112 148 L124 146"/><path d="M84 136 L90 154 L102 156"/></g><ellipse cx="88" cy="114" rx="34" ry="26" fill="#6F8A4A"/><circle cx="74" cy="106" r="8" fill="#fff"/><circle cx="72" cy="106" r="4.5" fill="#2B2340"/><path d="M60 122 Q66 128 74 124" fill="none" stroke="#2B2340" stroke-width="2" stroke-linecap="round"/></symbol>
<symbol id="g-f3" viewBox="0 0 200 200"><ellipse cx="100" cy="166" rx="80" ry="22" fill="#7CC6F2" opacity=".5"/><path d="M128 140 C 150 140, 166 130, 176 118 C 166 140, 150 150, 128 150 Z" fill="#6CB45A"/><ellipse cx="96" cy="136" rx="38" ry="28" fill="url(#g-gFrog)"/><g fill="url(#g-gFrog)"><circle cx="78" cy="106" r="14"/><circle cx="114" cy="106" r="14"/></g><g fill="#fff"><circle cx="78" cy="104" r="8"/><circle cx="114" cy="104" r="8"/></g><g fill="#2B2340"><circle cx="78" cy="105" r="4.5"/><circle cx="114" cy="105" r="4.5"/></g><path d="M86 132 Q96 140 106 132" fill="none" stroke="#2B2340" stroke-width="2.5" stroke-linecap="round"/><g fill="#5AA548"><ellipse cx="66" cy="160" rx="14" ry="6"/><ellipse cx="124" cy="160" rx="14" ry="6"/></g></symbol>
<symbol id="g-f4" viewBox="0 0 200 200"><ellipse cx="100" cy="172" rx="90" ry="22" fill="url(#g-gLeaf)"/><ellipse cx="100" cy="132" rx="58" ry="42" fill="url(#g-gFrog)"/><g fill="url(#g-gFrog)"><circle cx="72" cy="88" r="22"/><circle cx="128" cy="88" r="22"/></g><g fill="#fff"><circle cx="72" cy="86" r="13"/><circle cx="128" cy="86" r="13"/></g><g fill="#2B2340"><circle cx="72" cy="88" r="7"/><circle cx="128" cy="88" r="7"/></g><g fill="#fff"><circle cx="69" cy="84" r="2.5"/><circle cx="125" cy="84" r="2.5"/></g><path d="M80 130 Q100 146 120 130" fill="none" stroke="#2B2340" stroke-width="3.5" stroke-linecap="round"/><g fill="#FF6F9C" opacity=".55"><ellipse cx="62" cy="124" rx="9" ry="5"/><ellipse cx="138" cy="124" rx="9" ry="5"/></g><ellipse cx="100" cy="150" rx="30" ry="16" fill="#E9FBD6" opacity=".6"/><g fill="#4FA548"><ellipse cx="52" cy="168" rx="20" ry="8"/><ellipse cx="148" cy="168" rx="20" ry="8"/></g></symbol>

<!-- ======== the ladybird (shown grown) ======== -->

<!-- the pomegranate (رمّان), the bee, and pollination -->
<symbol id="g-rum" viewBox="0 0 200 200"><ellipse cx="100" cy="184" rx="76" ry="14" fill="url(#g-gSoil)"/><path d="M100 182 C 98 150, 104 130, 100 104" fill="none" stroke="#8A5A33" stroke-width="10" stroke-linecap="round"/><path d="M100 140 C 80 126, 70 116, 66 104 M100 128 C 122 118, 132 106, 136 96" fill="none" stroke="#8A5A33" stroke-width="6" stroke-linecap="round"/>
  <g fill="url(#g-gLeaf)"><ellipse cx="100" cy="70" rx="62" ry="44"/><ellipse cx="58" cy="96" rx="34" ry="26"/><ellipse cx="144" cy="92" rx="34" ry="26"/></g>
  <g><circle cx="70" cy="104" r="17" fill="url(#g-gRed)"/><path d="M64 88 L70 82 L76 88 Z" fill="#C2263A"/><circle cx="136" cy="98" r="15" fill="url(#g-gRed)"/><path d="M131 84 L136 79 L141 84 Z" fill="#C2263A"/><circle cx="104" cy="56" r="13" fill="url(#g-gRed)"/><path d="M100 44 L104 40 L108 44 Z" fill="#C2263A"/></g>
  <use href="#g-face" x="54" y="98" width="32" height="18"/><g fill="#FF8A5A"><path d="M48 64 l6 -10 l6 10 z"/><path d="M148 60 l6 -10 l6 10 z"/></g></symbol>
<symbol id="g-bee" viewBox="0 0 200 200"><g fill="#E8F6FF" stroke="#9FCDEB" stroke-width="3" opacity=".95"><ellipse cx="82" cy="62" rx="30" ry="40" transform="rotate(-25 82 62)"/><ellipse cx="122" cy="62" rx="30" ry="40" transform="rotate(25 122 62)"/></g><ellipse cx="100" cy="122" rx="62" ry="46" fill="#FFD84D" stroke="#2B2340" stroke-width="4"/><path d="M78 80 C 70 110, 70 136, 78 164 M110 78 C 102 110, 102 140, 110 166" fill="none" stroke="#2B2340" stroke-width="14"/><path d="M160 122 L182 128 L160 134 Z" fill="#2B2340"/><circle cx="54" cy="116" r="30" fill="#FFD84D" stroke="#2B2340" stroke-width="4"/><path d="M44 90 C 36 72, 30 66, 22 64 M60 88 C 62 70, 68 62, 76 58" fill="none" stroke="#2B2340" stroke-width="4" stroke-linecap="round"/><use href="#g-face" x="30" y="108" width="46" height="26"/></symbol>
<symbol id="g-pp" viewBox="0 0 200 200"><use href="#g-p4" width="200" height="200"/><g fill="#FFE36E" stroke="#E8A800" stroke-width="1"><circle cx="66" cy="40" r="3.5"/><circle cx="58" cy="52" r="2.8"/><circle cx="74" cy="30" r="2.6"/><circle cx="140" cy="76" r="3"/><circle cx="148" cy="66" r="2.4"/></g><use href="#g-bee" x="108" y="6" width="74" height="74"/></symbol>
<!-- watering can and sun -->
<symbol id="g-can" viewBox="0 0 200 200"><path d="M150 96 L188 62 L196 70 L162 112 Z" fill="url(#g-gCan)" stroke="#B83372" stroke-width="3" stroke-linejoin="round"/><ellipse cx="192" cy="64" rx="8" ry="12" transform="rotate(40 192 64)" fill="#FF8CC0" stroke="#B83372" stroke-width="3"/><path d="M40 80 L150 80 L144 164 C 144 172, 46 172, 46 164 Z" fill="url(#g-gCan)" stroke="#B83372" stroke-width="3" stroke-linejoin="round"/><path d="M60 80 C 60 34, 130 34, 130 80" fill="none" stroke="#B83372" stroke-width="12" stroke-linecap="round"/><ellipse cx="95" cy="80" rx="55" ry="10" fill="#FFC4E0" stroke="#B83372" stroke-width="3"/><g fill="#fff" opacity=".85"><circle cx="70" cy="118" r="8"/><circle cx="94" cy="132" r="6"/><circle cx="116" cy="114" r="7"/></g><use href="#g-face" x="72" y="128" width="46" height="28"/></symbol>
<symbol id="g-sun" viewBox="0 0 200 200"><g stroke="#FFC21E" stroke-width="10" stroke-linecap="round"><path d="M100 10 L100 34"/><path d="M100 166 L100 190"/><path d="M10 100 L34 100"/><path d="M166 100 L190 100"/><path d="M36 36 L54 54"/><path d="M146 146 L164 164"/><path d="M164 36 L146 54"/><path d="M54 146 L36 164"/></g><circle cx="100" cy="100" r="56" fill="url(#g-gSun)"/><use href="#g-face" x="62" y="88" width="76" height="46"/></symbol>
<symbol id="g-cloud" viewBox="0 0 200 80"><g fill="#fff"><circle cx="60" cy="50" r="28"/><circle cx="100" cy="36" r="34"/><circle cx="142" cy="50" r="26"/><rect x="40" y="50" width="120" height="26" rx="13"/></g></symbol>
<symbol id="g-tree" viewBox="0 0 200 260"><path d="M86 258 C 90 200, 88 170, 80 140 L 120 140 C 112 170, 110 200, 114 258 Z" fill="#9A6A44"/><path d="M98 160 C 80 150, 66 146, 56 136 M104 150 C 124 140, 136 132, 146 120" fill="none" stroke="#9A6A44" stroke-width="9" stroke-linecap="round"/><g fill="url(#g-gLeaf)"><circle cx="100" cy="86" r="66"/><circle cx="46" cy="118" r="42"/><circle cx="156" cy="112" r="42"/><circle cx="100" cy="38" r="40"/></g><g fill="#fff" opacity=".18"><circle cx="76" cy="60" r="16"/><circle cx="140" cy="96" r="10"/></g></symbol>
<symbol id="g-nest0" viewBox="0 0 200 200"><g fill="#C9E7FF" stroke="#7FB6E0" stroke-width="2"><ellipse cx="84" cy="112" rx="16" ry="20"/><ellipse cx="114" cy="110" rx="16" ry="20"/><ellipse cx="100" cy="120" rx="16" ry="20"/></g><g fill="#5A7FA8" opacity=".5"><circle cx="80" cy="106" r="2.5"/><circle cx="118" cy="104" r="2.5"/><circle cx="104" cy="116" r="2.5"/></g><path d="M30 120 C 40 160, 160 160, 170 120 C 150 134, 50 134, 30 120 Z" fill="#A9784E" stroke="#7A5232" stroke-width="3"/><path d="M40 128 C 70 140, 130 140, 160 128 M46 140 C 80 150, 120 150, 154 140 M60 120 L 74 150 M100 124 L 100 156 M140 120 L 126 150" fill="none" stroke="#7A5232" stroke-width="3" stroke-linecap="round"/></symbol>
<symbol id="g-sparrow" viewBox="0 0 200 200"><path d="M140 118 L 186 92 L 176 128 Z" fill="#7A5232"/><ellipse cx="104" cy="122" rx="60" ry="46" fill="#B9845A"/><ellipse cx="96" cy="136" rx="40" ry="28" fill="#F3DDBF"/><path d="M110 104 C 140 100, 158 118, 150 136 C 132 140, 116 128, 110 104 Z" fill="#8E5E3A"/><circle cx="60" cy="88" r="32" fill="#B9845A"/><path d="M28 86 L 10 92 L 28 98 Z" fill="#FFB21E" stroke="#C98400" stroke-width="2"/><circle cx="50" cy="82" r="6" fill="#2B2340"/><circle cx="48" cy="80" r="2" fill="#fff"/><ellipse cx="46" cy="98" rx="6" ry="3.5" fill="#FF6F9C" opacity=".55"/><g stroke="#C98400" stroke-width="4" stroke-linecap="round"><path d="M92 166 L 88 184 M112 166 L 116 184"/></g></symbol>
<symbol id="g-nest1" viewBox="0 0 200 200"><use href="#g-sparrow" x="44" y="22" width="120" height="120"/><path d="M30 120 C 40 160, 160 160, 170 120 C 150 134, 50 134, 30 120 Z" fill="#A9784E" stroke="#7A5232" stroke-width="3"/><path d="M40 128 C 70 140, 130 140, 160 128 M46 140 C 80 150, 120 150, 154 140 M60 120 L 74 150 M100 124 L 100 156 M140 120 L 126 150" fill="none" stroke="#7A5232" stroke-width="3" stroke-linecap="round"/></symbol>
<symbol id="g-nest2" viewBox="0 0 200 200"><circle cx="100" cy="100" r="34" fill="#FFE36E"/><circle cx="100" cy="72" r="26" fill="#FFE98A"/><path d="M92 56 C 96 44, 104 44, 108 56" fill="none" stroke="#E8C24A" stroke-width="4" stroke-linecap="round"/><path d="M90 78 L 100 92 L 110 78 Z" fill="#FF9F43" stroke="#E07A1F" stroke-width="2"/><path d="M90 78 L 100 72 L 110 78 Z" fill="#FFB86B"/><circle cx="90" cy="68" r="4" fill="#2B2340"/><circle cx="110" cy="68" r="4" fill="#2B2340"/><path d="M68 100 C 60 96, 58 108, 66 112 M132 100 C 140 96, 142 108, 134 112" fill="#FFD84D" stroke="#E8C24A" stroke-width="2"/><path d="M30 120 C 40 160, 160 160, 170 120 C 150 134, 50 134, 30 120 Z" fill="#A9784E" stroke="#7A5232" stroke-width="3"/><path d="M40 128 C 70 140, 130 140, 160 128 M46 140 C 80 150, 120 150, 154 140 M60 120 L 74 150 M100 124 L 100 156 M140 120 L 126 150" fill="none" stroke="#7A5232" stroke-width="3" stroke-linecap="round"/></symbol>
<symbol id="g-hog" viewBox="0 0 200 200"><g fill="#7A5232"><path d="M40 120 L 30 96 L 52 104 L 50 78 L 70 92 L 76 66 L 92 86 L 104 60 L 114 86 L 132 66 L 134 92 L 156 80 L 150 106 L 172 104 L 160 126 Z"/></g><ellipse cx="100" cy="128" rx="64" ry="40" fill="#9A6A44"/><path d="M36 132 C 30 112, 46 100, 64 104 C 76 120, 70 146, 52 150 C 44 150, 38 144, 36 132 Z" fill="#F3DDBF"/><circle cx="30" cy="132" r="7" fill="#2B2340"/><circle cx="54" cy="122" r="5" fill="#2B2340"/><circle cx="53" cy="120" r="1.6" fill="#fff"/><ellipse cx="58" cy="136" rx="6" ry="3.5" fill="#FF6F9C" opacity=".55"/><g fill="#7A5232"><ellipse cx="74" cy="166" rx="10" ry="6"/><ellipse cx="132" cy="166" rx="10" ry="6"/></g></symbol>
<symbol id="g-hopper" viewBox="0 0 200 200"><path d="M40 120 C 60 96, 140 92, 168 112 C 150 134, 70 138, 40 120 Z" fill="url(#g-gLeaf)" stroke="#2E8B4A" stroke-width="2"/><path d="M110 112 L 150 70 L 170 130" fill="none" stroke="#3EA352" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><path d="M80 124 L 70 150 M96 126 L 92 152" stroke="#3EA352" stroke-width="5" stroke-linecap="round"/><circle cx="48" cy="112" r="14" fill="#7EDB7A"/><circle cx="44" cy="108" r="5" fill="#2B2340"/><circle cx="43" cy="106" r="1.6" fill="#fff"/><path d="M44 98 C 36 70, 24 58, 12 54 M52 98 C 50 72, 44 58, 36 50" fill="none" stroke="#2E8B4A" stroke-width="3" stroke-linecap="round"/></symbol>
<symbol id="g-worm" viewBox="0 0 200 200"><path d="M30 140 C 50 100, 80 160, 110 120 C 130 94, 150 110, 166 96" fill="none" stroke="#F49AB0" stroke-width="26" stroke-linecap="round"/><path d="M30 140 C 50 100, 80 160, 110 120 C 130 94, 150 110, 166 96" fill="none" stroke="#E7738F" stroke-width="26" stroke-linecap="round" stroke-dasharray="2 12" opacity=".6"/><use href="#g-face" x="144" y="84" width="34" height="20"/></symbol>
<symbol id="g-leaves" viewBox="0 0 200 120"><g stroke="#A0522D" stroke-width="2"><ellipse cx="60" cy="90" rx="34" ry="14" fill="#F4A340" transform="rotate(-12 60 90)"/><ellipse cx="110" cy="96" rx="34" ry="13" fill="#E8742A" transform="rotate(10 110 96)"/><ellipse cx="148" cy="86" rx="30" ry="12" fill="#C9A13A" transform="rotate(-20 148 86)"/><ellipse cx="96" cy="76" rx="30" ry="12" fill="#D9862E" transform="rotate(4 96 76)"/></g></symbol>
<symbol id="g-mag" viewBox="0 0 200 200"><path d="M128 128 L 176 176" stroke="#B83372" stroke-width="22" stroke-linecap="round"/><circle cx="86" cy="86" r="58" fill="#E6F6FF" stroke="#E84C8E" stroke-width="14"/><ellipse cx="66" cy="66" rx="18" ry="10" fill="#fff" transform="rotate(-35 66 66)"/><use href="#g-face" x="64" y="84" width="44" height="26"/></symbol>
<symbol id="g-rumF" viewBox="0 0 200 200"><ellipse cx="100" cy="184" rx="76" ry="14" fill="url(#g-gSoil)"/><path d="M100 182 C 98 150, 104 130, 100 104" fill="none" stroke="#8A5A33" stroke-width="10" stroke-linecap="round"/><path d="M100 140 C 80 126, 70 116, 66 104 M100 128 C 122 118, 132 106, 136 96" fill="none" stroke="#8A5A33" stroke-width="6" stroke-linecap="round"/><g fill="url(#g-gLeaf)"><ellipse cx="100" cy="70" rx="62" ry="44"/><ellipse cx="58" cy="96" rx="34" ry="26"/><ellipse cx="144" cy="92" rx="34" ry="26"/></g><g fill="#FF6B3D" stroke="#C93A1A" stroke-width="2"><path d="M60 92 C 60 112, 80 112, 80 92 L 74 100 L 70 88 L 66 100 Z"/><path d="M126 86 C 126 106, 146 106, 146 86 L 140 94 L 136 82 L 132 94 Z"/><path d="M94 44 C 94 64, 114 64, 114 44 L 108 52 L 104 40 L 100 52 Z"/></g><use href="#g-face" x="88" y="64" width="34" height="20"/></symbol>
<symbol id="g-strF" viewBox="0 0 200 200"><ellipse cx="100" cy="182" rx="76" ry="15" fill="url(#g-gSoil)"/><g fill="url(#g-gLeaf)"><path d="M100 170 C 60 150, 50 120, 70 108 C 90 120, 98 150, 100 170 Z"/><path d="M100 170 C 140 150, 150 120, 130 108 C 110 120, 102 150, 100 170 Z"/><path d="M100 168 C 90 130, 96 100, 110 92 C 118 112, 110 150, 100 168 Z"/></g><g><g transform="translate(112 84)"><g fill="#fff" stroke="#EDE3F7"><circle cx="0" cy="-12" r="8"/><circle cx="11" cy="-4" r="8"/><circle cx="7" cy="10" r="8"/><circle cx="-7" cy="10" r="8"/><circle cx="-11" cy="-4" r="8"/></g><circle r="6" fill="#FFD84D"/></g><g transform="translate(62 130)"><g fill="#fff" stroke="#EDE3F7"><circle cx="0" cy="-10" r="7"/><circle cx="9" cy="-3" r="7"/><circle cx="6" cy="8" r="7"/><circle cx="-6" cy="8" r="7"/><circle cx="-9" cy="-3" r="7"/></g><circle r="5" fill="#FFD84D"/></g><g transform="translate(146 128)"><g fill="#fff" stroke="#EDE3F7"><circle cx="0" cy="-10" r="7"/><circle cx="9" cy="-3" r="7"/><circle cx="6" cy="8" r="7"/><circle cx="-6" cy="8" r="7"/><circle cx="-9" cy="-3" r="7"/></g><circle r="5" fill="#FFD84D"/></g></g><use href="#g-face" x="96" y="78" width="32" height="18"/></symbol>
<symbol id="g-rumP" viewBox="0 0 200 200"><use href="#g-rumF" width="200" height="200"/><g fill="#FFE36E" stroke="#E8A800" stroke-width="1"><circle cx="86" cy="40" r="3.5"/><circle cx="78" cy="52" r="2.8"/><circle cx="150" cy="76" r="3"/></g><use href="#g-bee" x="106" y="12" width="70" height="70"/></symbol>
<symbol id="g-strP" viewBox="0 0 200 200"><use href="#g-strF" width="200" height="200"/><g fill="#FFE36E" stroke="#E8A800" stroke-width="1"><circle cx="96" cy="64" r="3.5"/><circle cx="130" cy="70" r="2.8"/><circle cx="72" cy="112" r="3"/></g><use href="#g-bee" x="118" y="40" width="64" height="64"/></symbol>
<symbol id="g-humus" viewBox="0 0 200 160"><path d="M10 150 C 16 86, 64 52, 100 52 C 136 52, 184 86, 190 150 Z" fill="url(#g-gSoil)"/><path d="M26 104 C 60 78, 140 78, 174 104 C 140 92, 60 92, 26 104 Z" fill="#3E2416" opacity=".45"/><g fill="#3B2214" opacity=".75"><circle cx="52" cy="120" r="4"/><circle cx="148" cy="118" r="5"/><circle cx="120" cy="136" r="3.5"/><circle cx="76" cy="138" r="3"/><circle cx="160" cy="138" r="3"/></g><g opacity=".9"><ellipse cx="62" cy="86" rx="9" ry="4" fill="#E9A23B" transform="rotate(-20 62 86)"/><ellipse cx="140" cy="84" rx="8" ry="3.5" fill="#C7843A" transform="rotate(25 140 84)"/><ellipse cx="44" cy="134" rx="7" ry="3" fill="#8FBF5A" transform="rotate(10 44 134)"/></g><path d="M100 54 C 100 40, 98 30, 100 18" fill="none" stroke="#34A353" stroke-width="5" stroke-linecap="round"/><path d="M100 30 C 86 18, 74 22, 70 30 C 82 36, 94 36, 100 30 Z" fill="url(#g-gLeaf)"/><path d="M100 24 C 112 10, 126 12, 130 20 C 118 28, 106 28, 100 24 Z" fill="url(#g-gLeaf)"/><use href="#g-face" x="70" y="104" width="60" height="36"/></symbol>
</svg>`;

/* ---------- the journey (no DOM: scripts/test_garden.js runs this in Node) ---------- */
const PLANTS = [
  { name: 'الرمّان', icons: ['p0', 'p1', 'p3', 'rumF', 'rumP', 'rum'] },
  { name: 'عبّاد الشمس', icons: ['p0', 'p1', 'p3', 'p4', 'pp', 'p5'] },
  { name: 'الفراولة', icons: ['p0', 'p1', 'p3', 'strF', 'strP', 'straw'] },
];
const PLANT_STAGES = ['بذرة', 'إنبات', 'نبتة صغيرة', 'نبات مزهر', 'تلقيح', 'ثمرة وبذور'];
const PLANT_SAY = ['', 'خرج الجذير!', 'صارت نبتة صغيرة!', 'تفتّحت الزهرة!', 'جاءت النحلة: تلقيح!', 'تكوّنت الثمرة والبذور!'];
const PLANT_FACT = [
  'في البذرة: غلاف، وغذاء مخزون، وجنين ينمو ليصبح نباتًا جديدًا.',
  'تمتص البذرة الماء فيخرج الجذير، ثم الساق الصغيرة.',
  'الأوراق تصنع الغذاء للنبات بضوء الشمس: البناء الضوئي.',
  'الزهرة تساعد النبات على التكاثر، وتنتج حبوب اللقاح.',
  'تساعد الحشرات والرياح على التلقيح: تنقل النحلة حبوب اللقاح في الزهرة.',
  'الثمرة تحمل البذور، والبذور تنبت نباتات جديدة.'];
const CREATURES = {
  butterfly: { name: 'الفراشة', icons: ['b0', 'b1', 'b2', 'b3'], stages: ['بيضة', 'يرقة', 'عذراء', 'فراشة'],
    say: ['بيضٌ على ورقة النبات!', 'فقست البيضة: يرقة!', 'صارت اليرقة عذراء!', 'خرجت الفراشة: تحوّل!'],
    fact: ['تضع الفراشة بيضها على ورقة نبات.', 'تفقس البيضة فتخرج اليرقة، تأكل كثيرًا، ولونها الأخضر يخفيها: التخفّي.',
           'تختبئ اليرقة داخل غلاف صلب: العذراء.', 'تخرج الفراشة من العذراء: هذا هو التحوّل!'] },
  frog: { name: 'الضفدع', icons: ['f0', 'f1', 'f3', 'f4'], stages: ['البيضة', 'أبو ذُنَيبة', 'الضفدع الصغير', 'الضفدع المكتمل النمو'],
    say: ['بيضٌ في البركة!', 'فقست البيضة: أبو ذُنيبة!', 'نمت الأرجل: ضفدع صغير!', 'صار ضفدعًا مكتمل النمو!'],
    fact: ['يبدأ الضفدع حياته بيضةً في الماء.', 'أبو ذُنيبة يعيش في الماء ويتنفس بالخياشيم كالأسماك.',
           'تنمو الأرجل ويقصر الذيل: الضفدع الصغير.', 'الضفدع من البرمائيات: يعيش في الماء وعلى اليابسة.'] },
  bird: { name: 'العصفور', icons: ['nest0', 'nest1', 'nest2', 'sparrow'], stages: ['البيض في العش', 'الأم ترقد', 'الفرخ', 'العصفور'],
    say: ['عشٌّ في الشجرة، وفيه بيض!', 'ترقد الأم على البيض!', 'فقست البيضة: فرخ صغير!', 'كبر الفرخ: صار عصفورًا!'],
    fact: ['الطيور تبني أعشاشًا لحماية بيوضها.', 'ترقد الأم على البيض حتى يفقس.',
           'تطعم الأم فرخها وتعتني به حتى يكبر.', 'الفرخ لا يمرّ بالتحوّل: يكبر فيشبه أمه.'] },
};
const EXTRAS = {
  hog: { icon: 'hog', say: 'زائرٌ جديد: القنفذ!', fact: 'أشواك القنفذ الحادة تحميه من أعدائه: هذا تكيّف.' },
  chain: { icon: 'hopper', say: 'جاءت الجرادة: سلسلة غذائية!', fact: 'النبات مُنتِج يصنع غذاءه بنفسه، والجرادة والعصفور مُستهلِكان.' },
  leaves: { icon: 'leaves', say: 'تساقطت الأوراق، وجاءت دودة الأرض!', fact: 'المحلّلات تحلّل بقايا النباتات والحيوانات وتعيدها إلى التربة.' },
  humus: { icon: 'worm', say: 'صارت التربة خصبة!', fact: 'الدبال: بقايا المخلوقات المتحلّلة في الطبقة السطحية من التربة، يجعلها خصبة.' },
};
const JOURNEY = [
  ...PLANTS.flatMap((p, pi) => p.icons.map((_, k) => ({ kind: 'plant', p: pi, k }))),
  ...['butterfly', 'frog', 'bird'].flatMap(c => CREATURES[c].icons.map((_, k) => ({ kind: c, k }))),
  { kind: 'hog' }, { kind: 'chain' }, { kind: 'leaves' }, { kind: 'humus' },
];
const L = JOURNEY.length;
const START = {};
JOURNEY.forEach((s, i) => { const key = s.kind === 'plant' ? 'p' + s.p : s.kind; if (!(key in START)) START[key] = i; });
const stepsFor = stars => Math.floor(Math.max(0, stars) / PER);
// Everything in the garden after n steps. In a new round the plants show their last fruit until their new seed is planted.
function stateAt(n) {
  const r = Math.floor(n / L), pos = n % L;
  const did = i => r > 0 || pos > i;                        // step i of the journey has happened at least once
  const doneIn = (start, len) => Math.max(0, Math.min(len, pos - start));
  const plants = PLANTS.map((_, pi) => { const d = doneIn(START['p' + pi], 6); return d ? d - 1 : (r ? 5 : -1); });
  const cyc = c => { const d = doneIn(START[c], 4); return { stage: d - 1, adults: r + (d === 4 ? 1 : 0) }; };
  const butterfly = cyc('butterfly'), frog = cyc('frog'), bird = cyc('bird');
  const grownNow = PLANTS.filter((_, pi) => doneIn(START['p' + pi], 6) === 6).length;
  const bee = did(START.p0 + 4), hog = did(START.hog), hopper = did(START.chain), leaves = did(START.leaves), humus = did(START.humus);
  return {
    n, round: r, pos, plants, butterfly, frog, bird, bee, hog, hopper, leaves, humus,
    counts: { plants: r * PLANTS.length + grownNow, insects: (bee ? 1 : 0) + butterfly.adults + (hopper ? 1 : 0), frogs: frog.adults, birds: bird.adults }
  };
}
const core = { PER, PLANTS, PLANT_STAGES, PLANT_FACT, CREATURES, EXTRAS, JOURNEY, START, stepsFor, stateAt };

/* =====================================================================================================
   The screens. api from maths.js: m (the times-tables state), save, today, show, SFX, confetti, stopConfetti,
   reduced, toAr, home, DEV.
   ===================================================================================================== */
function mount(api) {
  const $ = (s, r = document) => r.querySelector(s);
  const AR = api.toAr;
  const M = () => { const m = api.m(); if (!m.garden || typeof m.garden !== 'object') m.garden = { done: 0 }; if (!(m.garden.done >= 0)) m.garden.done = 0; return m; };
  const earned = () => stepsFor(M().stars.total);
  const done = () => Math.min(M().garden.done, earned());
  const pending = () => Math.max(0, earned() - done());
  // a drawing: the ChatGPT clay picture when it exists (assets/garden, scripts/garden_pics.py; her request 23 Oct 2026),
  // else the SVG drawing of the sprite
  const ic = (id, cls = '') => (PICS.has(id) ? `<img class="gd-ic gd-pic ${cls}" src="assets/garden/${id}.webp" alt="" draggable="false">`
    : `<svg class="gd-ic ${cls}" aria-hidden="true"><use href="#g-${id}"/></svg>`);
  // counting in Arabic: ١ خطوة، خطوتان، ٣ خطوات … ١٠ خطوات، ١١ خطوة
  const stepsTxt = (n, em) => n === 1 ? 'خطوة جديدة' : n === 2 ? 'خطوتان جديدتان'
    : `${em ? `<em>${AR(n)}</em>` : AR(n)} ${n <= 10 ? 'خطوات' : 'خطوة'} جديدة`;
  const starsTxt = n => n === 1 ? 'نجمة واحدة' : n === 2 ? 'نجمتين' : `${AR(n)} ${n <= 10 ? 'نجوم' : 'نجمة'}`;

  document.body.insertAdjacentHTML('beforeend', SPRITE + `
<section id="mgarden" class="screen mx gd-screen" dir="rtl" lang="ar" hidden>
  <div class="gd-scene" id="gdScene"></div>
  <div class="gd-top">
    <button class="gd-x" id="gdClose" aria-label="الرئيسية"><svg aria-hidden="true"><use href="#i-close"/></svg></button>
    <div class="gd-title">حديقة العالِمة ماريا</div>
    <div class="gd-counts" id="gdCounts"></div>
  </div>
  <button class="gd-act" id="gdAct"><span class="gd-act-ic" id="gdActIc"></span><span class="gd-act-t"><b id="gdActTitle"></b><span id="gdActSub"></span><span class="gd-bar"><i id="gdActBar"></i></span></span></button>
  <button class="gd-cyc-btn" id="gdCycBtn">${ic('mag')}<span>دورات الحياة</span></button>
  <div class="gd-bubble" id="gdBubble" hidden></div>
</section>
<section id="gdStep" class="overlay mx gd-step" dir="rtl" lang="ar" hidden>
  <canvas id="gdConfetti" aria-hidden="true"></canvas>
  <div class="gd-kick" id="gdKick"></div>
  <div class="gd-stage" id="gdStage"></div>
  <h2 class="gd-say" id="gdSay"></h2>
  <div class="gd-fact" id="gdFact"></div>
  <div class="gd-strip" id="gdStrip"></div>
  <div class="gd-tally" id="gdTally"></div>
  <button class="btn btn-good gd-ok" id="gdOk">رائع!</button>
</section>
<section id="mgcycles" class="screen mx gd-cycles" dir="rtl" lang="ar" hidden>
  <div class="gd-top"><button class="gd-x" id="gdCycClose" aria-label="الحديقة"><svg aria-hidden="true"><use href="#i-close"/></svg></button><div class="gd-title">دورات الحياة في حديقتي</div></div>
  <p class="gd-cyc-sub">كما في كتاب العلوم: كل مخلوق في الحديقة يمرّ بدورة حياته، مرحلةً بعد مرحلة</p>
  <div class="gd-wheels" id="gdWheels"></div>
  <div class="gd-ideas" id="gdIdeas"></div>
</section>
<section id="gdNew" class="overlay mx gd-new" dir="rtl" lang="ar" hidden>
  <div class="gd-new-ic">${ic('can')}</div>
  <h2 class="gd-say" id="gdNewTitle"></h2>
  <div class="gd-tally" id="gdNewSub"></div>
  <button class="btn btn-good" id="gdNewGo">إلى حديقتي</button>
  <button class="btn-link" id="gdNewLater">لاحقًا</button>
</section>`);

  // the way in: a card on the times-tables Home, and a button on its Done screen
  const card = document.createElement('button');
  card.className = 'gd-card'; card.id = 'gdCard';
  card.innerHTML = `<span class="gd-card-ic" id="gdCardIc"></span><span class="gd-card-t"><b>حديقتي</b><span class="gd-bar"><i id="gdCardBar"></i></span><span id="gdCardSub"></span></span>`;
  $('#mxNow').after(card);
  const doneBtn = document.createElement('button');
  doneBtn.className = 'btn gd-done'; doneBtn.id = 'gdDoneBtn'; doneBtn.hidden = true;
  $('#mxMore').before(doneBtn);

  /* ---------- sounds (Web Audio, quiet beside the voice) ---------- */
  let noise = null;
  function snd(kind) {
    const S = api.SFX; S.init();
    if (!S.ready()) return;
    const c = S.ctx, t = c.currentTime + .01;
    const tone = (f0, f1, at, dur, peak, type = 'sine') => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, t + at); o.frequency.exponentialRampToValueAtTime(f1, t + at + dur);
      g.gain.setValueAtTime(.0001, t + at); g.gain.exponentialRampToValueAtTime(peak, t + at + .015); g.gain.exponentialRampToValueAtTime(.0001, t + at + dur);
      o.connect(g); g.connect(S.out); o.start(t + at); o.stop(t + at + dur + .05);
    };
    const hiss = (at, dur, peak, freq, q = .8) => {
      if (!noise) { const len = c.sampleRate; noise = c.createBuffer(1, len, c.sampleRate); const d = noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; }
      const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      s.buffer = noise; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
      g.gain.setValueAtTime(.0001, t + at); g.gain.exponentialRampToValueAtTime(peak, t + at + .05); g.gain.exponentialRampToValueAtTime(.0001, t + at + dur);
      s.connect(f); f.connect(g); g.connect(S.out); s.start(t + at); s.stop(t + at + dur + .05);
    };
    switch (kind) {
      case 'water': hiss(0, 1.1, .12, 2200, .6); for (let i = 0; i < 7; i++) tone(1500 + Math.random() * 900, 700, .1 + i * .13, .09, .12); break;
      case 'grow': tone(260, 820, 0, .5, .22); S.bell(1318.5, .45, .45, .3); S.bell(1760, .58, .6, .25); break;
      case 'pop': tone(900, 260, 0, .1, .3); S.star(.08); break;
      case 'hatch': hiss(0, .12, .2, 3000, 1.5); hiss(.16, .12, .2, 2600, 1.5); tone(700, 1300, .3, .14, .25); S.star(.44); break;
      case 'buzz': { const o = c.createOscillator(), g = c.createGain(), l = c.createOscillator(), lg = c.createGain();
        o.type = 'sawtooth'; o.frequency.value = 210; l.frequency.value = 22; lg.gain.value = .03;
        g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.05, t + .08); g.gain.exponentialRampToValueAtTime(.0001, t + .8);
        l.connect(lg); lg.connect(g.gain); o.connect(g); g.connect(S.out); o.start(t); l.start(t); o.stop(t + .85); l.stop(t + .85); break; }
      case 'ribbit': tone(260, 150, 0, .1, .22, 'square'); tone(240, 140, .14, .12, .2, 'square'); break;
      case 'chirp': [0, .12, .24].forEach(a => tone(2300, 3600, a, .07, .14)); break;
      case 'flutter': [0, .07, .14, .21, .28].forEach((a, i) => tone(i % 2 ? 1700 : 1400, i % 2 ? 1900 : 1600, a, .05, .07, 'triangle')); break;
      case 'rustle': hiss(0, .5, .1, 3500, .7); break;
      case 'done': S.unlock(); break;
    }
  }

  /* ---------- the garden scene ---------- */
    function scene(changed) {
    const g = stateAt(done()), sc = $('#gdScene');
    const put = (html, css, cls, fact, key) =>
      `<div class="gd-it ${cls || ''}${changed && changed === key ? ' gd-new-pop' : ''}" style="${css}"${fact ? ` data-fact="${fact}"` : ''}${key ? ` data-key="${key}"` : ''}>${html}</div>`;
    // the bird: a nest in the tree (inside the tree, so it stays on its branches at every screen size), then sparrows on the fence
    const nest = g.bird.stage >= 0 && g.bird.stage < 3 ? put(ic(CREATURES.bird.icons[g.bird.stage]), 'right:30%; top:6%; width:44%; height:34%', 'gd-nest', CREATURES.bird.fact[g.bird.stage], 'bird') : '';
    let h = `${put(ic('sun'), '', 'gd-sun', 'يحتاج النبات إلى الضوء والماء والهواء والتربة لينمو.', 'sun')}
      <div class="gd-cloud" style="top:12%; animation-delay:-8s">${ic('cloud')}</div><div class="gd-cloud" style="top:22%; animation-delay:-30s; transform: scale(.7)">${ic('cloud')}</div>
      <div class="gd-hill" style="left:-10%; background:#B9E8A2"></div><div class="gd-hill" style="right:-15%; background:#A8E08E"></div>
      <div class="gd-ground${g.humus ? ' rich' : ''}"></div><div class="gd-fence"></div>
      ${put(ic('tree') + nest, '', 'gd-tree', 'الأشجار نباتات كبيرة، تصنع غذاءها بضوء الشمس.', 'tree')}`;
    for (let k = 0; k < Math.min(3, g.bird.adults); k++) h += put(ic('sparrow'), `right:${34 + k * 13}%; animation-delay:-${k * .7}s`, 'gd-perch', 'العصفور من الطيور: يبدأ حياته بيضة، وأمه تعتني به.', k ? '' : 'bird');
    // the plants in their beds
    PLANTS.forEach((p, pi) => {
      const s = g.plants[pi];
      const art = s >= 0 ? ic(p.icons[s], 'gd-plant') : '<div class="gd-empty"></div>';
      const tag = s >= 0 ? `${p.name}: ${PLANT_STAGES[s]}` : `${p.name}: قريبًا`;
      h += put(`${art}${s >= 0 ? '' : '<div class="gd-soil"></div>'}<div class="gd-tag">${tag}</div>`, `--i:${pi}; animation-delay:-${pi}s`, `gd-bed${s >= 0 ? '' : ' waiting'}`,
        s >= 0 ? PLANT_FACT[s] : `هنا ستزرعين بذرة ${p.name}.`, 'p' + pi);
    });
    // the bee, the butterfly, the grasshopper; the fallen leaves and the earthworm by the pond
    if (g.bee) h += put(ic('bee'), 'right:30%; bottom:47%', 'gd-bee', 'النحلة حشرة تنقل حبوب اللقاح بين الأزهار: التلقيح.', 'bee');
    const b = g.butterfly;
    if (b.stage === 0) h += put(ic('b0'), 'left:22%; bottom:34%; width:8vmin; height:8vmin', '', CREATURES.butterfly.fact[0], 'butterfly');
    if (b.stage === 1) h += put(ic('b1'), 'left:22%; bottom:34%; width:9vmin; height:9vmin', 'gd-wiggle', CREATURES.butterfly.fact[1], 'butterfly');
    if (b.stage === 2) h += put(ic('b2'), 'right:63%; bottom:calc(44% + 26px); width:6vmin; height:6vmin', 'gd-sway', CREATURES.butterfly.fact[2], 'butterfly');
    for (let k = 0; k < Math.min(3, b.adults); k++) h += put(ic('b3'), `top:${28 + k * 8}%; right:${40 + k * 17}%; width:${9 - k}vmin; height:${9 - k}vmin; animation-delay:-${k * 1.6}s`, 'gd-flutter', 'الفراشة حشرة تمرّ بالتحوّل: بيضة، يرقة، عذراء، فراشة.', k ? '' : 'butterfly');
    if (g.hopper) h += put(ic('hopper'), 'left:13%; bottom:35%; width:7.5vmin; height:7.5vmin', 'gd-hop', 'الجرادة مُستهلِك تتغذّى على النباتات.', 'chain');
    if (g.leaves) h += put(ic('leaves'), 'left:1%; bottom:34%; width:14vmin; height:8.4vmin', '', EXTRAS.leaves.fact, 'leaves');
    if (g.leaves) h += put(ic('worm'), 'left:7%; bottom:30.5%; width:8vmin; height:8vmin', 'gd-wiggle', 'دودة الأرض من المحلّلات: تعيد البقايا إلى التربة.', 'humus');
    // the pond and the frog
    // ChatGPT's clay pond (her request, 26 Oct 2026), assets/garden/pond.webp: its pads hold the frogs (places in % of the pond)
    let pond = '';
    const f = g.frog;
    if (f.stage === 0) pond += put(ic('f0'), 'top:44%; right:50%; width:20%; height:32%', '', CREATURES.frog.fact[0], 'frog');
    if (f.stage === 1) pond += put(ic('f1'), 'top:30%; right:38%; width:20%; height:32%', 'gd-swim', CREATURES.frog.fact[1], 'frog');
    if (f.stage === 2) pond += put(ic('f3'), 'top:20%; right:49%; width:20%; height:32%', '', CREATURES.frog.fact[2], 'frog');
    for (let k = 0; k < Math.min(2, f.adults); k++) pond += put(ic('f4'), k ? 'top:49%; right:56%; width:20%; height:32%' : 'top:25%; right:21%; width:26%; height:41%', 'gd-frog', 'الضفدع مُستهلِك يتغذّى على الحشرات، ويعيش في الماء وعلى اليابسة.', k ? '' : 'frog');
    h += `<div class="gd-pond gd-it" data-fact="البركة نظام بيئي: مخلوقات حيّة وأشياء غير حيّة تعيش معًا." data-key="pond">${pond}</div>`;
    // the hedgehog, walking in front of the beds
    if (g.hog) h += put(ic('hog'), '', 'gd-walk', EXTRAS.hog.fact, 'hog');
    sc.innerHTML = h;
    if (changed) setTimeout(() => sc.querySelectorAll('.gd-new-pop').forEach(x => x.classList.remove('gd-new-pop')), 1600);
    // counting
    const c = g.counts;
    $('#gdCounts').innerHTML = [['p5', 'النباتات', c.plants], ['bee', 'الحشرات', c.insects], ['f4', 'الضفادع', c.frogs], ['sparrow', 'الطيور', c.birds]]
      .map(([e, t, n]) => `<div class="gd-cnt">${ic(e)}<span>${t}</span><b>${AR(n)}</b></div>`).join('');
    actionPanel();
  }
  function nextStep() { return JOURNEY[done() % L]; }
  function actionPanel() {
    const p = pending(), s = nextStep(), have = M().stars.total % PER;
    const isPlant = s.kind === 'plant';
    $('#gdActIc').innerHTML = ic(isPlant ? 'can' : 'mag');
    $('#gdAct').classList.toggle('ready', p > 0);
    if (p > 0) {
      $('#gdActTitle').textContent = isPlant ? (s.k === 0 ? `ازرعي بذرة ${PLANTS[s.p].name}!` : `اسقي ${PLANTS[s.p].name}!`) : 'انظري ماذا حدث!';
      $('#gdActSub').textContent = p > 1 ? `لديكِ ${stepsTxt(p)}` : (isPlant ? 'لديكِ سقية جديدة' : 'مفاجأة في الحديقة');
      $('#gdActBar').style.width = '100%';
    } else {
      $('#gdActTitle').textContent = isPlant ? 'السقية القادمة' : 'المفاجأة القادمة';
      $('#gdActSub').textContent = `${AR(have)} من ${AR(PER)} نجمة`;
      $('#gdActBar').style.width = (have / PER * 100) + '%';
    }
  }

  /* ---------- tapping things in the garden: a fact from her book, and a little show ---------- */
  let bubbleT = 0;
  function tapGarden(e) {
    const it = e.target.closest('.gd-it'); if (!it || !it.dataset.fact) return;
    const key = it.dataset.key || '';
    const kind = key[0] === 'p' && key !== 'pond' ? 'plant' : key;
    const anim = { plant: 'gd-t-wiggle', sun: 'gd-t-spin', bee: 'gd-t-zoom', butterfly: 'gd-t-twirl', frog: 'gd-t-hop', bird: 'gd-t-hop', hog: 'gd-t-roll', chain: 'gd-t-hop', pond: 'gd-t-ripple', humus: 'gd-t-wiggle', leaves: 'gd-t-wiggle', tree: 'gd-t-wiggle' }[kind] || 'gd-t-wiggle';
    const target = kind === 'pond' || kind === 'tree' ? it : it.querySelector('.gd-ic') || it;
    target.classList.remove(anim); void target.offsetWidth; target.classList.add(anim);
    setTimeout(() => target.classList.remove(anim), 1100);
    snd({ bee: 'buzz', frog: 'ribbit', bird: 'chirp', butterfly: 'flutter', leaves: 'rustle', humus: 'rustle', pond: 'water' }[kind] || 'pop');
    let fact = it.dataset.fact;
    if (kind === 'plant') {                      // the plant's parts and what they do (chapter 1)
      const s = stateAt(done()).plants[Number(key.slice(1))];
      if (s >= 2) { showParts(it, s); fact = s >= 3 ? 'الجذور تثبّت النبات وتمتص الماء، والساق تنقله، والأوراق تصنع الغذاء، والزهرة للتكاثر.' : 'الجذور تثبّت النبات وتمتص الماء، والساق تنقله، والأوراق تصنع الغذاء.'; }
    }
    bubble(it, fact);
  }
  function showParts(bed, s) {
    bed.querySelectorAll('.gd-part').forEach(x => x.remove());
    const parts = [['الجذور', 90, 50], ['الساق', 66, 50], ['الأوراق', 50, 22]];
    if (s >= 3) parts.push([s >= 5 ? 'الثمرة' : 'الزهرة', 18, 62]);
    parts.forEach(([t, top, right], k) => bed.insertAdjacentHTML('beforeend', `<span class="gd-part" style="top:${top}%; right:${right}%; animation-delay:${k * .12}s">${t}</span>`));
    setTimeout(() => bed.querySelectorAll('.gd-part').forEach(x => x.remove()), 3800);
  }
  function bubble(it, text) {
    const b = $('#gdBubble'), r = it.getBoundingClientRect(), W = innerWidth;
    b.textContent = '🔬 ' + text; b.hidden = false;
    const bw = Math.min(360, W - 32);
    b.style.width = bw + 'px';
    b.style.left = Math.max(16, Math.min(W - bw - 16, r.left + r.width / 2 - bw / 2)) + 'px';
    const top = r.top - b.offsetHeight - 12;
    b.style.top = (top > 80 ? top : r.bottom + 12) + 'px';
    b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
    clearTimeout(bubbleT); bubbleT = setTimeout(() => { b.hidden = true; }, 4200);
  }

  /* ---------- a step: the watering (or the surprise), the new stage, the fact, the cycle, the count ---------- */
  function strip(icons, labels, now, chain) {
    return icons.map((id, k) => `${k ? '<span class="gd-arrow">←</span>' : ''}<div class="gd-st ${k < now ? 'done' : k === now ? 'now' : 'next'}"><div class="gd-st-ic">${ic(id)}</div><small>${labels[k]}</small>${chain && chain[k] ? `<em>${chain[k]}</em>` : ''}</div>`).join('');
  }
  function doStep() {
    if (pending() <= 0 || !$('#gdStep').hidden) return;
    const n = done(), s = JOURNEY[n % L], before = stateAt(n);
    M().garden.done = n + 1; M().garden.last = api.today(); api.save();   // saved before the show, so nothing is lost
    const after = stateAt(n + 1), c = after.counts;
    let kick = '٥٠ نجمة: مفاجأة في الحديقة!', say = '', fact = '', stripHTML = '', tally = '', stage = '', complete = false, sound = 'hatch', changed = s.kind;
    if (s.kind === 'plant') {
      const p = PLANTS[s.p];
      kick = s.k === 0 ? '٥٠ نجمة: بذرة جديدة!' : '٥٠ نجمة: سقية جديدة!';
      say = s.k === 0 ? `زرعتِ بذرة ${p.name}!` : PLANT_SAY[s.k];
      fact = PLANT_FACT[s.k];
      stripHTML = strip(p.icons, PLANT_STAGES, s.k);
      complete = s.k === 5;
      tally = complete ? `اكتملت دورة حياة ${p.name}! عدد النباتات في حديقتكِ: <em>${AR(c.plants)}</em>` : `${p.name}: المرحلة <em>${AR(s.k + 1)}</em> من ${AR(6)}`;
      if (s.k === 4 && !before.bee) tally += '<br>وجاءت النحلة لتعيش في حديقتكِ! عدد الحشرات: <em>' + AR(c.insects) + '</em>';
      const prev = s.k > 0 ? ic(p.icons[s.k - 1], 'gd-prev') : '';
      stage = `<div class="gd-can">${ic('can')}</div><div class="gd-drops">${'<i></i>'.repeat(8)}</div>${prev}${ic(p.icons[s.k], 'gd-now')}`;
      sound = 'water'; changed = 'p' + s.p;
    } else if (CREATURES[s.kind]) {
      const cr = CREATURES[s.kind];
      say = cr.say[s.k]; fact = cr.fact[s.k];
      stripHTML = strip(cr.icons, cr.stages, s.k);
      complete = s.k === 3;
      const count = { butterfly: ['عدد الحشرات', c.insects], frog: ['عدد الضفادع', c.frogs], bird: ['عدد الطيور', c.birds] }[s.kind];
      tally = complete ? `اكتملت دورة حياة ${cr.name}! ${count[0]} في حديقتكِ: <em>${AR(count[1])}</em>` : `${cr.name}: المرحلة <em>${AR(s.k + 1)}</em> من ${AR(4)}`;
      stage = `${ic(cr.icons[s.k], 'gd-now gd-hatch')}`;
    } else {
      const x = EXTRAS[s.kind];
      say = x.say; fact = x.fact;
      if (s.kind === 'hog') { tally = 'القنفذ يعيش في حديقتكِ الآن!'; stripHTML = `<div class="gd-badge">التكيّف</div>`; }
      if (s.kind === 'chain') {                // the book's food chain: الشمس ← العشب ← الجراد ← الطائر
        stripHTML = strip(['sun', 'p3', 'hopper', 'sparrow'], ['الشمس', 'النبات', 'الجرادة', 'العصفور'], 4, ['الطاقة', 'مُنتِج', 'مُستهلِك', 'مُستهلِك']);
        tally = `عدد الحشرات في حديقتكِ: <em>${AR(c.insects)}</em>`;
      }
      if (s.kind === 'leaves' || s.kind === 'humus') {
        const k = s.kind === 'leaves' ? 1 : 3;
        stripHTML = strip(['leaves', 'worm', 'humus', 'p1'], ['أوراق متساقطة', 'دودة الأرض', 'الدبال', 'نباتات جديدة'], k, ['', 'مُحلِّل', 'تربة خصبة', '']);
        tally = s.kind === 'humus' ? 'اكتملت دورة الحديقة! البذور الجديدة ستنبت في التربة الخصبة.' : 'دودة الأرض تعيش في تربة حديقتكِ.';
        complete = s.kind === 'humus';
      }
      stage = s.kind === 'leaves' ? ic('leaves', 'gd-now gd-hatch gd-leafpile') + ic('worm', 'gd-now gd-hatch gd-worm')   // the leaves fall, the worm comes
        : ic(s.kind === 'humus' ? 'humus' : x.icon, 'gd-now gd-hatch');
    }
    $('#gdKick').textContent = kick;
    $('#gdStage').className = 'gd-stage' + (s.kind === 'plant' ? ' watering' : '');
    $('#gdStage').innerHTML = stage;
    $('#gdSay').textContent = say;
    $('#gdFact').textContent = '🔬 ' + fact;
    $('#gdStrip').innerHTML = stripHTML;
    $('#gdTally').innerHTML = tally;
    const ov = $('#gdStep'); ov.hidden = false;
    ov.classList.remove('play'); void ov.offsetWidth; ov.classList.add('play');
    snd(sound);
    setTimeout(() => snd(s.kind === 'plant' ? 'grow' : s.kind === 'bird' ? 'chirp' : s.kind === 'frog' ? 'ribbit' : s.kind === 'butterfly' ? 'flutter' : 'pop'), s.kind === 'plant' ? 1300 : 700);
    if (complete) setTimeout(() => { snd('done'); api.confetti($('#gdConfetti')); }, 1700);
    const btn = $('#gdOk');
    btn.disabled = true; setTimeout(() => { btn.disabled = false; }, 1500);
    btn.onclick = () => { ov.hidden = true; api.stopConfetti($('#gdConfetti')); scene(changed); if (pending() > 0) setTimeout(() => $('#gdAct').classList.add('ready'), 300); };
  }

  /* ---------- circles of life, and the book's other ideas the garden has shown her ---------- */
  // Each stage sits on a true circle (px, not %), read counter-clockwise like her book's right-to-left pages.
  function wheel(title, icons, labels, now, mid) {
    const n = icons.length, big = n > 4, R = big ? 104 : 80, cy = big ? 196 : 178;
    const items = icons.map((id, k) => {
      const a = -Math.PI / 2 - k / n * Math.PI * 2, b = a - Math.PI / n;
      const x = Math.cos(a) * R, y = Math.sin(a) * R, ax = Math.cos(b) * R, ay = Math.sin(b) * R;
      return `<div class="gd-arw" style="left:calc(50% + ${ax.toFixed(1)}px); top:${(cy + ay).toFixed(1)}px; transform: translate(-50%, -50%) rotate(${(b * 180 / Math.PI).toFixed(1)}deg)"><svg viewBox="0 0 24 24"><path d="M12 1 L21 21 L12 15.5 L3 21 Z"/></svg></div>
        <div class="gd-ws ${now < 0 ? 'next' : k < now ? '' : k === now ? 'now' : 'next'}${Math.abs(Math.cos(a)) < .3 ? ' tb' : ''}" style="left:calc(50% + ${x.toFixed(1)}px); top:${(cy + y).toFixed(1)}px"><div class="gd-ws-ic">${ic(id)}</div><small>${labels[k]}</small></div>`;
    }).join('');
    const state = now < 0 ? 'قريبًا' : now >= n ? 'اكتملت!' : `المرحلة<br>${AR(now + 1)} من ${AR(n)}`;
    return `<div class="gd-wheel${big ? ' big' : ''}${now < 0 ? ' locked' : ''}"><h2>${title}</h2><div class="gd-ring" style="top:${cy}px; width:${2 * R}px; height:${2 * R}px"></div>${items}<div class="gd-mid" style="top:${cy}px">${mid ? mid + '<br>' : ''}${state}</div></div>`;
  }
  function idea(title, on, icons, labels, chain, note) {
    return `<div class="gd-idea${on ? '' : ' locked'}"><h2>${title}</h2><div class="gd-strip">${strip(icons, labels, on ? icons.length : -1, chain)}</div><p>${on ? note : 'قريبًا في حديقتكِ'}</p></div>`;
  }
  function cycles() {
    const g = stateAt(done());
    const growing = g.plants.findIndex(s => s >= 0 && s < 5);
    const cur = growing >= 0 ? growing : g.plants.lastIndexOf(5) >= 0 ? g.plants.lastIndexOf(5) : 0;
    const ps = g.plants[cur], P = PLANTS[cur];
    const st = c => (c.stage >= 0 ? c.stage : c.adults ? 4 : -1);
    $('#gdWheels').innerHTML =
      wheel('دورة حياة النبات الزهري', P.icons, PLANT_STAGES, ps >= 5 ? 6 : ps, P.name) +
      wheel('دورة حياة الفراشة', CREATURES.butterfly.icons, CREATURES.butterfly.stages, st(g.butterfly)) +
      wheel('دورة حياة الضفدع', CREATURES.frog.icons, CREATURES.frog.stages, st(g.frog)) +
      wheel('دورة حياة العصفور', CREATURES.bird.icons, CREATURES.bird.stages, st(g.bird));
    $('#gdIdeas').innerHTML =
      idea('السلسلة الغذائية', g.hopper, ['sun', 'p3', 'hopper', 'sparrow'], ['الشمس', 'النبات', 'الجرادة', 'العصفور'], ['الطاقة', 'مُنتِج', 'مُستهلِك', 'مُستهلِك'], 'النبات يصنع غذاءه بنفسه، والحيوانات تأكل غيرها.') +
      idea('المحلّلات والتربة', g.humus || g.leaves, ['leaves', 'worm', 'humus', 'p1'], ['أوراق متساقطة', 'دودة الأرض', 'الدبال', 'نباتات جديدة'], ['', 'مُحلِّل', 'تربة خصبة', ''], 'المحلّلات تعيد بقايا المخلوقات إلى التربة فتصبح خصبة.') +
      idea('التكيّف', g.hog, ['hog'], ['القنفذ'], ['أشواك حادة'], 'أشواك القنفذ تحميه من أعدائه.');
    api.show('mgcycles'); $('#mgcycles').scrollTop = 0;
  }

  /* ---------- Home card, Done screen, the moment a new step is earned ---------- */
  function homeCard() {
    const p = pending(), g = stateAt(done()), have = M().stars.total % PER;
    const pi = g.plants.findIndex(s => s >= 0 && s < 5), s = pi >= 0 ? g.plants[pi] : -1;
    $('#gdCardIc').innerHTML = s >= 0 ? ic(PLANTS[pi].icons[s]) : ic(g.plants[0] >= 0 ? PLANTS[0].icons[5] : 'can');
    card.classList.toggle('ready', p > 0);
    $('#gdCardBar').style.width = (p > 0 ? 100 : have / PER * 100) + '%';
    $('#gdCardSub').textContent = p > 0 ? `${stepsTxt(p)} في انتظاركِ!` : `${AR(have)} من ${AR(PER)} نجمة للخطوة القادمة`;
  }
  function open() { scene(); api.show('mgarden'); if (pending() > 0) setTimeout(() => snd('pop'), 300); }
  // after a times-tables round: did she pass a 50?
  function afterRound(starsAtStart) {
    const p = pending();
    doneBtn.hidden = p <= 0;
    doneBtn.innerHTML = `${ic('p1')}<span>${stepsTxt(p)} في حديقتكِ!</span>`;
    if (p > 0 && stepsFor(M().stars.total) > stepsFor(starsAtStart)) {
      $('#gdNewTitle').textContent = '٥٠ نجمة! خطوة جديدة لحديقتكِ';
      $('#gdNewSub').innerHTML = p > 1 ? `لديكِ ${stepsTxt(p, true)}` : 'هيا نرى ماذا سينمو!';
      const ov = $('#gdNew'); ov.hidden = false;
      ov.classList.remove('play'); void ov.offsetWidth; ov.classList.add('play');
      snd('water'); setTimeout(() => snd('grow'), 500);
    }
  }
  function parentRows() {
    const n = done(), g = stateAt(n), have = M().stars.total % PER, p = pending();
    const where = n ? `step ${(n - 1) % L + 1} of ${L}${n > L ? ` (round ${Math.floor((n - 1) / L) + 1})` : ''}` : 'not started';
    return `<div class="p-row"><span>Science garden: ${where}<span class="sub">One step for every ${PER} stars · ${p ? `${p} step${p === 1 ? '' : 's'} waiting for her` : `next step in ${PER - have} stars`} · plants ${g.counts.plants}, insects ${g.counts.insects}, frogs ${g.counts.frogs}, birds ${g.counts.birds} · from her term-1 science book: plant needs and parts, life cycles, food chain, decomposers</span></span><button class="p-btn" data-act="garden">Open the garden</button></div>`;
  }

  /* ---------- wiring ---------- */
  card.addEventListener('click', () => { api.SFX.init(); open(); });
  doneBtn.addEventListener('click', () => { api.SFX.init(); open(); });
  $('#gdClose').addEventListener('click', () => api.home());
  $('#gdAct').addEventListener('click', () => { api.SFX.init(); if (pending() > 0) doStep(); else bubble($('#gdAct'), `اجمعي ${starsTxt(PER - M().stars.total % PER)} في جدول الضرب للخطوة القادمة!`); });
  $('#gdScene').addEventListener('click', tapGarden);
  $('#gdCycBtn').addEventListener('click', () => { api.SFX.init(); snd('pop'); cycles(); });
  $('#gdCycClose').addEventListener('click', () => { scene(); api.show('mgarden'); });
  $('#gdNewGo').addEventListener('click', () => { $('#gdNew').hidden = true; open(); });
  $('#gdNewLater').addEventListener('click', () => { $('#gdNew').hidden = true; });

  return {
    open, homeCard, afterRound, parentRows, doStep, cycles,
    dismiss() { $('#gdNew').hidden = true; },
    busy: () => !$('#gdStep').hidden || !$('#gdNew').hidden,
    isOn: () => !$('#mgarden').hidden || !$('#mgcycles').hidden || !$('#gdStep').hidden,
    pending, done, earned, core
  };
}

root.ScienceGarden = { core, mount };
})(typeof window !== 'undefined' ? window : globalThis);
