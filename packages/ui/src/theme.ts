export type ThemePreference = "light" | "dark" | "system"

export function resolveTheme(theme: ThemePreference): "light" | "dark" {
  if (theme !== "system") return theme
  if (typeof matchMedia !== "function") return "light"
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export function applyTheme(theme: ThemePreference, root: HTMLElement = document.documentElement): void {
  const resolved = resolveTheme(theme)
  root.classList.toggle("dark", resolved === "dark")
  root.dataset.theme = resolved
}
