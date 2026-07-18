/* The teacher app's whole shared workspace (tasks, schedules, chats, memos…)
   lives in one JSONB row, mirroring the old window.storage single-key design.
   Simple, atomic enough for a 4-person team, and instantly synced via socket. */
const express = require("express");
const { pool } = require("../lib/db");
const { requireTeacher } = require("../lib/auth");

const KEY = "teamspace-v1";

module.exports = function (io) {
  const router = express.Router();

  /* GET /api/store → { value, updated_at } */
  router.get("/", requireTeacher, async (_req, res) => {
    const { rows } = await pool.query("SELECT value, updated_at FROM kv WHERE key = $1", [KEY]);
    res.json(rows[0] || { value: null, updated_at: null });
  });

  /* PUT /api/store  { value } */
  router.put("/", requireTeacher, async (req, res) => {
    const { value } = req.body || {};
    if (value === undefined) return res.status(400).json({ error: "value required" });
    await pool.query(
      `INSERT INTO kv (key, value, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
      [KEY, JSON.stringify(value)]
    );
    io.to("teachers").emit("store:updated", { at: Date.now() });
    res.json({ ok: true });
  });

  return router;
};
