/** Immersive account support chat routes (new + thread). */
export function isAccountTicketChatPath(pathname: string): boolean {
  const p = pathname.split("?")[0] ?? "";
  return (
    p === "/account/tickets/new" ||
    /^\/account\/tickets\/[^/]+$/.test(p)
  );
}
