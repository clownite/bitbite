import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { PetState } from "../pet/petProgress";

/** Voxel Dolphin by pratamacam, CC BY 4.0. https://sketchfab.com/3d-models/voxel-dolphin-1a99bccffcf74908aeff36ce4fbccf2b */
const PET_URL = "/models/pet.glb";

function fitScale(level: PetState["level"], stage: PetState["stage"]): number {
  const stageBoost = stage === 1 ? 0.86 : stage === 2 ? 1 : 1.12;
  const levelBoost = level === 1 ? 1 : level === 5 ? 1.18 : 1.34;
  return stageBoost * levelBoost;
}

/** Shared starter pet: the voxel dolphin. */
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
    camera.position.set(0, 0.55, 10);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
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

    let alive = true;
    const loader = new GLTFLoader();
    loader.load(
      PET_URL,
      (gltf) => {
        if (!alive) return;
        const model = gltf.scene;
        model.updateMatrixWorld(true);
        model.traverse((obj) => {
          const mesh = obj as THREE.Mesh;
          if (!mesh.isMesh) return;
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          for (const mat of mats) {
            const std = mat as THREE.MeshStandardMaterial;
            if (std.color) std.color.set(0xffffff);
            std.vertexColors = true;
          }
        });
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);
        model.position.sub(center);
        const pivot = new THREE.Group();
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        pivot.scale.setScalar(2.8 / maxDim);
        // Export stands on its tail, back toward us once it is laid flat.
        // Tip it, then roll so the eye and belly face the camera.
        const lay = new THREE.Group();
        lay.rotation.z = -Math.PI / 2;
        lay.add(model);
        pivot.rotation.x = Math.PI / 2;
        pivot.add(lay);
        const level = new THREE.Group();
        level.rotation.z = 0.95;
        level.add(pivot);
        rig.add(level);
      },
      undefined,
      () => { /* keep the stage empty if the model cannot load */ },
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
      rig.position.y = Math.sin(t * 1.35) * 0.16;
      rig.position.x = Math.sin(t * 0.55) * 0.12;
      rig.rotation.y = Math.sin(t * 0.65) * 0.28;
      rig.rotation.z = Math.sin(t * 1.2) * 0.06;
      rig.rotation.x = Math.sin(t * 1.5) * 0.06;
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
