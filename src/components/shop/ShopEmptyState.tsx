import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { hajiasalPath } from "@/lib/paths";

export function ShopEmptyState() {
  return (
    <EmptyState
      className="py-20"
      title="محصولی با این فیلترها یافت نشد"
      description="فیلترها را تغییر دهید یا همه محصولات را ببینید."
      action={
        <Button href={hajiasalPath("/shop")} variant="outline">
          مشاهده همه محصولات
        </Button>
      }
    />
  );
}
