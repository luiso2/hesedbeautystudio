import assert from 'node:assert/strict';
import test from 'node:test';
import { anatomyCues, filmTime, scrollPosition } from '../src/wood-anatomy-track.js';

test('the microscopic shot has extra scroll distance and the film retraces every frame', () => {
  const uptake = anatomyCues[1];
  const blood = anatomyCues[2];
  assert.equal(scrollPosition(blood.start) - scrollPosition(uptake.start), 2 * (blood.start - uptake.start));
  assert.deepEqual(uptake.phases.map(time => time * 24), [138, 172, 198]);
  for (let frame = 479; frame >= 0; frame--) {
    const time = frame / 24;
    assert.ok(Math.abs(filmTime(scrollPosition(time)) - time) < 1e-10);
  }
});
