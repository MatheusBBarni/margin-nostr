import { Outlet } from "react-router"
import { SiteFooter } from "./SiteFooter"
import { SiteHeader } from "./SiteHeader"
import { WebAuthProvider } from "./WebAuth"

export function Layout() {
  return (
    <WebAuthProvider>
      <div className="flex min-h-dvh flex-col">
        <SiteHeader />
        <Outlet />
        <SiteFooter />
      </div>
    </WebAuthProvider>
  )
}
