import {
  AmbientLight, Box3, DirectionalLight, Group, PerspectiveCamera, Scene, SRGBColorSpace, Vector3, WebGLRenderer,
} from "../vendor/three-pet.js";
import { petDef } from "./catalog";
import { takeCharClone, whenCharReady } from "../components/HomeVoxelResident";
import { personalPetNumber, petOwnerId } from "./number";
import { getPet } from "./petProgress";

function waitReady(id: ReturnType<typeof getPet>["active"]): Promise<void> {
  return new Promise((resolve) => {
    const stop = whenCharReady(id, () => {
      stop();
      resolve();
    });
  });
}

/** The Home pet, drawn as a card the player can send. */
export async function renderHomeCard(elementLabel: string): Promise<Blob> {
  const pet = getPet();
  const def = petDef(pet.active);
  await waitReady(pet.active);
  const model = takeCharClone(pet.active);
  const width = 720;
  const height = 1280;
  const card = document.createElement("canvas");
  card.width = width;
  card.height = height;
  const ctx = card.getContext("2d");
  if (!ctx) throw new Error("card");

  ctx.fillStyle = "#05080e";
  ctx.fillRect(0, 0, width, height);

  const left = 56;
  const top = 180;
  const cardW = width - 112;
  const cardH = 920;
  roundRect(ctx, left, top, cardW, cardH, 48);
  const glow = ctx.createLinearGradient(0, top, 0, top + cardH);
  glow.addColorStop(0, def.element.color);
  glow.addColorStop(0.45, "#102433");
  glow.addColorStop(1, "#071018");
  ctx.fillStyle = glow;
  ctx.fill();

  if (model) {
    const scene = new Scene();
    const camera = new PerspectiveCamera(28, 1, 0.1, 40);
    camera.position.set(0, 0.15, 8.5);
    camera.lookAt(0, 0, 0);
    const renderer = new WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.setSize(560, 560, false);
    renderer.setClearColor(0x000000, 0);
    scene.add(new AmbientLight(0xfff6ea, 1.4));
    const key = new DirectionalLight(0xfff0d4, 2.3);
    key.position.set(2, 3, 4);
    scene.add(key);
    const rig = new Group();
    model.updateMatrixWorld(true);
    const box = new Box3().setFromObject(model);
    const size = new Vector3();
    const center = new Vector3();
    box.getSize(size);
    box.getCenter(center);
    model.position.sub(center);
    const holder = new Group();
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    holder.scale.setScalar(2.4 / maxDim);
    holder.add(model);
    rig.add(holder);
    rig.position.y = -0.15;
    scene.add(rig);
    renderer.render(scene, camera);
    ctx.drawImage(renderer.domElement, left + (cardW - 560) / 2, top + 70, 560, 560);
    renderer.dispose();
    renderer.forceContextLoss?.();
  }

  ctx.fillStyle = "#e8f7ff";
  ctx.font = "700 42px system-ui, sans-serif";
  ctx.textAlign = "center";
  const tag = personalPetNumber(petOwnerId(), pet.active);
  ctx.fillText(`${tag}  ${def.name}`, width / 2, top + cardH - 150);
  ctx.fillStyle = "#041018";
  roundRect(ctx, width / 2 - 90, top + cardH - 120, 180, 48, 24);
  ctx.fillStyle = def.element.color;
  ctx.fill();
  ctx.fillStyle = "#041018";
  ctx.font = "800 22px system-ui, sans-serif";
  ctx.fillText(elementLabel.toUpperCase(), width / 2, top + cardH - 88);
  ctx.fillStyle = "rgba(232,247,255,0.7)";
  ctx.font = "700 28px system-ui, sans-serif";
  ctx.fillText("ZOOM", width / 2, top + cardH + 70);

  const blob = await new Promise<Blob | null>((resolve) => card.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("card");
  return blob;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function downloadCard(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "zoom-pet.png";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/** Send the Home card image. Stories and chats both take it from the phone share sheet. */
export async function shareHomeCard(caption: string, elementLabel: string): Promise<"shared" | "saved" | "cancelled"> {
  const blob = await renderHomeCard(elementLabel);
  const file = new File([blob], "zoom-pet.png", { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text: caption, title: "Zoom" });
      return "shared";
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return "cancelled";
    }
  }
  downloadCard(blob);
  return "saved";
}
