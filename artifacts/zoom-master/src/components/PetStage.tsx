import { useLayoutEffect, useRef, useState } from "react";
import {
  Group, Box3, Vector3, Scene, PerspectiveCamera, WebGLRenderer, SRGBColorSpace, AmbientLight, DirectionalLight, Clock,
  Mesh, MeshStandardMaterial, Object3D,
} from "../vendor/three-pet.js";
import type { PetId } from "../pet/catalog";
import { tapPet, type PetState } from "../pet/petProgress";
import { notePetTap } from "../pet/quests";
import { takeCharClone, whenCharReady } from "./HomeVoxelResident";
import { translate, type Lang } from "../i18n/translations";

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
  dispose: () => void;
};

function ui(key: string, vars?: Record<string, string | number>): string {
  let lang: Lang = "en";
  try {
    const saved = localStorage.getItem("zoom-lang");
    if (saved === "it" || saved === "es" || saved === "fil" || saved === "ru" || saved === "uk") lang = saved;
  } catch { /**/ }
  return translate(lang, key, vars);
}

const TRICK: Record<PetId, { arc: number; spin: number }> = {
  dolphin: { arc: 0.42, spin: 0.55 },
  finch: { arc: 0.34, spin: 2.3 },
  lynx: { arc: 0.56, spin: 1.15 },
  stag: { arc: 0.64, spin: 1.65 },
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

function eyeRow(y: number): boolean {
  return Math.abs(y - 0.7) < 0.03 || Math.abs(y - 0.9) < 0.03;
}

/** The black eye corners, the same pair Aquin closes. Hair, hat and teeth are not eyes. */
function isEye(petId: PetId, color: [number, number, number], x: number, y: number, z: number): boolean {
  if (!eyeRow(y)) return false;
  if (petId === "finch") {
    const onEye = Math.abs(Math.abs(x) - 0.1) < 0.03 || Math.abs(Math.abs(x) - 0.2) < 0.03;
    return nearColor(color, [17, 17, 17], 6) && Math.abs(z - 0.25) < 0.03 && onEye;
  }
  if (petId === "lynx") {
    const onEye = Math.abs(Math.abs(x) - 0.1) < 0.03 || Math.abs(Math.abs(x) - 0.2) < 0.03;
    return nearColor(color, [34, 34, 34], 6) && Math.abs(z - 0.2) < 0.03 && onEye;
  }
  if (petId === "stag") {
    const onEye = Math.abs(x - 0.1) < 0.03 || Math.abs(x - 0.2) < 0.03 || Math.abs(x - 0.3) < 0.03;
    return nearColor(color, [34, 34, 34], 6) && Math.abs(z - 0.3) < 0.03 && onEye;
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
  } else if (petId === "finch") {
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const y = position.getY(i);
      const z = position.getZ(i);
      const u = uv ? uv.getX(i) : 0;
      // Same seam as Aquin: the black pupil and the skin lid. Not the green band, not the red scarf.
      const pupil = u > 0.97 || u < 0.1;
      if (!pupil || Math.abs(z - 0.25) > 0.001 || x < -0.201 || x > 0.201) continue;
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

  if (seams.length < 6) {
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
  const [boot, setBoot] = useState(0);
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

    const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.touchAction = frame === "shop" ? "pan-y" : "none";
    renderer.domElement.style.background = "transparent";
    host.appendChild(renderer.domElement);
    const onLost = (event: Event) => {
      event.preventDefault();
      window.setTimeout(() => setBoot((n) => n + 1), 250);
    };
    renderer.domElement.addEventListener("webglcontextlost", onLost);

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
      let faceSum = 0;
      let faceCount = 0;
      model.traverse((obj) => {
        const mesh = obj as Mesh;
        const position = mesh.isMesh ? mesh.geometry?.attributes?.position : null;
        if (!position) return;
        for (let i = 0; i < position.count; i++) {
          const x = position.getX(i);
          if (position.getZ(i) > 0.18 && Math.abs(x) < 0.35) {
            faceSum += x;
            faceCount += 1;
          }
        }
      });
      if (faceCount > 8) model.position.x -= faceSum / faceCount;
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
    let pointerX = 0;
    let moved = 0;
    let userYaw = 0;
    let trick: { t0: number; arc: number; slide: number; spinY: number; spinZ: number } | null = null;

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "touch" && e.isPrimary === false) return;
      pressed = true;
      pointerX = e.clientX;
      moved = 0;
    };
    const onMove = (e: PointerEvent) => {
      if (!pressed) return;
      const dx = e.clientX - pointerX;
      moved += Math.abs(dx);
      pointerX = e.clientX;
      if (moved > 8) userYaw += dx * 0.012;
    };
    const onUp = () => {
      if (!pressed) return;
      pressed = false;
      if (moved > 12 || frame === "shop") {
        if (moved > 12) {
          const kill = (ev: Event) => { ev.stopPropagation(); ev.preventDefault(); };
          host.addEventListener("click", kill, { capture: true, once: true });
        }
        return;
      }
      if (Date.now() - lastTapAt < 700) return;
      lastTapAt = Date.now();
      const who = TRICK[petId];
      const sign = Math.random() < 0.5 ? -1 : 1;
      trick = {
        t0: t,
        arc: who.arc * (0.8 + Math.random() * 0.45),
        slide: (Math.random() * 2 - 1) * (frame === "lab" ? 0.34 : 0.1),
        spinY: sign * who.spin * (0.65 + Math.random() * 0.7),
        spinZ: (Math.random() * 2 - 1) * (0.35 + who.spin * 0.12),
      };
      if (frame === "collection") {
        flashRef.current(ui("pet.added"));
        window.setTimeout(() => flashRef.current(null), 1200);
        return;
      }
      const result = tapPet();
      if (result.reason === "ok") {
        notePetTap();
        flashRef.current(ui("pet.xpFlash", { xp: result.xp, n: result.count, max: result.max }));
      } else if (result.reason === "wait") {
        flashRef.current(ui("pet.wait"));
      } else if (result.reason === "gate") {
        flashRef.current(ui("pet.payGram"));
      } else {
        flashRef.current(ui("pet.tapFull", { max: result.max }));
      }
      window.setTimeout(() => flashRef.current(null), 1200);
    };
    const onCancel = () => { pressed = false; };
    host.addEventListener("pointerdown", onDown);
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerup", onUp);
    host.addEventListener("pointercancel", onCancel);

    let helloAt = -1;
    const onHello = () => { helloAt = t; };
    window.addEventListener("zoom-pet-hello", onHello);

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
      if (frame === "shop") {
        rig.scale.setScalar(1.55);
        rig.position.set(Math.sin(t * 0.65) * 0.012, Math.sin(t * 1.05) * 0.018, 0);
        rig.rotation.set(Math.sin(t * 0.45) * 0.01, userYaw + Math.sin(t * 0.35) * 0.028, Math.sin(t * 0.7) * 0.01);
      } else if (frame === "lab") {
        const view = 2 * Math.tan((32 * Math.PI) / 180 / 2) * 10;
        const grown = Math.min(1, Math.max(0, (fit - 0.86) / (1.12 * 1.34 - 0.86)));
        rig.scale.setScalar(((0.68 + grown * 0.04) * view) / 2.6);
      } else {
        rig.scale.setScalar(fit);
      }
      if (frame !== "shop") {
        if (trick) {
          const p = (t - trick.t0) / 3;
          if (p >= 1) {
            trick = null;
            rig.position.set(0, 0, 0);
            rig.rotation.set(0, userYaw, 0);
          } else {
            const air = 1 - smoothStep(Math.max(0, (p - 0.78) / 0.22));
            const hop = Math.sin(Math.min(p / 0.78, 1) * Math.PI);
            const capY = frame === "lab" ? 0.62 : 0.16;
            const capX = frame === "lab" ? 0.38 : 0.1;
            const x = Math.max(-capX, Math.min(capX, trick.slide * Math.sin(p * Math.PI) * air));
            rig.position.set(x, Math.min(capY, trick.arc * hop), 0);
            rig.rotation.set(
              trick.spinZ * Math.sin(p * Math.PI) * air * 0.4,
              userYaw + trick.spinY * Math.sin(p * Math.PI) * air,
              trick.spinZ * 0.3 * Math.sin(p * Math.PI * 2) * air,
            );
          }
        } else if (frame === "lab") {
          rig.position.set(Math.sin(t * 0.7) * 0.015, Math.sin(t * 1.15) * 0.028, 0);
          rig.rotation.set(Math.sin(t * 0.5) * 0.012, userYaw + Math.sin(t * 0.45) * 0.045, Math.sin(t * 0.8) * 0.018);
        } else {
          rig.position.set(0, 0, 0);
          rig.rotation.set(0, userYaw, 0);
        }
      }
      if (helloAt >= 0 && frame === "lab") {
        const hop = (t - helloAt) / 0.55;
        if (hop >= 1) helloAt = -1;
        else {
          rig.position.y += Math.sin(hop * Math.PI) * 0.14;
          rig.rotation.z += Math.sin(hop * Math.PI) * 0.05;
        }
      }
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
      window.removeEventListener("zoom-pet-hello", onHello);
      host.removeEventListener("pointerdown", onDown);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerup", onUp);
      host.removeEventListener("pointercancel", onCancel);
      renderer.domElement.removeEventListener("webglcontextlost", onLost);
      blink?.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
    };
  }, [frame, petId, boot]);

  return (
    <div
      ref={hostRef}
      style={{
        position: "absolute",
        inset: 0,
        touchAction: frame === "shop" ? "pan-y" : "none",
        pointerEvents: "auto",
        background: "transparent",
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
