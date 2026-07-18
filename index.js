require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const { migrate } = require("./lib/db");
const { decode } = require("./lib/auth");
const { UPLOAD_DIR } = require("./lib/upload");

const app = express();
app.set("trust proxy", 1);
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static(UPLOAD_DIR));

io.on("connection", (socket) => {
  const p = decode(socket.handshake.auth?.token || "");
  if (!p) return socket.disconnect(true);
  if (p.kind === "teacher") socket.join("teachers");
  else if (p.kind === "student") socket.join(`class:${p.slug}`);
});

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/teachers", require("./routes/teachers"));
app.use("/api/classes", require("./routes/classes"));
app.use("/api/store", require("./routes/store")(io));
app.use("/api", require("./routes/messages")(io));

const PORT = process.env.PORT || 3000;
migrate()
  .then(() => server.listen(PORT, () => console.log(`🚀 Super Team API on :${PORT}`)))
  .catch((e) => { console.error("Migration failed:", e); process.exit(1); });
