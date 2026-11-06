import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import type { PetId } from "../pet/catalog";
import type { PetState } from "../pet/petProgress";
import { takePetClone, whenPetModelReady } from "../pet/petModel";

function fitScale(level: PetState["level"], stage: PetState["stage"]): number {
  const stageBoost = stage === 1 ? 0.86 : stage === 2 ? 1 : 1.12;
  const levelBoost = level === 1 ? 1 : level === 5 ? 1.18 : 1.34;
  return stageBoost * levelBoost;
}

type Frame = "lab" | "collection";
type View = { x: number; y: number; s: number };

const VIEW_KEY = "biscotto-pet-view";
const LIMIT = { x: 2.2, y: 1.5, min: 0.45, max: 2.8 };

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function loadView(frame: Frame): View {
  try {
    const all = JSON.parse(localStorage.getItem(VIEW_KEY) || "{}") as Record<string, Partial<View>>;
    const v = all[frame] ?? {};
    return {
      x: clamp(Number(v.x) || 0, -LIMIT.x, LIMIT.x),
      y: clamp(Number(v.y) || 0, -LIMIT.y, LIMIT.y),
      s: clamp(Number(v.s) || 1, LIMIT.min, LIMIT.max),
    };
  } catch {
    return { x: 0, y: 0, s: 1 };
  }
}

function saveView(frame: Frame, view: View) {
  try {
    const all = JSON.parse(localStorage.getItem(VIEW_KEY) || "{}") as Record<string, View>;
    all[frame] = view;
    localStorage.setItem(VIEW_KEY, JSON.stringify(all));
  } catch { /**/ }
}

function standIn(id: PetId): THREE.Group {
  const color = id === "finch" ? 0xe7a56a : id === "lynx" ? 0xc47a2e : 0xf3e2c2;
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.48 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a1810, roughness: 0.4 });
  const group = new THREE.Group();
  const add = (mesh: THREE.Mesh) => {
    group.add(mesh);
    return mesh;
  };
  if (id === "finch") {
    add(new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 14), mat)).scale.set(1.15, 0.85, 0.9);
    const head = add(new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 12), mat));
    head.position.set(0.48, 0.22, 0);
    const beak = add(new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.28, 8), dark));
    beak.rotation.z = -Math.PI / 2;
    beak.position.set(0.78, 0.2, 0);
    const wing = add(new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), mat));
    wing.scale.set(0.4, 1, 1.3);
    wing.position.set(0.05, 0.05, 0.28);
  } else if (id === "lynx") {
    const body = add(new THREE.Mesh(new THREE.SphereGeometry(0.48, 18, 14), mat));
    body.scale.set(1.45, 0.72, 0.78);
    const head = add(new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), mat));
    head.position.set(0.62, 0.28, 0);
    const earL = add(new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 6), mat));
    earL.position.set(0.52, 0.58, 0.12);
    const earR = earL.clone();
    earR.position.z = -0.12;
    group.add(earR);
    const tail = add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.55, 8), mat));
    tail.rotation.z = Math.PI / 3;
    tail.position.set(-0.7, 0.28, 0);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), dark)).position.set(0.78, 0.34, 0.1);
  } else {
    const body = add(new THREE.Mesh(new THREE.SphereGeometry(0.5, 18, 14), mat));
    body.scale.set(1.5, 0.75, 0.7);
    const neck = add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.45, 8), mat));
    neck.position.set(0.55, 0.42, 0);
    neck.rotation.z = -0.5;
    const head = add(new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), mat));
    head.position.set(0.78, 0.62, 0);
    const antler = add(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.42, 6), dark));
    antler.position.set(0.7, 0.95, 0.08);
    antler.rotation.z = 0.3;
    const antler2 = antler.clone();
    antler2.position.z = -0.08;
    antler2.rotation.z = -0.3;
    group.add(antler2);
  }
  group.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(group);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  group.position.sub(center);
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const pivot = new THREE.Group();
  pivot.scale.setScalar(2.4 / maxDim);
  pivot.add(group);
  return pivot;
}

/** Dolphin uses the voxel model. Bought pets use an original shape until their GLB arrives. */
export function PetStage({
  pet,
  frame,
  petId = "dolphin",
}: {
  pet: PetState;
  frame: Frame;
  petId?: PetId;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const petRef = useRef(pet);
  petRef.current = pet;

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
    camera.position.set(0, 0.55, 10);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.touchAction = "none";
    host.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xfff6ea, 1.35));
    const key = new THREE.DirectionalLight(0xfff0d4, 2.4);
    key.position.set(3, 4, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x9ec8ff, 0.7);
    fill.position.set(-3, 1.2, -2);
    scene.add(fill);

    const rig = new THREE.Group();
    scene.add(rig);
    const view = loadView(frame);

    let alive = true;
    let stopWait = () => { /**/ };
    if (petId === "dolphin") {
      const mount = () => {
        if (!alive || rig.children.length > 0) return;
        const model = takePetClone();
        if (!model) return;
        rig.add(model);
        renderer.render(scene, camera);
      };
      mount();
      stopWait = whenPetModelReady(mount);
    } else {
      rig.add(standIn(petId));
    }

    const resize = () => {
      const w = host.clientWidth || 1;
      const h = host.clientHeight || 1;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    const pointers = new Map<number, { x: number; y: number }>();
    let dragLast: { x: number; y: number } | null = null;
    let pinchDist = 0;

    const worldPerPixel = () => {
      const h = host.clientHeight || 1;
      const worldH = 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
      return worldH / h;
    };
    const pinchDistance = () => {
      const pts = [...pointers.values()];
      if (pts.length < 2) return 0;
      return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    };

    const onDown = (e: PointerEvent) => {
      try { host.setPointerCapture(e.pointerId); } catch { /**/ }
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) dragLast = { x: e.clientX, y: e.clientY };
      if (pointers.size >= 2) pinchDist = pinchDistance();
    };
    const onMove = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1 && dragLast) {
        const k = worldPerPixel();
        view.x = clamp(view.x + (e.clientX - dragLast.x) * k, -LIMIT.x, LIMIT.x);
        view.y = clamp(view.y - (e.clientY - dragLast.y) * k, -LIMIT.y, LIMIT.y);
        dragLast = { x: e.clientX, y: e.clientY };
      } else if (pointers.size >= 2) {
        const dist = pinchDistance();
        if (pinchDist > 0 && dist > 0) {
          view.s = clamp(view.s * (dist / pinchDist), LIMIT.min, LIMIT.max);
          pinchDist = dist;
        }
      }
    };
    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size === 0) dragLast = null;
      if (pointers.size < 2) pinchDist = 0;
      if (pointers.size === 1) {
        const only = [...pointers.values()][0];
        dragLast = { x: only.x, y: only.y };
      }
      saveView(frame, view);
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      view.s = clamp(view.s * Math.exp(-e.deltaY * 0.0012), LIMIT.min, LIMIT.max);
      saveView(frame, view);
    };
    host.addEventListener("pointerdown", onDown);
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerup", onUp);
    host.addEventListener("pointercancel", onUp);
    host.addEventListener("wheel", onWheel, { passive: false });

    let raf = 0;
    const clock = new THREE.Clock();
    let t = 0;
    const loop = () => {
      const dt = Math.min(clock.getDelta(), 0.05);
      t += dt;
      const { stage, level } = petRef.current;
      rig.scale.setScalar(fitScale(level, stage) * view.s);
      rig.position.x = view.x + Math.sin(t * 0.55) * 0.12;
      rig.position.y = view.y + Math.sin(t * 1.35) * 0.16;
      rig.rotation.y = Math.sin(t * 0.65) * 0.28;
      rig.rotation.z = Math.sin(t * 1.2) * 0.06;
      rig.rotation.x = Math.sin(t * 1.5) * 0.06;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      alive = false;
      stopWait();
      cancelAnimationFrame(raf);
      observer.disconnect();
      host.removeEventListener("pointerdown", onDown);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerup", onUp);
      host.removeEventListener("pointercancel", onUp);
      host.removeEventListener("wheel", onWheel);
      renderer.dispose();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
    };
  }, [frame, petId]);

  return (
    <div
      ref={hostRef}
      style={{ position: "absolute", inset: 0, touchAction: "none" }}
      aria-label="Dolphin. Drag to move, pinch or scroll to resize."
    />
  );
}
