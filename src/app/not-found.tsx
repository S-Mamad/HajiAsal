import { Button } from "@/components/ui/Button";
import { hajiasalPath } from "@/lib/paths";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <p className="mb-2 text-6xl font-bold text-gold">۴۰۴</p>
      <h1 className="mb-3 text-xl font-semibold text-primary">صفحه یافت نشد</h1>
      <p className="mb-8 text-secondary">
        ممکن است آدرس اشتباه باشد یا صفحه حذف شده باشد.
      </p>
      <div className="flex gap-3">
        <Button href={hajiasalPath("/")}>خانه</Button>
        <Button href={hajiasalPath("/shop")} variant="outline">
          فروشگاه
        </Button>
      </div>
    </div>
  );
}
