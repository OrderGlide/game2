// Breadth-first search over puzzle states: finds the shortest solution.
// Powers the in-game hints and verifies every generated level is solvable.
import { DIRS, cloneState, isWon, move, stateKey, type Dir, type Level, type State } from './engine';

export interface Solution {
  path: Dir[];
  /** states looked at — a rough measure of how much the level branches */
  explored: number;
}

export function solve(lv: Level, start: State, maxStates = 200_000): Solution | null {
  if (isWon(start)) return { path: [], explored: 1 };
  const states: State[] = [start];
  const parent: number[] = [-1];
  const via: Dir[] = [0];
  const seen = new Set<string>([stateKey(lv, start)]);
  for (let head = 0; head < states.length; head++) {
    if (states.length > maxStates) return null;
    const cur = states[head];
    for (const d of DIRS) {
      const next = cloneState(cur);
      if (!move(lv, next, d)) continue;
      const key = stateKey(lv, next);
      if (seen.has(key)) continue;
      seen.add(key);
      states.push(next);
      parent.push(head);
      via.push(d);
      if (isWon(next)) {
        const path: Dir[] = [];
        for (let i = states.length - 1; i > 0; i = parent[i]) path.push(via[i]);
        return { path: path.reverse(), explored: states.length };
      }
    }
  }
  return null;
}
