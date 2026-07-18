const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");
if (!process.env.JWT_SECRET) {
  console.warn("⚠️  JWT_SECRET not set — using a random one. Logins will reset on every redeploy. Set JWT_SECRET in Railway variables.");
}

const teacherToken = (t) =>
  jwt.sign({ kind: "teacher", id: t.id, name: t.name, isAdmin: t.is_admin }, SECRET, { expiresIn: "180d" });

const studentToken = (c) =>
  jwt.sign({ kind: "student", slug: c.slug, name: c.name }, SECRET, { expiresIn: "365d" });

function decode(token) {
  try { return jwt.verify(token, SECRET); } catch { return null; }
}

function bearer(req) {
  const h = req.headers.authorization || "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}

function requireTeacher(req, res, next) {
  const p = decode(bearer(req));
  if (!p || p.kind !== "teacher") return res.status(401).json({ error: "Teacher login required" });
  req.teacher = p;
  next();
}

function requireAdmin(req, res, next) {
  const p = decode(bearer(req));
  if (!p || p.kind !== "teacher" || !p.isAdmin) return res.status(403).json({ error: "Admin only" });
  req.teacher = p;
  next();
}

/* Students may read a class feed with a class token; teachers may read any class. */
function requireClassAccess(req, res, next) {
  const p = decode(bearer(req));
  if (!p) return res.status(401).json({ error: "Login required" });
  if (p.kind === "teacher") { req.teacher = p; return next(); }
  if (p.kind === "student" && p.slug === req.params.slug) { req.student = p; return next(); }
  return res.status(403).json({ error: "No access to this class" });
}

module.exports = { teacherToken, studentToken, decode, requireTeacher, requireAdmin, requireClassAccess };
