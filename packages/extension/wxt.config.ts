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
    permissions: ["storage", "tabs", "sidePanel", "contextMenus"],
    host_permissions: ["wss://*/*", "https://*/*"],
    action: {
      default_title: "Margin",
    },
    commands: {
      "toggle-panel": {
        suggested_key: {
          default: "Alt+Shift+M",
        },
        description: "Toggle the Margin side panel",
      },
    },
    browser_specific_settings: {
      gecko: {
        id: "margin@local",
        data_collection_permissions: {
          required: ["browsingActivity"],
        },
      },
    },
  },
})
