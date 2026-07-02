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
  // Garage mode: activate only if some bay asks for the 3D spin (spin3d);
  // legacy single-photo mode: the photo wins and 3D stands down entirely.
  var garageMode = !!(S.bays && S.bays.length);
  var wantsSpin = garageMode && S.bays.some(function (b) { return b.spin3d || b.model; });
  if (garageMode && !wantsSpin) return;
  if (!garageMode && (S.heroImage || (S.heroRooms && S.heroRooms.length))) return;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarse = window.matchMedia("(hover: none)").matches;
  if (reduce) return;                      // calm mode → keep the photo hero
  if (coarse && !garageMode) return;       // legacy mode stays desktop-only

  var mount = document.getElementById("three");
  var stage = document.getElementById("stage");
  if (!mount || !stage) return;

  /* ---------- renderer (bail silently to 2D if WebGL is unavailable) ---- */
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
  } catch (e) { return; }
  renderer.setPixelRatio(Math.min(coarse ? 1.75 : 2, window.devicePixelRatio || 1));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  mount.appendChild(renderer.domElement);
  renderer.domElement.style.cursor = "grab";
  // horizontal drags spin the car; vertical swipes still scroll the page
  renderer.domElement.style.touchAction = "pan-y";
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
  // CU Later Grey — the satin medium grey of the photo car
  var paint = new THREE.MeshPhysicalMaterial({
    color: 0x878d93, metalness: 0.6, roughness: 0.46,
    clearcoat: 0.7, clearcoatRoughness: 0.22, envMapIntensity: 1.15
  });
  var glass = new THREE.MeshPhysicalMaterial({
    color: 0x14161b, metalness: 0.5, roughness: 0.05,
    clearcoat: 1.0, clearcoatRoughness: 0.03, envMapIntensity: 2.0
  });
  var tireMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0b, roughness: 0.92, metalness: 0.1 });
  // gloss-black wheels with a bright machined lip, like the photo car
  var rimMat = new THREE.MeshStandardMaterial({
    color: 0x17181b, roughness: 0.25, metalness: 0.9, envMapIntensity: 1.4
  });
  var lipMat = new THREE.MeshStandardMaterial({
    color: 0xc9ccd1, roughness: 0.15, metalness: 1.0, envMapIntensity: 1.6,
    emissive: 0x3c3f45, emissiveIntensity: 0.4
  });
  var trimDark = new THREE.MeshStandardMaterial({ color: 0x121316, roughness: 0.5, metalness: 0.8 });
  var glowWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2.6 });

  /* ---------- procedural 2025 GR Supra (A91) ----------------------------
     Sculpted to the MK5's proportions and cues: long hood with a low
     drooping nose, cab-rearward greenhouse with the black double-bubble
     roof, short deck with the ducktail kick, wide rear haunches, black
     wheels with machined lips.                                            */
  function buildCar() {
    var car = new THREE.Group();

    // body side profile
    var body = new THREE.Shape();
    body.moveTo(-2.2, 0.34);                          // under tail
    body.lineTo(2.0, 0.34);                           // rocker line
    body.quadraticCurveTo(2.38, 0.36, 2.42, 0.5);     // low pointed nose
    body.quadraticCurveTo(2.4, 0.6, 2.15, 0.66);      // nose crown
    body.quadraticCurveTo(1.2, 0.78, 0.55, 0.82);     // the long hood
    body.quadraticCurveTo(-0.6, 0.92, -1.55, 0.86);   // beltline under glass
    body.quadraticCurveTo(-1.95, 0.86, -2.1, 0.94);   // ducktail kick UP
    body.quadraticCurveTo(-2.28, 0.9, -2.3, 0.62);    // tail face
    body.quadraticCurveTo(-2.32, 0.4, -2.2, 0.34);    // undertail
    var bodyGeo = new THREE.ExtrudeGeometry(body, {
      depth: 1.42, bevelEnabled: true, bevelThickness: 0.28, bevelSize: 0.24, bevelSegments: 6, curveSegments: 28
    });
    bodyGeo.translate(0, 0, -0.71);
    var bodyMesh = new THREE.Mesh(bodyGeo, paint);
    bodyMesh.castShadow = true;
    car.add(bodyMesh);

    // greenhouse — compact, set rearward, long fastback into the deck;
    // the dark glass doubles as the Supra's black roof
    var cabin = new THREE.Shape();
    cabin.moveTo(0.78, 0.78);
    cabin.quadraticCurveTo(0.3, 1.26, -0.25, 1.3);    // fast windshield → roof peak
    cabin.quadraticCurveTo(-0.95, 1.24, -1.68, 0.84); // long fastback glass
    cabin.quadraticCurveTo(-0.5, 0.9, 0.78, 0.78);    // close along beltline
    var cabinGeo = new THREE.ExtrudeGeometry(cabin, {
      depth: 1.04, bevelEnabled: true, bevelThickness: 0.13, bevelSize: 0.13, bevelSegments: 5, curveSegments: 22
    });
    cabinGeo.translate(0, 0, -0.49);
    var cabinMesh = new THREE.Mesh(cabinGeo, glass);
    cabinMesh.castShadow = true;
    car.add(cabinMesh);

    // the Supra hips — wide bulges over the rear wheels (and subtler fronts)
    [[-1.3, 0.62, 1.55, 0.5], [1.35, 0.58, 1.15, 0.38]].forEach(function (f) {
      [1, -1].forEach(function (side) {
        var h = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 18), paint);
        h.scale.set(f[2] * 0.62, f[3], 0.34);
        h.position.set(f[0], f[1], side * 0.86);
        h.castShadow = true;
        car.add(h);
      });
    });

    // wheels — Supra wheelbase, black rims, bright machined lip
    var tireGeo = new THREE.CylinderGeometry(0.39, 0.39, 0.3, 36);
    var rimGeo = new THREE.CylinderGeometry(0.27, 0.27, 0.315, 24);
    var lipGeo = new THREE.TorusGeometry(0.265, 0.016, 8, 40);
    var hubGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.33, 12);
    [[1.32, 0.9], [1.32, -0.9], [-1.3, 0.92], [-1.3, -0.92]].forEach(function (p) {
      var w = new THREE.Group();
      var tire = new THREE.Mesh(tireGeo, tireMat);
      var rim = new THREE.Mesh(rimGeo, rimMat);
      var hub = new THREE.Mesh(hubGeo, trimDark);
      tire.castShadow = true;
      w.add(tire); w.add(rim); w.add(hub);
      [1, -1].forEach(function (s) {
        var lip = new THREE.Mesh(lipGeo, lipMat);
        lip.rotation.x = Math.PI / 2;
        lip.position.y = s * 0.158;
        w.add(lip);
      });
      w.rotation.x = Math.PI / 2;
      w.position.set(p[0], 0.39, p[1]);
      car.add(w);
    });

    // dark rocker + splitter line grounds the body
    var rocker = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.14, 1.6), trimDark);
    rocker.position.set(0, 0.3, 0);
    car.add(rocker);
    var splitter = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 1.7), trimDark);
    splitter.position.set(2.15, 0.3, 0);
    car.add(splitter);

    // slim wraparound headlights on the drooping nose + full-width tail bar
    var hl = new THREE.CapsuleGeometry(0.035, 0.2, 4, 8);
    [0.58, -0.58].forEach(function (z) {
      var m = new THREE.Mesh(hl, glowWhite);
      m.rotation.z = Math.PI / 2;
      m.rotation.y = z > 0 ? -0.5 : 0.5;
      m.position.set(2.3, 0.56, z);
      car.add(m);
    });
    var tail = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.045, 1.4), glowWhite);
    tail.position.set(-2.3, 0.78, 0);
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
    spin.clear();
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

  /* one shared world scale: units per metre, anchored so a ~4.4 m coupe
     fills the stage the way the original car did. Every bay model is
     scaled by its real length, so car-to-car size differences stay true. */
  var UNITS_PER_M = 1.05;
  function prepare(g, lengthM) {
    var box = new THREE.Box3().setFromObject(g);
    var size = box.getSize(new THREE.Vector3());
    var target = (lengthM || 4.4) * UNITS_PER_M;
    var s = target / Math.max(size.x, size.z);
    g.scale.setScalar(s);
    box.setFromObject(g);
    g.position.y -= box.min.y;
    var center = box.getCenter(new THREE.Vector3());
    g.position.x -= center.x; g.position.z -= center.z;
    g.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
    return g;
  }

  // lazy loader + per-URL cache so bay swaps are instant after first visit
  var loaderP = null;
  function getLoader() {
    loaderP = loaderP || import("./vendor/three/GLTFLoader.js").then(function (m) { return new m.GLTFLoader(); });
    return loaderP;
  }
  var modelCache = {};
  function loadBayModel(url) {
    modelCache[url] = modelCache[url] || getLoader().then(function (loader) {
      return new Promise(function (res, rej) {
        loader.load(url, function (gltf) { res(gltf.scene); }, undefined, rej);
      });
    });
    return modelCache[url];
  }

  var carReady = false;
  var readyCb = function () {};   // legacy mode only — assigned below
  if (!garageMode) {
    if (S.heroModel) {
      getLoader().then(function (loader) {
        loader.load(S.heroModel, function (gltf) {
          mountCar(prepare(gltf.scene, 4.4)); carReady = true; readyCb();
        }, undefined, function () { mountCar(buildCar()); carReady = true; readyCb(); });
      }).catch(function () { mountCar(buildCar()); carReady = true; readyCb(); });
    } else {
      mountCar(buildCar()); carReady = true;
    }
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
    if (!visible || document.hidden || mount.hidden) return;
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
    // in garage mode the pins are static bay buttons — leave them alone
    if (!garageMode) placeHotspots();
    renderer.render(scene, camera);
  }

  /* ---------- activate: swap the photo/2D hero for 3D --------------------- */
  var looping = false;
  function startLoop() { if (!looping) { looping = true; loop(); } }

  function show() {
    if (!garageMode && !carReady) return;
    stage.classList.add("stage--3d");
    mount.hidden = false;
    resize();
    startLoop();
  }
  function hide() {
    stage.classList.remove("stage--3d");
    mount.hidden = true;
  }

  if (garageMode) {
    // The bay's 3D scene: the canvas takes the stage immediately (no photo
    // underneath — the client only ever sees the car spinning); the model
    // mounts as soon as it's loaded, cached for instant returns.
    var currentUrl = null;
    var syncBay = function () {
      var room = window.__bayCurrent;
      var want = room && (room.model || room.spin3d);
      if (!want) { hide(); return; }
      show();
      if (room.model) {
        var url = room.model;
        if (currentUrl === url) return;
        loadBayModel(url).then(function (scene) {
          var now = window.__bayCurrent;
          if (!now || now.model !== url) return;   // walked on mid-load
          mountCar(prepare(scene.clone(true), room.modelLength));
          currentUrl = url;
          // gentle arrival under the lights
          if (window.gsap) {
            window.gsap.fromTo(spin.scale, { x: 0.88, y: 0.88, z: 0.88 },
              { x: 1, y: 1, z: 1, duration: 0.9, ease: "power3.out" });
          }
        }).catch(function () { if (currentUrl === null) hide(); }); // failed → photo returns
      } else if (currentUrl !== "procedural") {
        mountCar(buildCar());
        currentUrl = "procedural";
      }
    };
    window.HERO3D = { sync: syncBay, show: show, hide: hide };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", syncBay);
    else syncBay();
    document.addEventListener("bay:applied", syncBay);
    // warm the other bays' models once the page has settled
    setTimeout(function () {
      (S.bays || []).forEach(function (b) { if (b.model) loadBayModel(b.model); });
    }, 4000);
  } else {
    // legacy single-hero mode: take over the stage outright
    var activate = function () {
      if (!carReady) return;
      var flat = document.getElementById("stageCar");
      if (flat) flat.style.display = "none";
      var ped = stage.querySelector(".stage__pedestal");
      if (ped) ped.style.display = "none";
      mount.hidden = false;
      resize();
      startLoop();
    };
    readyCb = activate;
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", activate);
    else activate();
  }
})();
