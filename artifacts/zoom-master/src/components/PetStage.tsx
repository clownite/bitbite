import { useLayoutEffect, useRef, useState } from "react";
import {
  Group, Mesh, MeshStandardMaterial, SphereGeometry, ConeGeometry, CylinderGeometry, Box3, Vector3, Scene, PerspectiveCamera, WebGLRenderer, SRGBColorSpace, AmbientLight, DirectionalLight, Clock,
} from "../vendor/three-pet.js";
import type { PetId } from "../pet/catalog";
import { tapPet, type PetState } from "../pet/petProgress";
import { takePetClone, whenPetModelReady } from "../pet/petModel";
import { takeHomeCharClone, whenHomeCharReady } from "./HomeVoxelResident";

function fitScale(level: PetState["level"], stage: PetState["stage"]): number {
  const stageBoost = stage === 1 ? 0.86 : stage === 2 ? 1 : 1.12;
  const levelBoost = level === 1 ? 1 : level === 5 ? 1.18 : 1.34;
  return stageBoost * levelBoost;
}

type Frame = "lab" | "collection";

function standIn(id: PetId): Group {
  const color = id === "finch" ? 0xe7a56a : id === "lynx" ? 0xc47a2e : 0xf3e2c2;
  const mat = new MeshStandardMaterial({ color, roughness: 0.48 });
  const dark = new MeshStandardMaterial({ color: 0x2a1810, roughness: 0.4 });
  const group = new Group();
  const add = (mesh: Mesh) => {
    group.add(mesh);
    return mesh;
  };
  if (id === "finch") {
    add(new Mesh(new SphereGeometry(0.42, 18, 14), mat)).scale.set(1.15, 0.85, 0.9);
    const head = add(new Mesh(new SphereGeometry(0.26, 16, 12), mat));
    head.position.set(0.48, 0.22, 0);
    const beak = add(new Mesh(new ConeGeometry(0.08, 0.28, 8), dark));
    beak.rotation.z = -Math.PI / 2;
    beak.position.set(0.78, 0.2, 0);
    const wing = add(new Mesh(new SphereGeometry(0.22, 12, 10), mat));
    wing.scale.set(0.4, 1, 1.3);
    wing.position.set(0.05, 0.05, 0.28);
  } else if (id === "lynx") {
    const body = add(new Mesh(new SphereGeometry(0.48, 18, 14), mat));
    body.scale.set(1.45, 0.72, 0.78);
    const head = add(new Mesh(new SphereGeometry(0.28, 16, 12), mat));
    head.position.set(0.62, 0.28, 0);
    const earL = add(new Mesh(new ConeGeometry(0.08, 0.22, 6), mat));
    earL.position.set(0.52, 0.58, 0.12);
    const earR = earL.clone();
    earR.position.z = -0.12;
    group.add(earR);
    const tail = add(new Mesh(new CylinderGeometry(0.05, 0.08, 0.55, 8), mat));
    tail.rotation.z = Math.PI / 3;
    tail.position.set(-0.7, 0.28, 0);
    add(new Mesh(new SphereGeometry(0.045, 8, 8), dark)).position.set(0.78, 0.34, 0.1);
  } else {
    const body = add(new Mesh(new SphereGeometry(0.5, 18, 14), mat));
    body.scale.set(1.5, 0.75, 0.7);
    const neck = add(new Mesh(new CylinderGeometry(0.1, 0.14, 0.45, 8), mat));
    neck.position.set(0.55, 0.42, 0);
    neck.rotation.z = -0.5;
    const head = add(new Mesh(new SphereGeometry(0.22, 14, 12), mat));
    head.position.set(0.78, 0.62, 0);
    const antler = add(new Mesh(new CylinderGeometry(0.025, 0.035, 0.42, 6), dark));
    antler.position.set(0.7, 0.95, 0.08);
    antler.rotation.z = 0.3;
    const antler2 = antler.clone();
    antler2.position.z = -0.08;
    antler2.rotation.z = -0.3;
    group.add(antler2);
  }
  group.updateMatrixWorld(true);
  const box = new Box3().setFromObject(group);
  const size = new Vector3();
  const center = new Vector3();
  box.getSize(size);
  box.getCenter(center);
  group.position.sub(center);
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const pivot = new Group();
  pivot.scale.setScalar(2.4 / maxDim);
  pivot.add(group);
  return pivot;
}

/** The base pet uses the voxel character. Bought pets use an original shape until their GLB arrives. */
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
    camera.position.set(0, 0.55, 10);
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
      renderer.render(scene, camera);
    };
    // The nav button labeled Home is this stage. Show the brown hood
    // face-on. Collection keeps the winter-hood pet.
    if (frame === "lab") {
      mountHomeChar();
      stopWait = whenHomeCharReady(mountHomeChar);
    } else if (petId === "dolphin") {
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
        shake = 1;
        flashRef.current(`+${result.xp} XP · ${result.count}/${result.max}`);
      } else if (result.reason === "wait") {
        flashRef.current("Wait 3 seconds");
      } else if (result.reason === "gate") {
        flashRef.current("Pay GRAM in Collection");
      } else {
        flashRef.current(`${result.max}/${result.max} today`);
      }
      window.setTimeout(() => flashRef.current(null), 900);
    };
    const onCancel = () => { pressed = false; };
    host.addEventListener("pointerdown", onDown);
    host.addEventListener("pointerup", onUp);
    host.addEventListener("pointercancel", onCancel);

    let raf = 0;
    const clock = new Clock();
    let t = 0;
    const loop = () => {
      const dt = Math.min(clock.getDelta(), 0.05);
      t += dt;
      const { stage, level } = petRef.current;
      rig.scale.setScalar(fitScale(level, stage));
      shake = shake > 0.02 ? shake * Math.exp(-dt * 14) : 0;
      const buzz = shake * Math.sin(t * 55);
      if (frame === "lab") {
        rig.position.x = buzz * 0.04;
        rig.position.y = Math.sin(t * 1.35) * 0.08;
        rig.rotation.set(0, 0, buzz * 0.04);
      } else {
        rig.position.x = Math.sin(t * 0.55) * 0.12 + buzz * 0.06;
        rig.position.y = Math.sin(t * 1.35) * 0.16;
        rig.rotation.y = Math.sin(t * 0.65) * 0.28;
        rig.rotation.z = Math.sin(t * 1.2) * 0.06 + buzz * 0.22;
        rig.rotation.x = Math.sin(t * 1.5) * 0.06;
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
            color: "#7ad7ff",
            fontWeight: 800,
            letterSpacing: "0.08em",
            pointerEvents: "none",
          }}
        >
          {flash}
        </div>
      )}
    </div>
  );
}
