import { collegeBirds } from './bird-flight.js';
import { autumnLeaves } from './falling-leaves.js';

export function buildWildlife(T, scene, map, surfaces, mobile = false) {
  const group = new T.Group();
  group.name = 'College birds and autumn leaf fall';
  scene.add(group);
  const birds = collegeBirds(T, group, map, surfaces),
    leaves = autumnLeaves(T, group, map, surfaces, mobile);
  let time = 0,
    paused = false;
  return {
    update(dt, sim) {
      paused = !!sim.event;
      group.visible = !paused;
      if (paused) return;
      const delta = Math.max(0, Number(dt) || 0);
      time += delta;
      birds.update(delta);
      leaves.update(delta, sim);
    },
    metrics() {
      return {
        time: Math.round(time * 10000) / 10000,
        paused,
        visible: group.visible,
        birds: birds.metrics(),
        leaves: leaves.metrics(),
      };
    },
  };
}
