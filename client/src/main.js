import * as THREE from 'three';
import gsap from 'gsap';
import './style.css';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const tags = (a) => `<div class="tags">${a.map((t) => `<span>${esc(t)}</span>`).join('')}</div>`;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const TITLES = { about: 'About me', education: 'Education', skills: 'Skills and knowledge', projects: 'Projects', contact: "Let's work together" };
const ZONES = [
  { k: 'about', x: -20, z: -20, c: 0x8ea2ff },
  { k: 'education', x: 22, z: -18, c: 0xff7eb6 },
  { k: 'skills', x: -24, z: 14, c: 0xff7eb6 },
  { k: 'projects', x: 24, z: 18, c: 0x8ea2ff },
  { k: 'contact', x: 0, z: 34, c: 0xff7eb6 },
];

async function load() {
  const api = import.meta.env.VITE_API_URL || '';
  try {
    const r = await fetch(api + '/api/portfolio');
    if (r.ok) return await r.json();
  } catch {}
  return (await fetch(import.meta.env.BASE_URL + 'portfolio.json')).json();
}

function section(k, d) {
  const p = d.profile;
  const body = {
    about: () => `<p>${esc(p.summary)}</p>${tags(d.strengths)}`,
    education: () => d.education.map((e) => `<div class="row"><b>${esc(e.degree)}</b><span>${esc(e.school)}</span><em>${esc(e.period)}</em></div>`).join(''),
    skills: () => d.skills.map((g) => `<div class="group"><h3>${esc(g.group)}</h3>${tags(g.items)}</div>`).join(''),
    projects: () => d.projects.map((x) => `<article><h3>${esc(x.title)}</h3>${tags(x.tech)}<p>${esc(x.description)}</p><ul>${x.points.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></article>`).join(''),
    contact: () => `<p>${esc(d.languages.join(' / '))}</p><div class="links"><a href="mailto:${esc(p.email)}">${esc(p.email)}</a><a href="tel:${esc(p.phone)}">${esc(p.phone)}</a><a href="${esc(p.github)}" target="_blank" rel="noopener">GitHub</a><a href="${esc(p.linkedin)}" target="_blank" rel="noopener">LinkedIn</a></div>`,
  }[k]();
  return `<h2>${TITLES[k]}</h2>${body}`;
}

async function main() {
  document.body.insertAdjacentHTML('afterbegin', '<div id="loader"><b id="count">000</b></div>');
  const count = { v: 0 };
  const show = () => ($('count').textContent = String(Math.round(count.v)).padStart(3, '0'));
  const crawl = gsap.to(count, { v: 90, duration: 2.5, ease: 'power1.out', onUpdate: show });
  let d;
  try { d = await load(); } catch { $('loader').innerHTML = '<p>Could not load the portfolio data.</p>'; return; }
  await document.fonts.load('700 64px Syne').catch(() => {});
  const p = d.profile;
  $('app').innerHTML = `
    <div class="hud"><b>${esc(p.name)}</b><span>${esc(p.title)}</span><p>${coarse ? 'Drag on the screen to drive' : 'Drive with WASD or the arrow keys. Space brakes.'}<br>Roll into a glowing ring to open it.</p></div>
    <nav class="jump" aria-label="Jump to a section">${ZONES.map((z) => `<button data-k="${z.k}">${TITLES[z.k]}</button>`).join('')}</nav>
    <button class="readbtn" id="readbtn">Read as a page</button>
    <aside id="panel" hidden aria-live="polite"></aside>
    <div id="read" hidden role="dialog" aria-label="Portfolio as a page"><button class="x" id="readx" aria-label="Close">×</button>${ZONES.map((z) => `<section>${section(z.k, d)}</section>`).join('')}</div>`;
  const world = build(d);
  crawl.kill();
  gsap.to(count, { v: 100, duration: reduce ? 0 : 0.4, onUpdate: show, onComplete: () => {
    gsap.to('#loader', { yPercent: -100, duration: reduce ? 0 : 1, ease: 'power3.inOut', onComplete: () => $('loader').remove() });
    world.start();
  } });
}

function build(d) {
  const renderer = new THREE.WebGLRenderer({ canvas: $('bg'), antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0e27);
  scene.fog = new THREE.Fog(0x0a0e27, 40, 115);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 300);
  camera.position.set(0, 70, 40);
  const resize = () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); };
  addEventListener('resize', resize); resize();

  scene.add(new THREE.HemisphereLight(0x9fb0ff, 0x0a0e27, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, far: 90 });
  scene.add(sun, sun.target);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(130, 130).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x0e1230 }));
  ground.receiveShadow = true;
  const grid = new THREE.GridHelper(120, 60, 0x2c3680, 0x1a2052); grid.position.y = 0.02;
  scene.add(ground, grid);

  const std = (c) => new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.8 });
  const car = { x: 0, z: 0, h: Math.PI, speed: 0 };
  const rig = new THREE.Group(), body = new THREE.Group();
  const add = (g, m, x, y, z) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; return o; };
  body.add(add(new THREE.BoxGeometry(1.9, 0.7, 3.6), std(0xff7eb6), 0, 0.75, 0), add(new THREE.BoxGeometry(1.5, 0.55, 1.7), std(0x8ea2ff), 0, 1.35, -0.2));
  [-0.6, 0.6].forEach((x) => body.add(add(new THREE.BoxGeometry(0.4, 0.2, 0.1), new THREE.MeshBasicMaterial({ color: 0xfff3c4 }), x, 0.8, 1.8)));
  const wheels = [];
  [[-1, 1.15], [1, 1.15], [-1, -1.15], [1, -1.15]].forEach(([x, z]) => {
    const w = add(new THREE.CylinderGeometry(0.45, 0.45, 0.35, 14).rotateZ(Math.PI / 2), std(0x15183a), x, 0.45, z);
    wheels.push(w); rig.add(w);
  });
  rig.add(body); scene.add(rig);

  const obstacles = [];
  const tree = std(0x4b5bd6), trunk = std(0x2b2f66);
  let tries = 0;
  while (obstacles.length < 45 && tries++ < 600) {
    const x = (Math.random() - 0.5) * 108, z = (Math.random() - 0.5) * 108;
    if (Math.hypot(x, z) < 9 || ZONES.some((q) => Math.hypot(x - q.x, z - q.z) < 9) || obstacles.some((o) => Math.hypot(x - o.x, z - o.z) < 4)) continue;
    const s = 0.8 + Math.random() * 0.8, t = new THREE.Group();
    t.add(add(new THREE.CylinderGeometry(0.25, 0.3, 1.2, 6), trunk, 0, 0.6, 0), add(new THREE.ConeGeometry(1.3, 3.2, 7), tree, 0, 2.7, 0));
    t.position.set(x, 0, z); t.scale.setScalar(s); scene.add(t);
    obstacles.push({ x, z, r: 1.0 * s });
  }

  ZONES.forEach((z) => {
    const m = (o) => new THREE.MeshBasicMaterial({ color: z.c, transparent: true, side: THREE.DoubleSide, depthWrite: false, ...o });
    const ring = new THREE.Mesh(new THREE.RingGeometry(3.6, 4.4, 48).rotateX(-Math.PI / 2), m({ opacity: 0.9 }));
    const disc = new THREE.Mesh(new THREE.CircleGeometry(3.6, 48).rotateX(-Math.PI / 2), m({ opacity: 0.12 }));
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 12, 8), m({ opacity: 0.5 }));
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128;
    const cx = cv.getContext('2d'); cx.fillStyle = '#f1efe9'; cx.font = '700 58px Syne, sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(TITLES[z.k], 256, 64);
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, fog: false }));
    label.scale.set(9, 2.25, 1); label.position.y = 8;
    const g = new THREE.Group(); beam.position.y = 6; ring.position.y = disc.position.y = 0.04;
    g.add(ring, disc, beam, label); g.position.set(z.x, 0, z.z); scene.add(g);
    if (!reduce) gsap.to(ring.scale, { x: 1.1, z: 1.1, duration: 1.2, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  });

  const panel = $('panel');
  let active = null;
  function setActive(z) {
    if (z === active) return;
    active = z;
    if (z) {
      panel.innerHTML = `<button class="x" aria-label="Close">×</button>${section(z.k, d)}`;
      panel.hidden = false; panel.scrollTop = 0;
      gsap.fromTo(panel, { opacity: 0, x: 40 }, { opacity: 1, x: 0, duration: reduce ? 0 : 0.5 });
    } else gsap.to(panel, { opacity: 0, duration: reduce ? 0 : 0.3, onComplete: () => { if (!active) panel.hidden = true; } });
  }
  panel.addEventListener('click', (e) => { if (e.target.closest('.x')) panel.hidden = true; });

  const jump = (z) => { car.speed = 0; gsap.to(car, { x: z.x, z: z.z + 8, h: Math.PI, duration: reduce ? 0 : 1.2, ease: 'power2.inOut' }); };
  document.querySelectorAll('.jump button').forEach((b) => b.addEventListener('click', () => jump(ZONES.find((z) => z.k === b.dataset.k))));
  const read = $('read');
  $('readbtn').addEventListener('click', () => { read.hidden = false; read.scrollTop = 0; $('readx').focus(); });
  const closeRead = () => { read.hidden = true; $('readbtn').focus(); };
  $('readx').addEventListener('click', closeRead);
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !read.hidden) closeRead(); });

  const keys = {}; let touch = null;
  addEventListener('keydown', (e) => { keys[e.code] = true; if (e.target === document.body && (e.code === 'Space' || e.code.startsWith('Arrow'))) e.preventDefault(); });
  addEventListener('keyup', (e) => { keys[e.code] = false; });
  const cvs = $('bg');
  cvs.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') touch = { x: e.clientX, y: e.clientY, dx: 0, dy: 0 }; });
  cvs.addEventListener('pointermove', (e) => { if (touch) { touch.dx = e.clientX - touch.x; touch.dy = e.clientY - touch.y; } });
  ['pointerup', 'pointercancel'].forEach((n) => cvs.addEventListener(n, () => { touch = null; }));

  const clock = new THREE.Clock(), cam = new THREE.Vector3();
  let started = false;
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    let th = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
    let st = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
    if (touch) { th = clamp(-touch.dy / 70, -1, 1); st = clamp(touch.dx / 70, -1, 1); }
    if (started && read.hidden) {
      car.speed += th * (th > 0 ? 16 : 10) * dt;
      car.speed *= Math.pow(th ? 0.55 : 0.15, dt);
      if (keys.Space) car.speed *= Math.pow(0.01, dt);
      car.speed = clamp(car.speed, -8, 18);
      car.h -= ((st * car.speed) / (Math.abs(car.speed) + 4)) * 2.4 * dt;
      car.x += Math.sin(car.h) * car.speed * dt; car.z += Math.cos(car.h) * car.speed * dt;
    }
    car.x = clamp(car.x, -55, 55); car.z = clamp(car.z, -55, 55);
    for (const o of obstacles) {
      const dx = car.x - o.x, dz = car.z - o.z, dist = Math.hypot(dx, dz), min = o.r + 1.3;
      if (dist < min && dist > 0) { car.x += (dx / dist) * (min - dist); car.z += (dz / dist) * (min - dist); car.speed *= 0.6; }
    }
    rig.position.set(car.x, 0, car.z); rig.rotation.y = car.h;
    body.rotation.z = -st * Math.abs(car.speed) * 0.004;
    wheels.forEach((w) => { w.rotation.x += car.speed * dt * 2.2; });
    sun.target.position.set(car.x, 0, car.z); sun.position.set(car.x + 20, 30, car.z + 10);
    const fx = Math.sin(car.h), fz = Math.cos(car.h);
    cam.set(car.x - fx * 11, 7.5, car.z - fz * 11);
    camera.position.lerp(cam, 1 - Math.exp(-dt * 3));
    camera.lookAt(car.x + fx * 3, 1, car.z + fz * 3);
    setActive(ZONES.find((z) => Math.hypot(car.x - z.x, car.z - z.z) < 4.4) || null);
    renderer.render(scene, camera);
  });
  return { start: () => { started = true; } };
}

main();
