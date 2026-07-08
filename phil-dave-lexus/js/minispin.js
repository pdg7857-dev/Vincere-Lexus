/* ============================================================================
   Phil Dave — "next bay" mini viewer
   Tiny transparent 3D viewer inside the sticky bay teaser: shows the NEXT
   bay's car in a fixed three quarter pose (no spin). Reuses the bay models
   (same URLs the hero engine loads, so the browser cache pays once).
   ========================================================================== */
import * as THREE from "three";
import { GLTFLoader } from "./vendor/three/GLTFLoader.js";
import { RoomEnvironment } from "./vendor/three/RoomEnvironment.js";

var renderer = null, scene = null, cam = null, spin = null;
var loader = null, cache = {};

function ensure() {
  if (renderer) return true;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
  } catch (e) { return false; }
  scene = new THREE.Scene();
  var pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  var key = new THREE.DirectionalLight(0xf4f6ff, 2.4); key.position.set(3, 5, 2); scene.add(key);
  var warm = new THREE.DirectionalLight(0xd9c9a8, 0.7); warm.position.set(-3, 2, -3); scene.add(warm);
  scene.add(new THREE.AmbientLight(0x9aa0ad, 0.45));
  spin = new THREE.Group(); scene.add(spin);
  cam = new THREE.PerspectiveCamera(26, 1.6, 0.1, 50);
  // classic front three-quarter: camera swung toward the front corner and
  // dropped low, so the car reads at ~45°, never head-on
  cam.position.set(3.5, 0.95, 2.6);
  cam.lookAt(0, 0.02, 0);
  return true;
}

function load(url) {
  loader = loader || new GLTFLoader();
  cache[url] = cache[url] || new Promise(function (res, rej) {
    loader.load(url, function (g) { res(g.scene); }, undefined, rej);
  });
  return cache[url];
}

// same override semantics as the bay engine, so colours always match
function tune(g, list) {
  if (!list || !list.length) return;
  g.traverse(function (o) {
    if (!o.isMesh) return;
    var mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach(function (m) {
      list.forEach(function (t) {
        if (m.name !== t.match) return;
        if (t.color) m.color.set(t.color);
        if (t.stripMap) m.map = null;
        ["metalness", "roughness", "clearcoat", "clearcoatRoughness", "envMapIntensity"].forEach(function (k) {
          if (t[k] !== undefined && m[k] !== undefined) m[k] = t[k];
        });
        m.needsUpdate = true;
      });
    });
  });
}

function fit(g) {
  var box = new THREE.Box3().setFromObject(g);
  var size = box.getSize(new THREE.Vector3());
  var s = 2.5 / Math.max(size.x, size.z, 0.001);
  g.scale.setScalar(s);
  box.setFromObject(g);
  var c = box.getCenter(new THREE.Vector3());
  g.position.sub(c);            // centre the car on the origin
  return g;
}

/* show bay `room` ({ model, paintTune }) inside `mount`; the porthole
   stays an empty gradient until the model arrives, then one static frame
   is rendered (diagonal pose, no motion) */
export function show(mount, room) {
  if (!room || !room.model || !ensure()) return Promise.resolve();
  var url = room.model;
  mount.setAttribute("data-mini-for", url);
  var w = mount.clientWidth || 92, h = mount.clientHeight || 56;
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(w, h);
  cam.aspect = w / h; cam.updateProjectionMatrix();
  // the previous bay's car must never linger while the next one loads
  renderer.domElement.classList.remove("is-live");
  return load(url).then(function (src) {
    if (!mount.isConnected || mount.getAttribute("data-mini-for") !== url) return;
    while (spin.children.length) spin.remove(spin.children[0]);
    spin.rotation.y = -0.35;                    // fixed 45° three-quarter pose
    var g = fit(src.clone(true));
    tune(g, room.paintTune);
    spin.add(g);
    if (renderer.domElement.parentNode !== mount) mount.appendChild(renderer.domElement);
    renderer.render(scene, cam);               // one still frame, no loop
    requestAnimationFrame(function () { renderer.domElement.classList.add("is-live"); });
  });
}
