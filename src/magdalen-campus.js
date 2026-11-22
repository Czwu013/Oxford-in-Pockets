import * as T from 'three';
import site from './magdalen/data/site.json';
import buildings from './magdalen/data/buildings.json';
import ecology from './magdalen/data/ecology.json';
import routes from './magdalen/data/routes.json';
import { bridgeFrame, buildBridges } from './magdalen/bridge.js';
import { buildGround } from './magdalen/ground.js';
import { makeWater } from './magdalen/water.js';
import { buildArchitecture } from './magdalen/architecture/main.js';
import { indexSurfaces } from './magdalen/surfaces.js';
import { buildLife } from './magdalen/life/main.js';
import { buildWildlife } from './magdalen/life/wildlife.js';
import { makeSnowfall } from './magdalen/weather/snowfall.js';
import { batch } from './palette.js';
import { mappedGrove } from './quarter-trees.js';

export function mountMagdalen(scene, renderer, mobile) {
  const root = new T.Group();
  root.name = 'Magdalen College';
  root.userData.pocket = 'magdalen';
  scene.add(root);
  const map = { ...site, ...ecology, buildings, routes },
    frame = bridgeFrame(map);
  map.heightAt = frame.heightAt;
  const ground = buildGround(root, map, frame);
  for (const n of ['Diffuse base contact', 'Paper table shadows', 'Landscape section']) {
    const child = root.getObjectByName(n);
    if (child) child.visible = false;
  }
  const detailedGround = root.children.filter((child) => child.visible && child.name !== 'Rain film');
  const bridges = buildBridges(root, map, frame),
    architecture = buildArchitecture(T, root, map);
  const college = root.getObjectByName('Magdalen College · architectural model');
  for (const layer of [college, bridges.group])
    layer.traverse((o) => {
      if (o.isMesh) o.userData.pickTarget = true;
    });
  const water = makeWater(scene, map, renderer, mobile);
  root.add(water.surface);
  const surfaces = indexSurfaces(root, map.boundary),
    moving = new T.Group();
  root.add(moving);
  const life = buildLife(T, moving, map),
    wildlife = buildWildlife(T, moving, map, surfaces, mobile);
  const snow = makeSnowfall(root, map, frame, surfaces, mobile);
  const underlay = new T.Group();
  underlay.name = 'Magdalen campus at city scale';
  underlay.userData.pickTarget = true;
  const schematic = batch();
  for (const r of map.land) schematic.cap('grass', '#a7b691', r.outer, -0.155, r.holes);
  const surfaceColors = {
    lawn: '#aebe86',
    meadow: '#afbd8a',
    grove: '#9cae7f',
    bed: '#a7a173',
    court: '#c5b89b',
    path: '#ccb99b',
    pavement: '#cabea6',
    road: '#8d9086',
  };
  for (const r of map.surfaces) {
    const planted = ['lawn', 'meadow', 'grove', 'bed'].includes(r.kind);
    schematic.cap(planted ? 'grass' : 'paving', surfaceColors[r.kind] || '#c7b89f', r.outer, 0.025, r.holes);
  }
  for (const r of map.water) schematic.cap('water', '#83a6a3', r.outer, -1.89, r.holes);
  for (const m of schematic.finish(underlay, 'Mapped college ground')) {
    m.castShadow = false;
    m.userData.pickTarget = true;
  }
  root.add(underlay);
  const crowns = mappedGrove(root, map.trees);
  return {
    root,
    landmark: architecture.towerPick,
    life,
    wildlife,
    snow,
    surfaces,
    update(dt, state, env, sim, near, canvas) {
      ground.update(env, state.wet, sim.weights, sim.lamps);
      bridges.update(state.wet, 0, sim.lamps);
      architecture.update({ snow: 0, wet: state.wet, lamps: sim.lamps });
      sim.snow = snow.update(
        dt,
        state,
        sim.sunDir,
        near && (!state.event || sim.event) ? 1 : 0,
        canvas.height,
      );
      life.update(dt, sim);
      wildlife.update(dt, sim);
      moving.visible = near;
      crowns.visible = !near;
      for (const m of detailedGround) m.visible = near;
      underlay.visible = !near;
      water.surface.visible = near;
      if (near) water.update(sim.time, sim.camera, env.water, env.sky, sim.sunDir, false);
    },
  };
}
