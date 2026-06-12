import { Button } from "@workspace/ui/components/button"

/**
 * VK-branded login button. A plain <a> (not next/link) so the redirect from
 * the /auth/vk/start route handler is a full navigation and never prefetched.
 * The hover override uses the same `[a]:hover:` variant as the Button default
 * so tailwind-merge replaces it instead of letting both rules compete.
 */
export function VkLoginButton() {
  return (
    <Button
      asChild
      className="w-full border-transparent bg-[#0077FF] text-white [a]:hover:bg-[#0077FF]/85"
    >
      <a href="/auth/vk/start">
        <VkLogo />
        Continue with VK ID
      </a>
    </Button>
  )
}

function VkLogo() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className="size-4"
    >
      <path d="M13.162 18.994c.609 0 .858-.406.851-.915-.031-1.917.714-2.949 2.059-1.604 1.488 1.488 1.796 2.519 3.603 2.519h3.2c.808 0 1.126-.26 1.126-.668 0-.863-1.421-2.386-2.625-3.504-1.686-1.565-1.765-1.602-.313-3.486 1.801-2.339 4.157-5.336 2.073-5.336h-3.981c-.772 0-.828.435-1.103 1.083-.995 2.347-2.886 5.387-3.604 4.922-.751-.485-.407-2.406-.35-5.261.015-.754.011-1.271-1.141-1.539-.629-.145-1.241-.205-1.809-.205-2.273 0-3.841.953-2.95 1.119 1.571.293 1.42 3.692 1.054 5.16-.638 2.556-3.036-2.024-4.035-4.305-.241-.548-.315-.974-1.175-.974H.911c-.514 0-.911.169-.911.745 0 .949 4.91 10.85 9.562 11.533.222.033.345.072.345.072z" />
    </svg>
  )
}
