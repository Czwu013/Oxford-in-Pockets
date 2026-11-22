import * as T from 'three';
import { cityView, cityPortrait, pockets, journeys } from './data/views.js';
const rad = Math.PI / 180,
  clamp = T.MathUtils.clamp,
  lerp = T.MathUtils.lerp,
  smooth = (t) => t * t * (3 - 2 * t);
const wrap = (d) => ((d + 540) % 360) - 180;
export function navigation(canvas, pick, onManual) {
  const cam = new T.PerspectiveCamera(34, 1, 0.1, 16000),
    ray = new T.Raycaster(),
    plane = new T.Plane(new T.Vector3(0, 1, 0), 0),
    ndc = new T.Vector2();
  let scopeBounds = null,
    maximumSpan = 2450;
  let w = 1,
    h = 1,
    framingAspect = 1,
    pose = { ...cityView },
    flight = null,
    walk = null,
    save = { ...cityView },
    primed = false,
    clearance = null;
  const held = new Map();
  let start = null,
    drag = false,
    pinch = null;
  const stage = canvas.parentElement;
  const mapInput = (target) => target === canvas || target.closest?.('[data-mark]');
  let suppressMarkClick = false;
  const portrait = () => framingAspect < 0.85;
  function defaultCity() {
    return { ...(portrait() ? cityPortrait : cityView) };
  }
  function viewWidth(p) {
    return (
      p.span * (p.lens > 42 ? clamp(framingAspect / 1.45, 0.66, 1.5) : Math.max(1, framingAspect / 1.52))
    );
  }
  function apply() {
    const a = pose.az * rad,
      b = pose.alt * rad,
      aspect = w / h,
      dist = viewWidth(pose) / (2 * Math.tan((pose.lens * rad) / 2));
    cam.aspect = aspect;
    cam.fov = (2 * Math.atan(Math.tan((pose.lens * rad) / 2) / aspect)) / rad;
    cam.near = pose.lens < 43 ? Math.max(0.38, dist * 0.115) : clamp(dist * 0.008, 0.065, 0.49);
    cam.far = dist + clamp(pose.span * 3.7 + 140, 295, 3500);
    cam.position.set(
      pose.x + Math.sin(a) * Math.cos(b) * dist,
      pose.y + Math.sin(b) * dist,
      pose.z + Math.cos(a) * Math.cos(b) * dist,
    );
    if (clearance && cam.position.y < 66)
      cam.position.y = Math.max(cam.position.y, clearance(cam.position.x, cam.position.z, cam.position.y));
    cam.lookAt(pose.x, pose.y, pose.z);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
  }
  function ground(clientX, clientY) {
    const b = canvas.getBoundingClientRect();
    ndc.set(((clientX - b.left) / b.width) * 2 - 1, 1 - ((clientY - b.top) / b.height) * 2);
    ray.setFromCamera(ndc, cam);
    return ray.ray.intersectPlane(plane, new T.Vector3());
  }
  function resize(width, height, framingHeight = height) {
    w = width;
    h = height;
    // Photo mode expands the projection vertically while the camera stays at the same eye point.
    framingAspect = width / framingHeight;
    if (!primed) {
      pose = defaultCity();
      save = { ...pose };
      primed = true;
    }
    apply();
  }
  function endFlight() {
    flight = null;
    walk = null;
  }
  function fly(dest, duration = 1.25, after) {
    walk = null;
    flight = { a: { ...pose }, b: { ...dest }, t: 0, duration, after };
  }
  function look(eye, target, lens = 66) {
    const v = new T.Vector3(...eye).sub(new T.Vector3(...target)),
      d = v.length();
    const p = {
      x: target[0],
      y: target[1],
      z: target[2],
      az: Math.atan2(v.x, v.z) / rad,
      alt: Math.asin(v.y / d) / rad,
      lens,
    };
    p.span = (2 * d * Math.tan((lens * rad) / 2)) / clamp(framingAspect / 1.45, 0.66, 1.5);
    return p;
  }
  function journey(id, done) {
    const j = journeys[id],
      eyes = new T.CatmullRomCurve3(
        j.steps.map((s) => new T.Vector3(...s.eye)),
        false,
        'centripetal',
      ),
      aims = new T.CatmullRomCurve3(
        j.steps.map((s) => new T.Vector3(...s.look)),
        false,
        'centripetal',
      );
    fly(look(j.steps[0].eye, j.steps[0].look, j.lens), 0.95, () => {
      walk = { t: 0, j, eyes, aims, done };
    });
  }
  function step(dt) {
    if (flight) {
      const f = flight;
      f.t += dt;
      const raw = clamp(f.t / f.duration, 0, 1),
        t = smooth(raw);
      for (const k of ['x', 'y', 'z', 'alt', 'lens']) pose[k] = lerp(f.a[k], f.b[k], t);
      pose.az = f.a.az + wrap(f.b.az - f.a.az) * t;
      pose.span = Math.exp(lerp(Math.log(f.a.span), Math.log(f.b.span), t));
      if (raw >= 1) {
        pose = { ...f.b };
        flight = null;
        f.after?.();
      }
      apply();
    } else if (walk) {
      const s = walk;
      s.t += dt;
      const t = clamp(s.t / s.j.duration, 0, 1);
      pose = look(s.eyes.getPoint(t).toArray(), s.aims.getPoint(t).toArray(), s.j.lens);
      apply();
      if (t >= 1) {
        walk = null;
        s.done?.();
      }
    }
  }
  function pan(a, b) {
    if (a && b) {
      pose.x = clamp(pose.x + a.x - b.x, scopeBounds?.[0] ?? -1360, scopeBounds?.[2] ?? 352);
      pose.z = clamp(pose.z + a.z - b.z, scopeBounds?.[1] ?? -940, scopeBounds?.[3] ?? 458);
      apply();
    }
  }
  function zoom(mult, px, py) {
    endFlight();
    const before = ground(px, py),
      prior = { ...pose },
      old = pose.span;
    pose.span = clamp(old * mult, 8.5, maximumSpan);
    if (pose.span > 140) {
      const t = clamp((pose.span - old) / 350, 0, 0.48);
      pose.alt = lerp(pose.alt, 53, t);
      pose.lens = lerp(pose.lens, 20, t);
      pose.y = lerp(pose.y, 2, t);
    }
    apply();
    if (before && pose.alt > 14) {
      const after = ground(px, py);
      pan(before, after);
    }
    onManual('zoom', old, pose.span, prior);
  }
  function orbit(dx, dy) {
    endFlight();
    pose.az -= dx * 0.34;
    pose.alt = clamp(pose.alt + dy * 0.24, pose.lens > 42 ? -5 : 13, 82);
    if (pose.alt < 3)
      pose.alt = Math.max(
        pose.alt,
        Math.asin(
          clamp((1.65 - pose.y) / (viewWidth(pose) / (2 * Math.tan((pose.lens * rad) / 2))), -0.9, 0.9),
        ) / rad,
      );
    apply();
  }
  const pair = () => {
    const [a, b] = held.values();
    return { d: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  };
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  stage.addEventListener('pointerdown', (e) => {
    if (!mapInput(e.target) || e.button > 2) return;
    e.target.setPointerCapture(e.pointerId);
    held.set(e.pointerId, { x: e.clientX, y: e.clientY, pan: e.shiftKey || e.button !== 0 });
    if (held.size === 1) {
      start = { x: e.clientX, y: e.clientY, onCanvas: e.target === canvas };
      drag = false;
      suppressMarkClick = false;
    }
    if (held.size === 2) {
      pinch = pair();
      drag = true;
    }
  });
  stage.addEventListener('pointermove', (e) => {
    const last = held.get(e.pointerId);
    if (!last) return;
    held.set(e.pointerId, { ...last, x: e.clientX, y: e.clientY });
    if (held.size >= 2) {
      const a = pair();
      if (pinch) {
        const p = ground(pinch.x, pinch.y);
        if (a.d > 3 && pinch.d > 3) zoom(pinch.d / a.d, a.x, a.y);
        pan(p, ground(a.x, a.y));
      }
      pinch = a;
      return;
    }
    if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 4) drag = true;
    if (!drag) return;
    onManual('drag');
    if (last.pan) {
      endFlight();
      pan(ground(last.x, last.y), ground(e.clientX, e.clientY));
    } else orbit(e.clientX - last.x, e.clientY - last.y);
  });
  function end(e, cancel) {
    if (!held.has(e.pointerId)) return;
    held.delete(e.pointerId);
    pinch = null;
    if (!held.size) {
      suppressMarkClick = drag || cancel;
      if (!drag && !cancel && start?.onCanvas) pick(e.clientX, e.clientY);
      start = null;
    }
  }
  stage.addEventListener('pointerup', (e) => end(e, false));
  stage.addEventListener('pointercancel', (e) => end(e, true));
  stage.addEventListener('lostpointercapture', (e) => end(e, true));
  stage.addEventListener(
    'click',
    (e) => {
      if (e.detail && (suppressMarkClick || held.size > 0) && e.target.closest('[data-mark]')) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true,
  );
  stage.addEventListener(
    'wheel',
    (e) => {
      if (!mapInput(e.target)) return;
      e.preventDefault();
      zoom(Math.exp(clamp(e.deltaY * (e.deltaMode ? 14 : 1), -390, 390) * 0.00165), e.clientX, e.clientY);
    },
    { passive: false },
  );
  function centerZoom(f) {
    const b = canvas.getBoundingClientRect();
    zoom(f, b.left + b.width / 2, b.top + b.height / 2);
  }
  canvas.addEventListener('keydown', (e) => {
    if (['+', '=', '-', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      if (e.key === '-') centerZoom(1.25);
      else if (['+', '='].includes(e.key)) centerZoom(0.8);
      else {
        onManual('drag');
        orbit({ ArrowLeft: 20, ArrowRight: -20 }[e.key] || 0, { ArrowUp: 12, ArrowDown: -12 }[e.key] || 0);
      }
    }
  });
  return {
    cam,
    resize,
    step,
    fly,
    journey,
    viewFrom(eye, target, lens, minimumVertical = 0) {
      const fitted = (2 * Math.atan(Math.tan((minimumVertical * rad) / 2) * framingAspect)) / rad;
      return look(eye, target, Math.max(fitted, lens ?? 66));
    },
    zoom: centerZoom,
    defaultCity,
    fitPocket(view, outlines, peak) {
      const a = view.az * rad,
        alt = view.alt * rad,
        sn = Math.sin(a),
        cs = Math.cos(a);
      const sa = Math.sin(alt),
        ca = Math.cos(alt),
        aspect = framingAspect;
      const points = outlines.flatMap(([ring]) =>
        ring.flatMap(([x, z]) => [
          [x, -5.4, z],
          [x, 13, z],
        ]),
      );
      points.push(peak);
      const projected = points.map(([x, y, z]) => [cs * x - sn * z, ca * y - sa * (sn * x + cs * z)]);
      const u = projected.map((p) => p[0]),
        v = projected.map((p) => p[1]);
      const uMin = Math.min(...u),
        uMax = Math.max(...u),
        vMin = Math.min(...v),
        vMax = Math.max(...v);
      const midU = (uMin + uMax) / 2,
        midDepth = (ca * view.y - (vMin + vMax) / 2) / sa;
      const span =
        (Math.max((uMax - uMin) / 0.86, ((vMax - vMin) * aspect) / (portrait() ? 0.58 : 0.69)) * 1.06) /
        Math.max(1, aspect / 1.52);
      return { ...view, span, x: cs * midU + sn * midDepth, z: -sn * midU + cs * midDepth };
    },
    setBounds(bounds) {
      scopeBounds = bounds;
      maximumSpan = bounds
        ? Math.max(180, Math.hypot(bounds[2] - bounds[0], bounds[3] - bounds[1]) * 1.42)
        : 2450;
    },
    setClearance(fn) {
      clearance = fn;
    },
    remember(p = pose) {
      save = { ...p };
    },
    back() {
      fly(save);
    },
    snapshot: () => ({ ...pose }),
    cancel: endFlight,
    restore(p) {
      endFlight();
      pose = { ...p };
      apply();
    },
    get width() {
      return viewWidth(pose);
    },
    get moving() {
      return !!(flight || walk || held.size);
    },
    get pose() {
      return pose;
    },
  };
}
