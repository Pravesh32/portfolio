import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './style.css';
gsap.registerPlugin(ScrollTrigger);

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const tags = (a) => `<div class="tags">${a.map((t) => `<span>${esc(t)}</span>`).join('')}</div>`;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

async function main() {
  const app = document.getElementById('app');
  let d;
  try {
    d = await (await fetch('/api/portfolio')).json();
  } catch {
    app.innerHTML = '<p class="err">Could not reach the API. Start it with <code>npm run dev</code> in the project root.</p>';
    return;
  }
  const p = d.profile;
  app.innerHTML = `
  <section class="hero"><h1 id="name">${esc(p.name)}</h1><h2>${esc(p.title)}</h2><p class="sub">${esc(p.location)}. Scroll to fly through my work.</p></section>
  <section><div class="panel"><h3>About me</h3><p>${esc(p.summary)}</p>${tags(d.strengths)}</div></section>
  <section><h3 class="title">Education</h3><div class="timeline">${d.education.map((e) => `<div class="panel tilt"><b>${esc(e.degree)}</b>${esc(e.school)}<em>${esc(e.period)}</em></div>`).join('')}</div></section>
  <section><h3 class="title">Skills and knowledge</h3><div class="grid">${d.skills.map((g) => `<div class="panel tilt"><h4>${esc(g.group)}</h4>${tags(g.items)}</div>`).join('')}</div></section>
  <section><h3 class="title">Projects</h3><div class="grid">${d.projects.map((x) => `<article class="panel tilt"><h4>${esc(x.title)}</h4>${tags(x.tech)}<p>${esc(x.description)}</p><ul>${x.points.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></article>`).join('')}</div></section>
  <section><h3 class="title">Let's work together</h3><div class="panel contact"><span>${esc(d.languages.join(' / '))}</span>
    <a href="mailto:${esc(p.email)}">${esc(p.email)}</a><a href="tel:${esc(p.phone)}">${esc(p.phone)}</a>
    <a href="${esc(p.github)}" target="_blank" rel="noopener">GitHub</a><a href="${esc(p.linkedin)}" target="_blank" rel="noopener">LinkedIn</a></div></section>`;

  scene3d(app);
  if (!reduce) animateUI(p.name);
}

function scene3d(app) {
  const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('bg'), antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0e27);
  scene.fog = new THREE.FogExp2(0x0a0e27, 0.016);
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 250);
  const resize = () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); };
  addEventListener('resize', resize); resize();

  const pos = new Float32Array(3600 * 3).map(() => (Math.random() - 0.5) * 180);
  const starGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ size: 0.16, color: 0xc9d2ff })));

  // The camera flies along this curve; one wireframe shape sits beside each stop.
  const path = new THREE.CatmullRomCurve3([[0,0,30],[8,3,10],[-8,-2,-10],[8,2,-30],[-8,-3,-50],[6,2,-70],[0,0,-88]].map((a) => new THREE.Vector3(...a)));
  const geos = [new THREE.TorusKnotGeometry(2.2, 0.6, 140, 16), new THREE.IcosahedronGeometry(2.6), new THREE.OctahedronGeometry(2.6), new THREE.TorusGeometry(2.4, 0.7, 16, 48), new THREE.DodecahedronGeometry(2.5), new THREE.TetrahedronGeometry(3)];
  const shapes = geos.map((g, i) => {
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: i % 2 ? 0xff7eb6 : 0x8ea2ff, wireframe: true }));
    const at = path.getPoint(i / 6 + 0.04);
    m.position.set(-at.x * 0.9, at.y + 1, at.z - 4);
    m.userData.y = m.position.y;
    scene.add(m);
    return m;
  });

  const state = { t: 0 }, mouse = { x: 0, y: 0 }, look = new THREE.Vector3();
  addEventListener('pointermove', (e) => { mouse.x = e.clientX / innerWidth - 0.5; mouse.y = e.clientY / innerHeight - 0.5; });
  gsap.to(state, { t: 0.96, ease: 'none', scrollTrigger: { trigger: app, start: 'top top', end: 'bottom bottom', scrub: 1.2 } });

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const e = reduce ? 0 : clock.getElapsedTime();
    path.getPoint(state.t, camera.position);
    path.getPoint(Math.min(state.t + 0.03, 1), look);
    camera.position.x += mouse.x * 2.5; camera.position.y -= mouse.y * 2.5;
    camera.lookAt(look);
    shapes.forEach((s, i) => { s.rotation.x = e * 0.2 + i; s.rotation.y = e * 0.3; s.position.y = s.userData.y + Math.sin(e + i) * 0.6; });
    renderer.render(scene, camera);
  });
}

function animateUI(name) {
  const h = document.getElementById('name');
  h.innerHTML = [...name].map((c) => `<span>${c === ' ' ? '&nbsp;' : esc(c)}</span>`).join('');
  gsap.timeline()
    .from('#name span', { y: 90, opacity: 0, rotateX: -90, stagger: 0.04, duration: 1, ease: 'back.out(1.6)' })
    .from('.hero h2, .hero .sub', { opacity: 0, y: 24, stagger: 0.2 }, '-=0.3');

  gsap.utils.toArray('section:not(.hero) .panel, .title').forEach((el) =>
    gsap.from(el, { opacity: 0, y: 70, duration: 0.9, scrollTrigger: { trigger: el, start: 'top 90%' } }));

  document.querySelectorAll('.tilt').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      gsap.to(el, { rotateY: ((e.clientX - r.left) / r.width - 0.5) * 14, rotateX: -((e.clientY - r.top) / r.height - 0.5) * 14, transformPerspective: 800, duration: 0.4 });
    });
    el.addEventListener('pointerleave', () => gsap.to(el, { rotateX: 0, rotateY: 0, duration: 0.6 }));
  });
}

main();
