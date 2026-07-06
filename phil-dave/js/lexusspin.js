/* ============================================================================
   Phil Dave — Lexus tool turntable
   A single reusable Three.js viewer that spins the selected model. Mounts
   its canvas into whichever model section is showing (inside the tool's
   shadow root). Only models with a GLB spin; the rest simply show nothing.
   ========================================================================== */
import * as THREE from "three";
import { GLTFLoader } from "./vendor/three/GLTFLoader.js";
import { RoomEnvironment } from "./vendor/three/RoomEnvironment.js";

// tool model id  ->  { file, length(m), tune[] }
var MODELS = {
  es: { file: "models/lexus-es.glb", length: 4.98, tune: [] },
  gx: { file: "models/lexus-gx.glb", length: 4.95, tune: [] },
  lx: { file: "models/lexus-lx.glb", length: 5.10, tune: [] },
};

var renderer = null, scene = null, cam = null, spin = null, raf = 0, running = false;
var loader = null, cache = {}, currentId = null, host = null;

function ensure() {
  if (renderer) return true;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.cssText = "width:100%;height:100%;display:block;";
  } catch (e) { return false; }
  scene = new THREE.Scene();
  var pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  var key = new THREE.DirectionalLight(0xf4f6ff, 2.4); key.position.set(4, 6, 3); scene.add(key);
  var warm = new THREE.DirectionalLight(0xd9c9a8, 0.7); warm.position.set(-5, 3, -4); scene.add(warm);
  scene.add(new THREE.AmbientLight(0x9aa0ad, 0.42));
  spin = new THREE.Group(); scene.add(spin);
  cam = new THREE.PerspectiveCamera(26, 1.9, 0.1, 60);
  cam.position.set(5.4, 1.9, 6.6);   // pulled back + up so tall SUVs clear the frame
  cam.lookAt(0, 0.62, 0);
  return true;
}

function load(url) {
  loader = loader || new GLTFLoader();
  cache[url] = cache[url] || new Promise(function (res, rej) {
    loader.load(url, function (g) { res(g.scene); }, undefined, rej);
  });
  return cache[url];
}

function tune(g, list) {
  if (!list || !list.length) return;
  g.traverse(function (o) {
    if (!o.isMesh) return;
    var mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach(function (m) {
      list.forEach(function (t) {
        if (m.name !== t.match) return;
        if (t.color) m.color.set(t.color);
        ["metalness", "roughness", "envMapIntensity"].forEach(function (k) { if (t[k] !== undefined && m[k] !== undefined) m[k] = t[k]; });
        m.needsUpdate = true;
      });
    });
  });
}

function prepare(g, lengthM) {
  var box = new THREE.Box3().setFromObject(g);
  var size = box.getSize(new THREE.Vector3());
  var s = (lengthM || 4.9) / Math.max(size.x, size.z, 0.001);
  g.scale.setScalar(s);
  box.setFromObject(g);
  var c = box.getCenter(new THREE.Vector3());
  g.position.x -= c.x; g.position.z -= c.z; g.position.y -= box.min.y;
  return g;
}

function resize() {
  if (!host || !renderer) return;
  var w = host.clientWidth || 640, h = host.clientHeight || 360;
  renderer.setPixelRatio(Math.min(1.75, window.devicePixelRatio || 1));
  renderer.setSize(w, h, false);
  cam.aspect = w / h; cam.updateProjectionMatrix();
}

function loop() {
  var last = performance.now();
  function tick(now) {
    if (!running) return;
    raf = requestAnimationFrame(tick);
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    spin.rotation.y += 0.35 * dt;
    renderer.render(scene, cam);
  }
  raf = requestAnimationFrame(tick);
}

/* show the turntable for tool model `id` inside `container` (a .pd-spin box
   in the shadow root). Unknown ids clear the viewer. Returns true if a model
   is being shown. */
export function show(id, container) {
  var cfg = MODELS[id];
  if (!cfg || !container || !ensure()) { stop(); return false; }
  host = container;
  currentId = id;
  resize();
  if (renderer.domElement.parentNode !== host) host.appendChild(renderer.domElement);
  renderer.domElement.classList.remove("is-live");
  return load(cfg.file).then(function (src) {
    if (currentId !== id) return true;                 // switched while loading
    while (spin.children.length) spin.remove(spin.children[0]);
    spin.rotation.y = -0.5;
    spin.add(prepare(src.clone(true), cfg.length));
    tune(spin, cfg.tune);
    resize();
    running = true; cancelAnimationFrame(raf); loop();
    requestAnimationFrame(function () { renderer.domElement.classList.add("is-live"); });
    return true;
  }).catch(function () { return false; });
}

export function stop() {
  running = false;
  if (raf) cancelAnimationFrame(raf);
  if (renderer && renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
  currentId = null; host = null;
}

export function has(id) { return !!MODELS[id]; }
