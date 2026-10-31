export function notFound(_req, res) {
  res.status(404).json({ message: "Route not found" });
}

export function errorHandler(error, _req, res, _next) {
  if (error?.name === "MulterError") {
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Image must be no larger than 5 MB"
        : "Invalid image upload";
    return res.status(400).json({ message });
  }
  if (error?.name === "InvalidProductImageError") {
    return res.status(400).json({ message: error.message });
  }
  if (error?.name === "CloudinaryConfigurationError") {
    return res.status(503).json({ message: error.message });
  }
  if (error?.type === "entity.too.large") {
    return res.status(413).json({ message: "Request body is too large" });
  }

  if (error?.name === "ValidationError") {
    return res.status(400).json({ message: "Invalid request data" });
  }

  if (
    error?.name === "JsonWebTokenError" ||
    error?.name === "TokenExpiredError"
  ) {
    return res
      .status(401)
      .json({ message: "Your session is invalid or has expired" });
  }

  console.error(error);
  return res
    .status(500)
    .json({ message: "An unexpected server error occurred" });
}
