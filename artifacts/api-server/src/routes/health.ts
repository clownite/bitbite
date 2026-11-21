import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { pool } from "@workspace/db";
import { runPetNotes } from "../lib/petNotes";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/ping", async (_req, res) => {
  try {
    await pool.query("select 1");
    await pool.query("select 1 from users limit 1");
    res.status(200).send("pong");
  } catch {
    res.status(503).send("db_unavailable");
  }
});

router.get("/time", (_req, res) => {
  res.json({ serverTime: Date.now() });
});

/** Wakes the free host and sends any pet note that came due while it slept. */
router.get("/cron/pet-notes", async (_req, res) => {
  try {
    const result = await runPetNotes();
    res.json({ ok: true, checked: result.checked, sent: result.sent });
  } catch {
    res.status(500).json({ ok: false });
  }
});

export default router;
