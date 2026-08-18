import { AccountTicketChatShell } from "@/components/account/AccountTicketChatShell";

export default function AccountTicketDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AccountTicketChatShell>{children}</AccountTicketChatShell>;
}
