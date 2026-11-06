import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { PetState } from "../pet/petProgress";

const PET_URL = "/models/pet.glb";

function fitScale(level: PetState["level"], stage: PetState["stage"]): number {
  const stageBoost = stage === 1 ? 0.86 : stage === 2 ? 1 : 1.12;
  const levelBoost = level === 1 ? 1 : level === 5 ? 1.18 : 1.34;
  return stageBoost * levelBoost;
}

/** Base pet everyone starts with. Loads `/models/pet.glb` when that file exists. */
export function PetStage({
  pet,
  interactive = true,
  onTap,
}: {
  pet: PetState;
  interactive?: boolean;
  onTap?: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const petRef = useRef(pet);
  petRef.current = pet;
  const onTapRef = useRef(onTap);
  onTapRef.current = onTap;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
    camera.position.set(0, 1.05, 11);
    camera.lookAt(0, 0.45, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    host.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xfff1dc, 1.15));
    const key = new THREE.DirectionalLight(0xffe2b0, 2.1);
    key.position.set(2.2, 3.4, 3);
    scene.add(key);

    const rig = new THREE.Group();
    scene.add(rig);

    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.72, 28, 20),
      new THREE.MeshStandardMaterial({ color: 0xd98a3a, roughness: 0.45 }),
    );
    body.scale.set(1.15, 0.92, 1);
    body.position.y = 0.15;
    rig.add(body);

    const belly = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 20, 16),
      new THREE.MeshStandardMaterial({ color: 0xffe0b8, roughness: 0.55 }),
    );
    belly.position.set(0, -0.02, 0.42);
    rig.add(belly);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 24, 18),
      new THREE.MeshStandardMaterial({ color: 0xe09a48, roughness: 0.42 }),
    );
    head.position.set(0, 0.72, 0.18);
    rig.add(head);

    const earMat = new THREE.MeshStandardMaterial({ color: 0xc4742c, roughness: 0.5 });
    const earL = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 12), earMat);
    earL.scale.set(0.7, 1.35, 0.45);
    earL.position.set(-0.22, 1.08, 0.05);
    const earR = earL.clone();
    earR.position.x = 0.22;
    rig.add(earL, earR);

    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x2a1810, roughness: 0.3 });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), eyeMat);
    eyeL.position.set(-0.14, 0.76, 0.52);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.14;
    rig.add(eyeL, eyeR);

    const tail = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0xf0b15a, roughness: 0.4 }),
    );
    tail.position.set(0, 0.28, -0.78);
    rig.add(tail);

    let alive = true;
    const loader = new GLTFLoader();
    loader.load(
      PET_URL,
      (gltf) => {
        if (!alive) return;
        rig.clear();
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);
        model.position.sub(center);
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        model.scale.setScalar(2.4 / maxDim);
        rig.add(model);
      },
      undefined,
      () => { /* base animal stays until a pet.glb is added */ },
    );

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

    let raf = 0;
    const clock = new THREE.Clock();
    let t = 0;
    const loop = () => {
      const dt = Math.min(clock.getDelta(), 0.05);
      t += dt;
      const { stage, level } = petRef.current;
      const s = fitScale(level, stage);
      rig.scale.setScalar(s);
      rig.position.y = Math.sin(t * 2.1) * 0.14;
      rig.rotation.y = Math.sin(t * 0.85) * 0.45;
      rig.rotation.z = Math.sin(t * 1.7) * 0.05;
      tail.rotation.z = Math.sin(t * 4) * 0.5;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      observer.disconnect();
      renderer.dispose();
      host.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={hostRef}
      onPointerDown={() => { if (interactive) onTapRef.current?.(); }}
      style={{ position: "absolute", inset: 0, touchAction: "manipulation" }}
      aria-label="Pet"
    />
  );
}
