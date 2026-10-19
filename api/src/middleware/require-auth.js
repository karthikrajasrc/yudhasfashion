import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { User } from "../models/user.js";
import { roleForEmail } from "../constants/roles.js";

export function requireAuth(req, res, next) {
  const token = req.cookies?.yf_session;
  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    if (typeof payload === "string" || !payload.sub) {
      return res.status(401).json({ message: "Authentication required" });
    }
    req.authUserId = payload.sub;
    return next();
  } catch {
    return res.status(401).json({ message: "Authentication required" });
  }
}

export async function requireAdmin(req, res, next) {
  try {
    const user = await User.findById(req.authUserId);
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const role = roleForEmail(user.email);
    if (user.role !== role) {
      user.role = role;
      await user.save();
    }
    if (role !== "admin") {
      return res.status(403).json({ message: "Administrator access required" });
    }
    req.authUser = user;
    return next();
  } catch (error) {
    return next(error);
  }
}
