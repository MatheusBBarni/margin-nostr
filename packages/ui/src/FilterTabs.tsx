import { Tabs } from "@heroui/react"
import type { FilterMode } from "@margin/core"
import type { ReactNode } from "react"

type Props = {
  filter: FilterMode
  onFilter: (filter: FilterMode) => void
  children: ReactNode
}

export function FilterTabs({ filter, onFilter, children }: Props) {
  return (
    <Tabs
      className="flex min-h-0 flex-1 flex-col"
      selectedKey={filter}
      variant="secondary"
      onSelectionChange={(key) => {
        if (key === "follows" || key === "everyone") onFilter(key)
      }}
    >
      <Tabs.ListContainer>
        <Tabs.List aria-label="Thread filter" className="w-full">
          <Tabs.Tab className="flex-1" id="follows">
            Follows
            <Tabs.Indicator />
          </Tabs.Tab>
          <Tabs.Tab className="flex-1" id="everyone">
            Everyone
            <Tabs.Indicator />
          </Tabs.Tab>
        </Tabs.List>
      </Tabs.ListContainer>
      {children}
    </Tabs>
  )
}
