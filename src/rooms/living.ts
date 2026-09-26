// Room 4 — the living room. Play with the cat, power up the remote, and let the TV tell you how to read the books.
import { L, tx } from '../i18n';
import type { RoomDef } from '../engine/types';
import {
  aquarium, batteries, bookRow, bookshelf, coffeeTable, cushion, door, featherWand, fireplace, framed, goldFishModel,
  labelledBook, letterLock, net, plantPot, remote, rug, slide, sofa, split, swing, tvScreen, tvStand,
} from '../view/furniture';
import { text } from '../view/kit';

// shelf order (left to right) — the TV's "3 · 1 · 4 · 2" spells M-I-A-U
const BOOKS = [
  { id: 'book2', num: '2', letter: 'U', color: 0x4f81bd },
  { id: 'book4', num: '4', letter: 'A', color: 0x9bbb59 },
  { id: 'book1', num: '1', letter: 'I', color: 0xc0504d },
  { id: 'book3', num: '3', letter: 'M', color: 0x8064a2 },
];

export const living: RoomDef = {
  id: 'living',
  icon: '🛋️',
  name: L('Salon', 'Living room'),
  intro: L('Salon. Na drzwiach wisi kłódka z literami. Mruczek drzemie na kanapie.', 'The living room. A letter padlock hangs on the door. Whiskers is napping on the sofa.'),
  theme: { wall: 0xf6e3c8, wall2: 0xeccfa9, pattern: 'diamonds', floor: 0xa8744f, floor2: 0x7d5335, floorKind: 'planks', ceiling: 0xfffaf2, trim: 0xffffff, light: 0xffe9c9 },
  items: {
    feather: { icon: '🪶', name: L('Wędka z piórkiem', 'Feather wand'), desc: L('Kijek z kolorowymi piórkami. Ulubiona zabawka kotów.', 'A stick with colourful feathers. Every cat\'s favourite toy.') },
    remote: { icon: '📱', name: L('Pilot bez baterii', 'Remote without batteries'), desc: L('Pilot do telewizora. Ktoś wyjął z niego baterie.', 'A TV remote. Someone took out the batteries.') },
    batteries: { icon: '🔋', name: L('Baterie', 'Batteries'), desc: L('Dwie baterie AA.', 'Two AA batteries.') },
    remoteOk: { icon: '📺', name: L('Działający pilot', 'Working remote'), desc: L('Pilot z bateriami. Gotowy do użycia!', 'A remote with batteries. Ready to go!') },
    net: { icon: '🥅', name: L('Siatka na ryby', 'Fishing net'), desc: L('Mała siatka do akwarium.', 'A small aquarium net.') },
  },
  combos: [{ a: 'remote', b: 'batteries', result: 'remoteOk', say: L('Wkładasz baterie do pilota. Działa!', 'You put the batteries in the remote. It works!') }],
  hints: [
    { done: (f, has) => has('feather') || !!f.catPlay, hints: [
      L('Mruczek śpi na poduszce na kanapie. Czym bawią się koty?', 'Whiskers is asleep on a sofa cushion. What do cats play with?'),
      L('Coś kolorowego sterczy z doniczki.', 'Something colourful is sticking out of a flower pot.'),
      L('Weź wędkę z piórkiem z doniczki koło kominka.', 'Take the feather wand from the pot by the fireplace.')] },
    { done: (f) => !!f.catPlay, hints: [
      L('Pobaw się z Mruczkiem.', 'Play with Whiskers.'),
      L('Pomachaj mu piórkiem.', 'Wave the feather at him.'),
      L('Użyj wędki z piórkiem na śpiącym kocie.', 'Use the feather wand on the sleeping cat.')] },
    { done: (f, has) => has('remote') || has('remoteOk') || !!f.tvOn, hints: [
      L('Pod poduszką, na której spał Mruczek, coś jest.', 'There is something under the cushion Whiskers was sleeping on.'),
      L('Przesuń poduszkę na kanapie.', 'Move the cushion on the sofa.'),
      L('Stuknij poduszkę i weź pilota.', 'Tap the cushion and take the remote.')] },
    { done: (f, has) => has('batteries') || has('remoteOk') || !!f.tvOn, hints: [
      L('Pilot nie ma baterii. Szuflada stolika jest zamknięta na symbole.', 'The remote has no batteries. The coffee table drawer is locked with symbols.'),
      L('Obraz przy drzwiach pokazuje trzy symbole w pewnej kolejności.', 'The painting by the door shows three symbols in a certain order.'),
      L('Ustaw na szufladzie stolika 🌙 ☀ ⭐ i weź baterie.', 'Set 🌙 ☀ ⭐ on the coffee table drawer and take the batteries.')] },
    { done: (f, has) => has('remoteOk') || !!f.tvOn, hints: [
      L('Pilot i baterie pasują do siebie.', 'The remote and the batteries go together.'),
      L('Przedmioty w ekwipunku można łączyć.', 'You can combine items in your inventory.'),
      L('Stuknij pilota w ekwipunku, a potem baterie.', 'Tap the remote in your inventory, then the batteries.')] },
    { done: (f) => !!f.tvOn, hints: [
      L('Masz działający pilot.', 'You have a working remote.'),
      L('Włącz telewizor.', 'Turn on the TV.'),
      L('Użyj działającego pilota na telewizorze.', 'Use the working remote on the TV.')] },
    { done: (f) => !!f.doorOpen, hints: [
      L('Telewizor podaje kolejność: 3 · 1 · 4 · 2.', 'The TV gives an order: 3 · 1 · 4 · 2.'),
      L('Na półce stoją książki z numerami i literami.', 'The shelf holds books with numbers and letters.'),
      L('Książka 3 = M, 1 = I, 4 = A, 2 = U. Ustaw MIAU na kłódce.', 'Book 3 = M, 1 = I, 4 = A, 2 = U. Set MIAU on the padlock.')] },
    { done: (f) => !!f.won, hints: [L('Drzwi są otwarte!', 'The door is open!'), L('Stuknij drzwi.', 'Tap the door.'), L('Stuknij drzwi, żeby wyjść.', 'Tap the door to leave.')] },
  ],
  build(b) {
    // ----- wall 0: door with a letter lock and the symbol painting -----
    b.obj('door', door(0x6e4a2f), { wall: 0, u: -1.3 })
      .anim((f, n, k) => swing(n, 'leaf', f.doorOpen ? -1.3 : 0, k))
      .tap((c) => {
        if (c.f.doorOpen) c.win();
        else c.say(L('Zamknięte na kłódkę z czterema literami.', 'Locked with a four-letter padlock.'));
      });
    b.obj('lock', letterLock(), { wall: 0, u: -0.85, y: 1.0, out: 0.14 })
      .show((f) => !f.doorOpen)
      .tap((c) => c.lock({ kind: 'wheels', chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', answer: 'MIAU', title: L('Kłódka z literami', 'Letter padlock') }, () => {
        c.f.doorOpen = true;
        c.sfx('creak');
        c.say(L('M-I-A-U! Kłódka opadła.', 'M-I-A-U! The padlock drops off.'));
      }));
    b.obj('painting', framed(1.2, 0.75, (c, W, H) => {
      const g = c.createLinearGradient(0, 0, W, 0);
      g.addColorStop(0, '#223366'); g.addColorStop(0.5, '#ffcf6b'); g.addColorStop(1, '#6a4c93');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      c.fillStyle = '#3f7f4a'; c.fillRect(0, H * 0.78, W, H * 0.22);
      text(c, '🌙', W * 0.18, H * 0.38, H * 0.3, '#000');
      text(c, '☀', W * 0.5, H * 0.38, H * 0.36, '#fff3a0');
      text(c, '⭐', W * 0.82, H * 0.38, H * 0.3, '#000');
    }, 0xc9a23a), { wall: 0, u: 1.4, y: 1.2 })
      .zoom('paintZ')
      .tap((c) => c.say(L('Obraz „Doba”. Najpierw noc, potem dzień, a na końcu gwiazdy.', 'A painting called "A Day". First night, then day, and finally the stars.')));
    b.zoomView('paintZ', { wall: 0, u: 1.4, y: 1.55, out: 0.05, dist: 1.6, look: 0 });
    b.put(plantPot(0x6a8caf, 0x4f9a4a, 1.3), { wall: 0, u: 3.0 });

    // ----- wall 1: TV and the bookshelf -----
    const tv = tvStand();
    const tvDoor = split(tv, 'door');
    b.obj('tv', tv, { wall: 1, u: -1.3 })
      .tap((c) => c.say(c.f.tvOn
        ? L('Na ekranie: KANAŁ 7 — 3 · 1 · 4 · 2', 'On screen: CHANNEL 7 — 3 · 1 · 4 · 2')
        : L('Telewizor jest wyłączony. Gdzie jest pilot?', 'The TV is off. Where is the remote?')))
      .use('remoteOk', (c) => {
        c.f.tvOn = true;
        c.sfx('switch');
        c.say(L('Telewizor się włączył! Na ekranie jakieś cyfry.', 'The TV turns on! Some numbers are on the screen.'));
      })
      .use('remote', (c) => c.say(L('Pilot nie działa. Nie ma w nim baterii.', 'The remote doesn\'t work. It has no batteries.')));
    b.fx('screen', tvScreen([tx(L('KANAŁ 7', 'CHANNEL 7')), '3 · 1 · 4 · 2']), { wall: 1, u: -1.3, y: 0.91, out: 0.235 })
      .show((f) => !!f.tvOn);
    b.obj('tvdoor', tvDoor, { wall: 1, u: -1.3 })
      .anim((f, n, k) => swing(n, 'door', f.tvDoorOpen ? 1.5 : 0, k))
      .tap((c) => { c.f.tvDoorOpen = !c.f.tvDoorOpen; c.sfx(c.f.tvDoorOpen ? 'open' : 'close'); });
    b.zoomView('tvZ', { wall: 1, u: -0.95, y: 0.3, out: 0.3, dist: 1.1, look: 0.5 });
    b.pickup('net', net(), { wall: 1, u: -0.9, y: 0.07, out: 0.25 }, 'tvZ', (f) => !!f.tvDoorOpen);
    b.obj('shelf', bookshelf(1.4), { wall: 1, u: 1.3 })
      .zoom('shelfZ')
      .tap((c) => c.say(L('Regał z książkami. Cztery grube tomy mają numery i litery.', 'A bookshelf. Four thick volumes have numbers and letters.')));
    b.put(bookRow(1.3, 1), { wall: 1, u: 1.3, y: 0.09 });
    b.put(bookRow(0.7, 4), { wall: 1, u: 1.65, y: 0.55 });
    b.put(bookRow(1.3, 9), { wall: 1, u: 1.3, y: 1.47 });
    b.zoomView('shelfZ', { wall: 1, u: 1.05, y: 0.75, out: 0.2, dist: 1.3, look: 0.15 });
    BOOKS.forEach((bk, i) => {
      b.obj(bk.id, labelledBook(bk.color, bk.num, bk.letter), { wall: 1, u: 0.72 + i * 0.12, y: 0.55 })
        .in('shelfZ')
        .anim((f, n, k) => slide(n, 'book', f[bk.id] ? 0.12 : 0, k))
        .tap((c) => {
          c.f[bk.id] = !c.f[bk.id];
          c.sfx('slide');
          c.say(L(`Tom ${bk.num}, na grzbiecie litera ${bk.letter}.`, `Volume ${bk.num}, with the letter ${bk.letter} on its spine.`));
        });
    });

    // ----- wall 2: sofa with the sleeping cat, coffee table -----
    b.put(sofa(0x6a8caf), { wall: 2, u: 0 });
    b.catSpot('sofa', { wall: 2, u: -0.5, y: 0.65, out: 0.5, pose: 'sleep' });
    b.catSpot('rug', { wall: 2, u: 1.2, out: 2.1, pose: 'sit', face: 0.4 });
    b.cat('sofa')
      .tap((c) => {
        if (!c.f.catPlay) { c.sfx('purr'); c.say(L('Mruczek drzemie na poduszce. Chrrr…', 'Whiskers is dozing on the cushion. Zzz…')); }
        else { c.cat.happy(); c.say(L('Mruczek poluje na piórko!', 'Whiskers is hunting the feather!')); }
      })
      .use('feather', (c) => {
        c.take('feather');
        c.f.catPlay = true;
        c.cat.goto('rug');
        c.cat.meow();
        c.say(L('Mruczek obudził się i skoczył za piórkiem na dywan!', 'Whiskers woke up and pounced after the feather onto the rug!'));
      });
    b.obj('cushion', cushion(0xf2c53d), { wall: 2, u: -0.5, y: 0.5, out: 0.2 })
      .anim((f, n, k) => { n.position.y += ((f.cushionMoved ? 0.62 : 0.5) - n.position.y) * k; n.rotation.z += ((f.cushionMoved ? 0.5 : 0) - n.rotation.z) * k; })
      .tap((c) => {
        if (!c.f.catPlay) { c.say(L('Mruczek na niej śpi. Nie wypada go zrzucać.', 'Whiskers is sleeping on it. It would be rude to push him off.')); return; }
        c.f.cushionMoved = !c.f.cushionMoved;
        c.sfx('slide');
      });
    b.put(cushion(0xe25c5c), { wall: 2, u: 0.5, y: 0.5, out: 0.2 });
    b.pickup('remote', remote(), { wall: 2, u: -0.5, y: 0.5, out: 0.6 }, undefined, (f) => !!f.cushionMoved);
    const ct = coffeeTable();
    const ctDrawer = split(ct, 'drawer');
    b.obj('ctable', ct, { wall: 2, u: 0, out: 1.4 })
      .zoom('ctZ')
      .tap((c) => c.say(L('Stolik kawowy z szufladką.', 'A coffee table with a little drawer.')));
    b.obj('ctdrawer', ctDrawer, { wall: 2, u: 0, out: 1.4 })
      .in('ctZ')
      .anim((f, n, k) => slide(n, 'drawer', f.ctOpen ? 0.32 : 0, k))
      .tap((c) => {
        if (c.f.ctOpen) return;
        c.lock({ kind: 'wheels', chars: '☀🌙⭐🌸', answer: '🌙☀⭐', title: L('Szuflada z symbolami', 'Symbol drawer') }, () => {
          c.f.ctOpen = true;
          c.sfx('drawer');
        });
      });
    b.zoomView('ctZ', { wall: 2, u: 0, y: 0.4, out: 1.9, dist: 1.1, look: 0.7 });
    b.pickup('batteries', batteries(), { wall: 2, u: 0, y: 0.35, out: 2.05 }, 'ctZ', (f) => !!f.ctOpen);
    b.put(rug(0x6a8caf, 0xf6e3c8, 2.6, 1.8), { wall: 2, u: 0.4, out: 2.0 });

    // ----- wall 3: fireplace, plant with the feather wand, aquarium with the golden fish -----
    b.obj('fireplace', fireplace(), { wall: 3, u: 1.0 })
      .anim((_f, n) => { n.getObjectByName('fire')!.children.forEach((fl, i) => { fl.scale.y = 1 + Math.sin(performance.now() / 120 + i * 2) * 0.15; }); })
      .tap((c) => c.say(L('Ciepły kominek. Mruczek lubi tu drzemać zimą.', 'A warm fireplace. Whiskers likes to nap here in winter.')));
    b.put(framed(0.6, 0.45, (c, W, H) => { c.fillStyle = '#e8f4ff'; c.fillRect(0, 0, W, H); text(c, '🐈', W / 2, H / 2, H * 0.6, '#000'); }), { wall: 3, u: 1.0, y: 1.75 });
    b.obj('plant', plantPot(0xc8643c, 0x4f9a4a, 1.2), { wall: 3, u: -0.05 })
      .zoom('plantZ')
      .tap((c) => c.say(L('Duża roślina w doniczce.', 'A big potted plant.')));
    b.zoomView('plantZ', { wall: 3, u: -0.05, y: 0.4, out: 0.2, dist: 1.2, look: 0.4 });
    b.pickup('feather', featherWand(), { wall: 3, u: 0.02, y: 0.3, out: 0.12 }, 'plantZ');
    b.obj('aquarium', aquarium(), { wall: 3, u: -1.4 })
      .zoom('aqZ')
      .anim((_f, n) => {
        n.getObjectByName('fishes')!.children.forEach((fish, i) => { fish.position.x = Math.sin(performance.now() / (1500 + i * 400) + i) * 0.3; });
      })
      .tap((c) => c.say(c.f.fishFound
        ? L('Rybki pływają spokojnie.', 'The fish swim peacefully.')
        : L('W akwarium pływa złota rybka! Gołymi łapkami jej nie złapię.', 'A golden fish swims in the aquarium! Can\'t catch it with bare paws.')))
      .use('net', (c) => {
        if (c.f.fishFound) return;
        c.take('net');
        c.foundFish();
        c.say(L('Złapana! Złota rybka!', 'Caught it! A golden fish!'));
      });
    b.zoomView('aqZ', { wall: 3, u: -1.4, y: 0.95, out: 0.25, dist: 1.4, look: 0.1 });
    b.fx('tankFish', goldFishModel(), { wall: 3, u: -1.4, y: 0.82, out: 0.23 })
      .show((f) => !f.fishFound)
      .anim((_f, n) => { n.position.y = 0.82 + Math.sin(performance.now() / 700) * 0.05; });
  },
  solution: [
    { tap: 'pick_feather' }, { use: ['feather', 'cat'] }, { tap: 'cushion' }, { tap: 'pick_remote' }, { tap: 'ctdrawer' },
    { code: '🌙☀⭐' }, { tap: 'pick_batteries' }, { combine: ['remote', 'batteries'] }, { use: ['remoteOk', 'tv'] },
    { tap: 'lock' }, { code: 'MIAU' }, { tap: 'door' },
  ],
};
