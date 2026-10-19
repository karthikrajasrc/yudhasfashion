import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "BACKEND_API_URL");

  return {
    define: {
      "import.meta.env.BACKEND_API_URL": JSON.stringify(
        env["BACKEND_API_URL"] ?? "",
      ),
    },
    plugins: [TanStackRouterVite(), react(), tailwindcss(), tsconfigPaths()],
  };
});
