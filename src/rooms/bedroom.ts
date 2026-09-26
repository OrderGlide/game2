// Room 1 — the bedroom. A gentle tutorial: open things, pick things up, use an item, read a note, crack a code.
import { L } from '../i18n';
import type { RoomDef } from '../engine/types';
import {
  bed, chair, curtains, desk, door, framed, nightstand, padlock, paper, plantPot, rug, slide, swing, tableLamp,
  toyBox, treatsBox, wallClock, wardrobe, windowFrame, smallKey, bookRow,
} from '../view/furniture';
import { box, cyl, text } from '../view/kit';

export const bedroom: RoomDef = {
  id: 'bedroom',
  icon: '🛏️',
  name: L('Sypialnia', 'Bedroom'),
  intro: L('Drzwi się zatrzasnęły! Trzeba znaleźć sposób, żeby wyjść. Stuknij strzałki po bokach, żeby się rozejrzeć.',
    'The door slammed shut! Find a way out. Tap the arrows on the sides to look around.'),
  theme: { wall: 0xe8d7f1, wall2: 0xd9c3e8, pattern: 'stripes', floor: 0xc8966a, floor2: 0xa87a52, floorKind: 'planks', ceiling: 0xfaf6f0, trim: 0xffffff, light: 0xfff1dc },
  items: {
    treats: { icon: '🍪', name: L('Kocie przysmaki', 'Cat treats'), desc: L('Chrupiące przysmaki o smaku łososia. Mruczek je uwielbia.', 'Crunchy salmon treats. Whiskers loves them.') },
    smallkey: { icon: '🗝️', name: L('Mały kluczyk', 'Small key'), desc: L('Malutki mosiężny kluczyk. Pasuje do czegoś małego.', 'A tiny brass key. It fits something small.') },
    note: {
      icon: '📝', name: L('Liścik', 'Note'), desc: L('Liścik z szuflady.', 'A note from the drawer.'),
      doc: {
        style: 'paper',
        body: L('Kochanie,\nzamek w drzwiach znów się zacina.\nKod zapisałam tam, gdzie czas stanął w miejscu. ⏰\n\nP.S. Nakarm Mruczka!',
          'Darling,\nthe door lock is jamming again.\nI left the code where time stood still. ⏰\n\nP.S. Feed Whiskers!'),
      },
    },
  },
  hints: [
    { done: (f, has) => !!f.wardrobeOpen || has('treats') || !!f.catAwake, hints: [
      L('Rozejrzyj się: strzałki po bokach obracają widok. Stuknij meble, żeby je obejrzeć.', 'Look around: the side arrows turn you around. Tap furniture to examine it.'),
      L('Duża szafa wygląda, jakby dało się ją otworzyć.', 'The big wardrobe looks like it opens.'),
      L('Otwórz szafę stojącą przy ścianie z dywanem.', 'Open the wardrobe by the wall with the rug.')] },
    { done: (f, has) => has('treats') || !!f.catAwake, hints: [
      L('W szafie coś jest na półce.', 'There is something on the wardrobe shelf.'),
      L('Stuknij półkę w otwartej szafie, żeby podejść bliżej.', 'Tap the shelf in the open wardrobe to take a closer look.'),
      L('Weź pudełko przysmaków z półki w szafie.', 'Take the box of treats from the wardrobe shelf.')] },
    { done: (f) => !!f.catAwake, hints: [
      L('Mruczek śpi na łóżku. Pod nim coś błyszczy.', 'Whiskers is asleep on the bed. Something shiny is under him.'),
      L('Koty budzą się na zapach jedzenia.', 'Cats wake up when they smell food.'),
      L('Stuknij przysmaki w ekwipunku, a potem stuknij kota.', 'Tap the treats in your inventory, then tap the cat.')] },
    { done: (_f, has) => has('smallkey') || !!_f.drawerOpen, hints: [
      L('Tam, gdzie spał Mruczek, coś zostało.', 'Something was left where Whiskers was sleeping.'),
      L('Przyjrzyj się łóżku.', 'Look closely at the bed.'),
      L('Weź mały kluczyk z łóżka.', 'Take the small key from the bed.')] },
    { done: (f) => !!f.drawerOpen, hints: [
      L('Mały kluczyk pasuje do małego zamka.', 'A small key fits a small lock.'),
      L('Szafka nocna ma zamkniętą szufladę.', 'The nightstand has a locked drawer.'),
      L('Użyj kluczyka na szafce nocnej obok łóżka.', 'Use the small key on the nightstand by the bed.')] },
    { done: (f, has) => has('note') || !!f.doorOpen, hints: [
      L('W otwartej szufladzie coś leży.', 'Something is lying in the open drawer.'),
      L('Weź kartkę z szuflady.', 'Take the paper from the drawer.'),
      L('Weź liścik z szuflady szafki nocnej.', 'Take the note from the nightstand drawer.')] },
    { done: (f) => !!f.doorOpen, hints: [
      L('Przeczytaj liścik: stuknij go w ekwipunku, a potem wybierz „Obejrzyj”.', 'Read the note: tap it in your inventory and choose "Inspect".'),
      L('„Tam, gdzie czas stanął”. Co w pokoju pokazuje godzinę?', '"Where time stood still". What in the room shows the time?'),
      L('Zegar nad biurkiem stanął na 7:45. Ustaw na kłódce 7-4-5.', 'The clock above the desk stopped at 7:45. Set the padlock to 7-4-5.')] },
    { done: (f) => !!f.won, hints: [
      L('Drzwi są otwarte!', 'The door is open!'), L('Stuknij drzwi.', 'Tap the door.'), L('Stuknij drzwi, żeby wyjść.', 'Tap the door to leave.')] },
  ],
  build(b) {
    // ----- wall 0: the door -----
    b.obj('door', door(0x8a5a3b), { wall: 0, u: -1.2 })
      .anim((f, n, k) => swing(n, 'leaf', f.doorOpen ? -1.3 : 0, k))
      .tap((c) => {
        if (c.f.doorOpen) c.win();
        else c.say(L('Zamknięte na kłódkę z trzema cyframi.', 'Locked with a three-digit padlock.'));
      });
    b.obj('lock', padlock(0xc9a23a, 3), { wall: 0, u: -0.8, y: 1.0, out: 0.16 })
      .show((f) => !f.doorOpen)
      .tap((c) => c.lock({ kind: 'wheels', chars: '0123456789', answer: '745', title: L('Kłódka', 'Padlock') }, () => {
        c.f.doorOpen = true;
        c.sfx('creak');
        c.say(L('Kłódka puściła! Drzwi się uchyliły.', 'The padlock opened! The door swings open.'));
      }));
    b.put(framed(0.8, 0.6, (c, W, H) => {
      c.fillStyle = '#ffe8c9'; c.fillRect(0, 0, W, H);
      text(c, '🐱', W / 2, H / 2, H * 0.7, '#000');
    }), { wall: 0, u: 1.6, y: 1.4 });
    b.put(plantPot(0x5aa0d8, 0x4f9a4a, 1.3), { wall: 0, u: 2.9 });
    // coat hooks with a scarf
    b.put(box(0.9, 0.08, 0.04, 0x8a5a3b), { wall: 0, u: 0.6, y: 1.75 });
    for (const x of [-0.3, 0, 0.3]) b.put(cyl(0.02, 0.02, 0.1, 0xe8b64a), { wall: 0, u: 0.6 + x, y: 1.72, out: 0.06 });
    b.put(box(0.18, 0.7, 0.04, 0x4aa3ff), { wall: 0, u: 0.3, y: 1.05, out: 0.08 });
    b.put(box(0.3, 0.5, 0.08, 0xf29a45), { wall: 0, u: 0.9, y: 1.2, out: 0.09 });

    // ----- wall 1: bed, nightstand, sleeping cat -----
    b.obj('bed', bed(0x7ea6dc), { wall: 1, u: 0.5 })
      .tap((c) => c.say(c.f.catAwake ? L('Miękkie, ciepłe łóżko.', 'A soft, warm bed.') : L('Mruczek śpi na łóżku. Pod nim coś błyszczy…', 'Whiskers is asleep on the bed. Something shiny is under him…')));
    b.zoomView('bedZ', { wall: 1, u: 0.5, y: 0.6, out: 1.1, dist: 1.5, look: 0.9 });
    b.catSpot('bed', { wall: 1, u: 0.55, y: 0.62, out: 1.15, pose: 'sleep' });
    b.catSpot('rug', { wall: 3, u: -0.7, out: 2.0, pose: 'loaf' });
    b.pickup('smallkey', smallKey(), { wall: 1, u: 0.45, y: 0.64, out: 1.2 }, 'bedZ', (f) => !!f.catAwake);
    b.cat('bed')
      .tap((c) => {
        if (!c.f.catAwake) { c.sfx('purr'); c.say(L('Mruczek śpi jak kamień. Leży na czymś błyszczącym.', 'Whiskers is fast asleep, lying on something shiny.')); }
        else { c.cat.happy(); c.say(L('Mrrr… Mruczek chrupie przysmaki.', 'Mrrr… Whiskers is munching his treats.')); }
      })
      .use('treats', (c) => {
        c.take('treats');
        c.f.catAwake = true;
        c.cat.goto('rug');
        c.cat.meow();
        c.say(L('Mruczek zwęszył przysmaki i zeskoczył z łóżka! Na pościeli coś zostało.', 'Whiskers smelled the treats and jumped off the bed! Something was left on the sheets.'));
      });
    b.obj('nightstand', nightstand(), { wall: 1, u: -0.85 })
      .zoom('nsZ')
      .anim((f, n, k) => slide(n, 'drawer', f.drawerOpen ? 0.3 : 0, k))
      .tap((c) => { if (!c.f.drawerOpen) c.say(L('Szuflada jest zamknięta na mały kluczyk.', 'The drawer is locked with a small key.')); })
      .use('smallkey', (c) => {
        c.take('smallkey');
        c.f.drawerOpen = true;
        c.sfx('drawer');
        c.say(L('Kluczyk pasuje! Szuflada się otworzyła.', 'The key fits! The drawer slides open.'));
      });
    b.put(tableLamp(), { wall: 1, u: -0.95, y: 0.55, out: 0.15 });
    b.put(framed(0.45, 0.35, (c, W, H) => { c.fillStyle = '#bfe3ff'; c.fillRect(0, 0, W, H); text(c, '🌙', W / 2, H / 2, H * 0.6, '#000'); }), { wall: 1, u: 0.05, y: 1.6 });
    b.put(framed(0.45, 0.35, (c, W, H) => { c.fillStyle = '#ffe3f0'; c.fillRect(0, 0, W, H); text(c, '⭐', W / 2, H / 2, H * 0.6, '#000'); }), { wall: 1, u: 0.95, y: 1.6 });
    b.put(framed(0.6, 0.8, (c, W, H) => { c.fillStyle = '#d8f0d0'; c.fillRect(0, 0, W, H); text(c, '🌳', W / 2, H / 2, H * 0.5, '#000'); }), { wall: 1, u: -2.3, y: 1.2 });
    b.zoomView('nsZ', { wall: 1, u: -0.85, y: 0.45, out: 0.45, dist: 1.2, look: 0.7 });
    b.pickup('note', paper(), { wall: 1, u: -0.85, y: 0.49, out: 0.62 }, 'nsZ', (f) => !!f.drawerOpen);

    // ----- wall 2: window, desk, the stopped clock -----
    b.put(windowFrame(), { wall: 2, u: 1.0 });
    b.obj('curtains', curtains(0xd96f7c), { wall: 2, u: 1.0 })
      .anim((f, n, k) => {
        slide(n, 'curtainL', f.curtains ? -0.45 : 0, k, 'x');
        slide(n, 'curtainR', f.curtains ? 0.45 : 0, k, 'x');
      })
      .tap((c) => { c.f.curtains = !c.f.curtains; c.sfx('slide'); });
    b.put(plantPot(0xe8c547, 0x5fae55, 0.8), { wall: 2, u: 1.35, y: 1.28, out: 0.05 });
    b.put(desk(), { wall: 2, u: -1.6 });
    b.put(chair(), { wall: 2, u: -1.6, out: 0.7, rot: Math.PI });
    b.put(bookRow(0.5, 3), { wall: 2, u: -1.9, y: 0.77 });
    b.put(cyl(0.05, 0.045, 0.1, 0xffffff), { wall: 2, u: -1.2, y: 0.77, out: 0.35 });
    b.obj('clock', wallClock(7, 45), { wall: 2, u: -1.6, y: 2.15 })
      .zoom('clockZ')
      .tap((c) => c.say(L('Zegar nie tyka. Stanął i już nie ruszy.', 'The clock isn\'t ticking. It has stopped for good.')));
    b.zoomView('clockZ', { wall: 2, u: -1.6, y: 2.15, out: 0.05, dist: 1.4, look: -0.2 });

    // ----- wall 3: wardrobe, rug, toy box -----
    b.obj('wardrobe', wardrobe(0xb07b52), { wall: 3, u: 0.4 })
      .anim((f, n, k) => {
        swing(n, 'doorL', f.wardrobeOpen ? -1.6 : 0, k);
        swing(n, 'doorR', f.wardrobeOpen ? 1.6 : 0, k);
      })
      .tap((c) => {
        c.f.wardrobeOpen = !c.f.wardrobeOpen;
        c.sfx(c.f.wardrobeOpen ? 'creak' : 'close');
      });
    b.put(box(1.2, 0.35, 0.4, 0xf2e6d4, 0, 0, 0), { wall: 3, u: 0.4, y: 0.06, out: 0.1 }); // folded clothes
    b.zoomView('wardZ', { wall: 3, u: 0.4, y: 1.25, out: 0.3, dist: 1.8, look: 0.2 });
    b.pickup('treats', treatsBox(), { wall: 3, u: 0.2, y: 1.23, out: 0.3 }, 'wardZ', (f) => !!f.wardrobeOpen);
    b.obj('rug', rug(0xc0504d, 0xf2d0a4), { wall: 3, u: 0, out: 2.2 })
      .anim((f, n, k) => swing(n, 'corner', f.rugLifted ? 1.2 : 0, k, 'x'))
      .tap((c) => { c.f.rugLifted = !c.f.rugLifted; c.sfx('slide'); });
    b.goldFish({ wall: 3, u: 0.95, out: 2.75, y: 0.02 }, undefined, (f) => !!f.rugLifted);
    b.put(box(1.1, 0.04, 0.28, 0x8a5a3b), { wall: 3, u: -2.2, y: 1.45 });
    b.put(bookRow(0.7, 5), { wall: 3, u: -2.35, y: 1.49 });
    b.put(plantPot(0xffffff, 0x6abf69, 0.6), { wall: 3, u: -1.85, y: 1.49 });
    b.put(framed(0.5, 0.65, (c, W, H) => { c.fillStyle = '#fff1c1'; c.fillRect(0, 0, W, H); text(c, '🐟', W / 2, H / 2, H * 0.45, '#000'); }), { wall: 3, u: 2.0, y: 1.3 });
    b.obj('toybox', toyBox(), { wall: 3, u: -2.2 })
      .anim((f, n, k) => swing(n, 'lid', f.toyOpen ? -1.4 : 0, k, 'x'))
      .tap((c) => {
        c.f.toyOpen = !c.f.toyOpen;
        c.sfx('open');
        if (c.f.toyOpen) c.say(L('Piłeczki i gumowa myszka. Nic przydatnego.', 'Balls and a rubber mouse. Nothing useful.'));
      });
  },
  solution: [
    { tap: 'wardrobe' }, { tap: 'pick_treats' }, { use: ['treats', 'cat'] }, { tap: 'pick_smallkey' },
    { use: ['smallkey', 'nightstand'] }, { tap: 'pick_note' }, { tap: 'lock' }, { code: '745' }, { tap: 'door' },
  ],
};
