/* ============================================================================
   Phil Dave — hyper-3D pedestal hero (Three.js, self-hosted)
   ----------------------------------------------------------------------------
   A real-time showroom: a procedurally-built platinum grand tourer on a lit
   turntable — auto-rotating, drag-to-spin with inertia, floor reflection,
   studio lighting, and the DOM hotspots anchored to live 3D points on the car
   so they orbit with it.

   Simple by design:
   - No model file needed. Drop a .glb in models/ + set SITE.heroModel in
     js/data.js and it replaces the procedural car automatically.
   - Falls back to the 2D hero on mobile, prefers-reduced-motion, or no WebGL.
   - Pauses rendering when the hero is off-screen or the tab is hidden.
   ========================================================================== */
import * as THREE from "three";
import { RoomEnvironment } from "./vendor/three/RoomEnvironment.js";

(function () {
  "use strict";

  var S = window.SITE || {};
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarse = window.matchMedia("(hover: none)").matches;
  if (reduce || coarse) return; // calm/mobile → keep the 2D hero

  var mount = document.getElementById("three");
  var stage = document.getElementById("stage");
  if (!mount || !stage) return;

  /* ---------- renderer (bail silently to 2D if WebGL is unavailable) ---- */
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
  } catch (e) { return; }
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  mount.appendChild(renderer.domElement);
  renderer.domElement.style.cursor = "grab";
  renderer.domElement.setAttribute("aria-hidden", "true");

  var scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer)
    .fromScene(new RoomEnvironment(), 0.04).texture;

  var camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 60);
  var CAM = { x: 4.6, y: 2.2, z: 8.2 };
  camera.position.set(CAM.x, CAM.y, CAM.z);
  var camTarget = new THREE.Vector3(0, 0.5, 0);

  /* ---------- studio lighting ------------------------------------------ */
  var key = new THREE.SpotLight(0xffffff, 260, 0, Math.PI / 5, 0.55, 1.6);
  key.position.set(0, 9, 1.5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.0004;
  scene.add(key);

  var rim1 = new THREE.SpotLight(0xdfe6f2, 90, 0, Math.PI / 5, 0.8, 1.8);
  rim1.position.set(-7, 3.2, -5);
  scene.add(rim1);
  var rim2 = new THREE.SpotLight(0xcfd4dc, 60, 0, Math.PI / 5, 0.8, 1.8);
  rim2.position.set(7, 2.6, -4);
  scene.add(rim2);
  // soft fill from the camera side so glass and flanks catch a glint
  var fill = new THREE.DirectionalLight(0xdfe3ea, 2.4);
  fill.position.set(4.5, 2.5, 8);
  scene.add(fill);
  scene.add(new THREE.AmbientLight(0x1c1e24, 2.2));

  /* ---------- materials -------------------------------------------------- */
  var paint = new THREE.MeshPhysicalMaterial({
    color: 0xaab0b8, metalness: 0.85, roughness: 0.34,
    clearcoat: 1.0, clearcoatRoughness: 0.08, envMapIntensity: 1.6
  });
  var glass = new THREE.MeshPhysicalMaterial({
    color: 0x14161b, metalness: 0.5, roughness: 0.05,
    clearcoat: 1.0, clearcoatRoughness: 0.03, envMapIntensity: 2.0
  });
  var tireMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0b, roughness: 0.92, metalness: 0.1 });
  var rimMat = new THREE.MeshStandardMaterial({
    color: 0xe8eaed, roughness: 0.18, metalness: 1.0, envMapIntensity: 1.6,
    emissive: 0x53565c, emissiveIntensity: 0.5
  });
  var trimDark = new THREE.MeshStandardMaterial({ color: 0x121316, roughness: 0.5, metalness: 0.8 });
  var glowWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2.6 });

  /* ---------- procedural grand tourer ----------------------------------- */
  function buildCar() {
    var car = new THREE.Group();

    // body — sleek side profile extruded + fat bevel to round the flanks
    var body = new THREE.Shape();
    body.moveTo(-2.25, 0.34);
    body.lineTo(2.05, 0.34);
    body.quadraticCurveTo(2.48, 0.38, 2.44, 0.62);   // nose
    body.quadraticCurveTo(2.3, 0.82, 1.5, 0.87);     // hood
    body.quadraticCurveTo(-0.2, 1.0, -2.02, 0.92);   // beltline rising aft
    body.quadraticCurveTo(-2.36, 0.9, -2.34, 0.62);  // tail
    body.quadraticCurveTo(-2.38, 0.4, -2.25, 0.34);  // undertail
    var bodyGeo = new THREE.ExtrudeGeometry(body, {
      depth: 1.5, bevelEnabled: true, bevelThickness: 0.3, bevelSize: 0.26, bevelSegments: 6, curveSegments: 24
    });
    bodyGeo.translate(0, 0, -0.75);
    var bodyMesh = new THREE.Mesh(bodyGeo, paint);
    bodyMesh.castShadow = true;
    car.add(bodyMesh);

    // cabin — low fastback greenhouse in dark glass
    var cabin = new THREE.Shape();
    cabin.moveTo(1.18, 0.88);
    cabin.quadraticCurveTo(0.5, 1.19, -0.15, 1.2);   // windshield → roof
    cabin.quadraticCurveTo(-0.95, 1.17, -1.55, 0.9); // fastback
    cabin.quadraticCurveTo(-0.2, 0.97, 1.18, 0.88);  // close along beltline
    var cabinGeo = new THREE.ExtrudeGeometry(cabin, {
      depth: 1.06, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.12, bevelSegments: 4, curveSegments: 20
    });
    cabinGeo.translate(0, 0, -0.53);
    var cabinMesh = new THREE.Mesh(cabinGeo, glass);
    cabinMesh.castShadow = true;
    car.add(cabinMesh);

    // wheels
    var tireGeo = new THREE.CylinderGeometry(0.43, 0.43, 0.3, 36);
    var rimGeo = new THREE.CylinderGeometry(0.29, 0.29, 0.325, 24);
    var hubGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.34, 12);
    [[1.45, 0.95], [1.45, -0.95], [-1.45, 0.95], [-1.45, -0.95]].forEach(function (p) {
      var w = new THREE.Group();
      var tire = new THREE.Mesh(tireGeo, tireMat);
      var rim = new THREE.Mesh(rimGeo, rimMat);
      var hub = new THREE.Mesh(hubGeo, trimDark);
      tire.castShadow = true;
      w.add(tire); w.add(rim); w.add(hub);
      w.rotation.x = Math.PI / 2;
      w.position.set(p[0], 0.43, p[1]);
      car.add(w);
    });

    // rocker shadow line (visually grounds the body over the wheels)
    var rocker = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.16, 1.72), trimDark);
    rocker.position.set(0, 0.3, 0);
    car.add(rocker);

    // headlights + tail light bar
    var hl = new THREE.CapsuleGeometry(0.045, 0.16, 4, 8);
    [0.62, -0.62].forEach(function (z) {
      var m = new THREE.Mesh(hl, glowWhite);
      m.rotation.z = Math.PI / 2;
      m.position.set(2.42, 0.6, z);
      car.add(m);
    });
    var tail = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 1.5), glowWhite);
    tail.position.set(-2.37, 0.74, 0);
    car.add(tail);

    return car;
  }

  /* ---------- pedestal --------------------------------------------------- */
  var pedestal = new THREE.Group();
  var disc = new THREE.Mesh(
    new THREE.CylinderGeometry(3.1, 3.24, 0.14, 72),
    new THREE.MeshStandardMaterial({ color: 0x0e0f12, roughness: 0.28, metalness: 0.85, envMapIntensity: 0.7 })
  );
  disc.position.y = -0.07;
  disc.receiveShadow = true;
  pedestal.add(disc);

  var ring = new THREE.Mesh(
    new THREE.TorusGeometry(3.02, 0.016, 10, 100),
    new THREE.MeshStandardMaterial({ color: 0xe8eaed, emissive: 0xe8eaed, emissiveIntensity: 1.4, roughness: 0.3, metalness: 1 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.005;
  pedestal.add(ring);
  scene.add(pedestal);

  /* ---------- spin group: car + mirrored reflection ---------------------- */
  var spin = new THREE.Group();
  scene.add(spin);

  function mountCar(car) {
    spin.add(car);
    // cheap, convincing floor reflection: mirrored ghost of the car
    var mirror = car.clone(true);
    mirror.traverse(function (o) {
      if (o.isMesh) {
        o.castShadow = false;
        o.material = o.material.clone();
        o.material.transparent = true;
        o.material.opacity = 0.14;
        o.material.depthWrite = false;
        if (o.material.emissiveIntensity) o.material.emissiveIntensity *= 0.4;
      }
    });
    mirror.scale.y = -1;
    spin.add(mirror);
  }

  var carReady = false;
  if (S.heroModel) {
    // owner supplied a real model — use it instead of the procedural car
    import("./vendor/three/GLTFLoader.js").then(function (m) {
      new m.GLTFLoader().load(S.heroModel, function (gltf) {
        var g = gltf.scene;
        // normalise to ~4.6 units long, sitting on y=0
        var box = new THREE.Box3().setFromObject(g);
        var size = box.getSize(new THREE.Vector3());
        var s = 4.6 / Math.max(size.x, size.z);
        g.scale.setScalar(s);
        box.setFromObject(g);
        g.position.y -= box.min.y;
        g.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
        mountCar(g); carReady = true; activate();
      }, undefined, function () { mountCar(buildCar()); carReady = true; activate(); });
    }).catch(function () { mountCar(buildCar()); carReady = true; activate(); });
  } else {
    mountCar(buildCar()); carReady = true;
  }

  /* ---------- hotspot anchors on the car body ---------------------------- */
  var anchors = [
    new THREE.Vector3(2.3, 0.75, 0.7),    // nose / headlight
    new THREE.Vector3(-0.2, 1.32, 0.3),   // roof line
    new THREE.Vector3(-2.25, 1.0, -0.5),  // tail
    new THREE.Vector3(1.45, 0.5, 1.05),   // front wheel
    new THREE.Vector3(-1.45, 0.55, -1.05) // rear wheel (5th room if ever added)
  ];
  var hotspotEls = null;
  var v = new THREE.Vector3();
  function placeHotspots() {
    if (!hotspotEls) {
      var els = stage.querySelectorAll(".hotspot");
      if (!els.length) return;
      hotspotEls = els;
    }
    var w = mount.clientWidth, h = mount.clientHeight;
    for (var i = 0; i < hotspotEls.length; i++) {
      var a = anchors[i % anchors.length];
      v.copy(a).applyMatrix4(spin.matrixWorld).project(camera);
      var el = hotspotEls[i];
      el.style.left = ((v.x * 0.5 + 0.5) * 100) + "%";
      el.style.top = ((-v.y * 0.5 + 0.5) * 100) + "%";
      // fade hotspots that swing behind the car (depth cue)
      el.style.opacity = v.z < 0.994 ? "" : "0.35";
    }
  }

  /* ---------- drag to rotate, with inertia ------------------------------- */
  var AUTO = 0.22;           // rad/s luxury-slow turntable
  var vel = AUTO, dragging = false, lastX = 0, lastT = 0;
  var el = renderer.domElement;
  el.addEventListener("pointerdown", function (e) {
    dragging = true; lastX = e.clientX; lastT = performance.now();
    el.style.cursor = "grabbing";
    el.setPointerCapture(e.pointerId);
  });
  el.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    var now = performance.now();
    var dx = e.clientX - lastX;
    spin.rotation.y += dx * 0.006;
    vel = (dx * 0.006) / Math.max((now - lastT) / 1000, 0.016);
    lastX = e.clientX; lastT = now;
  });
  function endDrag() { dragging = false; el.style.cursor = "grab"; }
  el.addEventListener("pointerup", endDrag);
  el.addEventListener("pointercancel", endDrag);

  // hovering a hotspot eases the turntable to a stop so it's easy to hit
  var hotspotHover = false;
  stage.addEventListener("mouseover", function (e) {
    if (e.target.closest && e.target.closest(".hotspot")) hotspotHover = true;
  });
  stage.addEventListener("mouseout", function (e) {
    if (e.target.closest && e.target.closest(".hotspot")) hotspotHover = false;
  });

  // subtle camera parallax on mouse
  var mx = 0, my = 0;
  stage.addEventListener("mousemove", function (e) {
    var r = stage.getBoundingClientRect();
    mx = (e.clientX - r.left) / r.width - 0.5;
    my = (e.clientY - r.top) / r.height - 0.5;
  });

  /* ---------- size / visibility ------------------------------------------ */
  function resize() {
    var w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage);
  window.addEventListener("resize", resize);

  var visible = true;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }, { threshold: 0.02 }).observe(stage);
  }

  /* ---------- loop -------------------------------------------------------- */
  var clock = new THREE.Clock();
  function loop() {
    requestAnimationFrame(loop);
    if (!visible || document.hidden) return;
    var dt = Math.min(clock.getDelta(), 0.05);
    if (!dragging) {
      spin.rotation.y += vel * dt;
      // inertia bleeds back to the slow auto-rotate (or to a stop on hover)
      var goal = hotspotHover ? 0 : AUTO;
      vel += (goal - vel) * Math.min(1, dt * (hotspotHover ? 6 : 1.2));
    }
    ring.material.emissiveIntensity = 1.15 + Math.sin(clock.elapsedTime * 1.4) * 0.35;
    camera.position.x = CAM.x + mx * 0.7;
    camera.position.y = CAM.y - my * 0.4;
    camera.lookAt(camTarget);
    spin.updateMatrixWorld();
    placeHotspots();
    renderer.render(scene, camera);
  }

  /* ---------- activate: swap 2D hero for 3D ------------------------------ */
  function activate() {
    if (!carReady) return;
    var flat = document.getElementById("stageCar");
    if (flat) flat.style.display = "none";
    // the 3D scene has its own pedestal — retire the CSS one so its rings
    // and glow don't float behind the transparent canvas
    var ped = stage.querySelector(".stage__pedestal");
    if (ped) ped.style.display = "none";
    mount.hidden = false;
    resize();
    loop();
  }
  if (carReady) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", activate);
    else activate();
  }
})();
