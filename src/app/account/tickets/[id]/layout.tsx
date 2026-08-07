export default function AccountTicketDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={[
        // Mobile: break out of account padding and fill viewport above bottom nav
        "-mx-4 -mt-8",
        "h-[calc(100dvh-6.5rem-env(safe-area-inset-bottom,0px))]",
        "max-h-[calc(100dvh-6.5rem-env(safe-area-inset-bottom,0px))]",
        "-mb-[calc(6.5rem+env(safe-area-inset-bottom,0px))]",
        // Desktop: normal embedded card height inside account shell
        "md:mx-0 md:mt-0 md:mb-0",
        "md:h-[min(70vh,40rem)] md:max-h-none",
        "flex min-h-0 flex-col overflow-hidden",
        "md:rounded-2xl md:border md:border-border md:shadow-sm",
      ].join(" ")}
    >
      {children}
    </div>
  );
}
