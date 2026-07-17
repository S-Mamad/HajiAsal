interface AdminStubPageProps {
  title: string;
  description?: string;
}

export function AdminStubPage({
  title,
  description = "این بخش در نسخه‌های بعدی تکمیل می‌شود.",
}: AdminStubPageProps) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}
