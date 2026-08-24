import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, Route, Routes } from "react-router"
import { Home } from "./pages/Home"
import { Room } from "./pages/Room"
import "./index.css"

const root = document.getElementById("root")
if (!root) throw new Error("missing #root")

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/u/*" element={<Room />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
