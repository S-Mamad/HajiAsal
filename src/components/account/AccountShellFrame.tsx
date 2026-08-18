"use client";

import { AccountSectionTabs } from "@/components/account/AccountSectionTabs";
import { isAccountTicketChatPath } from "@/lib/account/ticket-chat-path";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

export function AccountShellFrame({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const ticketChat = isAccountTicketChatPath(pathname);

  return (
    <div
      className={cn(
        "relative mx-auto flex max-w-6xl gap-8",
        ticketChat
          ? "px-0 pb-0 pt-0 lg:gap-12 lg:px-6 lg:pb-16 lg:pt-10"
          : "px-4 pb-6 pt-4 md:px-6 md:pt-6 lg:gap-12 lg:pb-16 lg:pt-10",
      )}
    >
      {sidebar}
      <main
        className={cn(
          "min-w-0 flex-1",
          ticketChat && "lg:min-h-0",
        )}
      >
        {ticketChat ? null : <AccountSectionTabs />}
        {children}
      </main>
    </div>
  );
}
