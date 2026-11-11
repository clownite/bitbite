import { useLayoutEffect, useRef, useState } from "react";
import {
  Group, Box3, Vector3, Scene, PerspectiveCamera, WebGLRenderer, SRGBColorSpace, AmbientLight, DirectionalLight, Clock,
  Mesh, MeshStandardMaterial, Object3D,
} from "../vendor/three-pet.js";
import type { PetId } from "../pet/catalog";
import { tapPet, type PetState } from "../pet/petProgress";
import { notePetTap } from "../pet/quests";
import { PLAY_BASE_Y } from "../pet/cookieGame";
import { playPose } from "../pet/playPose";
import { takeCharClone, whenCharReady } from "./HomeVoxelResident";
import { translate, type Lang } from "../i18n/translations";

function fitScale(level: PetState["level"], stage: PetState["stage"]): number {
  const stageBoost = stage === 1 ? 0.9 : stage === 2 ? 1.05 : 1.2;
  const levelBoost = 1 + (level - 1) * 0.025;
  return stageBoost * levelBoost;
}

type Frame = "lab" | "collection" | "shop" | "play" | "duel";

type PoseName = "rest" | "lookL" | "lookR" | "hop" | "pace" | "sit" | "eat";

const WANDER: PoseName[] = ["pace", "pace", "lookL", "pace", "lookR", "rest", "hop"];

function poseEase(p: number): number {
  const inn = smoothStep(Math.min(1, p / 0.2));
  const out = 1 - smoothStep(Math.max(0, (p - 0.75) / 0.25));
  return inn * out;
}

/** One short pose, then back onto the card floor. Nothing leaves the frame. */
function poseAt(name: PoseName, p: number, t: number, lift: number, yaw: number, amp: number) {
  const e = name === "rest" ? 1 : poseEase(Math.min(1, p));
  const bob = Math.sin(t * 1.15) * 0.018;
  const turn = 0.28 + 0.62 * amp;
  if (name === "lookL" || name === "lookR") {
    return { x: 0, y: lift + bob * 0.6, rx: 0, ry: yaw + (name === "lookL" ? -turn : turn) * e, rz: 0 };
  }
  if (name === "hop") {
    return { x: 0, y: lift + Math.sin(Math.min(p, 1) * Math.PI) * (0.14 + 0.22 * amp), rx: 0, ry: yaw, rz: 0 };
  }
  if (name === "sit") {
    return { x: 0, y: lift - 0.08 * e, rx: 0.26 * e, ry: yaw, rz: -0.045 * e };
  }
  if (name === "eat") {
    return {
      x: Math.max(-0.34, -0.2 * e),
      y: lift + Math.sin(p * Math.PI * 4) * 0.04 * e,
      rx: 0.34 * e,
      ry: yaw - 0.18 * e,
      rz: 0,
    };
  }
  return {
    x: 0,
    y: lift + bob * 0.35,
    rx: 0,
    ry: yaw + Math.sin(t * (0.7 + amp)) * (0.03 + amp * 0.07),
    rz: 0,
  };
}

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

type PupilCorner = { x: number; y: number; z: number };

/**
 * The black pupils are a front face with the head hollow behind them.
 * A skin patch sits just behind each pupil, so closing the black quad
 * shows skin instead of the red bandana. The bandana vertices never move.
 */
function lidsBehindPupils(mesh: Mesh, pupils: PupilCorner[], skinU: number, skinV: number): Mesh | null {
  if (pupils.length !== 8) return null;
  const geometry = mesh.geometry;
  const position = geometry.attributes.position;
  const Geom = geometry.constructor as new () => typeof geometry;
  const Attr = position.constructor as new (array: Float32Array, itemSize: number) => typeof position;
  const lidGeom = new Geom();
  const pos = new Float32Array(8 * 3);
  const uv = new Float32Array(8 * 2);
  const normal = new Float32Array(8 * 3);
  const indexOf = new Map<string, number>();
  pupils.forEach((corner, n) => {
    pos[n * 3] = corner.x;
    pos[n * 3 + 1] = corner.y;
    pos[n * 3 + 2] = corner.z - 0.004;
    uv[n * 2] = skinU;
    uv[n * 2 + 1] = skinV;
    normal[n * 3 + 2] = 1;
    const side = corner.x < 0 ? "L" : "R";
    const row = corner.y > 0.8 ? "T" : "B";
    const col = Math.abs(corner.x) > 0.15 ? "O" : "I";
    indexOf.set(`${side}${row}${col}`, n);
  });
  const at = (key: string) => indexOf.get(key);
  // Same winding as the pupil quads, so the skin faces the camera.
  const tris = [
    at("LBI"), at("LTO"), at("LBO"), at("LTI"), at("LTO"), at("LBI"),
    at("RBO"), at("RTI"), at("RBI"), at("RTO"), at("RTI"), at("RBO"),
  ];
  if (tris.some((n) => n == null)) return null;
  lidGeom.setAttribute("position", new Attr(pos, 3));
  lidGeom.setAttribute("uv", new Attr(uv, 2));
  lidGeom.setAttribute("normal", new Attr(normal, 3));
  lidGeom.setIndex(tris as number[]);
  const lid = new Mesh(lidGeom, mesh.material);
  mesh.add(lid);
  return lid;
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
  let pupilLid: Mesh | null = null;

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
    const pupils: PupilCorner[] = [];
    let skinU = 0.033;
    let skinV = 0.5;
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const y = position.getY(i);
      const z = position.getZ(i);
      const u = uv ? uv.getX(i) : 0;
      if (uv && u < 0.05) {
        skinU = u;
        skinV = uv.getY(i);
      }
      // Only the two black pupil quads. Not the skin, not the green band, not the red bandana.
      if (u < 0.97 || Math.abs(z - 0.25) > 0.001 || x < -0.201 || x > 0.201) continue;
      if (Math.abs(y - 0.9) < 0.001 || Math.abs(y - 0.7) < 0.001) {
        pupils.push({ x, y, z });
        seams.push({ index: i, rest: y, shut: y > 0.8 ? 0.816 : 0.784 });
      }
    }
    pupilLid = lidsBehindPupils(source, pupils, skinU, skinV);
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
      pupilLid?.geometry.dispose();
      geometry.dispose();
    },
  };
}

/** Home and Collection show the character for this pet. Aquin stays the white hood. */
export function PetStage({
  pet,
  frame,
  petId = "dolphin",
  side = "left",
  room,
}: {
  pet: PetState;
  frame: Frame;
  petId?: PetId;
  side?: "left" | "right";
  room?: { asleep: boolean; dark: boolean; sick?: boolean; calling?: boolean; hungry?: boolean };
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const moodRef = useRef(room);
  moodRef.current = room;
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
    if (frame === "play" || frame === "duel") {
      camera.position.set(0, frame === "duel" ? 0.15 : -0.15, frame === "duel" ? 7.6 : 10);
      camera.lookAt(0, frame === "duel" ? -0.05 : -0.62, 0);
    } else {
      camera.position.set(0, frame === "lab" ? 0 : 0.55, 10);
      camera.lookAt(0, 0, 0);
    }

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

    const ambient = new AmbientLight(0xfff6ea, 1.35);
    scene.add(ambient);
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

    let sizedW = 0;
    let sizedH = 0;
    const resize = () => {
      const w = host.clientWidth || 1;
      const h = host.clientHeight || 1;
      if (w === sizedW && h === sizedH) return;
      sizedW = w;
      sizedH = h;
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
      if (frame === "play" || frame === "duel") return;
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
        slide: frame === "lab" ? 0 : (Math.random() * 2 - 1) * 0.1,
        spinY: frame === "lab" ? 0 : sign * who.spin * (0.65 + Math.random() * 0.7),
        spinZ: frame === "lab" ? 0 : (Math.random() * 2 - 1) * (0.35 + who.spin * 0.12),
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
    let eatUntil = -1;
    const onEat = () => { eatUntil = t + 1.25; };
    window.addEventListener("zoom-pet-eat", onEat);
    let brightUntil = -1;
    const onCared = () => { brightUntil = t + 16; };
    window.addEventListener("zoom-pet-cared", onCared);
    let poseName: PoseName = "pace";
    let poseDur = 2.8;
    let poseAmp = 0.7;
    let poseT0 = 0;

    let paceX = 0;
    let paceDir = 1;
    let raf = 0;
    let onScreen = true;
    const seeing = new IntersectionObserver((entries) => {
      onScreen = entries.some((entry) => entry.isIntersecting);
    });
    seeing.observe(host);
    const clock = new Clock();
    let t = 0;
    let blinkAt = 0.7 + Math.random() * 1.1;
    let blinkStart = -1;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (!onScreen || document.hidden || host.getClientRects().length === 0) {
        clock.getDelta();
        return;
      }
      const dt = Math.min(clock.getDelta(), 0.05);
      t += dt;
      const { stage, level } = petRef.current;
      const fit = fitScale(level, stage);
      if (frame === "shop") {
        rig.scale.setScalar(1.55);
        rig.position.set(Math.sin(t * 0.65) * 0.012, Math.sin(t * 1.05) * 0.018, 0);
        rig.rotation.set(Math.sin(t * 0.45) * 0.01, userYaw + t * 0.28, Math.sin(t * 0.7) * 0.01);
      } else if (frame === "lab" || frame === "play" || frame === "duel") {
        const view = 2 * Math.tan((32 * Math.PI) / 180 / 2) * 10;
        const grown = Math.min(1, Math.max(0, (fit - 0.86) / (1.12 * 1.34 - 0.86)));
        const small = frame === "duel" ? 0.52 : frame === "play" ? 0.32 : 0.38;
        rig.scale.setScalar(((small + grown * 0.03) * view) / 2.6);
        key.intensity = frame === "lab" && moodRef.current?.dark ? 0.18 : 2.4;
        ambient.intensity = frame === "lab" && moodRef.current?.dark ? 0.22 : 1.35;
      } else {
        rig.scale.setScalar(fit);
      }
      const homeLift = frame === "lab" ? -1.08 : 0;
      if (frame === "play") {
        rig.position.set(playPose.x, PLAY_BASE_Y + playPose.y, 0);
        rig.rotation.set(0, playPose.face * 0.28, 0);
        host.dataset.pose = "play";
      } else if (frame === "duel") {
        const dir = side === "right" ? -1 : 1;
        rig.position.set(0, -0.15 + Math.sin(t * 2.1) * 0.02, 0);
        rig.rotation.set(0, dir * 0.62, 0);
        host.dataset.pose = "duel";
      } else if (frame !== "shop") {
        if (trick) {
          const p = (t - trick.t0) / 3;
          if (frame === "lab") poseT0 += dt;
          if (p >= 1) {
            trick = null;
            rig.position.set(0, homeLift, 0);
            rig.rotation.set(0, userYaw, 0);
          } else {
            const air = 1 - smoothStep(Math.max(0, (p - 0.78) / 0.22));
            const hop = Math.sin(Math.min(p / 0.78, 1) * Math.PI);
            const capY = frame === "lab" ? 0.62 : 0.16;
            const capX = frame === "lab" ? 0.38 : 0.1;
            const x = Math.max(-capX, Math.min(capX, trick.slide * Math.sin(p * Math.PI) * air));
            rig.position.set(x, homeLift + Math.min(capY, trick.arc * hop), 0);
            rig.rotation.set(
              trick.spinZ * Math.sin(p * Math.PI) * air * 0.4,
              userYaw + trick.spinY * Math.sin(p * Math.PI) * air,
              trick.spinZ * 0.3 * Math.sin(p * Math.PI * 2) * air,
            );
          }
        } else if (frame === "lab") {
          const mood = moodRef.current;
          let pose: PoseName = "rest";
          let p = 0;
          if (mood?.dark) {
            pose = "rest";
            host.dataset.pose = "sleep";
          } else if (t < eatUntil) {
            pose = "eat";
            p = (t - (eatUntil - 1.25)) / 1.25;
            host.dataset.pose = "eat";
          } else {
            const bright = t < brightUntil;
            const bag = mood?.sick
              ? (["rest", "lookL", "lookR", "rest"] as PoseName[])
              : mood?.hungry && !bright
                ? (["pace", "lookL", "lookR", "rest"] as PoseName[])
                : bright
                  ? (["pace", "hop", "lookL", "pace", "rest"] as PoseName[])
                  : WANDER;
            if (t - poseT0 >= poseDur) {
              let next = bag[Math.floor(Math.random() * bag.length)];
              if (next === poseName) next = bag[(bag.indexOf(next) + 3) % bag.length];
              poseName = next;
              poseAmp = 0.4 + Math.random() * 0.6;
              poseDur = next === "hop"
                ? 0.5 + Math.random() * 0.4
                : next === "pace"
                  ? 2.2 + Math.random() * 1.4
                  : next === "rest"
                    ? 0.8 + Math.random() * 1.1
                    : 0.6 + Math.random() * 0.8;
              poseT0 = t;
            }
            pose = poseName;
            p = poseDur <= 0 ? 0 : (t - poseT0) / poseDur;
            host.dataset.pose = pose;
          }
          const at = mood?.dark
            ? { x: 0, y: homeLift, rx: 0, ry: 0, rz: 0 }
            : poseAt(pose, p, t, homeLift, 0, poseAmp);
          rig.position.set(Math.max(-0.38, Math.min(0.38, at.x)), at.y, 0);
          rig.rotation.set(at.rx, at.ry, at.rz);
        } else {
          rig.position.set(0, 0, 0);
          rig.rotation.set(0, userYaw, 0);
        }
      }
      if (helloAt >= 0 && frame === "lab" && t >= eatUntil) {
        const hop = (t - helloAt) / 0.55;
        if (hop >= 1) helloAt = -1;
        else {
          rig.position.y += Math.sin(hop * Math.PI) * 0.14;
          rig.rotation.z += Math.sin(hop * Math.PI) * 0.05;
        }
      }
      if (frame === "lab" && moodRef.current?.dark) {
        blink?.apply(1);
      } else if (blink) {
        const mood = moodRef.current;
        const bright = t < brightUntil;
        const sick = frame === "lab" && mood?.sick && !bright;
        const hungry = frame === "lab" && mood?.hungry && !sick && !bright;
        const span = sick ? 0.9 : hungry ? 0.46 : bright ? 0.18 : 0.28;
        const base = sick ? 0.62 : hungry ? 0.36 : 0;
        let closed = base;
        if (blinkStart < 0) {
          if (t >= blinkAt) blinkStart = t;
        } else {
          const p = (t - blinkStart) / span;
          if (p < 0.36) closed = base + (1 - base) * smoothStep(p / 0.36);
          else if (p < 0.52) closed = 1;
          else if (p < 1) closed = base + (1 - base) * (1 - smoothStep((p - 0.52) / 0.48));
          else {
            blinkStart = -1;
            const gap = sick ? 2.4 + Math.random() * 2.2 : hungry ? 1.8 + Math.random() * 1.6 : bright ? 0.7 + Math.random() * 0.8 : 1.4 + Math.random() * 1.8;
            blinkAt = t + gap;
          }
        }
        blink.apply(closed);
      }
      if (frame === "lab" && poseName === "pace" && t >= eatUntil && !moodRef.current?.dark) {
        paceX += paceDir * dt * 0.85;
        if (paceX > 2.6) {
          paceX = 2.6;
          paceDir = -1;
          poseDur = 0;
        } else if (paceX < -2.6) {
          paceX = -2.6;
          paceDir = 1;
          poseDur = 0;
        }
        rig.position.x = paceX;
        rig.position.y = homeLift + Math.abs(Math.sin(t * 10)) * 0.028;
        rig.rotation.y = paceDir * 0.55;
      } else if (frame === "lab" && t >= eatUntil && !moodRef.current?.dark && poseName !== "hop" && poseName !== "eat") {
        rig.position.x = paceX;
      }
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      alive = false;
      stopWait();
      cancelAnimationFrame(raf);
      observer.disconnect();
      seeing.disconnect();
      window.removeEventListener("zoom-pet-hello", onHello);
      window.removeEventListener("zoom-pet-eat", onEat);
      window.removeEventListener("zoom-pet-cared", onCared);
      host.removeEventListener("pointerdown", onDown);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerup", onUp);
      host.removeEventListener("pointercancel", onCancel);
      renderer.domElement.removeEventListener("webglcontextlost", onLost);
      blink?.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
    };
  }, [frame, petId, boot, side]);

  return (
    <div
      ref={hostRef}
      className={room?.calling ? "pet-stage is-calling" : "pet-stage"}
      style={{
        position: "absolute",
        inset: 0,
        touchAction: frame === "shop" ? "pan-y" : "none",
        pointerEvents: frame === "play" || frame === "duel" ? "none" : "auto",
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
