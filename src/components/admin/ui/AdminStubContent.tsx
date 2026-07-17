interface AdminStubContentProps {
  description?: string;
}

export function AdminStubContent({
  description = "این بخش در حال توسعه است و به‌زودی در دسترس قرار می‌گیرد.",
}: AdminStubContentProps) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      <p className="text-sm text-slate-500">{description}</p>
    </div>
  );
}
