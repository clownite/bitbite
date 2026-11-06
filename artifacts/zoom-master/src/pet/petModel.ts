import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/** Voxel Dolphin by pratamacam, CC BY 4.0. https://sketchfab.com/3d-models/voxel-dolphin-1a99bccffcf74908aeff36ce4fbccf2b */
const PET_URL = "/models/pet.glb";

let cached: THREE.Object3D | null = null;
let started = false;
const waiters = new Set<() => void>();

function prepare(root: THREE.Object3D): THREE.Object3D {
  root.updateMatrixWorld(true);
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      const std = mat as THREE.MeshStandardMaterial;
      if (std.color) std.color.set(0xffffff);
      std.vertexColors = true;
    }
  });
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  root.position.sub(center);
  const pivot = new THREE.Group();
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  pivot.scale.setScalar(2.8 / maxDim);
  const lay = new THREE.Group();
  lay.rotation.z = -Math.PI / 2;
  lay.add(root);
  pivot.rotation.x = Math.PI / 2;
  pivot.add(lay);
  const level = new THREE.Group();
  level.rotation.z = 0.95;
  level.add(pivot);
  return level;
}

/** Start the fetch immediately. Later opens clone the parsed model. */
export function preloadPetModel() {
  if (started) return;
  started = true;
  const loader = new GLTFLoader();
  loader.load(
    PET_URL,
    (gltf) => {
      cached = prepare(gltf.scene);
      waiters.forEach((fn) => fn());
      waiters.clear();
    },
    undefined,
    () => { /**/ },
  );
}

export function takePetClone(): THREE.Object3D | null {
  return cached ? cached.clone(true) : null;
}

export function whenPetModelReady(fn: () => void): () => void {
  if (cached) {
    fn();
    return () => { /**/ };
  }
  waiters.add(fn);
  return () => waiters.delete(fn);
}

preloadPetModel();
