/* ============================================================================
   Phil Dave — showroom sheet turntable
   Lazy 3D viewer for the vehicle lightbox: the card's still image stays
   until the model arrives, then the live turntable fades in over it.
   Loaded on demand (dynamic import) the first time a 3D card is opened.
   ========================================================================== */
import * as THREE from "three";
import { GLTFLoader } from "./vendor/three/GLTFLoader.js";
import { RoomEnvironment } from "./vendor/three/RoomEnvironment.js";

var renderer = null, scene = null, cam = null, spin = null, raf = 0, running = false;
var loader = null, cache = {};                     // url → Promise<scene>
var UNITS_PER_M = 1.05, AUTO = 0.22;               // same scale/speed as the bays

function buildScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0c);
  scene.fog = new THREE.Fog(0x0a0a0c, 14, 30);
  var pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  var floor = new THREE.Mesh(
    new THREE.CircleGeometry(30, 64),
    new THREE.MeshStandardMaterial({ color: 0x0b0b0d, metalness: 0.4, roughness: 0.35 })
  );
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

  var podium = new THREE.Mesh(
    new THREE.CylinderGeometry(3.6, 3.8, 0.16, 96),
    new THREE.MeshStandardMaterial({ color: 0x131316, metalness: 0.75, roughness: 0.3 })
  );
  podium.position.y = 0.08; podium.receiveShadow = true; scene.add(podium);

  var rim = new THREE.Mesh(
    new THREE.TorusGeometry(3.7, 0.015, 12, 128),
    new THREE.MeshBasicMaterial({ color: 0xc9ccd1 })
  );
  rim.rotation.x = Math.PI / 2; rim.position.y = 0.165; scene.add(rim);

  var key = new THREE.SpotLight(0xf4f6ff, 260, 0, 0.55, 0.45, 1.6);
  key.position.set(4.5, 7.5, 3.5); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0002;
  scene.add(key);
  var warm = new THREE.SpotLight(0xd9c9a8, 90, 0, 0.7, 0.6, 1.8);
  warm.position.set(-6, 4.2, -4.5); scene.add(warm);
  scene.add(new THREE.AmbientLight(0x9aa0ad, 0.32));
  var halo = new THREE.PointLight(0xe8ecf5, 26, 9, 1.7);
  halo.position.set(0, 4.4, 0); scene.add(halo);

  spin = new THREE.Group();
  scene.add(spin);

  cam = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 100);
  cam.position.set(Math.sin(0.62) * 7.4, 1.6, Math.cos(0.62) * 7.4);
  cam.lookAt(0, 0.62, 0);
}

function getLoader() { loader = loader || new GLTFLoader(); return loader; }

function loadModel(url) {
  cache[url] = cache[url] || new Promise(function (res, rej) {
    getLoader().load(url, function (g) { res(g.scene); }, undefined, rej);
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
        ["metalness", "roughness", "envMapIntensity"].forEach(function (k) {
          if (t[k] !== undefined) m[k] = t[k];
        });
        m.needsUpdate = true;
      });
    });
  });
}

function prepare(g, lengthM) {
  var box = new THREE.Box3().setFromObject(g);
  var size = box.getSize(new THREE.Vector3());
  var s = (lengthM || 4.6) * UNITS_PER_M / Math.max(size.x, size.z);
  g.scale.setScalar(s);
  box.setFromObject(g);
  var c = box.getCenter(new THREE.Vector3());
  g.position.x -= c.x; g.position.z -= c.z; g.position.y += 0.165 - box.min.y;
  g.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
  return g;
}

function loop() {
  var last = performance.now();
  function tick(now) {
    if (!running) return;
    raf = requestAnimationFrame(tick);
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (spin) spin.rotation.y += AUTO * dt;
    renderer.render(scene, cam);
  }
  raf = requestAnimationFrame(tick);
}

/* mount the turntable into `host` (the sheet media box) and load `cfg`:
   { spinModel, spinLength, spinTune }. Returns a cleanup nothing — call stop(). */
export function start(host, cfg) {
  try {
    if (!renderer) {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.domElement.className = "sheet__spin";
      buildScene();
    }
  } catch (e) { return Promise.reject(e); }         // no WebGL → keep the still

  var w = host.clientWidth || 720, h = host.clientHeight || 405;
  renderer.setPixelRatio(Math.min(1.75, window.devicePixelRatio || 1));
  renderer.setSize(w, h);
  cam.aspect = w / h; cam.updateProjectionMatrix();

  return loadModel(cfg.spinModel).then(function (src) {
    // sheet may have been closed (or another car opened) while downloading
    if (!host.isConnected || host.getAttribute("data-spin-for") !== cfg.spinModel) return;
    while (spin.children.length) spin.remove(spin.children[0]);
    spin.rotation.y = 0;
    spin.add(prepare(src.clone(true), cfg.spinLength));
    tune(spin, cfg.spinTune);
    host.appendChild(renderer.domElement);
    running = true; loop();
    requestAnimationFrame(function () { renderer.domElement.classList.add("is-live"); });
  });
}

export function stop() {
  running = false;
  if (raf) cancelAnimationFrame(raf);
  if (renderer && renderer.domElement.parentNode) {
    renderer.domElement.classList.remove("is-live");
    renderer.domElement.parentNode.removeChild(renderer.domElement);
  }
}
