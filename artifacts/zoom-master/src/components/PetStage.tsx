import { useLayoutEffect, useRef, useState } from "react";
import {
  Group, Box3, Vector3, Scene, PerspectiveCamera, WebGLRenderer, SRGBColorSpace, AmbientLight, DirectionalLight, Clock,
  Mesh, Object3D,
} from "../vendor/three-pet.js";
import type { PetId } from "../pet/catalog";
import { tapPet, type PetState } from "../pet/petProgress";
import { notePetTap } from "../pet/quests";
import { takeHomeCharClone, whenHomeCharReady } from "./HomeVoxelResident";

function fitScale(level: PetState["level"], stage: PetState["stage"]): number {
  const stageBoost = stage === 1 ? 0.9 : stage === 2 ? 1.05 : 1.2;
  const levelBoost = 1 + (level - 1) * 0.025;
  return stageBoost * levelBoost;
}

type Frame = "lab" | "collection";

function smoothStep(value: number): number {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
}

type Blink = { apply: (closed: number) => void; dispose: () => void };

/**
 * The black eye quads already in the model. The upper edge drops and the
 * lower edge rises, and the face skin on that seam follows so the eyes
 * close into a line instead of leaving a hole.
 */
function bindBlink(model: Object3D): Blink | null {
  let source: Mesh | null = null;
  model.traverse((obj) => {
    const mesh = obj as Mesh;
    if (mesh.isMesh && mesh.geometry?.attributes?.position) source = mesh;
  });
  if (!source) return null;
  const original = source.geometry;
  const geometry = original.clone();
  source.geometry = geometry;
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  const seams: { index: number; rest: number }[] = [];
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const u = uv ? uv.getX(i) : 1;
    const eyeOrSkin = u > 0.97 || u < 0.1;
    if (!eyeOrSkin || Math.abs(z - 0.25) > 0.001 || x < -0.201 || x > 0.201) continue;
    if (Math.abs(y - 0.9) < 0.001 || Math.abs(y - 0.7) < 0.001) seams.push({ index: i, rest: y });
  }
  if (seams.length < 8) {
    geometry.dispose();
    source.geometry = original;
    return null;
  }
  return {
    apply(closed: number) {
      const shut = Math.min(1, Math.max(0, closed));
      for (const seam of seams) {
        const target = seam.rest > 0.8 ? 0.732 : 0.708;
        position.setY(seam.index, seam.rest + (target - seam.rest) * shut);
      }
      position.needsUpdate = true;
    },
    dispose() {
      geometry.dispose();
    },
  };
}

/** Home and Collection use the same hooded character. */
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
  const [flash, setFlash] = useState<string | null>(null);
  const flashRef = useRef(setFlash);
  flashRef.current = setFlash;
  const petRef = useRef(pet);
  petRef.current = pet;

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new Scene();
    const camera = new PerspectiveCamera(32, 1, 0.1, 40);
    camera.position.set(0, frame === "lab" ? 0 : 0.55, 10);
    camera.lookAt(0, 0, 0);

    const renderer = new WebGLRenderer({ antialias: true, alpha: true });
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.touchAction = "none";
    host.appendChild(renderer.domElement);

    scene.add(new AmbientLight(0xfff6ea, 1.35));
    const key = new DirectionalLight(0xfff0d4, 2.4);
    key.position.set(3, 4, 5);
    scene.add(key);
    const fill = new DirectionalLight(0x9ec8ff, 0.7);
    fill.position.set(-3, 1.2, -2);
    scene.add(fill);

    const rig = new Group();
    scene.add(rig);

    let alive = true;
    let stopWait = () => { /**/ };
    let blink: Blink | null = null;
    const mountHomeChar = () => {
      if (!alive || rig.children.length > 0) return;
      const model = takeHomeCharClone();
      if (!model) return;
      model.updateMatrixWorld(true);
      const box = new Box3().setFromObject(model);
      const size = new Vector3();
      const center = new Vector3();
      box.getSize(size);
      box.getCenter(center);
      model.position.sub(center);
      const holder = new Group();
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      holder.scale.setScalar(2.6 / maxDim);
      holder.add(model);
      rig.add(holder);
      blink = bindBlink(model);
      renderer.render(scene, camera);
    };
    mountHomeChar();
    stopWait = whenHomeCharReady(mountHomeChar);

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

    let pressed = false;
    let lastTapAt = 0;
    let shake = 0;

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "touch" && e.isPrimary === false) return;
      pressed = true;
    };
    const onUp = (e: PointerEvent) => {
      if (!pressed) return;
      pressed = false;
      if (e.pointerType === "mouse" && Date.now() - lastTapAt < 700) return;
      lastTapAt = Date.now();
      const result = tapPet();
      if (result.reason === "ok") {
        notePetTap();
        shake = 1;
        flashRef.current(`+${result.xp} XP · ${result.count}/${result.max}`);
      } else if (result.reason === "wait") {
        flashRef.current("Wait 3 seconds");
      } else if (result.reason === "gate") {
        flashRef.current("Pay GRAM in Collection");
      } else {
        flashRef.current(`${result.max}/${result.max} Tap`);
      }
      window.setTimeout(() => flashRef.current(null), 1200);
    };
    const onCancel = () => { pressed = false; };
    host.addEventListener("pointerdown", onDown);
    host.addEventListener("pointerup", onUp);
    host.addEventListener("pointercancel", onCancel);

    let raf = 0;
    const clock = new Clock();
    let t = 0;
    let blinkAt = 0.7 + Math.random() * 1.1;
    let blinkStart = -1;
    const loop = () => {
      const dt = Math.min(clock.getDelta(), 0.05);
      t += dt;
      const { stage, level } = petRef.current;
      const fit = fitScale(level, stage);
      if (frame === "lab") {
        const view = 2 * Math.tan((32 * Math.PI) / 180 / 2) * 10;
        const grown = Math.min(1, Math.max(0, (fit - 0.86) / (1.12 * 1.34 - 0.86)));
        rig.scale.setScalar(((0.88 + grown * 0.06) * view) / 2.6);
      } else {
        rig.scale.setScalar(fit);
      }
      shake = shake > 0.02 ? shake * Math.exp(-dt * 14) : 0;
      const buzz = shake * Math.sin(t * 55);
      rig.position.x = buzz * 0.04;
      rig.position.y = Math.sin(t * 1.35) * (frame === "lab" ? 0.08 : 0.05);
      rig.rotation.set(0, 0, 0);
      if (blink) {
        const span = 0.28;
        let closed = 0;
        if (blinkStart < 0) {
          if (t >= blinkAt) blinkStart = t;
        } else {
          const p = (t - blinkStart) / span;
          if (p < 0.36) closed = smoothStep(p / 0.36);
          else if (p < 0.52) closed = 1;
          else if (p < 1) closed = 1 - smoothStep((p - 0.52) / 0.48);
          else {
            blinkStart = -1;
            blinkAt = t + 2 + Math.random() * 3;
          }
        }
        blink.apply(closed);
      }
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
      host.removeEventListener("pointerup", onUp);
      host.removeEventListener("pointercancel", onCancel);
      blink?.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
    };
  }, [frame, petId]);

  return (
    <div
      ref={hostRef}
      style={{ position: "absolute", inset: 0, touchAction: "none" }}
      aria-label="Pet. Tap for a little XP."
    >
      {flash && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "38%",
            transform: "translate(-50%, -50%)",
            color: "#ffffff",
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: "0.06em",
            textAlign: "center",
            width: "70%",
            textShadow: "0 2px 10px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,0.9)",
            pointerEvents: "none",
          }}
        >
          {flash}
        </div>
      )}
    </div>
  );
}
