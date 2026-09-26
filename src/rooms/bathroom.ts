// Room 3 — the bathroom. Lure the cat out of the laundry basket, fix the shower, and read the steamy mirror.
import { L } from '../i18n';
import type { RoomDef } from '../engine/types';
import * as THREE from 'three';
import {
  bathtub, colorPanel, door, duck, hitbox, laundryBasket, mirror, mirrorWriting, plantPot, smallCabinet, steam, swing,
  tapHandle, towelRack, toyMouse, washbasin, washingMachine,
} from '../view/furniture';
import { box, cyl, mat } from '../view/kit';

const DUCKS = [
  { id: 'duckY', color: 0xf2c53d, sym: '■' },
  { id: 'duckB', color: 0x4a8fe0, sym: '★' },
  { id: 'duckR', color: 0xe25c5c, sym: '▲' },
  { id: 'duckG', color: 0x4cbf7a, sym: '●' },
];

export const bathroom: RoomDef = {
  id: 'bathroom',
  icon: '🛁',
  name: L('Łazienka', 'Bathroom'),
  intro: L('Łazienka. Zamek w drzwiach ma cztery kolorowe przyciski. Gdzie jest Mruczek?', 'The bathroom. The door lock has four coloured buttons. Where is Whiskers?'),
  theme: { wall: 0xd9f0ef, wall2: 0xbfe3e0, pattern: 'tiles', floor: 0xf2f2f2, floor2: 0x9fc7cf, floorKind: 'tiles', ceiling: 0xffffff, trim: 0xa9d6d0, light: 0xf4fbff },
  items: {
    mouse: { icon: '🐭', name: L('Myszka-zabawka', 'Toy mouse'), desc: L('Szara myszka z różowym ogonkiem. Piszczy, gdy się ją ściśnie.', 'A grey toy mouse with a pink tail. It squeaks when squeezed.') },
    handle: { icon: '🔧', name: L('Kurek', 'Tap handle'), desc: L('Czerwony kurek od kranu albo prysznica.', 'A red handle from a tap or a shower.') },
  },
  hints: [
    { done: (f, has) => has('mouse') || !!f.catOut, hints: [
      L('Mruczek wygodnie leży w koszu na pranie i nie chce wyjść.', 'Whiskers is snuggled in the laundry basket and won\'t come out.'),
      L('Czym zwabić kota? Zajrzyj do małej szafki.', 'What would lure a cat? Look in the small cabinet.'),
      L('Otwórz małą szafkę obok umywalki i weź myszkę.', 'Open the small cabinet next to the washbasin and take the mouse.')] },
    { done: (f) => !!f.catOut, hints: [
      L('Koty uwielbiają gonić myszki.', 'Cats love chasing mice.'),
      L('Pokaż myszkę Mruczkowi.', 'Show the mouse to Whiskers.'),
      L('Użyj myszki na kocie w koszu na pranie.', 'Use the mouse on the cat in the laundry basket.')] },
    { done: (f, has) => has('handle') || !!f.handleOn, hints: [
      L('W koszu, gdzie siedział Mruczek, coś jest.', 'There is something in the basket where Whiskers was sitting.'),
      L('Przeszukaj kosz na pranie.', 'Search the laundry basket.'),
      L('Weź kurek z kosza na pranie.', 'Take the handle from the laundry basket.')] },
    { done: (f) => !!f.handleOn, hints: [
      L('Kurek pasuje do czegoś w łazience.', 'The handle fits something in the bathroom.'),
      L('Prysznic nad wanną nie ma kurka.', 'The shower above the bathtub has no handle.'),
      L('Użyj kurka na prysznicu przy wannie.', 'Use the handle on the shower by the bathtub.')] },
    { done: (f) => !!f.steam, hints: [
      L('Teraz można odkręcić wodę.', 'Now you can turn on the water.'),
      L('Stuknij kurek prysznica.', 'Tap the shower handle.'),
      L('Stuknij kurek, żeby puścić gorącą wodę.', 'Tap the handle to run hot water.')] },
    { done: (f) => !!f.doorOpen, hints: [
      L('Gorąca para zaparowała lustro. Spójrz na nie.', 'The hot steam fogged up the mirror. Take a look.'),
      L('Te same symbole są na spodach kaczek w wannie. Odwróć kaczki.', 'The same symbols are on the bottoms of the ducks in the tub. Flip the ducks.'),
      L('★ niebieska, ● zielona, ▲ czerwona, ■ żółta. Naciśnij: niebieski, zielony, czerwony, żółty.', '★ blue, ● green, ▲ red, ■ yellow. Press: blue, green, red, yellow.')] },
    { done: (f) => !!f.won, hints: [L('Drzwi są otwarte!', 'The door is open!'), L('Stuknij drzwi.', 'Tap the door.'), L('Stuknij drzwi, żeby wyjść.', 'Tap the door to leave.')] },
  ],
  build(b) {
    // ----- wall 0: door and colour lock -----
    b.obj('door', door(0xf4f1ea), { wall: 0, u: -1.3 })
      .anim((f, n, k) => swing(n, 'leaf', f.doorOpen ? -1.3 : 0, k))
      .tap((c) => {
        if (c.f.doorOpen) c.win();
        else c.say(L('Zamknięte. Zamek ma cztery kolorowe przyciski.', 'Locked. The lock has four coloured buttons.'));
      });
    b.obj('panel', colorPanel(['#e25c5c', '#f2c53d', '#4a8fe0', '#4cbf7a']), { wall: 0, u: -0.35, y: 1.0 })
      .tap((c) => {
        if (c.f.doorOpen) return;
        c.lock({
          kind: 'sequence',
          title: L('Kolorowy zamek', 'Colour lock'),
          buttons: [
            { id: 'red', label: '', color: '#e25c5c' }, { id: 'yellow', label: '', color: '#f2c53d' },
            { id: 'blue', label: '', color: '#4a8fe0' }, { id: 'green', label: '', color: '#4cbf7a' },
          ],
          answer: ['blue', 'green', 'red', 'yellow'],
        }, () => {
          c.f.doorOpen = true;
          c.sfx('creak');
          c.say(L('Klik! Drzwi się otworzyły.', 'Click! The door opens.'));
        });
      });
    b.put(towelRack(0xf29ab0), { wall: 0, u: 1.2 });
    b.put(box(0.8, 0.04, 0.22, 0xffffff), { wall: 0, u: 2.4, y: 1.35 });
    for (const [x, col] of [[-0.25, 0xff9ab0], [0, 0x7fd3c8], [0.25, 0xffd23f]] as const) b.put(cyl(0.05, 0.06, 0.2, col), { wall: 0, u: 2.4 + x, y: 1.39, out: 0.1 });
    b.put(plantPot(0xffffff, 0x5fae55, 1.0), { wall: 0, u: 3.0 });

    // ----- wall 1: bathtub with ducks and the broken shower -----
    b.obj('tub', bathtub(), { wall: 1, u: 0 })
      .zoom('tubZ')
      .anim((f, n) => {
        n.getObjectByName('handle')!.visible = !!f.handleOn;
        n.getObjectByName('stream')!.visible = !!f.showerOn;
      })
      .tap((c) => c.say(L('Wanna pełna wody i gumowych kaczek.', 'A bathtub full of water and rubber ducks.')));
    b.zoomView('tubZ', { wall: 1, u: -0.05, y: 0.45, out: 0.45, dist: 1.3, look: 0.9 });
    DUCKS.forEach((d, i) => {
      b.obj(d.id, duck(d.color, d.sym), { wall: 1, u: -0.55 + i * 0.36, y: 0.38, out: 0.5, rot: -Math.PI / 2 + (i - 1.5) * 0.3 })
        .in('tubZ')
        .anim((f, n, k) => {
          const inner = n.getObjectByName('duck')!;
          inner.rotation.x += ((f[d.id] ? Math.PI : 0) - inner.rotation.x) * k;
          inner.position.y += ((f[d.id] ? 0.16 : 0.07) - inner.position.y) * k;
          if (!f[d.id]) inner.position.y += Math.sin(performance.now() / 500 + i) * 0.0008;
          n.getObjectByName('label')!.visible = !!f[d.id];
        })
        .tap((c) => {
          c.f[d.id] = !c.f[d.id];
          c.sfx('water');
          if (c.f[d.id]) c.say(L(`Na spodzie kaczki jest symbol: ${d.sym}`, `There is a symbol on the duck's bottom: ${d.sym}`));
        });
    });
    b.obj('shower', hitbox(0.35, 0.3, 0.25), { wall: 1, u: 0.75, y: 0.75 })
      .tap((c) => {
        if (!c.f.handleOn) { c.say(L('Tu powinien być kurek od prysznica. Ktoś go zabrał!', 'The shower handle should be here. Someone took it!')); return; }
        c.f.showerOn = !c.f.showerOn;
        c.sfx('water');
        if (c.f.showerOn && !c.f.steam) {
          c.f.steam = true;
          c.say(L('Leci gorąca woda. Robi się parno!', 'Hot water pours out. It\'s getting steamy!'));
        }
      })
      .use('handle', (c) => {
        c.take('handle');
        c.f.handleOn = true;
        c.sfx('click');
        c.say(L('Kurek pasuje idealnie!', 'The handle fits perfectly!'));
      });
    // tub corner: bottles, a folded towel, a frosted window above
    for (const [x, col] of [[-0.8, 0xff9ab0], [-0.68, 0x7fd3c8]] as const) b.put(cyl(0.04, 0.05, 0.18, col), { wall: 1, u: x, y: 0.6, out: 0.07 });
    b.put(box(0.4, 0.06, 0.3, 0xf29ab0), { wall: 1, u: 0.45, y: 0.6, out: 0.2 });
    b.put(box(0.9, 0.6, 0.06, 0xffffff), { wall: 1, u: -0.3, y: 1.6 });
    b.put(box(0.8, 0.5, 0.02, mat(0xd6eef5, { emissive: 0x4a6a78, rough: 0.3 })), { wall: 1, u: -0.3, y: 1.65, out: 0.05 });
    b.put(box(0.9, 0.01, 0.6, 0x7fd3c8), { wall: 1, u: -0.1, out: 1.05 });
    b.fx('steam', steam(), { wall: 1, u: 0, out: 0.6 })
      .show((f) => !!f.steam)
      .anim((_f, n) => { n.children.forEach((m, i) => { m.position.y += Math.sin(performance.now() / 900 + i) * 0.0015; }); });

    // ----- wall 2: washbasin, the mirror and a small cabinet -----
    b.put(washbasin(), { wall: 2, u: -0.8 });
    b.obj('mirror', mirror(), { wall: 2, u: -0.8, y: 1.25 })
      .zoom('mirrorZ')
      .tap((c) => c.say(c.f.steam
        ? L('Na zaparowanym lustrze pojawiły się symbole!', 'Symbols have appeared on the steamy mirror!')
        : L('Lustro. Trochę zaparowane w rogu.', 'A mirror. A little misty in the corner.')));
    b.fx('writing', mirrorWriting('★ ● ▲ ■'), { wall: 2, u: -0.8, y: 1.8, out: 0.03 })
      .anim((f, n, k) => {
        const m = (n as THREE.Mesh).material as THREE.MeshStandardMaterial;
        m.opacity += ((f.steam ? 0.95 : 0) - m.opacity) * k * 0.3;
      });
    b.zoomView('mirrorZ', { wall: 2, u: -0.8, y: 1.75, out: 0.05, dist: 2.0, look: -0.15 });
    b.obj('scab', smallCabinet(0xffffff), { wall: 2, u: 1.2 })
      .anim((f, n, k) => swing(n, 'door', f.scabOpen ? -1.6 : 0, k))
      .tap((c) => { c.f.scabOpen = !c.f.scabOpen; c.sfx(c.f.scabOpen ? 'open' : 'close'); });
    b.zoomView('scabZ', { wall: 2, u: 1.2, y: 0.35, out: 0.25, dist: 1.2, look: 0.5 });
    b.pickup('mouse', toyMouse(), { wall: 2, u: 1.15, y: 0.04, out: 0.2 }, 'scabZ', (f) => !!f.scabOpen);
    b.put(box(0.9, 0.01, 0.55, 0x7fd3c8), { wall: 2, u: 0.3, out: 1.0 });

    // ----- wall 3: laundry basket (with the cat) and the washing machine -----
    b.catSpot('basket', { wall: 3, u: 1.0, y: 0.45, out: 0.35, pose: 'loaf' });
    b.catSpot('mat', { wall: 2, u: 0.3, out: 1.25, pose: 'sit' });
    b.obj('basket', laundryBasket(), { wall: 3, u: 1.0 })
      .tap((c) => c.say(c.f.catOut ? L('Kosz pełen prania.', 'A basket full of laundry.') : L('Mruczek leży w koszu na pranie. Wygodnie mu.', 'Whiskers is lying in the laundry basket. Very comfy.')));
    b.pickup('handle', tapHandle(), { wall: 3, u: 1.0, y: 0.62, out: 0.35 }, undefined, (f) => !!f.catOut);
    b.cat('basket')
      .tap((c) => {
        if (!c.f.catOut) { c.cat.meow(); c.say(L('Mruczek ani myśli wychodzić z kosza. Leży na czymś twardym.', 'Whiskers has no intention of leaving the basket. He\'s lying on something hard.')); }
        else { c.cat.happy(); c.say(L('Mruczek bawi się myszką.', 'Whiskers is playing with the mouse.')); }
      })
      .use('mouse', (c) => {
        c.take('mouse');
        c.f.catOut = true;
        c.cat.goto('mat');
        c.cat.meow();
        c.say(L('Pisk! Mruczek wyskoczył z kosza i goni myszkę!', 'Squeak! Whiskers leaps out of the basket after the mouse!'));
      });
    b.obj('washer', washingMachine(), { wall: 3, u: -0.6 })
      .zoom('wmZ')
      .anim((f, n, k) => swing(n, 'drum', f.wmOpen ? -1.8 : 0, k))
      .tap((c) => { c.f.wmOpen = !c.f.wmOpen; c.sfx(c.f.wmOpen ? 'open' : 'close'); });
    b.zoomView('wmZ', { wall: 3, u: -0.6, y: 0.4, out: 0.6, dist: 1.2, look: 0.2 });
    b.goldFish({ wall: 3, u: -0.6, y: 0.3, out: 0.72 }, 'wmZ', (f) => !!f.wmOpen);
    b.put(box(0.6, 0.04, 0.22, 0xffffff), { wall: 3, u: -0.6, y: 1.6 });
    b.put(cyl(0.08, 0.08, 0.3, 0x7fb3e0), { wall: 3, u: -0.8, y: 1.64, out: 0.1 });
  },
  solution: [
    { tap: 'scab' }, { tap: 'pick_mouse' }, { use: ['mouse', 'cat'] }, { tap: 'pick_handle' }, { use: ['handle', 'shower'] },
    { tap: 'shower' }, { tap: 'panel' }, { code: 'blue,green,red,yellow' }, { tap: 'door' },
  ],
};
