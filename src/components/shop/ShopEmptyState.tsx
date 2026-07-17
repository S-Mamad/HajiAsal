import { MagnifyingGlass } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { hajiasalPath } from "@/lib/paths";

export function ShopEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface px-6 py-20 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gold-dim text-amber">
        <MagnifyingGlass size={24} weight="light" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-brown">
        محصولی با این فیلترها یافت نشد
      </h3>
      <p className="mb-6 max-w-sm text-sm text-muted">
        فیلترها را تغییر دهید یا همه محصولات را ببینید.
      </p>
      <Button href={hajiasalPath("/shop")} variant="outline">
        مشاهده همه محصولات
      </Button>
    </div>
  );
}
