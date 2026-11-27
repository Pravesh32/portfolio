import * as THREE from 'three';
import gsap from 'gsap';
import './style.css';
import './responsive.css';
import { initAudio, setEngine, sfx, toggleMute } from './sound.js';

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
  }[c]));

const tags = (a = []) =>
  `<div class="tags">${a.map((t) => `<span>${esc(t)}</span>`).join('')}</div>`;

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const BASE = import.meta.env.BASE_URL;

const SHOTS = {
  'The Explorer - 3D Exploration Game': 'explorer.png',
  '3D Developer Portfolio': 'portfolio.png',
  'MindEase - Personalized Mental Health Mobile Application': 'mindease.png'
};

const shot = (t) =>
  SHOTS[t]
    ? `<img class="shot" src="${BASE}shots/${SHOTS[t]}" alt="Screenshot of ${esc(t)}" loading="lazy" onerror="this.remove()">`
    : '';

const TITLES = {
  about: 'About me',
  education: 'Education',
  skills: 'Skills and knowledge',
  projects: 'Projects',
  contact: "Let's work together"
};

const ZONES = [
  { k: 'about', x: -20, z: -20, c: 0x8ea2ff },
  { k: 'education', x: 22, z: -18, c: 0xff7eb6 },
  { k: 'skills', x: -24, z: 14, c: 0xff7eb6 },
  { k: 'projects', x: 24, z: 18, c: 0x8ea2ff },
  { k: 'contact', x: 0, z: 34, c: 0xff7eb6 }
];

// --------------------------------------------------
// Portfolio data
// --------------------------------------------------

async function load() {
  const api = import.meta.env.VITE_API_URL || '';

  try {
    const r = await fetch(api + '/api/portfolio', {
      signal: AbortSignal.timeout(4000)
    });

    if (r.ok) {
      const data = await r.json();
      if (data?.profile) return data;
    }
  } catch (error) {
    console.warn('API unavailable. Loading local portfolio data.');
  }

  const fallback = await fetch(BASE + 'portfolio.json');

  if (!fallback.ok) {
    throw new Error('Could not load portfolio data.');
  }

  return fallback.json();
}

// --------------------------------------------------
// Portfolio sections
// --------------------------------------------------

function section(k, d) {
  const p = d.profile;

  const body = {
    about: () => `
      <img
        src="${BASE}planets.jpg"
        alt=""
        style="width:100%;border-radius:12px;margin-bottom:12px"
        onerror="this.remove()"
      >

      <img
        class="me"
        src="${BASE}me.jpg"
        alt="Pravesh Bahadur Shahi"
        width="96"
        height="96"
        onerror="this.remove()"
      >

      <p>${esc(p.summary)}</p>
      ${tags(d.strengths)}
    `,

    education: () =>
      d.education.map((e) => `
        <div class="row">
          <b>${esc(e.degree)}</b>
          <span>${esc(e.school)}</span>
          <em>${esc(e.period)}</em>
        </div>
      `).join('') +
      (d.relevantAreas && d.relevantAreas.length
        ? `<h3>Relevant areas</h3>${tags(d.relevantAreas)}`
        : ''),

    skills: () =>
      d.skills.map((g) => `
        <div class="group">
          <h3>${esc(g.group)}</h3>
          ${tags(g.items)}
        </div>
      `).join(''),

    projects: () => {
      const projects = d.projects;

      return projects.map((x) => `
        <article>
          <h3>${esc(x.title)}</h3>
          ${shot(x.title)}
          ${tags(x.tech)}
          <p>${esc(x.description)}</p>
          <ul>
            ${x.points.map((t) => `<li>${esc(t)}</li>`).join('')}
          </ul>
        </article>
      `).join('');
    },

    contact: () => `
      <img
        src="${BASE}spaceship.png"
        alt=""
        width="120"
        height="120"
        style="border-radius:50%"
        onerror="this.remove()"
      >

      ${p.goal ? `<p>${esc(p.goal)}</p>` : ''}
      <p>${esc(d.languages.join(' / '))}</p>

      <div class="links">
        <a href="mailto:${esc(p.email)}">${esc(p.email)}</a>
        <a href="tel:${esc(p.phone)}">${esc(p.phone)}</a>
        <a href="${esc(p.github)}" target="_blank" rel="noopener">GitHub</a>
        <a href="${esc(p.linkedin)}" target="_blank" rel="noopener">LinkedIn</a>
      </div>
    `
  }[k]();

  return `<h2>${TITLES[k]}</h2>${body}`;
}

// --------------------------------------------------
// Application
// --------------------------------------------------

async function main() {
  document.body.insertAdjacentHTML(
    'afterbegin',
    `
      <div id="loader">
        <img
          id="lship"
          src="${BASE}spaceship.png"
          alt=""
          width="140"
          height="140"
          style="border-radius:50%;margin-bottom:16px"
          onerror="this.remove()"
        >
        <b id="count">000</b>
      </div>
    `
  );

  if (!reduce) {
    gsap.to('#lship', {
      y: -14,
      rotation: -4,
      duration: 1.2,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut'
    });
  }

  const count = { v: 0 };

  const show = () => {
    $('count').textContent = String(Math.round(count.v)).padStart(3, '0');
  };

  const crawl = gsap.to(count, {
    v: 90,
    duration: 2.5,
    ease: 'power1.out',
    onUpdate: show
  });

  let d;

  try {
    d = await load();
  } catch (error) {
    console.error(error);
    $('loader').innerHTML = '<p>Could not load the portfolio data.</p>';
    return;
  }

  // Always use the preferred professional title.
  if (d.profile) {
    d.profile.title = 'Bsc.IT student and Mobile Application Developer';
  }

  await document.fonts.load('700 64px Syne').catch(() => {});

  const p = d.profile;

  $('app').innerHTML = `
    <div class="hud">
      <b>${esc(p.name)}</b>
      <span>${esc(p.title)}</span>
      <p>
        ${coarse
          ? 'Drag on the screen to fly'
          : 'Fly with WASD or the arrow keys. Space brakes, H beeps.'}
        <br>
        Fly into a glowing ring to open it.
      </p>
    </div>

    <nav class="jump" aria-label="Jump to a section">
      ${ZONES.map((z) => `
        <button data-k="${z.k}">${TITLES[z.k]}</button>
      `).join('')}
    </nav>

    <button class="readbtn sndbtn" id="sndbtn">Sound on</button>
    <button class="readbtn" id="readbtn">Read as a page</button>

    <aside id="panel" hidden aria-live="polite"></aside>

    <div id="read" hidden role="dialog" aria-label="Portfolio as a page">
      <button class="x" id="readx" aria-label="Close">×</button>

      ${ZONES.map((z) => `
        <section>${section(z.k, d)}</section>
      `).join('')}
    </div>
  `;

  const world = build(d);

  crawl.kill();

  gsap.to(count, {
    v: 100,
    duration: reduce ? 0 : 0.4,
    onUpdate: show,
    onComplete: () => {
      gsap.to('#loader', {
        yPercent: -100,
        duration: reduce ? 0 : 1,
        ease: 'power3.inOut',
        onComplete: () => {
          $('loader').remove();
          world.start();
        }
      });
    }
  });
}

// --------------------------------------------------
// Three.js world
// --------------------------------------------------

function build(d) {
  const renderer = new THREE.WebGLRenderer({
    canvas: $('bg'),
    antialias: true,
    alpha: true
  });

  $('bg').style.background =
    `#050a1f url(${BASE}star.jpg) center top / cover no-repeat`;

  renderer.setPixelRatio(
    Math.min(devicePixelRatio, coarse ? 1.5 : 2)
  );

  renderer.shadowMap.enabled = true;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x050a1f, 90, 240);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 300);
  camera.position.set(0, 70, 40);

  const labels = [];
  const starLayers = [];

  let zoom = 1;
  let ui = 1;

  const resize = () => {
    renderer.setSize(innerWidth, innerHeight);

    camera.aspect = innerWidth / innerHeight;

    zoom = clamp(1.35 / camera.aspect, 1, 2.4);
    ui = Math.min(zoom, 1.7);

    labels.forEach((label) => {
      label.scale.set(14 * ui, 2.63 * ui, 1);
    });

    camera.updateProjectionMatrix();
  };

  addEventListener('resize', resize);
  resize();

  // --------------------------------------------------
  // Lighting
  // --------------------------------------------------

  scene.add(
    new THREE.HemisphereLight(0xaab8ff, 0x1a1030, 1.2)
  );

  const sun = new THREE.DirectionalLight(0xfff1dd, 2.2);

  sun.position.set(30, 40, 20);
  scene.add(sun, sun.target);

  // --------------------------------------------------
  // Starfield
  // --------------------------------------------------

  const dc = document.createElement('canvas');
  dc.width = dc.height = 32;

  const dx = dc.getContext('2d');

  dx.fillStyle = '#fff';
  dx.beginPath();
  dx.arc(16, 16, 15, 0, 7);
  dx.fill();

  const dot = new THREE.CanvasTexture(dc);

  const stars = (n, size, color, spread, speed) => {
    const positions = new Float32Array(n * 3);

    for (let i = 0; i < n; i++) {
      positions[i * 3] = (Math.random() - 0.5) * spread;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 90;
      positions[i * 3 + 2] = (Math.random() - 0.5) * spread;
    }

    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3)
    );

    const points = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        size,
        color,
        fog: false,
        map: dot,
        alphaTest: 0.4,
        transparent: true,
        sizeAttenuation: false
      })
    );

    points.userData.parallax = speed;

    scene.add(points);
    starLayers.push(points);
  };

  stars(1800, 1.6, 0xffffff, 300, 0.12);
  stars(500, 2.4, 0x9fb4ff, 160, 0.2);

  // --------------------------------------------------
  // Materials and helpers
  // --------------------------------------------------

  const std = (c) =>
    new THREE.MeshStandardMaterial({
      color: c,
      flatShading: true,
      roughness: 0.7
    });

  const add = (g, m, x, y, z) => {
    const o = new THREE.Mesh(g, m);
    o.position.set(x, y, z);
    return o;
  };

  const car = {
    x: 0,
    z: 0,
    h: Math.PI,
    speed: 0
  };

  // --------------------------------------------------
  // Image helpers
  // --------------------------------------------------

  const keyed = (url, W, H, fn) => {
    const c = document.createElement('canvas');

    c.width = W;
    c.height = H;

    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;

    const im = new Image();

    im.onload = () => {
      fn(c.getContext('2d'), im, W, H);
      t.needsUpdate = true;
    };

    im.onerror = () => {
      console.warn(`Could not load image: ${url}`);
    };

    im.src = BASE + url;

    return t;
  };

  const spriteMat = (t) =>
    new THREE.SpriteMaterial({
      map: t,
      transparent: true,
      depthWrite: false,
      fog: false
    });

  const shipKey = (x, im, W, H) => {
    x.drawImage(im, 0, 0, W, H);

    const p = x.getImageData(0, 0, W, H);
    const a = p.data;

    const r0 = a[0];
    const g0 = a[1];
    const b0 = a[2];

    for (let i = 0; i < a.length; i += 4) {
      a[i + 3] =
        clamp(
          (
            Math.hypot(
              a[i] - r0,
              a[i + 1] - g0,
              a[i + 2] - b0
            ) - 25
          ) / 35,
          0,
          1
        ) * 255;
    }

    x.putImageData(p, 0, 0);
  };

  const cometKey = (x, im, W, H) => {
    x.drawImage(im, 0, 0, W, H);

    const p = x.getImageData(0, 0, W, H);
    const a = p.data;

    for (let i = 0; i < a.length; i += 4) {
      a[i + 3] =
        clamp((a[i] - a[i + 2] + 10) / 60, 0, 1) * 255;
    }

    x.putImageData(p, 0, 0);
  };

  const cometMat = spriteMat(
    keyed('comet.png', 240, 427, cometKey)
  );

  // --------------------------------------------------
  // Planets
  // --------------------------------------------------

  const PLANET_CROPS = [
    [0.235, 0.43, 0.12],
    [0.37, 0.14, 0.07],
    [0.44, 0.62, 0.07],
    [0.84, 0.54, 0.08],
    [0.10, 0.22, 0.06]
  ];

  const planetTex = ([fx, fy, fr]) =>
    keyed('planets.jpg', 256, 256, (x, im) => {
      const w = im.width;
      const h = im.height;
      const S = fr * w;

      x.drawImage(
        im,
        fx * w - S,
        fy * h - S,
        S * 2,
        S * 2,
        0,
        0,
        256,
        256
      );

      const g = x.createRadialGradient(
        128, 128, 80,
        128, 128, 128
      );

      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(1, 'rgba(0,0,0,0)');

      x.globalCompositeOperation = 'destination-in';
      x.fillStyle = g;
      x.fillRect(0, 0, 256, 256);
    });

  // --------------------------------------------------
  // Spaceship
  // --------------------------------------------------

  const rig = new THREE.Group();
  const body = new THREE.Group();
  const wheels = [];

  const flame = add(
    new THREE.ConeGeometry(0.3, 1.6, 8).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xff9a5c }),
    0,
    1.2,
    -2.2
  );

  body.add(
    add(
      new THREE.ConeGeometry(0.8, 3, 4).rotateX(Math.PI / 2),
      std(0xe8ecff),
      0,
      1.2,
      0
    ),
    add(
      new THREE.BoxGeometry(3.4, 0.1, 1.1),
      std(0xff7eb6),
      0,
      1.1,
      -0.7
    ),
    add(
      new THREE.SphereGeometry(0.35, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0x8ea2ff }),
      0,
      1.5,
      0.2
    ),
    flame
  );

  rig.add(body);
  scene.add(rig);

  const shipTex = keyed(
    'spaceship.png',
    256,
    256,
    (x, im, W, H) => {
      shipKey(x, im, W, H);
      body.visible = false;
    }
  );

  const ship = new THREE.Sprite(spriteMat(shipTex));

  ship.scale.set(3.8, 3.8, 1);
  scene.add(ship);

  // --------------------------------------------------
  // Asteroids
  // --------------------------------------------------

  const obstacles = [];
  const rocks = [];

  let tries = 0;

  while (obstacles.length < 22 && tries++ < 600) {
    const x = (Math.random() - 0.5) * 108;
    const z = (Math.random() - 0.5) * 108;

    if (
      Math.hypot(x, z) < 9 ||
      Math.hypot(x, z + 12) < 7 ||
      ZONES.some((q) => Math.hypot(x - q.x, z - q.z) < 9) ||
      obstacles.some((o) => Math.hypot(x - o.x, z - o.z) < 4)
    ) {
      continue;
    }

    const s = 0.8 + Math.random() * 1.2;
    const r = new THREE.Sprite(cometMat);

    r.position.set(
      x,
      2.5 + Math.random() * 2,
      z
    );

    r.scale.set(s * 1.1, s * 1.95, 1);
    r.userData.y = r.position.y;

    scene.add(r);

    rocks.push(r);
    obstacles.push({ x, z, r: s * 0.7 });
  }

  // --------------------------------------------------
  // Earth
  // --------------------------------------------------

  const ec = document.createElement('canvas');
  ec.width = ec.height = 512;

  const etex = new THREE.CanvasTexture(ec);
  etex.colorSpace = THREE.SRGBColorSpace;

  const earth = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: etex,
      transparent: true,
      depthWrite: false,
      fog: false
    })
  );

  earth.scale.set(30, 30, 1);
  earth.position.set(-20, 6, -62);

  scene.add(earth);

  const eimg = new Image();

  eimg.onload = () => {
    const x = ec.getContext('2d');
    const w = eimg.width;
    const h = eimg.height;
    const S = w * 0.2 * 1.5;

    x.drawImage(
      eimg,
      w * 0.5 - S,
      h * 0.5 - S,
      S * 2,
      S * 2,
      0,
      0,
      512,
      512
    );

    const g = x.createRadialGradient(
      256, 256, 200,
      256, 256, 256
    );

    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');

    x.globalCompositeOperation = 'destination-in';
    x.fillStyle = g;
    x.fillRect(0, 0, 512, 512);

    etex.needsUpdate = true;
  };

  eimg.src = BASE + 'earth.jpg';

  if (!reduce) {
    gsap.to(earth.scale, {
      x: 31.5,
      y: 31.5,
      duration: 4,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut'
    });
  }

  // --------------------------------------------------
  // Floating profile card
  // --------------------------------------------------

  const bc = document.createElement('canvas');

  bc.width = 512;
  bc.height = 640;

  const bx = bc.getContext('2d');
  const btex = new THREE.CanvasTexture(bc);

  btex.colorSpace = THREE.SRGBColorSpace;

  const paint = (img) => {
    bx.clearRect(0, 0, 512, 640);

    bx.fillStyle = 'rgba(12,16,56,.92)';
    bx.beginPath();
    bx.roundRect(8, 8, 496, 624, 40);
    bx.fill();

    bx.strokeStyle = '#8ea2ff';
    bx.lineWidth = 6;
    bx.stroke();

    if (img) {
      bx.save();

      bx.beginPath();
      bx.arc(256, 230, 170, 0, 7);
      bx.clip();

      const s = Math.max(
        340 / img.width,
        340 / img.height
      );

      bx.drawImage(
        img,
        256 - (img.width * s) / 2,
        230 - (img.height * s) / 2,
        img.width * s,
        img.height * s
      );

      bx.restore();
    }

    bx.textAlign = 'center';

    bx.fillStyle = '#f1efe9';
    bx.font = '700 46px Syne, sans-serif';
    bx.fillText("Hi, I'm Pravesh", 256, 500, 440);

    bx.fillStyle = '#8ea2ff';
    bx.font = '400 28px Manrope, sans-serif';

    bx.fillText(
      'Bsc.IT student and Mobile Application Developer',
      256,
      550,
      460
    );

    bx.fillText(
      'Fly on. Press H for a beep.',
      256,
      595,
      440
    );

    btex.needsUpdate = true;
  };

  paint();

  const me = new Image();

  me.onload = () => paint(me);
  me.src = BASE + 'me.jpg';

  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 8.75),
    new THREE.MeshBasicMaterial({
      map: btex,
      transparent: true
    })
  );

  board.position.set(0, 4.8, -12);
  scene.add(board);

  if (!reduce) {
    gsap.to(board.position, {
      y: 5.4,
      duration: 2.5,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut'
    });
  }

  // --------------------------------------------------
  // Section planets and landing rings
  // --------------------------------------------------

  ZONES.forEach((z, i) => {
    const m = (o) =>
      new THREE.MeshBasicMaterial({
        color: z.c,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        ...o
      });

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(3.6, 4.4, 48)
        .rotateX(-Math.PI / 2),
      m({ opacity: 0.9 })
    );

    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(3.6, 48)
        .rotateX(-Math.PI / 2),
      m({ opacity: 0.12 })
    );

    const planet = new THREE.Sprite(
      spriteMat(
        planetTex(
          PLANET_CROPS[i % PLANET_CROPS.length]
        )
      )
    );

    planet.scale.set(10, 10, 1);
    planet.position.y = 4.4;

    const orbit = new THREE.Mesh(
      new THREE.RingGeometry(3.2, 3.35, 64)
        .rotateX(-1.2),
      m({ opacity: 0.55 })
    );

    orbit.position.y = 4;

    const cv = document.createElement('canvas');

    cv.width = 1024;
    cv.height = 192;

    const cx = cv.getContext('2d');

    cx.fillStyle = '#f1efe9';
    cx.font = '700 84px Syne, sans-serif';
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.shadowColor = '#000';
    cx.shadowBlur = 12;

    cx.fillText(TITLES[z.k], 512, 96, 960);

    const label = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(cv),
        transparent: true,
        fog: false
      })
    );

    label.scale.set(14 * ui, 2.63 * ui, 1);
    label.position.y = 10;

    labels.push(label);

    const g = new THREE.Group();

    ring.position.y = 0.04;
    disc.position.y = 0.04;

    g.add(ring, disc, planet, orbit, label);
    g.position.set(z.x, 0, z.z);

    scene.add(g);

    if (!reduce) {
      gsap.to(planet.position, {
        y: 5,
        duration: 2.5 + i * 0.4,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut'
      });

      gsap.to(orbit.rotation, {
        y: 6.283,
        duration: 12,
        repeat: -1,
        ease: 'none'
      });

      gsap.to(ring.scale, {
        x: 1.1,
        z: 1.1,
        duration: 1.2,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut'
      });
    }
  });

  // --------------------------------------------------
  // Comets
  // --------------------------------------------------

  const cc = document.createElement('canvas');

  cc.width = 240;
  cc.height = 427;

  const ctex = new THREE.CanvasTexture(cc);
  ctex.colorSpace = THREE.SRGBColorSpace;

  const comet = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: ctex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      fog: false
    })
  );

  comet.scale.set(7, 12.5, 1);
  scene.add(comet);

  const cimg = new Image();

  cimg.onload = () => {
    const x = cc.getContext('2d');

    x.drawImage(cimg, 0, 0, 240, 427);

    const px = x.getImageData(0, 0, 240, 427);
    const a = px.data;

    for (let i = 0; i < a.length; i += 4) {
      a[i + 3] =
        clamp((a[i] - a[i + 2] + 10) / 60, 0, 1) * 255;
    }

    x.putImageData(px, 0, 0);
    ctex.needsUpdate = true;
  };

  cimg.src = BASE + 'comet.png';

  const cf = new THREE.Vector3();
  const cr = new THREE.Vector3();
  const cu = new THREE.Vector3();

  function flyComet() {
    camera.getWorldDirection(cf);

    cr.crossVectors(cf, camera.up).normalize();
    cu.crossVectors(cr, cf).normalize();

    const from = camera.position.clone()
      .addScaledVector(cf, 90)
      .addScaledVector(cr, 40 + Math.random() * 20)
      .addScaledVector(cu, 20 + Math.random() * 15);

    const to = from.clone()
      .addScaledVector(cr, -110)
      .addScaledVector(cu, -65);

    comet.position.copy(from);

    gsap.timeline({
      onComplete: () => {
        gsap.delayedCall(6 + Math.random() * 8, flyComet);
      }
    })
      .to(comet.position, {
        x: to.x,
        y: to.y,
        z: to.z,
        duration: 4,
        ease: 'none'
      }, 0)
      .to(comet.material, {
        opacity: 1,
        duration: 0.5
      }, 0)
      .to(comet.material, {
        opacity: 0,
        duration: 0.8
      }, 3.2);
  }

  if (!reduce) {
    gsap.delayedCall(4, flyComet);
  }

  // --------------------------------------------------
  // Section panel
  // --------------------------------------------------

  const panel = $('panel');

  let active = null;
  let dismissedZone = null;

  function setActive(z) {
    if (!z) {
      active = null;
      dismissedZone = null;

      gsap.to(panel, {
        opacity: 0,
        duration: reduce ? 0 : 0.3,
        onComplete: () => {
          if (!active) panel.hidden = true;
        }
      });

      return;
    }

    // Do not reopen a panel the user has just closed
    // until they leave that zone and enter it again.
    if (z.k === dismissedZone) return;

    if (z.k === active?.k) return;

    active = z;
    panel.innerHTML = `
      <button class="x" aria-label="Close">×</button>
      ${section(z.k, d)}
    `;

    panel.hidden = false;
    panel.scrollTop = 0;

    sfx.chime();

    gsap.fromTo(
      panel,
      { opacity: 0, x: 40 },
      {
        opacity: 1,
        x: 0,
        duration: reduce ? 0 : 0.5
      }
    );
  }

  panel.addEventListener('click', (e) => {
    if (e.target.closest('.x')) {
      dismissedZone = active?.k || null;
      active = null;
      panel.hidden = true;
    }
  });

  // --------------------------------------------------
  // Navigation buttons
  // --------------------------------------------------

  const jump = (z) => {
    if (!z) return;

    car.speed = 0;

    dismissedZone = null;

    gsap.to(car, {
      x: z.x,
      z: z.z + 8,
      h: Math.PI,
      duration: reduce ? 0 : 1.2,
      ease: 'power2.inOut'
    });
  };

  document.querySelectorAll('.jump button').forEach((b) => {
    b.addEventListener('click', () => {
      sfx.click();

      jump(
        ZONES.find((z) => z.k === b.dataset.k)
      );
    });
  });

  // --------------------------------------------------
  // Sound and reading mode
  // --------------------------------------------------

  const read = $('read');

  ['keydown', 'pointerdown'].forEach((n) => {
    addEventListener(n, initAudio, { once: true });
  });

  $('sndbtn').addEventListener('click', () => {
    initAudio();

    $('sndbtn').textContent =
      toggleMute() ? 'Sound off' : 'Sound on';
  });

  $('readbtn').addEventListener('click', () => {
    read.hidden = false;
    read.scrollTop = 0;
    $('readx').focus();
  });

  const closeRead = () => {
    read.hidden = true;
    $('readbtn').focus();
  };

  $('readx').addEventListener('click', closeRead);

  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !read.hidden) {
      closeRead();
    }
  });

  // --------------------------------------------------
  // Keyboard and touch controls
  // --------------------------------------------------

  const keys = {};

  let touch = null;

  addEventListener('keydown', (e) => {
    if (e.code === 'KeyH' && !e.repeat) {
      sfx.honk();
    }

    keys[e.code] = true;

    if (
      e.target === document.body &&
      (
        e.code === 'Space' ||
        e.code.startsWith('Arrow')
      )
    ) {
      e.preventDefault();
    }
  });

  addEventListener('keyup', (e) => {
    keys[e.code] = false;
  });

  const cvs = $('bg');

  cvs.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') {
      touch = {
        x: e.clientX,
        y: e.clientY,
        dx: 0,
        dy: 0
      };
    }
  });

  cvs.addEventListener('pointermove', (e) => {
    if (touch) {
      touch.dx = e.clientX - touch.x;
      touch.dy = e.clientY - touch.y;
    }
  });

  ['pointerup', 'pointercancel'].forEach((n) => {
    cvs.addEventListener(n, () => {
      touch = null;
    });
  });

  // --------------------------------------------------
  // Animation loop
  // --------------------------------------------------

  const clock = new THREE.Clock();
  const cam = new THREE.Vector3();

  let started = false;

  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);

    let th =
      (keys.KeyW || keys.ArrowUp ? 1 : 0) -
      (keys.KeyS || keys.ArrowDown ? 1 : 0);

    let st =
      (keys.KeyD || keys.ArrowRight ? 1 : 0) -
      (keys.KeyA || keys.ArrowLeft ? 1 : 0);

    if (touch) {
      th = clamp(-touch.dy / 70, -1, 1);
      st = clamp(touch.dx / 70, -1, 1);
    }

    if (started && read.hidden) {
      car.speed += th * (th > 0 ? 16 : 10) * dt;

      car.speed *= Math.pow(th ? 0.55 : 0.15, dt);

      if (keys.Space) {
        car.speed *= Math.pow(0.01, dt);
      }

      car.speed = clamp(car.speed, -8, 18);

      car.h -=
        ((st * car.speed) / (Math.abs(car.speed) + 4)) *
        2.4 *
        dt;

      car.x += Math.sin(car.h) * car.speed * dt;
      car.z += Math.cos(car.h) * car.speed * dt;
    }

    car.x = clamp(car.x, -55, 55);
    car.z = clamp(car.z, -55, 55);

    // Collision detection
    for (const o of obstacles) {
      const dx = car.x - o.x;
      const dz = car.z - o.z;

      const dist = Math.hypot(dx, dz);
      const min = o.r + 1.3;

      if (dist < min && dist > 0) {
        if (Math.abs(car.speed) > 4) {
          sfx.bump();
        }

        car.x += (dx / dist) * (min - dist);
        car.z += (dz / dist) * (min - dist);

        car.speed *= 0.6;
      }
    }

    // Engine sound
    setEngine(car.speed);

    // Engine flame
    flame.scale.set(
      1,
      1,
      0.2 + (Math.abs(car.speed) / 18) * 1.6
    );

    const tt = clock.elapsedTime;

    // Asteroid movement
    rocks.forEach((r, i) => {
      r.position.y =
        r.userData.y + Math.sin(tt * 0.8 + i) * 0.35;
    });

    // Subtle starfield parallax
    starLayers.forEach((layer) => {
      const speed = layer.userData.parallax;

      layer.position.x = car.x * speed;
      layer.position.z = car.z * speed;
    });

    // Spaceship banking
    ship.material.rotation +=
      (
        -st * 0.25 * Math.min(1, Math.abs(car.speed) / 8) -
        ship.material.rotation
      ) * Math.min(1, dt * 5);

    ship.scale.set(
      3.8 * ui,
      3.8 * ui,
      1
    );

    ship.position.set(
      car.x,
      1.6 + Math.sin(tt * 2.2) * 0.15,
      car.z
    );

    // Fallback 3D ship
    rig.position.set(car.x, 0, car.z);
    rig.rotation.y = car.h;

    body.rotation.z = -st * Math.abs(car.speed) * 0.004;

    wheels.forEach((w) => {
      w.rotation.x += car.speed * dt * 2.2;
    });

    // Follow light
    sun.target.position.set(car.x, 0, car.z);
    sun.position.set(
      car.x + 20,
      30,
      car.z + 10
    );

    // Camera follow
    const fx = Math.sin(car.h);
    const fz = Math.cos(car.h);

    cam.set(
      car.x - fx * 11 * zoom,
      7.5 * zoom,
      car.z - fz * 11 * zoom
    );

    camera.position.lerp(
      cam,
      1 - Math.exp(-dt * 3)
    );

    camera.fov =
      55 + (Math.abs(car.speed) / 18) * 14;

    camera.updateProjectionMatrix();

    camera.lookAt(
      car.x + fx * 3,
      1,
      car.z + fz * 3
    );

    // Open a section when the spaceship enters its ring.
    const zone = ZONES.find(
      (z) => Math.hypot(car.x - z.x, car.z - z.z) < 4.4
    ) || null;

    setActive(zone);

    renderer.render(scene, camera);
  });

  return {
    start: () => {
      started = true;
    }
  };
}

main();