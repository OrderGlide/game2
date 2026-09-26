// Room 5 — the study. A longer chain: magnifier → map → globe → drawer → safe handle → sliding-picture safe → big key.
// Optional side quest for the golden fish: switch off the lamp so the cat moves, read the photo, set the grandfather clock.
import * as THREE from 'three';
import { L, tx } from '../i18n';
import type { RoomDef } from '../engine/types';
import {
  armchair, bigDesk, bigKey, bookRow, bookshelf, deskLamp, door, framed, globe, grandfatherClock, magnifier, paper, rug,
  safe, safeHandle, slide, smallKey, split, swing, worldMap,
} from '../view/furniture';
import { box, group, text } from '../view/kit';

const pins = () => [
  { x: 0.47, y: 0.3, label: tx(L('Paryż 9', 'Paris 9')) },
  { x: 0.55, y: 0.26, label: tx(L('Warszawa 4', 'Warsaw 4')) },
  { x: 0.85, y: 0.37, label: tx(L('Tokio 2', 'Tokyo 2')) },
];

export const study: RoomDef = {
  id: 'study',
  icon: '📚',
  name: L('Gabinet', 'Study'),
  intro: L('Gabinet dziadka. Drzwi zamyka stary, ciężki zamek. Tu trzeba pomyśleć…', 'Grandpa\'s study. An old, heavy lock keeps the door shut. Time to think…'),
  theme: { wall: 0x2f5d50, wall2: 0x294f44, pattern: 'stripes', floor: 0x8a5a3b, floor2: 0x6e4a2f, floorKind: 'planks', ceiling: 0xf2eadb, trim: 0x6e4a2f, light: 0xffe2b0 },
  items: {
    magnifier: { icon: '🔍', name: L('Lupa', 'Magnifying glass'), desc: L('Mosiężna lupa. Powiększa nawet najmniejszy druk.', 'A brass magnifier. It enlarges even the tiniest print.') },
    smallkey: { icon: '🗝️', name: L('Mały kluczyk', 'Small key'), desc: L('Kluczyk z globusa.', 'The key from the globe.') },
    knob: { icon: '⚙️', name: L('Pokrętło', 'Dial handle'), desc: L('Metalowe pokrętło. Wygląda jak część sejfu.', 'A metal dial handle. It looks like part of a safe.') },
    bigkey: { icon: '🔑', name: L('Duży klucz', 'Big key'), desc: L('Ciężki, stary klucz.', 'A heavy old key.') },
    photo: {
      icon: '🖼️', name: L('Zdjęcie', 'Photo'), desc: L('Zdjęcie spod kota.', 'The photo the cat was lying on.'),
      doc: {
        style: 'photo',
        body: L('📷  Mruczek, pierwszy dzień w domu 🐱\n\nNa odwrocie:\n„Przyszedł do nas o 3:15 w nocy.\nOd tej pory stary zegar\nskrywa dla niego skarb.”',
          '📷  Whiskers, his first day home 🐱\n\nOn the back:\n"He came to us at 3:15 at night.\nEver since, the old clock\nhas kept a treasure for him."'),
      },
    },
  },
  hints: [
    { done: (f, has) => has('magnifier') || !!f.mapRead, hints: [
      L('Zacznij od biurka.', 'Start with the desk.'),
      L('Górna szuflada biurka nie jest zamknięta.', 'The top desk drawer isn\'t locked.'),
      L('Otwórz górną szufladę biurka i weź lupę.', 'Open the top desk drawer and take the magnifier.')] },
    { done: (f) => !!f.mapRead, hints: [
      L('Lupa pomaga czytać drobny druk.', 'A magnifier helps you read tiny print.'),
      L('Na mapie przy szpilkach są maleńkie napisy.', 'The map has tiny writing next to its pins.'),
      L('Użyj lupy na mapie świata.', 'Use the magnifier on the world map.')] },
    { done: (f) => !!f.globeOpen, hints: [
      L('Cyfry z mapy czytaj tak, jak mówi podpis: od zachodu na wschód.', 'Read the map\'s digits as the caption says: west to east.'),
      L('Globus ma zamek na trzy cyfry.', 'The globe has a three-digit lock.'),
      L('Paryż 9, Warszawa 4, Tokio 2. Wpisz 942 na globusie.', 'Paris 9, Warsaw 4, Tokyo 2. Enter 942 on the globe.')] },
    { done: (f, has) => has('smallkey') || !!f.d2Open, hints: [
      L('Globus się otworzył.', 'The globe opened.'), L('Zajrzyj do środka globusa.', 'Look inside the globe.'), L('Weź kluczyk z globusa.', 'Take the small key from the globe.')] },
    { done: (f) => !!f.d2Open, hints: [
      L('Kluczyk pasuje do jednej z szuflad.', 'The small key fits one of the drawers.'),
      L('Środkowa szuflada biurka jest zamknięta.', 'The middle desk drawer is locked.'),
      L('Użyj kluczyka na środkowej szufladzie biurka.', 'Use the small key on the middle desk drawer.')] },
    { done: (f, has) => has('knob') || !!f.safeHandle, hints: [
      L('W szufladzie coś leży.', 'Something is in the drawer.'), L('Weź to, co leży w środkowej szufladzie.', 'Take what is in the middle drawer.'), L('Weź pokrętło ze środkowej szuflady.', 'Take the dial handle from the middle drawer.')] },
    { done: (f) => !!f.paintingMoved || !!f.safeHandle, hints: [
      L('Pokrętło pasuje do sejfu. Tylko gdzie jest sejf?', 'The handle belongs to a safe. But where is the safe?'),
      L('Obrazy czasem coś zasłaniają.', 'Paintings sometimes hide things.'),
      L('Przesuń obraz obok mapy.', 'Slide the painting next to the map.')] },
    { done: (f) => !!f.safeHandle, hints: [
      L('Sejf nie ma pokrętła.', 'The safe has no handle.'), L('Masz pokrętło w ekwipunku.', 'You have a handle in your inventory.'), L('Użyj pokrętła na sejfie.', 'Use the dial handle on the safe.')] },
    { done: (f) => !!f.safeOpen, hints: [
      L('Stuknij sejf, żeby go otworzyć.', 'Tap the safe to open it.'),
      L('Ułóż obrazek jak we wzorze pod układanką.', 'Arrange the picture like the pattern below the puzzle.'),
      L('Kolejność kafelków: 🐱 🐟 🧶 / 🐭 🥛 🌙 / ⭐ 🐾 i puste pole w prawym dolnym rogu.', 'Tile order: 🐱 🐟 🧶 / 🐭 🥛 🌙 / ⭐ 🐾 with the gap in the bottom right.')] },
    { done: (f, has) => has('bigkey') || !!f.doorOpen, hints: [
      L('Sejf jest otwarty.', 'The safe is open.'), L('Zajrzyj do sejfu.', 'Look into the safe.'), L('Weź duży klucz z sejfu.', 'Take the big key from the safe.')] },
    { done: (f) => !!f.doorOpen, hints: [
      L('Duży klucz do dużego zamka.', 'A big key for a big lock.'), L('Drzwi mają stary zamek.', 'The door has an old lock.'), L('Użyj dużego klucza na drzwiach.', 'Use the big key on the door.')] },
    { done: (f) => !!f.won, hints: [L('Drzwi są otwarte!', 'The door is open!'), L('Stuknij drzwi.', 'Tap the door.'), L('Stuknij drzwi, żeby wyjść.', 'Tap the door to leave.')] },
  ],
  build(b) {
    // ----- wall 0: the door with an old lock -----
    b.obj('door', door(0x4a2f1e), { wall: 0, u: -1.3 })
      .anim((f, n, k) => swing(n, 'leaf', f.doorOpen ? -1.3 : 0, k))
      .tap((c) => {
        if (c.f.doorOpen) c.win();
        else c.say(L('Ciężkie drzwi z dużą, starą dziurką od klucza.', 'A heavy door with a big, old keyhole.'));
      })
      .use('bigkey', (c) => {
        c.take('bigkey');
        c.f.doorOpen = true;
        c.sfx('unlock');
        c.say(L('Klucz obraca się ze zgrzytem. Otwarte!', 'The key turns with a grind. Open!'));
      });
    b.put(bookshelf(1.6, 0x4a2f1e), { wall: 0, u: 1.6 });
    b.put(bookRow(1.5, 2), { wall: 0, u: 1.6, y: 0.09 });
    b.put(bookRow(1.5, 6), { wall: 0, u: 1.6, y: 0.55 });
    b.put(bookRow(1.0, 3), { wall: 0, u: 1.35, y: 1.01 });
    b.put(bookRow(1.5, 8), { wall: 0, u: 1.6, y: 1.47 });

    // ----- wall 1: the desk (with the lamp the cat loves) -----
    const desk = bigDesk();
    const d1 = split(desk, 'drawer1');
    const d2 = split(desk, 'drawer2');
    const d3 = split(desk, 'drawer3');
    b.obj('desk', desk, { wall: 1, u: 0 })
      .zoom('deskZ')
      .tap((c) => c.say(L('Masywne biurko dziadka z trzema szufladami.', 'Grandpa\'s massive desk with three drawers.')));
    b.zoomView('deskZ', { wall: 1, u: 0.3, y: 0.65, out: 0.55, dist: 1.6, look: 0.55 });
    b.obj('drawer1', d1, { wall: 1, u: 0 }).in('deskZ')
      .anim((f, n, k) => slide(n, 'drawer1', f.d1Open ? 0.35 : 0, k))
      .tap((c) => { c.f.d1Open = !c.f.d1Open; c.sfx('drawer'); });
    b.obj('drawer2', d2, { wall: 1, u: 0 }).in('deskZ')
      .anim((f, n, k) => slide(n, 'drawer2', f.d2Open ? 0.35 : 0, k))
      .tap((c) => { if (!c.f.d2Open) c.say(L('Zamknięta na mały kluczyk.', 'Locked with a small key.')); })
      .use('smallkey', (c) => { c.take('smallkey'); c.f.d2Open = true; c.sfx('drawer'); });
    b.obj('drawer3', d3, { wall: 1, u: 0 }).in('deskZ')
      .tap((c) => { c.sfx('thud'); c.say(L('Zacięta na amen. Chyba od lat nikt jej nie otwierał.', 'Stuck solid. Nobody has opened it in years.')); });
    b.pickup('magnifier', magnifier(), { wall: 1, u: 0.62, y: 0.71, out: 0.9 }, 'deskZ', (f) => !!f.d1Open);
    b.pickup('knob', safeHandle(), { wall: 1, u: 0.62, y: 0.48, out: 0.9 }, 'deskZ', (f) => !!f.d2Open);
    b.obj('lamp', deskLamp(), { wall: 1, u: -0.55, y: 0.775, out: 0.3 })
      .anim((f, n) => {
        (n.getObjectByName('light') as THREE.PointLight).intensity = f.lampOff ? 0 : 2.5;
        n.getObjectByName('bulb')!.visible = !f.lampOff;
      })
      .tap((c) => {
        c.f.lampOff = !c.f.lampOff;
        c.sfx('switch');
        if (c.f.lampOff && !c.f.catMoved) {
          c.f.catMoved = true;
          c.cat.goto('chair');
          c.say(L('Lampa zgasła i zrobiło się chłodno. Mruczek przeniósł się na fotel. Leżał na jakimś zdjęciu!', 'The lamp went off and it got chilly. Whiskers moved to the armchair. He was lying on a photo!'));
        }
      });
    b.catSpot('desk', { wall: 1, u: 0.05, y: 0.775, out: 0.42, pose: 'loaf' });
    b.catSpot('chair', { wall: 3, u: -1.0, y: 0.5, out: 0.45, pose: 'sleep' });
    b.cat('desk').tap((c) => {
      c.cat.meow();
      c.say(c.f.catMoved
        ? L('Mruczek zwinął się w kłębek na fotelu.', 'Whiskers curled up in the armchair.')
        : L('Mruczek wygrzewa się pod lampą. Pod łapkami ma jakieś zdjęcie.', 'Whiskers is basking under the lamp, with a photo under his paws.'));
    });
    b.pickup('photo', paper(0xffffff, 0.18, 0.13), { wall: 1, u: 0.05, y: 0.78, out: 0.42 }, 'deskZ', (f) => !!f.catMoved);
    b.put(box(0.3, 0.03, 0.22, 0x7a2e2e), { wall: 1, u: -0.1, y: 0.775, out: 0.25 });

    // ----- wall 2: globe and grandfather clock -----
    b.obj('globe', globe(), { wall: 2, u: -1.4 })
      .zoom('globeZ')
      .anim((f, n, k) => swing(n, 'top', f.globeOpen ? -1.3 : 0, k, 'x'))
      .tap((c) => {
        if (c.f.globeOpen) return;
        c.lock({ kind: 'wheels', chars: '0123456789', answer: '942', title: L('Zamek w globusie', 'Globe lock') }, () => {
          c.f.globeOpen = true;
          c.sfx('open');
          c.say(L('Globus otworzył się jak szkatułka!', 'The globe opened like a jewellery box!'));
        });
      });
    b.zoomView('globeZ', { wall: 2, u: -1.4, y: 0.85, out: 0.3, dist: 1.3, look: 0.5 });
    b.pickup('smallkey', smallKey(), { wall: 2, u: -1.4, y: 0.86, out: 0.3 }, 'globeZ', (f) => !!f.globeOpen);
    b.obj('clock', grandfatherClock(12, 0), { wall: 2, u: 1.3 })
      .zoom('clockZ')
      .anim((f, n, k) => {
        swing(n, 'door', f.clockOpen ? -1.7 : 0, k);
        n.getObjectByName('pendulum')!.rotation.z = f.clockOpen ? 0 : Math.sin(performance.now() / 500) * 0.2;
      })
      .tap((c) => {
        if (c.f.clockOpen) return;
        c.lock({ kind: 'wheels', chars: '0123456789', answer: '315', title: L('Przestaw wskazówki (G:MM)', 'Set the hands (H:MM)') }, () => {
          c.f.clockOpen = true;
          c.sfx('ding');
          c.say(L('Zegar wybił… i otworzył drzwiczki!', 'The clock chimed… and its little door opened!'));
        });
      });
    b.zoomView('clockZ', { wall: 2, u: 1.3, y: 1.1, out: 0.3, dist: 1.7, look: 0.2 });
    b.goldFish({ wall: 2, u: 1.3, y: 0.46, out: 0.22 }, 'clockZ', (f) => !!f.clockOpen);
    b.put(rug(0x7a2e2e, 0xe8c547, 2.4, 1.6), { wall: 2, u: 0, out: 2.2 });

    // ----- wall 3: world map, armchair, painting hiding the safe -----
    b.obj('map', worldMap(pins(), false), { wall: 3, u: -1.0, y: 1.8, out: 0.02 })
      .zoom('mapZ')
      .tap((c) => c.say(c.f.mapRead
        ? L('Przy szpilkach: Paryż 9, Warszawa 4, Tokio 2. Na dole: „od zachodu na wschód”.', 'By the pins: Paris 9, Warsaw 4, Tokyo 2. Below: "from west to east".')
        : L('Mapa podróży dziadka. Przy szpilkach są maleńkie napisy, nie da się ich odczytać.', 'Grandpa\'s travel map. There is tiny writing by the pins, too small to read.')))
      .use('magnifier', (c) => {
        c.f.mapRead = true;
        c.sfx('paper');
        c.say(L('Przez lupę widać cyfry przy szpilkach!', 'Through the magnifier you can see digits by the pins!'));
      });
    b.fx('mapLabels', worldMap(pins(), true, tx(L('→ od zachodu na wschód →', '→ from west to east →'))), { wall: 3, u: -1.0, y: 1.8, out: 0.03 })
      .show((f) => !!f.mapRead);
    b.zoomView('mapZ', { wall: 3, u: -1.0, y: 1.8, out: 0.02, dist: 1.5, look: 0 });
    b.put(armchair(0x9c3d3d), { wall: 3, u: -1.0 });
    b.obj('safe', safe(), { wall: 3, u: 1.4, y: 1.15 })
      .zoom('safeZ')
      .anim((f, n, k) => swing(n, 'door', f.safeOpen ? -1.6 : 0, k))
      .tap((c) => {
        if (c.f.safeOpen) return;
        if (!c.f.safeHandle) { c.say(L('Sejf! Ale nie ma pokrętła, nie ma za co chwycić.', 'A safe! But it has no handle to grab.')); return; }
        c.lock({ kind: 'slide', tiles: ['🐱', '🐟', '🧶', '🐭', '🥛', '🌙', '⭐', '🐾'], title: L('Zamek-układanka', 'Puzzle lock') }, () => {
          c.f.safeOpen = true;
          c.sfx('open');
        });
      })
      .use('knob', (c) => {
        c.take('knob');
        c.f.safeHandle = true;
        c.sfx('click');
        c.say(L('Pokrętło wskoczyło na miejsce. Na drzwiczkach pojawiła się układanka.', 'The handle clicks into place. A sliding puzzle appears on the door.'));
      });
    b.zoomView('safeZ', { wall: 3, u: 1.4, y: 1.45, out: 0.1, dist: 1.3, look: 0 });
    b.pickup('bigkey', bigKey(), { wall: 3, u: 1.4, y: 1.25, out: 0.1 }, 'safeZ', (f) => !!f.safeOpen);
    const paint = group(framed(0.9, 0.8, (c, W, H) => {
      c.fillStyle = '#9fc7e0'; c.fillRect(0, 0, W, H);
      c.fillStyle = '#5f8f4a'; c.beginPath(); c.moveTo(0, H); c.lineTo(W * 0.35, H * 0.35); c.lineTo(W * 0.7, H); c.fill();
      c.fillStyle = '#4b7a3c'; c.beginPath(); c.moveTo(W * 0.4, H); c.lineTo(W * 0.75, H * 0.45); c.lineTo(W, H); c.fill();
      text(c, '⛵', W * 0.2, H * 0.8, H * 0.15, '#000');
    }, 0xc9a23a));
    paint.children[0].name = 'frame';
    b.obj('painting', paint, { wall: 3, u: 1.4, y: 1.1, out: 0.1 })
      .anim((f, n, k) => slide(n, 'frame', f.paintingMoved ? -1.0 : 0, k, 'x'))
      .tap((c) => { c.f.paintingMoved = !c.f.paintingMoved; c.sfx('slide'); });
  },
  solution: [
    { tap: 'drawer1' }, { tap: 'pick_magnifier' }, { use: ['magnifier', 'map'] }, { tap: 'globe' }, { code: '942' },
    { tap: 'pick_smallkey' }, { use: ['smallkey', 'drawer2'] }, { tap: 'pick_knob' }, { tap: 'painting' },
    { use: ['knob', 'safe'] }, { tap: 'safe' }, { code: 'solve' }, { tap: 'pick_bigkey' }, { use: ['bigkey', 'door'] }, { tap: 'door' },
  ],
};
