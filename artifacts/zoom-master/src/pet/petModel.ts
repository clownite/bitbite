import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/** One character from 25 Voxel Chars by Rufián, CC BY 4.0. https://sketchfab.com/3d-models/25-voxel-chars-977cd691acea4d85b303c48e767b304b */
const PET_URL = "/models/pet.glb";

let cached: THREE.Object3D | null = null;
let started = false;
const waiters = new Set<() => void>();

function prepare(root: THREE.Object3D): THREE.Object3D {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      const std = mat as THREE.MeshStandardMaterial;
      if (std.color) std.color.set(0xffffff);
      std.vertexColors = false;
      if (std.map) std.map.colorSpace = THREE.SRGBColorSpace;
    }
  });
  // The character is modeled with height on Z. Stand it up and turn the face to the camera.
  const stand = new THREE.Group();
  stand.rotation.x = -Math.PI / 2;
  stand.add(root);
  stand.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(stand);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  stand.position.sub(center);
  const face = new THREE.Group();
  face.rotation.y = -Math.PI / 2;
  face.add(stand);
  const pivot = new THREE.Group();
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  pivot.scale.setScalar(2.6 / maxDim);
  pivot.add(face);
  return pivot;
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
