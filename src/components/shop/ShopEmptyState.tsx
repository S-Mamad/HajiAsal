import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { hajiasalPath } from "@/lib/paths";

export function ShopEmptyState({ searchQuery }: { searchQuery?: string }) {
  if (searchQuery) {
    return (
      <EmptyState
        className="py-20"
        title="نتیجه‌ای یافت نشد"
        description={`برای «${searchQuery}» محصولی پیدا نشد. عبارت یا فیلترها را تغییر دهید.`}
        action={
          <Button href={hajiasalPath("/shop")} variant="outline">
            مشاهده همه محصولات
          </Button>
        }
      />
    );
  }

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
