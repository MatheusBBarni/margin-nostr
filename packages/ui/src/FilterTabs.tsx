import { Tabs } from "@heroui/react"
import type { FilterMode } from "@margin/core"

type Props = {
  filter: FilterMode
  onFilter: (filter: FilterMode) => void
}

export function FilterTabs({ filter, onFilter }: Props) {
  return (
    <Tabs
      selectedKey={filter}
      onSelectionChange={(key) => onFilter(String(key) === "follows" ? "follows" : "everyone")}
      variant="secondary"
    >
      <Tabs.ListContainer>
        <Tabs.List aria-label="Thread filter">
          <Tabs.Tab id="follows">
            Follows
            <Tabs.Indicator />
          </Tabs.Tab>
          <Tabs.Tab id="everyone">
            Everyone
            <Tabs.Indicator />
          </Tabs.Tab>
        </Tabs.List>
      </Tabs.ListContainer>
    </Tabs>
  )
}
