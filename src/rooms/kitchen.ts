// Room 2 — the kitchen. The cat guards a cabinet, a vent hides a recipe, and the cups hide the code.
import { L, tx } from '../i18n';
import type { Ctx, RoomDef } from '../engine/types';
import {
  bowl, calendar, chair, cup, door, fridge, keypad, milk, paper, plantPot, screwdriver, sinkCabinet, slide, split,
  stove, swing, table, upperCabinet, windowFrame,
} from '../view/furniture';
import { ball, box, cyl } from '../view/kit';

const CUPS = [
  { id: 'cupR', color: 0xe25c5c, digit: '3' },
  { id: 'cupB', color: 0x4a8fe0, digit: '8' },
  { id: 'cupY', color: 0xf2c53d, digit: '1' },
  { id: 'cupG', color: 0x4cbf7a, digit: '6' },
];

export const kitchen: RoomDef = {
  id: 'kitchen',
  icon: '🍳',
  name: L('Kuchnia', 'Kitchen'),
  intro: L('Kuchnia. Pachnie kawą, a drzwi mają zamek na kod. Mruczek chyba jest głodny…', 'The kitchen. It smells of coffee and the door has a code lock. Whiskers looks hungry…'),
  theme: { wall: 0xfff1d6, wall2: 0xf5dfb8, pattern: 'tiles', floor: 0xe8e2d8, floor2: 0x9fb0c0, floorKind: 'tiles', ceiling: 0xffffff, trim: 0xd9c7a8, light: 0xfff4e0 },
  items: {
    milk: { icon: '🥛', name: L('Mleko', 'Milk'), desc: L('Karton mleka. Mruczek by się ucieszył.', 'A carton of milk. Whiskers would love it.') },
    screwdriver: { icon: '🪛', name: L('Śrubokręt', 'Screwdriver'), desc: L('Żółty śrubokręt. Do odkręcania śrubek.', 'A yellow screwdriver. For undoing screws.') },
    recipe: {
      icon: '🧾', name: L('Kartka z przepisem', 'Recipe card'), desc: L('Kartka zza kratki okapu.', 'A card from behind the vent.'),
      doc: {
        style: 'paper',
        title: L('Poranna kawa babci ☕', 'Grandma\'s morning coffee ☕'),
        body: L('Kubki zawsze stawiam w tej kolejności:\n\n1. 🟡 żółty\n2. 🔴 czerwony\n3. 🟢 zielony\n4. 🔵 niebieski\n\nA pod każdym schowałam cyferkę 😉',
          'I always set out the cups in this order:\n\n1. 🟡 yellow\n2. 🔴 red\n3. 🟢 green\n4. 🔵 blue\n\nAnd I hid a little digit under each one 😉'),
      },
    },
  },
  hints: [
    { done: (f, has) => has('milk') || !!f.catFed, hints: [
      L('Mruczek miauczy przy pustej misce. Chyba jest głodny.', 'Whiskers keeps meowing by his empty bowl. He must be hungry.'),
      L('W lodówce znajdziesz coś do picia dla kota.', 'The fridge has something a cat would drink.'),
      L('Otwórz lodówkę i weź mleko.', 'Open the fridge and take the milk.')] },
    { done: (f) => !!f.catFed, hints: [
      L('Masz mleko. Komu by się przydało?', 'You have milk. Who would like it?'),
      L('Miska Mruczka stoi pusta.', 'Whiskers\' bowl is empty.'),
      L('Użyj mleka na misce kota.', 'Use the milk on the cat\'s bowl.')] },
    { done: (f, has) => has('screwdriver') || !!f.grateOff, hints: [
      L('Mruczek już nie pilnuje szafki pod zlewem.', 'Whiskers is no longer guarding the cabinet under the sink.'),
      L('Zajrzyj do szafki pod zlewem.', 'Look inside the cabinet under the sink.'),
      L('Otwórz szafkę pod zlewem i weź śrubokręt.', 'Open the cabinet under the sink and take the screwdriver.')] },
    { done: (f) => !!f.grateOff, hints: [
      L('Śrubokręt odkręca śrubki. Gdzie widzisz śrubki?', 'A screwdriver undoes screws. Where do you see screws?'),
      L('Spójrz na okap nad kuchenką.', 'Look at the hood above the stove.'),
      L('Użyj śrubokręta na kratce okapu.', 'Use the screwdriver on the hood\'s vent.')] },
    { done: (f, has) => has('recipe') || !!f.doorOpen, hints: [
      L('Coś wypadło zza kratki.', 'Something fell out from behind the vent.'),
      L('Spójrz na kuchenkę pod okapem.', 'Look at the stove under the hood.'),
      L('Weź kartkę z kuchenki.', 'Take the card from the stove.')] },
    { done: (f) => !!f.doorOpen, hints: [
      L('Przeczytaj kartkę: stuknij ją w ekwipunku dwa razy.', 'Read the card: tap it twice in your inventory.'),
      L('Pod kubkami na stole są cyfry. Kolejność kubków jest na kartce.', 'There are digits under the cups on the table. The card gives the order.'),
      L('Żółty 1, czerwony 3, zielony 6, niebieski 8. Wpisz 1368 na zamku przy drzwiach.', 'Yellow 1, red 3, green 6, blue 8. Enter 1368 on the lock by the door.')] },
    { done: (f) => !!f.won, hints: [L('Drzwi są otwarte!', 'The door is open!'), L('Stuknij drzwi.', 'Tap the door.'), L('Stuknij drzwi, żeby wyjść.', 'Tap the door to leave.')] },
  ],
  build(b) {
    // ----- wall 0: door with a keypad -----
    b.obj('door', door(0x5d8aa8), { wall: 0, u: -1.3 })
      .anim((f, n, k) => swing(n, 'leaf', f.doorOpen ? -1.3 : 0, k))
      .tap((c) => {
        if (c.f.doorOpen) c.win();
        else c.say(L('Drzwi są zamknięte. Obok jest zamek z klawiaturą.', 'The door is locked. There is a keypad next to it.'));
      });
    b.obj('keypad', keypad(), { wall: 0, u: -0.4, y: 1.15 })
      .tap((c) => {
        if (c.f.doorOpen) { c.say(L('Już otwarte!', 'Already open!')); return; }
        c.lock({ kind: 'keypad', answer: '1368', title: L('Zamek szyfrowy', 'Code lock') }, () => {
          c.f.doorOpen = true;
          c.sfx('creak');
          c.say(L('Piknięcie i drzwi się otworzyły!', 'Beep, and the door swings open!'));
        });
      });
    b.put(calendar(tx(L('MAJ', 'MAY')), tx(L('Urodziny Mruczka 🎂', 'Whiskers\' birthday 🎂'))), { wall: 0, u: 1.1, y: 1.55, out: 0.01 });
    b.put(box(0.9, 0.04, 0.25, 0xb07b52), { wall: 0, u: 2.3, y: 1.5 });
    for (const [x, col] of [[-0.3, 0xe25c5c], [0, 0xf2c53d], [0.3, 0x4cbf7a]] as const) b.put(cyl(0.07, 0.07, 0.22, col), { wall: 0, u: 2.3 + x, y: 1.54, out: 0.13 });
    b.put(plantPot(0xe8ecef, 0x5fae55, 1.2), { wall: 0, u: 3.0 });

    // ----- wall 1: fridge and stove -----
    const fr = fridge();
    const freezer = split(fr, 'freezer');
    b.obj('fridge', fr, { wall: 1, u: -1.9 })
      .anim((f, n, k) => swing(n, 'door', f.fridgeOpen ? -1.7 : 0, k))
      .tap((c) => { c.f.fridgeOpen = !c.f.fridgeOpen; c.sfx(c.f.fridgeOpen ? 'open' : 'close'); });
    b.obj('freezer', freezer, { wall: 1, u: -1.9 })
      .anim((f, n, k) => swing(n, 'freezer', f.freezerOpen ? -1.7 : 0, k))
      .tap((c) => {
        c.f.freezerOpen = !c.f.freezerOpen;
        c.sfx(c.f.freezerOpen ? 'open' : 'close');
        if (c.f.freezerOpen && c.f.fishFound) c.say(L('Zamrażarka. Brr, zimno!', 'The freezer. Brr, it\'s cold!'));
      });
    b.zoomView('fridgeZ', { wall: 1, u: -1.9, y: 1.05, out: 0.35, dist: 1.9, look: 0.2 });
    b.pickup('milk', milk(), { wall: 1, u: -2.05, y: 0.72, out: 0.35 }, 'fridgeZ', (f) => !!f.fridgeOpen);
    b.put(box(0.18, 0.12, 0.14, 0xffe0a0), { wall: 1, u: -1.75, y: 0.72, out: 0.3 });
    b.put(ball(0.07, 0xe25c5c), { wall: 1, u: -1.7, y: 1.14, out: 0.3 });
    b.goldFish({ wall: 1, u: -1.9, y: 1.32, out: 0.35 }, 'fridgeZ', (f) => !!f.freezerOpen);

    const st = stove();
    const grate = split(st, 'grate');
    b.obj('stove', st, { wall: 1, u: -0.5 })
      .zoom('stoveZ')
      .anim((f, n, k) => swing(n, 'ovenDoor', f.ovenOpen ? 1.4 : 0, k, 'x'))
      .tap((c) => {
        c.f.ovenOpen = !c.f.ovenOpen;
        c.sfx(c.f.ovenOpen ? 'open' : 'close');
        if (c.f.ovenOpen) c.say(L('Piekarnik jest pusty i czysty.', 'The oven is empty and clean.'));
      });
    b.obj('grate', grate, { wall: 1, u: -0.5 })
      .show((f) => !f.grateOff)
      .in('stoveZ')
      .tap((c) => c.say(L('Kratka okapu przykręcona czterema śrubkami. Coś za nią szeleści.', 'The hood vent is held on by four screws. Something rustles behind it.')))
      .use('screwdriver', (c) => {
        c.f.grateOff = true;
        c.sfx('drawer');
        c.say(L('Kratka odpadła, a zza niej wyfrunęła kartka!', 'The vent came off and a card fluttered out!'));
      });
    b.zoomView('stoveZ', { wall: 1, u: -0.5, y: 1.4, out: 0.35, dist: 2.4, look: 0 });
    b.pickup('recipe', paper(0xfff4d6), { wall: 1, u: -0.35, y: 0.94, out: 0.35 }, 'stoveZ', (f) => !!f.grateOff);
    // counter with bread and fruit
    b.put(box(1.5, 0.9, 0.62, 0x7fc4b0), { wall: 1, u: 1.2 });
    b.put(box(1.54, 0.05, 0.66, 0x9aa3ad), { wall: 1, u: 1.2, y: 0.9 });
    b.put(box(0.4, 0.22, 0.26, 0xb07b52), { wall: 1, u: 1.5, y: 0.95, out: 0.1 });
    for (const [x, col] of [[0.7, 0xe25c5c], [0.82, 0xf2c53d], [0.76, 0x7cbf4f]] as const) b.put(ball(0.07, col), { wall: 1, u: x, y: 1.01, out: 0.35 });
    b.put(upperCabinet(1.5, 0x7fc4b0), { wall: 1, u: 1.2, y: 1.6 });

    // ----- wall 2: table with cups under a window -----
    b.put(windowFrame(0xbfe6ff), { wall: 2, u: 0 });
    b.obj('table', table(1.6, 0.9, 0xc8966a), { wall: 2, u: 0 })
      .zoom('tableZ')
      .tap((c) => c.say(L('Na stole stoją cztery odwrócone kubki.', 'Four upside-down cups stand on the table.')));
    b.zoomView('tableZ', { wall: 2, u: 0, y: 0.8, out: 0.5, dist: 1.2, look: 0.9 });
    CUPS.forEach((cp, i) => {
      b.obj(cp.id, cup(cp.color, cp.digit), { wall: 2, u: -0.54 + i * 0.36, y: 0.8, out: 0.5 })
        .in('tableZ')
        .anim((f, n, k) => slide(n, 'cup', f[cp.id] ? 0.22 : 0, k, 'y'))
        .tap((c) => { c.f[cp.id] = !c.f[cp.id]; c.sfx('click'); });
    });
    b.put(cyl(0.2, 0.15, 0.08, 0xffffff), { wall: 2, u: 0.55, y: 0.8, out: 0.2 });
    for (const u of [-0.55, 0.55]) b.put(chair(0xb07b52), { wall: 2, u, out: 1.2, rot: Math.PI });

    // ----- wall 3: sink cabinet guarded by the cat, and his bowl -----
    b.catSpot('cab', { wall: 3, u: 0.9, out: 1.0, pose: 'sit' });
    b.catSpot('bowl', { wall: 3, u: -0.9, out: 0.8, pose: 'loaf', face: Math.PI * 0.85 });
    b.cat('cab')
      .tap((c) => {
        if (!c.f.catFed) { c.cat.meow(); c.say(L('Miau! Mruczek patrzy to na ciebie, to na pustą miskę.', 'Meow! Whiskers looks at you, then at his empty bowl.')); }
        else { c.cat.happy(); c.say(L('Mruczek chłepcze mleko. Mlask, mlask.', 'Whiskers laps up the milk. Slurp, slurp.')); }
      })
      .use('milk', (c) => pour(c));
    const pour = (c: Ctx) => {
      c.take('milk');
      c.f.catFed = true;
      c.sfx('water');
      c.cat.goto('bowl');
      c.say(L('Nalewasz mleka do miski. Mruczek od razu podbiega!', 'You pour milk into the bowl. Whiskers runs right over!'));
    };
    b.obj('bowl', bowl(0x4a8fe0), { wall: 3, u: -0.9, out: 0.35 })
      .anim((f, n) => { n.getObjectByName('milk')!.visible = !!f.catFed; })
      .tap((c) => c.say(c.f.catFed ? L('Miska pełna mleka.', 'A bowl full of milk.') : L('Pusta miska Mruczka. On chyba jest głodny.', 'Whiskers\' empty bowl. He must be hungry.')))
      .use('milk', (c) => pour(c));
    b.obj('sink', sinkCabinet(0x7fc4b0), { wall: 3, u: 0.9 })
      .anim((f, n, k) => {
        swing(n, 'doorL', f.cabOpen ? -1.5 : 0, k);
        swing(n, 'doorR', f.cabOpen ? 1.5 : 0, k);
      })
      .tap((c) => {
        if (!c.f.catFed) { c.say(L('Mruczek siedzi przed szafką i nie pozwala jej otworzyć.', 'Whiskers sits in front of the cabinet and won\'t let you open it.')); return; }
        c.f.cabOpen = !c.f.cabOpen;
        c.sfx(c.f.cabOpen ? 'open' : 'close');
      });
    b.zoomView('cabZ', { wall: 3, u: 0.9, y: 0.4, out: 0.3, dist: 1.5, look: 0.5 });
    b.pickup('screwdriver', screwdriver(), { wall: 3, u: 0.8, y: 0.06, out: 0.3 }, 'cabZ', (f) => !!f.cabOpen);
    b.put(cyl(0.08, 0.08, 0.25, 0x7fb3e0), { wall: 3, u: 1.2, y: 0.05, out: 0.3 });
    b.put(upperCabinet(1.2, 0x7fc4b0), { wall: 3, u: 0.9, y: 1.6 });
    b.put(cyl(0.18, 0.16, 0.5, 0x9aa3ad), { wall: 3, u: -2.3, out: 0.3 });
  },
  solution: [
    { tap: 'fridge' }, { tap: 'pick_milk' }, { use: ['milk', 'bowl'] }, { tap: 'sink' }, { tap: 'pick_screwdriver' },
    { use: ['screwdriver', 'grate'] }, { tap: 'pick_recipe' }, { tap: 'keypad' }, { code: '1368' }, { tap: 'door' },
  ],
};
