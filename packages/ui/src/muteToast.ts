import { toast } from "@heroui/react"

export function showMutedToast(onUndo: () => void): void {
  toast("Muted", {
    actionProps: {
      children: "Undo",
      onPress: onUndo,
      variant: "tertiary",
    },
  })
}
