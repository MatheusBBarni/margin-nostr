import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "wxt"

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: "Margin",
    version: "0.1.0",
    description: "Follows-first comments on any URL",
    permissions: ["storage", "tabs", "sidePanel"],
    host_permissions: ["wss://*/*", "https://*/*"],
    action: {
      default_title: "Margin",
    },
    browser_specific_settings: {
      gecko: {
        id: "margin@local",
      },
    },
  },
})
