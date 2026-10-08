/**
 * Interactive particle field — singleton Canvas 2D engine behind all pages.
 *
 * Paper-colored dust points on a fixed, persisted `<canvas id="field">`.
 * Motion: continuous free roaming — each particle carries a heading that
 * wanders via a slow per-particle sine, plus a damped impulse channel fed
 * by pointer repulsion + tangential wake and scroll inertia. Particles
 * wrap across edges once fully off-canvas; nothing is tethered home.
 *
 * All particle state lives in preallocated Float32Arrays — the RAF loop
 * performs zero allocations. Under `prefers-reduced-motion` it draws one
 * static frame of the home grid and never starts RAF or input listeners.
 */

const AREA_PER_PARTICLE = 14_000;
const COUNT_MIN = 60;
const COUNT_MAX = 220;
const DPR_CAP = 1.5;

const DAMPING = 0.9;
const REPEL_RADIUS = 160;
const REPEL_RADIUS_TOUCH = 110;
const REPEL_STRENGTH = 1.6;
const WAKE_STRENGTH = 0.07;
const SCROLL_FORCE = 0.035;
const SCROLL_LERP = 0.2;
const POINTER_LERP = 0.12;
const CLUSTER_MIN = 3;
const CLUSTER_MAX = 6;
const CLUSTER_SHARE = 0.62;

// Roaming — continuous free movement; no home tether during animation
const ROAM_SPEED = 0.38; // base px/frame (~23 px/s at 60fps)
const ROAM_SPEED_VAR = 0.5; // per-particle speed spread: 0.5–1.5× base
const TURN_MIN = 0.15; // rad/s — near-straight travelers
const TURN_MAX = 1.4; // rad/s — gradual curvers
const TURN_PERIOD_MIN = 3_500; // ms — steering oscillation periods
const TURN_PERIOD_MAX = 9_000;
const EDGE_MARGIN = 14; // px past the edge before wrapping

const ALPHA_MIN = 0.14;
const ALPHA_MAX = 0.55;
const ALPHA_SKEW = 2.2;
const ALPHA_STATIC_MIN = 0.1;
const ALPHA_STATIC_MAX = 0.32;
const ALPHA_BUCKETS = 4;

const RESIZE_DEBOUNCE_MS = 150;

const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const coarseQuery = window.matchMedia('(pointer: coarse)');

interface Engine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  count: number;
  width: number;
  height: number;
  x: Float32Array;
  y: Float32Array;
  homeX: Float32Array;
  homeY: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  alpha: Float32Array;
  size: Float32Array;
  heading: Float32Array;
  turnAmp: Float32Array;
  turnPhase: Float32Array;
  turnPeriod: Float32Array;
  speed: Float32Array;
  bucketOf: Uint8Array;
  bucketIdx: Uint16Array;
  bucketCount: Int32Array;
  bucketAlpha: Float32Array;
  px: number;
  py: number;
  tx: number;
  ty: number;
  pvx: number;
  pvy: number;
  pointerOn: boolean;
  pointerTouch: boolean;
  scrollVel: number;
  scrollDelta: number;
  lastScrollY: number;
  raf: number;
  running: boolean;
  listening: boolean;
  systemListening: boolean;
  resizeTimer: number;
  lastTime: number;
  color: string;
  tickFn: FrameRequestCallback;
}

let engine: Engine | null = null;

function particleCount(): number {
  let count = (window.innerWidth * window.innerHeight) / AREA_PER_PARTICLE;
  if (coarseQuery.matches) count *= 0.55;
  const cores = navigator.hardwareConcurrency ?? 8;
  const memory = (navigator as Navigator & { deviceMemory?: number })
    .deviceMemory ?? 8;
  if (cores <= 4 || memory <= 4) count *= 0.6;
  return Math.round(Math.min(COUNT_MAX, Math.max(COUNT_MIN, count)));
}

function buildBuffers(e: Engine) {
  e.width = window.innerWidth;
  e.height = window.innerHeight;
  e.count = particleCount();

  const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
  e.canvas.width = Math.round(e.width * dpr);
  e.canvas.height = Math.round(e.height * dpr);
  e.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  e.x = new Float32Array(e.count);
  e.y = new Float32Array(e.count);
  e.homeX = new Float32Array(e.count);
  e.homeY = new Float32Array(e.count);
  e.vx = new Float32Array(e.count);
  e.vy = new Float32Array(e.count);
  e.alpha = new Float32Array(e.count);
  e.size = new Float32Array(e.count);
  e.heading = new Float32Array(e.count);
  e.turnAmp = new Float32Array(e.count);
  e.turnPhase = new Float32Array(e.count);
  e.turnPeriod = new Float32Array(e.count);
  e.speed = new Float32Array(e.count);
  e.bucketOf = new Uint8Array(e.count);
  e.bucketIdx = new Uint16Array(ALPHA_BUCKETS * e.count);
  e.bucketCount = new Int32Array(ALPHA_BUCKETS);
  e.bucketAlpha = new Float32Array(ALPHA_BUCKETS);

  // Organic placement — a few loose Gaussian clusters over a sparse uniform
  // base. Clusters overlap freely; gaps emerge naturally between them.
  const clusterCount =
    CLUSTER_MIN + Math.floor(Math.random() * (CLUSTER_MAX - CLUSTER_MIN + 1));
  const clusterX = new Float64Array(clusterCount);
  const clusterY = new Float64Array(clusterCount);
  const clusterR = new Float64Array(clusterCount);
  const radiusBase = Math.min(e.width, e.height) * 0.35;
  for (let c = 0; c < clusterCount; c++) {
    // Centers may sit partially off-viewport so clusters bleed at edges
    clusterX[c] = e.width * (0.1 + Math.random() * 0.8);
    clusterY[c] = e.height * (0.1 + Math.random() * 0.8);
    clusterR[c] = radiusBase * (0.4 + Math.random() * 0.6);
  }

  for (let i = 0; i < e.count; i++) {
    let hx: number;
    let hy: number;
    if (Math.random() < CLUSTER_SHARE) {
      const c = Math.floor(Math.random() * clusterCount);
      // Irwin–Hall approx of a Gaussian, range ~[-1,1] — loose, not dense
      const gx = (Math.random() + Math.random() + Math.random()) / 1.5 - 1;
      const gy = (Math.random() + Math.random() + Math.random()) / 1.5 - 1;
      hx = clusterX[c] + gx * clusterR[c];
      hy = clusterY[c] + gy * clusterR[c];
    } else {
      hx = Math.random() * e.width;
      hy = Math.random() * e.height;
    }
    // Clamp with a small bleed so nothing sits artificially off-canvas
    e.homeX[i] = Math.min(e.width + 24, Math.max(-24, hx));
    e.homeY[i] = Math.min(e.height + 24, Math.max(-24, hy));
    e.x[i] = e.homeX[i];
    e.y[i] = e.homeY[i];
    e.alpha[i] =
      ALPHA_MIN +
      Math.pow(Math.random(), ALPHA_SKEW) * (ALPHA_MAX - ALPHA_MIN);
    // Mostly 2–3px; ~28% larger 3–4px for depth
    e.size[i] =
      Math.random() < 0.72 ? 2 + Math.random() : 3 + Math.random();
    e.heading[i] = Math.random() * Math.PI * 2;
    e.turnAmp[i] = TURN_MIN + Math.random() * (TURN_MAX - TURN_MIN);
    e.turnPhase[i] = Math.random() * Math.PI * 2;
    e.turnPeriod[i] =
      TURN_PERIOD_MIN + Math.random() * (TURN_PERIOD_MAX - TURN_PERIOD_MIN);
    e.speed[i] =
      ROAM_SPEED * (1 - ROAM_SPEED_VAR + Math.random() * ROAM_SPEED_VAR * 2);
    const bucket = Math.min(
      ALPHA_BUCKETS - 1,
      Math.floor(
        ((e.alpha[i] - ALPHA_MIN) / (ALPHA_MAX - ALPHA_MIN)) * ALPHA_BUCKETS,
      ),
    );
    e.bucketOf[i] = bucket;
    e.bucketCount[bucket] += 1;
    e.bucketAlpha[bucket] =
      ALPHA_MIN +
      ((bucket + 0.5) / ALPHA_BUCKETS) * (ALPHA_MAX - ALPHA_MIN);
  }

  // Second pass: packed per-bucket index lists for the render loop
  const offsets = new Int32Array(ALPHA_BUCKETS);
  for (let i = 0; i < e.count; i++) {
    const b = e.bucketOf[i];
    e.bucketIdx[b * e.count + offsets[b]] = i;
    offsets[b] += 1;
  }
}

function drawStaticFrame(e: Engine) {
  const { ctx, count } = e;
  ctx.clearRect(0, 0, e.width, e.height);
  ctx.fillStyle = e.color;
  const scale = (ALPHA_STATIC_MAX - ALPHA_STATIC_MIN) / (ALPHA_MAX - ALPHA_MIN);
  for (let i = 0; i < count; i++) {
    ctx.globalAlpha = ALPHA_STATIC_MIN + (e.alpha[i] - ALPHA_MIN) * scale;
    const s = e.size[i];
    ctx.fillRect(e.homeX[i] - s / 2, e.homeY[i] - s / 2, s, s);
  }
  ctx.globalAlpha = 1;
}

function step(e: Engine, now: number) {
  // Frame-rate-independent dt for heading integration (clamped for hitches)
  const dt = Math.min(0.05, Math.max(0.001, (now - e.lastTime) / 1000));
  e.lastTime = now;

  const {
    count,
    width,
    height,
    x,
    y,
    vx,
    vy,
    heading,
    turnAmp,
    turnPhase,
    turnPeriod,
    speed,
  } = e;

  // Smoothed pointer + pointer velocity for the wake term
  const prevPx = e.px;
  const prevPy = e.py;
  e.px += (e.tx - e.px) * POINTER_LERP;
  e.py += (e.ty - e.py) * POINTER_LERP;
  e.pvx = e.px - prevPx;
  e.pvy = e.py - prevPy;

  const radius = e.pointerTouch ? REPEL_RADIUS_TOUCH : REPEL_RADIUS;
  const invRadius = 1 / radius;

  // Scroll inertia — velocity lerps toward the latest delta, then eases back
  e.scrollVel += (e.scrollDelta - e.scrollVel) * SCROLL_LERP;
  e.scrollDelta = 0;
  const scrollPush = e.scrollVel * SCROLL_FORCE;

  for (let i = 0; i < count; i++) {
    // Roaming — heading wanders via a slow per-particle sine plus a fixed
    // gentle bias derived from the phase (±0.25 rad/s), so direction
    // changes are smooth, independently timed, never synchronized, and
    // some particles genuinely arc rather than only wiggle
    heading[i] +=
      (Math.sin((now / turnPeriod[i]) * Math.PI * 2 + turnPhase[i]) *
        turnAmp[i] +
        (turnPhase[i] - Math.PI) * 0.08) *
      dt;

    let vX = vx[i];
    let vY = vy[i];

    if (e.pointerOn) {
      const dx = x[i] - e.px;
      const dy = y[i] - e.py;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < radius && d > 0.01) {
        const falloff = 1 - d * invRadius;
        const push = falloff * falloff * REPEL_STRENGTH;
        const nx = dx / d;
        const ny = dy / d;
        vX += nx * push;
        vY += ny * push;
        // Tangential wake — pointer velocity projected onto the tangent
        const wake = (e.pvx * -ny + e.pvy * nx) * WAKE_STRENGTH * falloff;
        vX += -ny * wake;
        vY += nx * wake;
      }
    }

    vY -= scrollPush;

    vX *= DAMPING;
    vY *= DAMPING;
    vx[i] = vX;
    vy[i] = vY;

    // Advance: roaming velocity + damped impulse channel
    let nx = x[i] + Math.cos(heading[i]) * speed[i] + vX;
    let ny = y[i] + Math.sin(heading[i]) * speed[i] + vY;

    // Wrap once fully past the edge — seamless since particles are
    // invisible outside the canvas
    if (nx < -EDGE_MARGIN) nx += width + EDGE_MARGIN * 2;
    else if (nx > width + EDGE_MARGIN) nx -= width + EDGE_MARGIN * 2;
    if (ny < -EDGE_MARGIN) ny += height + EDGE_MARGIN * 2;
    else if (ny > height + EDGE_MARGIN) ny -= height + EDGE_MARGIN * 2;

    x[i] = nx;
    y[i] = ny;
  }

  render(e);
}

function render(e: Engine) {
  const { ctx, count, size, x, y, bucketIdx, bucketCount, bucketAlpha } = e;
  ctx.clearRect(0, 0, e.width, e.height);
  ctx.fillStyle = e.color;
  for (let b = 0; b < ALPHA_BUCKETS; b++) {
    const n = bucketCount[b];
    if (n === 0) continue;
    ctx.globalAlpha = bucketAlpha[b];
    const base = b * count;
    for (let k = 0; k < n; k++) {
      const i = bucketIdx[base + k];
      const s = size[i];
      ctx.fillRect(x[i] - s / 2, y[i] - s / 2, s, s);
    }
  }
  ctx.globalAlpha = 1;
}

function startLoop(e: Engine) {
  if (e.running) return;
  e.running = true;
  e.lastTime = performance.now();
  e.raf = requestAnimationFrame(e.tickFn);
}

function stopLoop(e: Engine) {
  e.running = false;
  if (e.raf) cancelAnimationFrame(e.raf);
  e.raf = 0;
}

function registerInput(e: Engine) {
  if (e.listening) return;
  e.listening = true;
  document.addEventListener(
    'pointermove',
    (ev) => {
      const touch = ev.pointerType === 'touch';
      if (touch && !e.pointerTouch) return; // touch sets position only while down
      e.pointerTouch = touch;
      e.tx = ev.clientX;
      e.ty = ev.clientY;
      e.pointerOn = true;
    },
    { passive: true },
  );

  document.addEventListener(
    'pointerdown',
    (ev) => {
      if (ev.pointerType !== 'touch') return;
      e.pointerTouch = true;
      e.tx = ev.clientX;
      e.ty = ev.clientY;
      e.px = ev.clientX;
      e.py = ev.clientY;
      e.pointerOn = true;
    },
    { passive: true },
  );

  const endTouch = (ev: PointerEvent) => {
    if (ev.pointerType !== 'touch') return;
    e.pointerOn = false;
    e.pointerTouch = false;
  };
  document.addEventListener('pointerup', endTouch, { passive: true });
  document.addEventListener('pointercancel', endTouch, { passive: true });

  document.addEventListener(
    'pointerleave',
    () => {
      e.pointerOn = false;
    },
    { passive: true },
  );

  window.addEventListener(
    'scroll',
    () => {
      const sy = window.scrollY;
      e.scrollDelta += sy - e.lastScrollY;
      e.lastScrollY = sy;
    },
    { passive: true },
  );
}

function registerSystem(e: Engine) {
  if (e.systemListening) return;
  e.systemListening = true;

  window.addEventListener('resize', () => {
    window.clearTimeout(e.resizeTimer);
    e.resizeTimer = window.setTimeout(() => {
      buildBuffers(e);
      if (motionQuery.matches) drawStaticFrame(e);
    }, RESIZE_DEBOUNCE_MS);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopLoop(e);
    else if (!motionQuery.matches) startLoop(e);
  });
}

function init() {
  const canvas = document.getElementById('field');
  if (!(canvas instanceof HTMLCanvasElement)) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const color =
    getComputedStyle(document.documentElement)
      .getPropertyValue('--color-paper')
      .trim() || '#eceae4';

  const e: Engine = {
    canvas,
    ctx,
    count: 0,
    width: 0,
    height: 0,
    x: new Float32Array(0),
    y: new Float32Array(0),
    homeX: new Float32Array(0),
    homeY: new Float32Array(0),
    vx: new Float32Array(0),
    vy: new Float32Array(0),
    alpha: new Float32Array(0),
    size: new Float32Array(0),
    heading: new Float32Array(0),
    turnAmp: new Float32Array(0),
    turnPhase: new Float32Array(0),
    turnPeriod: new Float32Array(0),
    speed: new Float32Array(0),
    bucketOf: new Uint8Array(0),
    bucketIdx: new Uint16Array(0),
    bucketCount: new Int32Array(0),
    bucketAlpha: new Float32Array(0),
    px: 0,
    py: 0,
    tx: 0,
    ty: 0,
    pvx: 0,
    pvy: 0,
    pointerOn: false,
    pointerTouch: false,
    scrollVel: 0,
    scrollDelta: 0,
    lastScrollY: window.scrollY,
    raf: 0,
    running: false,
    listening: false,
    systemListening: false,
    resizeTimer: 0,
    lastTime: performance.now(),
    color,
    tickFn: () => {},
  };

  e.tickFn = (now: number) => {
    if (!e.running) return;
    step(e, now);
    e.raf = requestAnimationFrame(e.tickFn);
  };

  buildBuffers(e);
  engine = e;
  registerSystem(e);

  if (motionQuery.matches) {
    drawStaticFrame(e);
  } else {
    registerInput(e);
    startLoop(e);
  }
}

function onMotionPreferenceChange() {
  const e = engine;
  if (!e) return;
  if (motionQuery.matches) {
    stopLoop(e);
    drawStaticFrame(e);
  } else {
    registerInput(e);
    startLoop(e);
  }
}

motionQuery.addEventListener('change', onMotionPreferenceChange);

function syncScroll(e: Engine) {
  e.lastScrollY = window.scrollY;
  e.scrollVel = 0;
  e.scrollDelta = 0;
}

document.addEventListener('astro:page-load', () => {
  if (!engine) {
    init();
    return;
  }
  syncScroll(engine);

  // Rebind if the persisted canvas was replaced
  const canvas = document.getElementById('field');
  if (canvas instanceof HTMLCanvasElement && canvas !== engine.canvas) {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      engine.canvas = canvas;
      engine.ctx = ctx;
      buildBuffers(engine);
      if (motionQuery.matches) {
        drawStaticFrame(engine);
        return;
      }
    }
  }

  if (!motionQuery.matches && !document.hidden) startLoop(engine);
});

document.addEventListener('astro:after-swap', () => {
  if (engine) syncScroll(engine);
});

document.addEventListener('astro:before-swap', () => {
  if (!engine) return;
  engine.scrollVel = 0;
  engine.scrollDelta = 0;
});
