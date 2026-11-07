import { useLayoutEffect, useRef } from "react";
import {
  Object3D, Mesh, MeshStandardMaterial, Group, Scene, PerspectiveCamera, WebGLRenderer, SRGBColorSpace, AmbientLight, DirectionalLight, Clock, NearestFilter, GLTFLoader,
} from "../vendor/three-pet.js";
import type { PetId } from "../pet/catalog";

/**
 * Characters from 25 Voxel Chars by Rufián, CC BY 4.0.
 * https://sketchfab.com/3d-models/25-voxel-chars-977cd691acea4d85b303c48e767b304b
 * Each file is already standing (Y up) and facing +Z. Do not yaw it.
 * Aquin keeps the white hood. Emberin, Lynvyr and Cervolt are the three circled characters.
 */
const CHAR_URL: Record<PetId, string> = {
  dolphin: "/models/home-char.glb",
  finch: "/models/emberin.glb",
  lynx: "/models/lynvyr.glb",
  stag: "/models/cervolt.glb",
};

const cached = new Map<PetId, Object3D>();
const waiters = new Map<PetId, Set<() => void>>();
const started = new Set<PetId>();

function prepareChar(root: Object3D) {
  root.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      const std = mat as MeshStandardMaterial;
      if (std.color) std.color.set(0xffffff);
      std.vertexColors = false;
      std.metalness = 0;
      std.roughness = 1;
      if (std.map) {
        std.map.colorSpace = SRGBColorSpace;
        std.map.magFilter = NearestFilter;
        std.map.minFilter = NearestFilter;
        std.map.needsUpdate = true;
      }
    }
  });
}

function preloadChar(id: PetId) {
  if (started.has(id)) return;
  started.add(id);
  const loader = new GLTFLoader();
  loader.load(CHAR_URL[id], (gltf) => {
    const root = gltf.scene;
    prepareChar(root);
    cached.set(id, root);
    const pending = waiters.get(id);
    pending?.forEach((fn) => fn());
    pending?.clear();
  });
}

(Object.keys(CHAR_URL) as PetId[]).forEach(preloadChar);

export function takeCharClone(id: PetId): Object3D | null {
  const model = cached.get(id);
  return model ? model.clone(true) : null;
}

export function whenCharReady(id: PetId, fn: () => void): () => void {
  if (cached.has(id)) {
    fn();
    return () => { /**/ };
  }
  let pending = waiters.get(id);
  if (!pending) {
    pending = new Set();
    waiters.set(id, pending);
  }
  pending.add(fn);
  return () => pending.delete(fn);
}

export function takeHomeCharClone(): Object3D | null {
  return takeCharClone("dolphin");
}

export function whenHomeCharReady(fn: () => void): () => void {
  return whenCharReady("dolphin", fn);
}

/** Front view of the home resident. Yaw stays at 0 so the face looks at the camera. */
export function HomeVoxelResident({ calm = false }: { calm?: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const calmRef = useRef(calm);
  calmRef.current = calm;

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new Scene();
    const camera = new PerspectiveCamera(26, 1, 0.05, 20);
    // Model is Y-up, feet at y=0, head near y=1.2, face toward +Z.
    // Sit the camera on +Z so the brown hood reads from the front.
    camera.position.set(0, 0.62, 3.2);
    camera.lookAt(0, 0.58, 0);

    const renderer = new WebGLRenderer({ antialias: true, alpha: true });
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.pointerEvents = "none";
    host.appendChild(renderer.domElement);

    scene.add(new AmbientLight(0xfff8ee, 1.55));
    const key = new DirectionalLight(0xfff3df, 2.1);
    key.position.set(0.8, 2.4, 3.2);
    scene.add(key);
    const fill = new DirectionalLight(0xd5e4ff, 0.45);
    fill.position.set(-1.8, 1.1, 1.4);
    scene.add(fill);

    const rig = new Group();
    scene.add(rig);

    let alive = true;
    const mount = () => {
      if (!alive || rig.children.length > 0) return;
      const model = takeCharClone("dolphin");
      if (!model) return;
      rig.add(model);
    };
    mount();
    const stopWait = whenCharReady("dolphin", mount);

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
    const clock = new Clock();
    let t = 0;
    const loop = () => {
      const dt = Math.min(clock.getDelta(), 0.05);
      t += dt;
      const sleeping = calmRef.current;
      rig.position.y = Math.sin(t * (sleeping ? 1.05 : 1.7)) * (sleeping ? 0.008 : 0.02);
      rig.rotation.set(0, 0, 0);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      alive = false;
      stopWait();
      cancelAnimationFrame(raf);
      observer.disconnect();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={hostRef} style={{ width: "100%", height: "100%" }} />;
}
