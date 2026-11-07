import { useLayoutEffect, useRef, useState } from "react";
import {
  Group, Box3, Vector3, Scene, PerspectiveCamera, WebGLRenderer, SRGBColorSpace, AmbientLight, DirectionalLight, Clock,
  Mesh, MeshStandardMaterial, Object3D,
} from "../vendor/three-pet.js";
import type { PetId } from "../pet/catalog";
import { tapPet, type PetState } from "../pet/petProgress";
import { notePetTap } from "../pet/quests";
import { takeCharClone, whenCharReady } from "./HomeVoxelResident";

function fitScale(level: PetState["level"], stage: PetState["stage"]): number {
  const stageBoost = stage === 1 ? 0.9 : stage === 2 ? 1.05 : 1.2;
  const levelBoost = 1 + (level - 1) * 0.025;
  return stageBoost * levelBoost;
}

type Frame = "lab" | "collection" | "shop";

function smoothStep(value: number): number {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
}

type Blink = {
  apply: (closed: number) => void;
  pose: (t: number, wave: number) => void;
  dispose: () => void;
};

function paletteOf(mesh: Mesh): { data: Uint8ClampedArray; width: number } | null {
  const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as MeshStandardMaterial;
  const image = mat?.map?.image as CanvasImageSource | undefined;
  const width = image && "width" in image ? Number(image.width) : 0;
  const height = image && "height" in image ? Number(image.height) : 0;
  if (!image || !width || !height) return null;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, 0, 0);
  return { data: ctx.getImageData(0, 0, width, height).data, width };
}

function samplePalette(palette: { data: Uint8ClampedArray; width: number }, u: number): [number, number, number] {
  const x = Math.min(palette.width - 1, Math.max(0, Math.floor(u * palette.width)));
  const i = x * 4;
  return [palette.data[i], palette.data[i + 1], palette.data[i + 2]];
}

function nearColor(color: [number, number, number], target: [number, number, number], slack = 14): boolean {
  return Math.abs(color[0] - target[0]) <= slack
    && Math.abs(color[1] - target[1]) <= slack
    && Math.abs(color[2] - target[2]) <= slack;
}

/** The black eye voxels. Emberin's green band and Cervolt's hat are not eyes. */
function isEye(petId: PetId, color: [number, number, number], x: number, y: number, z: number): boolean {
  if (petId === "finch") {
    return nearColor(color, [17, 17, 17], 8) && z > 0.2 && y > 0.65 && y < 0.95 && x > -0.25 && x < 0.25;
  }
  if (petId === "lynx") return nearColor(color, [221, 221, 221], 20) && z > 0.35 && y > 0.7 && y < 1.05;
  if (petId === "stag") {
    const dark = color[0] < 90 && color[1] < 90 && color[2] < 90;
    return dark && z > 0.22 && z < 0.38 && y > 0.84 && y < 1.06 && x > -0.2 && x < 0.42;
  }
  return false;
}

/**
 * Close the eyes into a line. The hood keeps its skin seams so the face
 * does not open a hole. The other three pinch their own eye voxels.
 */
function bindBlink(model: Object3D, petId: PetId): Blink | null {
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
  const seams: { index: number; rest: number; shut: number }[] = [];

  if (petId === "dolphin") {
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const y = position.getY(i);
      const z = position.getZ(i);
      const u = uv ? uv.getX(i) : 1;
      const eyeOrSkin = u > 0.97 || u < 0.1;
      if (!eyeOrSkin || Math.abs(z - 0.25) > 0.001 || x < -0.201 || x > 0.201) continue;
      if (Math.abs(y - 0.9) < 0.001 || Math.abs(y - 0.7) < 0.001) {
        seams.push({ index: i, rest: y, shut: y > 0.8 ? 0.732 : 0.708 });
      }
    }
  } else {
    const palette = paletteOf(source);
    if (palette) {
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const y = position.getY(i);
        const z = position.getZ(i);
        const u = uv ? uv.getX(i) : 0;
        if (!isEye(petId, samplePalette(palette, u), x, y, z)) continue;
        seams.push({ index: i, rest: y, shut: y });
      }
      if (seams.length >= 6) {
        const groups = [
          seams.filter((seam) => position.getX(seam.index) < 0),
          seams.filter((seam) => position.getX(seam.index) >= 0),
        ];
        for (const group of groups) {
          if (group.length < 2) continue;
          const mid = group.reduce((sum, seam) => sum + seam.rest, 0) / group.length;
          for (const seam of group) seam.shut = seam.rest + (mid - seam.rest) * 0.92;
        }
      }
    }
  }

  const arms: { index: number; x: number; y: number; side: number }[] = [];
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    // Outer hands only. Head, hood, and the red bandana sit higher and must stay.
    if (Math.abs(x) < 0.48 || y < 0.35 || y > 0.62) continue;
    arms.push({ index: i, x, y, side: x >= 0 ? 1 : -1 });
  }

  if (seams.length < 6 && arms.length < 4) {
    geometry.dispose();
    source.geometry = original;
    return null;
  }
  return {
    apply(closed: number) {
      const shut = Math.min(1, Math.max(0, closed));
      for (const seam of seams) {
        position.setY(seam.index, seam.rest + (seam.shut - seam.rest) * shut);
      }
      position.needsUpdate = true;
    },
    pose(t: number, wave: number) {
      const still = wave < 0;
      const sway = still ? 0 : Math.sin(t * 1.35) * 0.18;
      for (const arm of arms) {
        const pivotX = arm.side * 0.32;
        const pivotY = 0.62;
        const dx = arm.x - pivotX;
        const dy = arm.y - pivotY;
        const current = Math.atan2(dy, dx);
        const down = arm.side > 0 ? -1.35 : -Math.PI + 1.35;
        let delta = down - current;
        if (delta > Math.PI) delta -= Math.PI * 2;
        if (delta < -Math.PI) delta += Math.PI * 2;
        let angle = delta * 0.82 + sway;
        if (!still && wave > 0 && arm.side > 0) angle += wave * 1.35;
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        position.setX(arm.index, pivotX + dx * c - dy * s);
        position.setY(arm.index, pivotY + dx * s + dy * c);
      }
      if (arms.length) position.needsUpdate = true;
    },
    dispose() {
      geometry.dispose();
    },
  };
}

/** Home and Collection show the character for this pet. Aquin stays the white hood. */
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
      const model = takeCharClone(petId);
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
      blink = bindBlink(model, petId);
      renderer.render(scene, camera);
    };
    mountHomeChar();
    stopWait = whenCharReady(petId, mountHomeChar);

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
      if (frame === "collection") {
        flashRef.current("Added to Home");
        window.setTimeout(() => flashRef.current(null), 1200);
        return;
      }
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
    if (frame !== "shop") {
      host.addEventListener("pointerdown", onDown);
      host.addEventListener("pointerup", onUp);
      host.addEventListener("pointercancel", onCancel);
    }

    let raf = 0;
    const clock = new Clock();
    let t = 0;
    let blinkAt = 0.7 + Math.random() * 1.1;
    let blinkStart = -1;
    let waveAt = 2.5 + Math.random() * 3;
    let waveStart = -1;
    let hopAt = 4 + Math.random() * 4;
    const loop = () => {
      const dt = Math.min(clock.getDelta(), 0.05);
      t += dt;
      const { stage, level } = petRef.current;
      const fit = fitScale(level, stage);
      if (frame === "shop") {
        rig.scale.setScalar(1.55);
        rig.position.set(0, 0, 0);
      } else if (frame === "lab") {
        const view = 2 * Math.tan((32 * Math.PI) / 180 / 2) * 10;
        const grown = Math.min(1, Math.max(0, (fit - 0.86) / (1.12 * 1.34 - 0.86)));
        rig.scale.setScalar(((0.68 + grown * 0.04) * view) / 2.6);
      } else {
        rig.scale.setScalar(fit);
      }
      shake = frame === "shop" || shake <= 0.02 ? 0 : shake * Math.exp(-dt * 14);
      const buzz = shake * Math.sin(t * 55);
      let wave = frame === "shop" ? -1 : 0;
      let hopY = 0;
      if (frame !== "shop") {
        if (waveStart < 0) {
          if (t >= waveAt) waveStart = t;
        } else {
          const p = (t - waveStart) / 0.9;
          if (p < 1) wave = Math.sin(Math.min(1, p) * Math.PI);
          else {
            waveStart = -1;
            waveAt = t + 4 + Math.random() * 5;
          }
        }
        if (t >= hopAt) {
          const p = (t - hopAt) / 0.42;
          if (p < 1) hopY = Math.sin(p * Math.PI) * (frame === "lab" ? 0.16 : 0.08);
          else hopAt = t + 5 + Math.random() * 6;
        }
        rig.position.x = buzz * 0.04;
        rig.position.y = Math.sin(t * 1.15) * (frame === "lab" ? 0.04 : 0.03) + hopY;
      }
      rig.rotation.set(0, 0, 0);
      if (blink) blink.pose(t, wave);
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
      if (frame !== "shop") {
        host.removeEventListener("pointerdown", onDown);
        host.removeEventListener("pointerup", onUp);
        host.removeEventListener("pointercancel", onCancel);
      }
      blink?.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
    };
  }, [frame, petId]);

  return (
    <div
      ref={hostRef}
      style={{
        position: "absolute",
        inset: 0,
        touchAction: frame === "shop" ? "pan-y" : "none",
        pointerEvents: frame === "shop" ? "none" : "auto",
      }}
      aria-label={frame === "shop" ? "Pet" : "Pet. Tap for a little XP."}
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
