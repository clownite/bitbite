import { randomBytes } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { allow } from "../lib/rate-limit";

const router = Router();
const BOT_TOKEN = process.env["BOT_TOKEN"] || "";
const API_ORIGIN = (process.env["PUBLIC_API_URL"] || process.env["RENDER_EXTERNAL_URL"] || "https://zoomverse-api-u7ea.onrender.com").replace(/\/$/, "").replace(/\/api$/, "");

type Held = { image: Buffer; thumb: Buffer; until: number };
const held = new Map<string, Held>();

function prune(now = Date.now()) {
  for (const [id, row] of held) {
    if (row.until <= now) held.delete(id);
  }
  while (held.size > 40) {
    const oldest = held.keys().next().value;
    if (!oldest) break;
    held.delete(oldest);
  }
}

function decodeJpeg(raw: string): Buffer | null {
  const b64 = raw.includes(",") ? raw.slice(raw.indexOf(",") + 1) : raw.trim();
  if (!/^[A-Za-z0-9+/=\s]+$/.test(b64)) return null;
  const buf = Buffer.from(b64, "base64");
  if (buf.length < 80 || buf.length > 500_000) return null;
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  return buf;
}

function jpegSize(buf: Buffer): { width: number; height: number } | null {
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) return null;
    const marker = buf[i + 1];
    if (marker === 0xd8 || marker === 0xd9) {
      i += 2;
      continue;
    }
    const len = buf.readUInt16BE(i + 2);
    if (len < 2 || i + 2 + len > buf.length) return null;
    if (marker >= 0xc0 && marker <= 0xc3) {
      const height = buf.readUInt16BE(i + 5);
      const width = buf.readUInt16BE(i + 7);
      if (width < 32 || height < 32 || width > 2000 || height > 2000) return null;
      return { width, height };
    }
    i += 2 + len;
  }
  return null;
}

const Body = z.object({
  telegramId: z.string().regex(/^\d{5,16}$/),
  image: z.string().min(80).max(900_000),
  thumb: z.string().min(80).max(400_000),
});

router.get("/share/media/:file", (req, res) => {
  prune();
  const file = String(req.params.file || "");
  const thumb = file.endsWith("-t.jpg");
  const id = file.replace(/-t\.jpg$/, "").replace(/\.jpg$/, "");
  if (!/^[a-f0-9]{32}$/.test(id)) {
    res.status(404).end();
    return;
  }
  const row = held.get(id);
  const buf = row && row.until > Date.now() ? (thumb ? row.thumb : row.image) : null;
  if (!buf) {
    res.status(404).end();
    return;
  }
  res.setHeader("Content-Type", "image/jpeg");
  res.setHeader("Cache-Control", "public, max-age=600");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(buf);
});

/** Prepare a photo-only Telegram message. The Mini App opens the forward dialog with this id. */
router.post("/share/card", async (req, res) => {
  const verified = req.tgUser?.id;
  if (!verified) {
    res.status(401).json({ ok: false, error: "TG_AUTH_REQUIRED" });
    return;
  }
  const parsed = Body.safeParse(req.body);
  if (!parsed.success || parsed.data.telegramId !== verified) {
    res.status(400).json({ ok: false, error: "Invalid body" });
    return;
  }
  if (!allow(`share:${verified}`, 8, 10 * 60 * 1000)) {
    res.status(429).json({ ok: false, error: "SLOW_DOWN" });
    return;
  }
  if (!BOT_TOKEN) {
    res.status(503).json({ ok: false, error: "AUTH_UNAVAILABLE" });
    return;
  }
  const image = decodeJpeg(parsed.data.image);
  const thumb = decodeJpeg(parsed.data.thumb);
  const size = image ? jpegSize(image) : null;
  if (!image || !thumb || !size) {
    res.status(400).json({ ok: false, error: "Invalid image" });
    return;
  }

  prune();
  const id = randomBytes(16).toString("hex");
  held.set(id, { image, thumb, until: Date.now() + 20 * 60 * 1000 });
  const photoUrl = `${API_ORIGIN}/api/share/media/${id}.jpg`;
  const thumbUrl = `${API_ORIGIN}/api/share/media/${id}-t.jpg`;

  try {
    const telegram = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/savePreparedInlineMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: Number(verified),
        allow_user_chats: true,
        allow_group_chats: true,
        allow_channel_chats: true,
        allow_bot_chats: false,
        result: {
          type: "photo",
          id,
          photo_url: photoUrl,
          thumbnail_url: thumbUrl,
          photo_width: size.width,
          photo_height: size.height,
        },
      }),
    });
    const data = await telegram.json().catch(() => null) as { ok?: boolean; description?: string; result?: { id?: string } } | null;
    if (!telegram.ok || !data?.ok || typeof data.result?.id !== "string") {
      held.delete(id);
      req.log?.warn({ status: telegram.status, description: data?.description }, "[share] prepared message refused");
      res.status(502).json({ ok: false, error: "SHARE_UNAVAILABLE" });
      return;
    }
    res.json({ ok: true, messageId: data.result.id });
  } catch (err) {
    held.delete(id);
    req.log?.warn({ err }, "[share] prepared message failed");
    res.status(502).json({ ok: false, error: "SHARE_UNAVAILABLE" });
  }
});

export default router;
