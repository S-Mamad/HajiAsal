import { panelHomeUrl, panelSupportUrl } from "@/lib/auth/panel-access";

type PanelAccessDeniedProps = {
  panelLabel?: string;
};

export function PanelAccessDenied({
  panelLabel = "این صفحه",
}: PanelAccessDeniedProps) {
  const supportHref = panelSupportUrl();
  const homeHref = panelHomeUrl();

  return (
    <main
      dir="rtl"
      className="flex min-h-[100dvh] flex-col items-center justify-center bg-[var(--background,#faf8f5)] px-6 py-16 text-center"
    >
      <div className="mx-auto max-w-md">
        <p className="text-xs font-medium tracking-wide text-[var(--muted,#6b6560)]">
          حاجی‌عسل
        </p>
        <h1 className="mt-4 text-2xl font-semibold text-[var(--foreground,#1a1814)]">
          اجازه دسترسی ندارید
        </h1>
        <p className="mt-3 text-sm leading-7 text-[var(--muted,#6b6560)]">
          شما اجازه دسترسی به {panelLabel} را ندارید. اگر فکر می‌کنید این یک
          اشتباه است، با پشتیبانی تماس بگیرید.
        </p>
        <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
          <a
            href={supportHref}
            className="inline-flex items-center justify-center rounded-xl bg-[var(--primary,#2d5a3d)] px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
          >
            پشتیبانی
          </a>
          <a
            href={homeHref}
            className="inline-flex items-center justify-center rounded-xl border border-[var(--border,#e5e0d8)] bg-white px-5 py-3 text-sm font-medium text-[var(--foreground,#1a1814)] transition hover:bg-[var(--muted-bg,#f3efe8)]"
          >
            بازگشت به فروشگاه
          </a>
        </div>
      </div>
    </main>
  );
}
