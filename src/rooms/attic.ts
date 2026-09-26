// Room 6 — the dark attic. Get light, fix the fuses, read the boxes, rescue the cat from a beam and climb out onto the roof.
import * as THREE from 'three';
import { L } from '../i18n';
import type { Ctx, RoomDef } from '../engine/types';
import {
  batteries, cardboardBox, chain, chest, dustyMirror, flashlight, fuseBox, jar, ladder, padlock, rag, roofBeam, roofWindow,
  shelf, smallKey, swing, tuna, hitbox,
} from '../view/furniture';
import { ball, box, cyl, group, mat } from '../view/kit';

const DIGITS = [
  { u: -2.2, y: 0, label: '2' },
  { u: -1.35, y: 0.45, label: '7' },
  { u: -0.5, y: 0, label: '0' },
  { u: 0.4, y: 0, label: '4' },
];

export const attic: RoomDef = {
  id: 'attic',
  icon: '🕯️',
  name: L('Strych', 'Attic'),
  intro: L('Ciemny, zakurzony strych. Jedyne wyjście to okno w dachu. A gdzie Mruczek?! Słychać miauczenie z góry…', 'A dark, dusty attic. The only way out is the roof window. And where is Whiskers?! Meowing comes from above…'),
  theme: { wall: 0x8a6a4d, wall2: 0x7a5c41, pattern: 'planks', floor: 0x7d5a3c, floor2: 0x5e4029, floorKind: 'planks', ceiling: 0x5e4029, trim: 0x4a3222, light: 0xbfd0ff, dim: 0.42 },
  items: {
    flashlight: { icon: '🔦', name: L('Latarka bez baterii', 'Flashlight (no batteries)'), desc: L('Niebieska latarka. Pusto w środku.', 'A blue flashlight. Empty inside.') },
    batteries: { icon: '🔋', name: L('Baterie', 'Batteries'), desc: L('Dwie baterie ze słoika.', 'Two batteries from the jar.') },
    torch: { icon: '🔦', name: L('Działająca latarka', 'Working flashlight'), desc: L('Świeci jasnym promieniem.', 'It shines a bright beam.') },
    tuna: { icon: '🥫', name: L('Puszka tuńczyka', 'Can of tuna'), desc: L('Mruczek oddałby za nią wszystkie zabawki.', 'Whiskers would trade all his toys for this.') },
    rag: { icon: '🧽', name: L('Szmatka', 'Rag'), desc: L('Miękka szmatka do kurzu.', 'A soft dusting rag.') },
    key: { icon: '🗝️', name: L('Kluczyk od kłódki', 'Padlock key'), desc: L('Mruczek się nim bawił.', 'Whiskers was playing with it.') },
    ladder: { icon: '🪜', name: L('Drabina', 'Ladder'), desc: L('Stara drewniana drabina.', 'An old wooden ladder.') },
  },
  combos: [{ a: 'flashlight', b: 'batteries', result: 'torch', say: L('Wkładasz baterie. Latarka świeci!', 'You put in the batteries. The flashlight works!') }],
  hints: [
    { done: (f, has) => has('torch') || !!f.fuseLit, hints: [
      L('Tu jest ciemno. Przydałoby się światło.', 'It\'s dark in here. Some light would help.'),
      L('Na półce leży latarka, a w jednym słoiku coś grzechocze.', 'There is a flashlight on the shelf, and something rattles in one of the jars.'),
      L('Weź latarkę, otwórz słoik z czerwoną pokrywką, weź baterie i połącz je z latarką w ekwipunku.', 'Take the flashlight, open the jar with the red lid, take the batteries and combine them with the flashlight.')] },
    { done: (f) => !!f.fuseLit, hints: [
      L('Na ścianie wisi skrzynka z bezpiecznikami.', 'A fuse box hangs on the wall.'),
      L('W skrzynce jest za ciemno, żeby coś zobaczyć.', 'It\'s too dark inside the fuse box to see anything.'),
      L('Użyj działającej latarki na skrzynce z bezpiecznikami.', 'Use the working flashlight on the fuse box.')] },
    { done: (f) => !!f.power, hints: [
      L('Wszystkie bezpieczniki muszą się świecić.', 'All the fuses must be lit.'),
      L('Każdy przełącznik zmienia siebie i sąsiadów w górę, w dół, w lewo i w prawo.', 'Each switch flips itself and its neighbours above, below, left and right.'),
      L('Stuknij: lewy górny, prawy górny, środkowy i prawy dolny.', 'Tap: top left, top right, centre and bottom right.')] },
    { done: (f) => !!f.chestOpen, hints: [
      L('Przy świetle na kartonach widać duże cyfry.', 'With the lights on, big digits show up on the boxes.'),
      L('Kufer ma kłódkę na 4 cyfry. Czytaj kartony od lewej.', 'The chest has a 4-digit padlock. Read the boxes from the left.'),
      L('Wpisz 2704 na kufrze.', 'Enter 2704 on the chest.')] },
    { done: (f) => !!f.catDown, hints: [
      L('Mruczek utknął na belce pod sufitem.', 'Whiskers is stuck on a beam under the roof.'),
      L('Zwab go czymś pysznym z kufra.', 'Lure him down with something tasty from the chest.'),
      L('Weź tuńczyka z kufra i użyj go na kocie.', 'Take the tuna from the chest and use it on the cat.')] },
    { done: (f, has) => has('key') || !!f.ladderFree, hints: [
      L('Mruczek coś upuścił.', 'Whiskers dropped something.'), L('Spójrz na podłogę pod belką.', 'Look at the floor under the beam.'), L('Weź kluczyk z podłogi.', 'Take the key from the floor.')] },
    { done: (f) => !!f.ladderFree, hints: [
      L('Kluczyk pasuje do kłódki.', 'The key fits a padlock.'), L('Drabina jest przypięta łańcuchem.', 'The ladder is chained up.'), L('Użyj kluczyka na drabinie.', 'Use the key on the ladder.')] },
    { done: (f, has) => has('ladder') || !!f.ladderPlaced, hints: [
      L('Drabina jest wolna.', 'The ladder is free.'), L('Weź drabinę.', 'Take the ladder.'), L('Stuknij drabinę, żeby ją wziąć.', 'Tap the ladder to take it.')] },
    { done: (f) => !!f.ladderPlaced, hints: [
      L('Okno dachowe jest wysoko.', 'The roof window is high up.'), L('Postaw pod nim drabinę.', 'Put the ladder under it.'), L('Użyj drabiny na oknie dachowym.', 'Use the ladder on the roof window.')] },
    { done: (f) => !!f.windowOpen, hints: [
      L('Wejdź po drabinie.', 'Climb the ladder.'), L('Otwórz okno.', 'Open the window.'), L('Stuknij okno dachowe.', 'Tap the roof window.')] },
    { done: (f) => !!f.won, hints: [L('Okno jest otwarte!', 'The window is open!'), L('Wyjdź na dach.', 'Climb out onto the roof.'), L('Stuknij okno jeszcze raz.', 'Tap the window again.')] },
  ],
  build(b) {
    // rafters and hanging bulbs that light up once the fuses are fixed
    for (const w of [1, 3] as const) {
      for (const u of [-2.4, 0, 2.4]) {
        const r = roofBeam(2.2);
        r.rotation.z = 0.6;
        b.put(group(r), { wall: w, u, y: 2.6, out: 0.8, rot: Math.PI / 2 });
      }
    }
    for (const [x, z] of [[-1.5, -1], [1.5, 1], [0, 0]] as const) {
      const bulb = group(cyl(0.01, 0.01, 0.5, 0x222222, 0, -0.5, 0), ball(0.07, mat(0xfff3c4, { emissive: 0xffd76a }), 0, -0.55, 0));
      const light = new THREE.PointLight(0xffd79a, 0, 7, 1.4);
      light.position.y = -0.6;
      bulb.add(light);
      b.fx(`bulb${x}${z}`, bulb, { wall: 0, u: x, y: 3.4, out: 4 + z })
        .anim((f, n) => { (n.children[2] as THREE.PointLight).intensity = f.power ? 7 : 0; (n.children[1] as THREE.Mesh).visible = !!f.power; });
    }

    // ----- wall 0: the roof window (the exit) -----
    b.obj('window', roofWindow(false), { wall: 0, u: 0.6, y: 1.6 })
      .anim((f, n, k) => swing(n, 'sash', f.windowOpen ? -1.2 : 0, k, 'x'))
      .tap((c) => {
        if (!c.f.ladderPlaced) { c.say(L('Okno dachowe! Ale jest za wysoko, żeby dosięgnąć.', 'The roof window! But it\'s too high to reach.')); return; }
        if (!c.f.windowOpen) {
          c.f.windowOpen = true;
          c.sfx('creak');
          c.say(L('Wchodzisz po drabinie i otwierasz okno. Świeże powietrze!', 'You climb the ladder and open the window. Fresh air!'));
          return;
        }
        c.win();
      })
      .use('ladder', (c) => {
        c.take('ladder');
        c.f.ladderPlaced = true;
        c.sfx('thud');
        c.say(L('Drabina stoi pod oknem.', 'The ladder stands under the window.'));
      });
    b.fx('placedLadder', ladder(), { wall: 0, u: 0.6, out: 0.5, rot: 0 })
      .show((f) => !!f.ladderPlaced)
      .anim((_f, n) => { n.rotation.x = -0.2; });
    for (const [u, w, h] of [[-2.4, 0.7, 0.5], [-1.7, 0.5, 0.4], [2.4, 0.8, 0.6]] as const) b.put(cardboardBox('', w, h), { wall: 0, u });
    b.put(box(0.12, 1.1, 0.12, 0x6e4a2f), { wall: 0, u: 2.9, y: 0 });

    // ----- wall 1: fuse box and the old chest -----
    b.obj('fuse', fuseBox(), { wall: 1, u: -1.3, y: 1.0 })
      .anim((f, n, k) => swing(n, 'door', f.fuseOpen ? -1.8 : 0, k))
      .tap((c) => {
        if (c.f.power) { c.say(L('Wszystkie bezpieczniki działają.', 'All the fuses are working.')); return; }
        if (!c.f.fuseOpen) { c.f.fuseOpen = true; c.sfx('open'); }
        if (!c.f.fuseLit) { c.say(L('Skrzynka z bezpiecznikami. W środku jest za ciemno, żeby coś zobaczyć.', 'A fuse box. It\'s too dark inside to see anything.')); return; }
        openFuses(c);
      })
      .use('torch', (c) => {
        c.f.fuseOpen = true;
        c.f.fuseLit = true;
        c.say(L('W świetle latarki widać dziewięć przełączników.', 'The flashlight reveals nine switches.'));
        openFuses(c);
      });
    const openFuses = (c: Ctx) =>
      c.lock({ kind: 'lights', size: 3, start: [0, 2, 4, 8], title: L('Zapal wszystkie bezpieczniki', 'Light up every fuse') }, () => {
        c.f.power = true;
        c.sfx('switch');
        c.say(L('Światło! Teraz widać cały strych.', 'Light! Now you can see the whole attic.'));
      });
    b.obj('chest', chest(), { wall: 1, u: 0.9 })
      .zoom('chestZ')
      .anim((f, n, k) => swing(n, 'lid', f.chestOpen ? -1.6 : 0, k, 'x'))
      .tap((c) => {
        if (c.f.chestOpen) return;
        c.lock({ kind: 'wheels', chars: '0123456789', answer: '2704', title: L('Kłódka kufra', 'Chest padlock') }, () => {
          c.f.chestOpen = true;
          c.sfx('creak');
        });
      });
    b.put(padlock(0x9aa3ad, 4), { wall: 1, u: 0.9, y: 0.2, out: 0.6 });
    b.zoomView('chestZ', { wall: 1, u: 0.9, y: 0.5, out: 0.3, dist: 1.3, look: 0.7 });
    b.pickup('tuna', tuna(), { wall: 1, u: 0.7, y: 0.5, out: 0.3 }, 'chestZ', (f) => !!f.chestOpen);
    b.pickup('rag', rag(), { wall: 1, u: 1.1, y: 0.5, out: 0.28 }, 'chestZ', (f) => !!f.chestOpen);

    // ----- wall 2: numbered boxes, the beam with the cat, a dusty mirror -----
    DIGITS.forEach((d, i) => {
      if (d.y > 0) b.put(cardboardBox('', 0.7, 0.45), { wall: 2, u: d.u });
      b.fx(`box${i}`, cardboardBox(d.label, 0.62, 0.45), { wall: 2, u: d.u, y: d.y })
        .anim((f, n) => { n.getObjectByName('label')!.visible = !!f.power; });
    });
    b.obj('boxes', hitbox(3.3, 0.9, 0.55), { wall: 2, u: -0.9 })
      .tap((c) => c.say(c.f.power
        ? L('Na kartonach ktoś wymalował duże cyfry: 2, 7, 0, 4.', 'Someone painted big digits on the boxes: 2, 7, 0, 4.')
        : L('Stare kartony. W tej ciemności nic nie widać.', 'Old boxes. You can\'t see a thing in this darkness.')));
    b.put(roofBeam(8), { wall: 2, u: 0, y: 1.55, out: 0.8 });
    b.catSpot('beam', { wall: 2, u: -0.3, y: 1.77, out: 0.8, pose: 'sit' });
    b.catSpot('floor', { wall: 2, u: 1.0, out: 1.4, pose: 'sit' });
    b.cat('beam')
      .tap((c) => {
        if (!c.f.catDown) { c.cat.meow(); c.say(L('Mruczek utknął na belce i boi się zejść! Coś trzyma w pyszczku.', 'Whiskers is stuck on the beam and afraid to come down! He has something in his mouth.')); }
        else { c.cat.happy(); c.say(L('Mruczek mruczy z wdzięczności.', 'Whiskers purrs gratefully.')); }
      })
      .use('tuna', (c) => {
        c.take('tuna');
        c.f.catDown = true;
        c.cat.goto('floor');
        c.say(L('Zapach tuńczyka zadziałał! Mruczek zeskoczył i upuścił kluczyk.', 'The smell of tuna worked! Whiskers jumped down and dropped a key.'));
      });
    b.pickup('key', smallKey(0xb8bec6), { wall: 2, u: 0.2, y: 0.01, out: 1.2 }, undefined, (f) => !!f.catDown);
    b.obj('mirror', dustyMirror(), { wall: 2, u: 2.2, y: 0.2 })
      .anim((f, n) => { n.getObjectByName('dust')!.visible = !f.mirrorClean; })
      .tap((c) => c.say(c.f.mirrorClean ? L('Czyste lustro. Wyglądasz na zmęczonego.', 'A clean mirror. You look tired.') : L('Lustro pokryte grubą warstwą kurzu. Coś za nim błyszczy?', 'A mirror under a thick layer of dust. Is something glinting behind it?')))
      .use('rag', (c) => {
        c.take('rag');
        c.f.mirrorClean = true;
        c.sfx('slide');
        c.say(L('Przecierasz lustro… a za szybą przyklejona złota rybka!', 'You wipe the mirror… and there is a golden fish taped behind the glass!'));
      });
    b.goldFish({ wall: 2, u: 2.2, y: 0.85, out: 0.12 }, undefined, (f) => !!f.mirrorClean);

    // ----- wall 3: shelves with jars and the flashlight, the chained ladder -----
    b.put(shelf(1.6, 3, 0x8a6a4d), { wall: 3, u: 0.8 });
    b.pickup('flashlight', flashlight(), { wall: 3, u: 0.4, y: 0.62, out: 0.15 });
    for (const [u, col, lid] of [[0.3, 0xcfe9d8, 0x4a8fe0], [1.3, 0xf2e6c8, 0x4cbf7a]] as const) b.put(jar(col, lid), { wall: 3, u, y: 1.12, out: 0.15 });
    b.obj('jar', jar(0xe6d8f0, 0xe25c5c), { wall: 3, u: 0.8, y: 1.12, out: 0.15 })
      .zoom('shelfZ')
      .anim((f, n, k) => {
        const lid = n.getObjectByName('lid')!;
        lid.position.y += ((f.jarOpen ? 0.32 : 0.2) - lid.position.y) * k;
        lid.position.x += ((f.jarOpen ? 0.15 : 0) - lid.position.x) * k;
      })
      .tap((c) => {
        if (!c.f.jarOpen) { c.f.jarOpen = true; c.sfx('open'); c.say(L('Coś grzechotało w środku.', 'Something was rattling inside.')); }
      });
    b.zoomView('shelfZ', { wall: 3, u: 0.8, y: 1.0, out: 0.15, dist: 1.4, look: 0.25 });
    b.pickup('batteries', batteries(), { wall: 3, u: 0.8, y: 1.14, out: 0.15 }, 'shelfZ', (f) => !!f.jarOpen);
    b.put(cyl(0.12, 0.12, 0.25, 0x6e4a2f), { wall: 3, u: 1.2, y: 1.62, out: 0.15 });
    const lad = group(ladder());
    const ch = chain();
    ch.position.set(0, 1.0, 0.06);
    const pl = padlock(0x9aa3ad, 0);
    pl.name = 'lock';
    pl.position.set(0.35, 0.85, 0.1);
    ch.name = 'chain';
    lad.add(ch, pl);
    b.obj('ladder', lad, { wall: 3, u: -1.5, out: 0.12 })
      .show((f) => !f.got_ladder)
      .anim((f, n) => { n.getObjectByName('chain')!.visible = !f.ladderFree; n.getObjectByName('lock')!.visible = !f.ladderFree; })
      .tap((c) => {
        if (!c.f.ladderFree) { c.say(L('Drabina przypięta łańcuchem do belki. Na łańcuchu wisi kłódka.', 'The ladder is chained to a beam. A padlock hangs on the chain.')); return; }
        c.give('ladder');
      })
      .use('key', (c) => {
        c.take('key');
        c.f.ladderFree = true;
        c.sfx('unlock');
        c.say(L('Kłódka puściła, łańcuch opadł.', 'The padlock opens and the chain falls away.'));
      });
    b.put(ball(0.2, 0x9c3d3d), { wall: 3, u: 2.4, y: 0.2, out: 0.4 });
  },
  solution: [
    { tap: 'pick_flashlight' }, { tap: 'jar' }, { tap: 'pick_batteries' }, { combine: ['flashlight', 'batteries'] },
    { use: ['torch', 'fuse'] }, { code: 'solve' }, { tap: 'chest' }, { code: '2704' }, { tap: 'pick_tuna' },
    { use: ['tuna', 'cat'] }, { tap: 'pick_key' }, { use: ['key', 'ladder'] }, { tap: 'ladder' }, { use: ['ladder', 'window'] },
    { tap: 'window' }, { tap: 'window' },
  ],
};
