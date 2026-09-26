// The ten places the player escapes through, ten levels each. Colours, textures, props and scrawled phrases.
import { L, type Txt } from '../i18n';
import type { RoomTheme } from '../engine/types';

export type DecorKind =
  | 'doll' | 'rocking' | 'wheelchair' | 'hospitalBed' | 'barrel' | 'brokenChair' | 'mannequin' | 'bucket'
  | 'candles' | 'specimen' | 'schoolDesk' | 'tombstone' | 'bookshelf' | 'portrait' | 'pipes';

export interface Theme extends RoomTheme {
  intro: Txt[];
  decor: DecorKind[];
  /** containers that feel at home here (the generator prefers them) */
  prefer: string[];
  /** door colour */
  door: number;
  /** base pitch of the ambient drone (Hz) */
  drone: number;
}

export const THEMES: Theme[] = [
  {
    id: 'house', name: L('Opuszczony dom', 'Abandoned house'),
    wall: 0x6b5a4a, wall2: 0x5a4a3c, pattern: 'stripes', floor: 0x5a4030, floor2: 0x3a2a1e, floorKind: 'planks',
    ceiling: 0x4a4038, trim: 0x2e241c, light: 0xffc27a, fog: 0x0c0907, grime: 0.55, bright: 0.9, door: 0x4a3222, drone: 55,
    decor: ['doll', 'rocking', 'brokenChair', 'portrait', 'bookshelf', 'candles'], prefer: ['cabinet', 'drawers', 'trunk', 'desk', 'painting', 'floorboards'],
    intro: [
      L('Drzwi zatrzasnęły się za tobą. W domu ktoś jest… Uciekaj.', 'The door slammed behind you. Someone is in the house… Get out.'),
      L('Pachnie kurzem i czymś zgniłym. Musisz znaleźć wyjście.', 'It smells of dust and something rotten. You need a way out.'),
    ],
  },
  {
    id: 'cellar', name: L('Piwnica', 'Cellar'),
    wall: 0x5a4c44, wall2: 0x3e342e, pattern: 'bricks', floor: 0x4a4540, floor2: 0x2e2a26, floorKind: 'tiles',
    ceiling: 0x2e2a26, trim: 0x2a2420, light: 0xffb060, fog: 0x080706, grime: 0.8, bright: 0.75, door: 0x3a3a38, drone: 48,
    decor: ['barrel', 'bucket', 'pipes', 'brokenChair', 'candles'], prefer: ['crate', 'trunk', 'toolbox', 'vent', 'cabinet'],
    intro: [
      L('Zimna, wilgotna piwnica. Coś kapie w ciemności.', 'A cold, damp cellar. Something drips in the dark.'),
      L('Schody za tobą zniknęły w ciemności. Tylko jedne drzwi.', 'The stairs behind you vanished into darkness. Only one door.'),
    ],
  },
  {
    id: 'asylum', name: L('Szpital psychiatryczny', 'Asylum'),
    wall: 0x9aa89a, wall2: 0x7f8f80, pattern: 'tiles', floor: 0x8a8a80, floor2: 0x5a5a52, floorKind: 'tiles',
    ceiling: 0x6a6e66, trim: 0x4a524a, light: 0xd8ffe0, fog: 0x070a08, grime: 0.75, bright: 0.85, door: 0x6a7a6e, drone: 62,
    decor: ['wheelchair', 'hospitalBed', 'bucket', 'mannequin'], prefer: ['locker', 'medcab', 'desk', 'drawers', 'vent'],
    intro: [
      L('Oddział zamknięty. Na ścianach ślady paznokci.', 'The locked ward. Fingernail marks on the walls.'),
      L('Ktoś tu wciąż jest pacjentem. I nie chce, żebyś wyszedł.', 'Someone here is still a patient. And doesn\'t want you to leave.'),
    ],
  },
  {
    id: 'school', name: L('Szkoła nocą', 'School at night'),
    wall: 0x7a8a6a, wall2: 0x6a7a5a, pattern: 'plain', floor: 0x6a5a48, floor2: 0x4a3e32, floorKind: 'planks',
    ceiling: 0x5a5a50, trim: 0x3a3a30, light: 0xf0f0ff, fog: 0x08090a, grime: 0.6, bright: 0.85, door: 0x4a5a6a, drone: 58,
    decor: ['schoolDesk', 'schoolDesk', 'doll', 'bookshelf', 'mannequin'], prefer: ['locker', 'desk', 'cabinet', 'drawers', 'puzzle'],
    intro: [
      L('Pusta klasa. Kreda sama pisze po tablicy.', 'An empty classroom. The chalk writes on the board by itself.'),
      L('Dzwonek zadzwonił o północy. Lekcja właśnie się zaczyna.', 'The bell rang at midnight. The lesson is just starting.'),
    ],
  },
  {
    id: 'hotel', name: L('Hotel „Cisza”', 'The Silent Hotel'),
    wall: 0x6a2a2a, wall2: 0x4a1a1c, pattern: 'diamonds', floor: 0x3a1a1a, floor2: 0x5a2a20, floorKind: 'planks',
    ceiling: 0x3a2a26, trim: 0x2a1a14, light: 0xffc890, fog: 0x0a0505, grime: 0.45, bright: 0.85, door: 0x3a1a12, drone: 52,
    decor: ['portrait', 'rocking', 'candles', 'mannequin', 'doll'], prefer: ['cabinet', 'drawers', 'safe', 'trunk', 'painting', 'desk'],
    intro: [
      L('Pokój 217. Klucz od recepcji nie pasuje do drzwi.', 'Room 217. The front-desk key doesn\'t fit the door.'),
      L('Ktoś zapukał trzy razy. Za drzwiami nikogo nie ma.', 'Someone knocked three times. Nobody is behind the door.'),
    ],
  },
  {
    id: 'morgue', name: L('Kostnica', 'Morgue'),
    wall: 0x8a9aa2, wall2: 0x6a7a84, pattern: 'tiles', floor: 0x6a7278, floor2: 0x4a5258, floorKind: 'tiles',
    ceiling: 0x5a6268, trim: 0x3a4248, light: 0xc8e0ff, fog: 0x05070a, grime: 0.6, bright: 0.8, door: 0x7a868e, drone: 45,
    decor: ['hospitalBed', 'bucket', 'wheelchair', 'specimen'], prefer: ['coffin', 'locker', 'medcab', 'drawers', 'vent'],
    intro: [
      L('Zimno jak w lodówce. Jedna z szuflad na ciała jest otwarta… od środka.', 'Cold as a fridge. One of the body drawers is open… from the inside.'),
      L('Etykieta na palcu ma twoje nazwisko.', 'The toe tag has your name on it.'),
    ],
  },
  {
    id: 'lab', name: L('Laboratorium', 'Laboratory'),
    wall: 0x8a9488, wall2: 0x6a7468, pattern: 'tiles', floor: 0x5a625a, floor2: 0x3a423a, floorKind: 'tiles',
    ceiling: 0x4a524a, trim: 0x2a322a, light: 0xb0ffb8, fog: 0x040a05, grime: 0.55, bright: 0.8, door: 0x4a5a4a, drone: 66,
    decor: ['specimen', 'specimen', 'wheelchair', 'hospitalBed', 'pipes'], prefer: ['locker', 'safe', 'medcab', 'desk', 'toolbox', 'vent', 'puzzle'],
    intro: [
      L('Coś w słoju poruszyło się, gdy weszłeś.', 'Something in a jar moved when you came in.'),
      L('Eksperyment wymknął się spod kontroli. Ty jesteś następny.', 'The experiment got out of hand. You are next.'),
    ],
  },
  {
    id: 'crypt', name: L('Krypta', 'Crypt'),
    wall: 0x5a5650, wall2: 0x46423c, pattern: 'bricks', floor: 0x4a4640, floor2: 0x36322c, floorKind: 'bricks',
    ceiling: 0x36322c, trim: 0x2a2620, light: 0xffa050, fog: 0x060505, grime: 0.85, bright: 0.7, door: 0x3a3632, drone: 42,
    decor: ['tombstone', 'tombstone', 'candles', 'candles', 'doll'], prefer: ['coffin', 'trunk', 'crate', 'painting', 'floorboards'],
    intro: [
      L('Świece zapaliły się same. Kamienne płyty szepczą imiona.', 'The candles lit themselves. The stone slabs whisper names.'),
      L('Ktoś zamurował wejście. Z drugiej strony.', 'Someone bricked up the entrance. From the other side.'),
    ],
  },
  {
    id: 'sewers', name: L('Kanały', 'Sewers'),
    wall: 0x4a5244, wall2: 0x363e32, pattern: 'bricks', floor: 0x3a4236, floor2: 0x262e24, floorKind: 'bricks',
    ceiling: 0x2a3226, trim: 0x1e241a, light: 0xd0ff90, fog: 0x050704, grime: 0.95, bright: 0.7, door: 0x3a4236, drone: 40,
    decor: ['pipes', 'barrel', 'bucket', 'pipes', 'brokenChair'], prefer: ['crate', 'toolbox', 'vent', 'locker', 'trunk'],
    intro: [
      L('Woda sięga kostek. Coś przepłynęło obok.', 'The water is ankle-deep. Something just swam past.'),
      L('W rurach ktoś stuka. Coraz bliżej.', 'Someone is knocking inside the pipes. Getting closer.'),
    ],
  },
  {
    id: 'final', name: L('Pokój 100', 'Room 100'),
    wall: 0x3a1418, wall2: 0x240a0c, pattern: 'diamonds', floor: 0x1e1012, floor2: 0x3a1418, floorKind: 'tiles',
    ceiling: 0x1a0c0e, trim: 0x100608, light: 0xff5050, fog: 0x080203, grime: 0.7, bright: 0.75, door: 0x1a0a0a, drone: 36,
    decor: ['doll', 'mannequin', 'candles', 'portrait', 'rocking'], prefer: ['coffin', 'safe', 'cabinet', 'puzzle', 'trunk', 'painting'],
    intro: [
      L('Ten pokój zna twoje imię. Za drzwiami czeka koniec koszmaru.', 'This room knows your name. Behind the door, the nightmare ends.'),
      L('Byłeś tu już. Tysiące razy.', 'You have been here before. Thousands of times.'),
    ],
  },
];

export const themeFor = (level: number): Theme => THEMES[Math.min(THEMES.length - 1, Math.floor((level - 1) / 10))];

/** Creepy writing for the walls (no Polish diacritics — the scrawl font doesn't have them). */
export const PHRASES: Txt[] = [
  L('UCIEKAJ', 'RUN'), L('ON TU JEST', 'HE IS HERE'), L('NIE ODWRACAJ SIE', "DON'T LOOK BACK"), L('POMOCY', 'HELP ME'),
  L('ZA TOBA', 'BEHIND YOU'), L('NIE MA WYJSCIA', 'NO WAY OUT'), L('SLYSZE CIE', 'I HEAR YOU'), L('ZOSTAN', 'STAY'),
  L('WIDZE CIE', 'I SEE YOU'), L('TO NIE SEN', 'NOT A DREAM'),
];
