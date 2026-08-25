import { applyTheme } from "@margin/ui"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, Route, Routes } from "react-router"
import { Layout } from "./Layout"
import { Home } from "./pages/Home"
import { HowItWorks } from "./pages/HowItWorks"
import { Me } from "./pages/Me"
import { Room } from "./pages/Room"
import "./index.css"

applyTheme("dark")

const root = document.getElementById("root")
if (!root) throw new Error("missing #root")

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/me" element={<Me />} />
          <Route path="/u/*" element={<Room />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
