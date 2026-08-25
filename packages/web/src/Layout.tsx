import { Outlet } from "react-router"
import { SiteHeader } from "./SiteHeader"

export function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <Outlet />
    </div>
  )
}
