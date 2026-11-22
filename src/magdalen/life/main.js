import { plantSite } from './vegetation.js';
import { animateSite } from './motion.js';
import { createChoir } from './chorale.js';

export function buildLife(T, scene, map) {
  const planting = plantSite(T, scene, map);
  const population = animateSite(T, scene, map);
  const choir = createChoir(T, map.towerTop || [-28.2, 35.1, 19.81]);
  return {
    update(dt, sim) {
      planting.update(sim);
      population.update(dt, sim);
      choir.update(sim);
    },
    startAudio: choir.start,
    stopAudio: choir.stop,
    metrics() {
      return { ...planting.stats, ...population.stats(), audio: choir.status() };
    },
  };
}
