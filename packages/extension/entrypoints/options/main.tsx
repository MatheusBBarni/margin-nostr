import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { Options } from "../../src/Options"
import "../../src/index.css"

const root = document.getElementById("root")
if (!root) throw new Error("missing #root")

createRoot(root).render(
  <StrictMode>
    <Options />
  </StrictMode>,
)
