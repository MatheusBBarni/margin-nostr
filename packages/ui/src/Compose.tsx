import { Button, TextArea } from "@heroui/react"
import { useEffect, useRef, useState } from "react"
import type { VerifiedComment } from "@margin/core"

type Props = {
  disabled: boolean
  replyTo: VerifiedComment | null
  onSubmit: (text: string) => Promise<void>
  onCancelReply?: () => void
}

export function Compose({ disabled, replyTo, onSubmit, onCancelReply }: Props) {
  const [text, setText] = useState("")
  const [pending, setPending] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (!replyTo) return
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    formRef.current?.querySelector("textarea")?.focus()
  }, [replyTo])

  async function handleSubmit() {
    const next = text.trim()
    if (!next || disabled || pending) return
    setPending(true)
    try {
      await onSubmit(next)
      setText("")
    } finally {
      setPending(false)
    }
  }

  return (
    <form
      ref={formRef}
      className="flex scroll-mt-20 flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        void handleSubmit()
      }}
    >
      {replyTo ? (
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[var(--stone)] px-2 py-1 text-xs">
            Replying to {replyTo.pubkey.slice(0, 8)}
          </span>
          {onCancelReply ? (
            <Button size="sm" variant="tertiary" onPress={onCancelReply}>
              Cancel
            </Button>
          ) : null}
        </div>
      ) : null}
      <TextArea
        aria-label={replyTo ? "Reply" : "Comment"}
        disabled={disabled}
        fullWidth
        maxLength={4000}
        placeholder={disabled ? "Connect to comment" : "Write a comment"}
        rows={3}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <div className="flex justify-end">
        <Button
          isDisabled={disabled || text.trim().length === 0}
          isPending={pending}
          type="submit"
        >
          Post
        </Button>
      </div>
    </form>
  )
}
