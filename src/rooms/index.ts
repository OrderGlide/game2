// The rooms of chapter 1, in play order.
import type { RoomDef } from '../engine/types';
import { bedroom } from './bedroom';
import { kitchen } from './kitchen';
import { bathroom } from './bathroom';
import { living } from './living';
import { study } from './study';
import { attic } from './attic';

export const ROOMS: RoomDef[] = [bedroom, kitchen, bathroom, living, study, attic];
