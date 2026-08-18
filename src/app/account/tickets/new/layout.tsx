import { AccountTicketChatShell } from "@/components/account/AccountTicketChatShell";

export default function AccountTicketNewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AccountTicketChatShell>{children}</AccountTicketChatShell>;
}
