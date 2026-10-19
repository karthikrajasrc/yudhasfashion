import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import mongoose from "mongoose";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { authRouter } from "./routes/auth.js";
import { productsRouter } from "./routes/products.js";
import { ordersRouter } from "./routes/orders.js";
import { errorHandler, notFound } from "./middleware/error-handler.js";
import { ADMIN_EMAIL } from "./constants/roles.js";
import { User } from "./models/user.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || config.clientOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());
app.use(
  "/uploads",
  express.static(fileURLToPath(new URL("../uploads/", import.meta.url)), {
    fallthrough: false,
    dotfiles: "deny",
  }),
);

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRouter);
app.use("/api/admin/products", productsRouter);
app.use("/api/orders", ordersRouter);
app.use(notFound);
app.use(errorHandler);

await mongoose.connect(config.mongoUri);
const adminUpdate = await User.updateMany(
  { email: ADMIN_EMAIL, role: { $ne: "admin" } },
  { $set: { role: "admin" } },
);
const userUpdate = await User.updateMany(
  { email: { $ne: ADMIN_EMAIL }, role: { $ne: "user" } },
  { $set: { role: "user" } },
);
console.log(
  `Role sync complete: ${adminUpdate.modifiedCount} admin account(s), ${userUpdate.modifiedCount} user account(s) updated`,
);
const server = app.listen(config.port, () => {
  console.log(`Yudhas Fashion API listening on port ${config.port}`);
});

async function shutdown(signal) {
  console.log(`${signal} received; shutting down`);
  server.close(async (error) => {
    if (error) {
      console.error(error);
      process.exitCode = 1;
    }
    await mongoose.disconnect();
    process.exit();
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
