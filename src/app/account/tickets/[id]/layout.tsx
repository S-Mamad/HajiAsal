export default function AccountTicketDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Keeps account main from collapsing while chat is position:fixed on mobile */}
      <div
        aria-hidden
        className="pointer-events-none md:hidden"
        style={{
          height:
            "calc(100dvh - var(--site-header-h, 4rem) - var(--account-bottom-chrome, 6.75rem) - env(safe-area-inset-bottom, 0px))",
        }}
      />
      <div
        className={[
          // Mobile: true app shell between site header and account bottom nav
          "fixed inset-x-0 z-[105] flex min-h-0 flex-col overflow-hidden",
          "top-[var(--site-header-h,4rem)]",
          "bottom-[calc(var(--account-bottom-chrome,6.75rem)+env(safe-area-inset-bottom,0px))]",
          // Desktop: sit inside account main as an elevated panel
          "md:static md:inset-auto md:z-auto",
          "md:h-[min(70vh,40rem)] md:max-h-none",
          "md:rounded-2xl md:border md:border-border md:shadow-sm",
        ].join(" ")}
      >
        {children}
      </div>
    </>
  );
}
