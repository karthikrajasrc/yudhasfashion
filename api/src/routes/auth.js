import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { z } from "zod";
import { config } from "../config.js";
import { User } from "../models/user.js";
import { requireAuth } from "../middleware/require-auth.js";
import { roleForEmail } from "../constants/roles.js";

export const authRouter = Router();
const googleClient = config.googleClientId
  ? new OAuth2Client(config.googleClientId)
  : null;
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many authentication attempts. Try again later." },
});
const credentialsSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
});
const registrationSchema = credentialsSchema.extend({
  name: z.string().trim().min(1).max(100),
});
const passwordUsesValidByteLength = (password) =>
  Buffer.byteLength(password, "utf8") <= 72;

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: roleForEmail(user.email),
  };
}

async function synchronizeUserRole(user) {
  const role = roleForEmail(user.email);
  if (user.role !== role) {
    user.role = role;
    await user.save();
  }
  return user;
}

function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: config.isProduction ? "none" : "lax",
    path: "/",
  };
}

function issueSession(res, user) {
  const token = jwt.sign({}, config.jwtSecret, {
    subject: user.id,
    expiresIn: "7d",
  });
  res.cookie("yf_session", token, {
    ...sessionCookieOptions(),
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  return res.json({ user: publicUser(user) });
}

authRouter.post("/register", authLimiter, async (req, res, next) => {
  const parsed = registrationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ message: parsed.error.issues[0]?.message ?? "Invalid details" });
  }
  if (!passwordUsesValidByteLength(parsed.data.password)) {
    return res
      .status(400)
      .json({ message: "Password must be no more than 72 bytes" });
  }

  try {
    const email = parsed.data.email.toLowerCase();
    if (await User.exists({ email })) {
      return res
        .status(409)
        .json({ message: "An account with this email already exists" });
    }
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const user = await User.create({
      name: parsed.data.name,
      email,
      role: roleForEmail(email),
      passwordHash,
    });
    return issueSession(res, user);
  } catch (error) {
    if (error?.code === 11000) {
      return res
        .status(409)
        .json({ message: "An account with this email already exists" });
    }
    return next(error);
  }
});

authRouter.post("/login", authLimiter, async (req, res, next) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ message: parsed.error.issues[0]?.message ?? "Invalid details" });
  }
  if (!passwordUsesValidByteLength(parsed.data.password)) {
    return res
      .status(400)
      .json({ message: "Password must be no more than 72 bytes" });
  }

  try {
    const user = await User.findOne({
      email: parsed.data.email.toLowerCase(),
    }).select("+passwordHash");
    if (
      !user?.passwordHash ||
      !(await bcrypt.compare(parsed.data.password, user.passwordHash))
    ) {
      return res
        .status(401)
        .json({ message: "Email or password is incorrect" });
    }
    await synchronizeUserRole(user);
    return issueSession(res, user);
  } catch (error) {
    return next(error);
  }
});

authRouter.post("/google", authLimiter, async (req, res, next) => {
  if (!googleClient || !config.googleClientId) {
    return res
      .status(503)
      .json({ message: "Google sign-in is not configured on the server" });
  }

  const parsed = z
    .object({ credential: z.string().min(1) })
    .safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Google credential is required" });
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: parsed.data.credential,
      audience: config.googleClientId,
    });
    payload = ticket.getPayload();
  } catch {
    return res
      .status(401)
      .json({ message: "Google sign-in could not be verified" });
  }
  if (!payload?.sub || !payload.email || !payload.email_verified) {
    return res
      .status(401)
      .json({ message: "Google account could not be verified" });
  }

  try {
    let user = await User.findOne({ googleId: payload.sub }).select(
      "+googleId",
    );
    if (!user) {
      user = await User.findOne({ email: payload.email.toLowerCase() }).select(
        "+googleId",
      );
      if (user) {
        user.googleId = payload.sub;
        if (!user.name && payload.name) user.name = payload.name;
        user.role = roleForEmail(user.email);
        await user.save();
      } else {
        user = await User.create({
          name: payload.name?.trim().slice(0, 100) || payload.email,
          email: payload.email.toLowerCase(),
          googleId: payload.sub,
          role: roleForEmail(payload.email),
        });
      }
    }
    await synchronizeUserRole(user);
    return issueSession(res, user);
  } catch (error) {
    if (error?.code === 11000) {
      return res
        .status(409)
        .json({ message: "This Google account is already linked" });
    }
    return next(error);
  }
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.authUserId);
    if (!user) {
      res.clearCookie("yf_session", sessionCookieOptions());
      return res.status(401).json({ message: "Authentication required" });
    }
    await synchronizeUserRole(user);
    return res.json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie("yf_session", sessionCookieOptions());
  return res.json({ message: "Signed out" });
});
