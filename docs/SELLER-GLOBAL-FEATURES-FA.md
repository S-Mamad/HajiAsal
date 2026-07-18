# قابلیت‌های سراسری پنل فروشنده

این لایه قبل از ماژول‌های کسب‌وکار در Foundation (فاز F0) پیاده می‌شود.

---

## 1) Global Search

### هدف
جستجوی سریع در کل دامنهٔ فروشنده: محصولات، سفارشات، تیکت‌ها (و در فاز بعد مشتریان/فایل‌ها).

### UX
- تریگر: دکمه در Header + `Ctrl+K` / `⌘K`
- Command palette تمام‌صفحه ملایم، input فوکوس فوری
- گروه‌بندی نتایج: محصولات / سفارشات / تیکت‌ها
- Enter → رفتن به جزئیات؛ Esc بستن
- Empty: «چیزی پیدا نشد» + پیشنهاد فیلتر ماژول

### رفتار فنی
- API: `GET /api/seller/search?q=&limit=8` (فقط وقتی پیاده‌سازی UI آماده است)
- Scope اجباری: `seller_id`
- Debounce ۲۵۰ms سمت کلاینت
- حداقل ۲ کاراکتر

### ستون‌های نتیجه (نمایش)
| نوع | عنوان | زیر‌عنوان |
|-----|--------|-----------|
| product | عنوان محصول | SKU / وضعیت |
| order | شماره سفارش | وضعیت + مبلغ سهم |
| ticket | عنوان تیکت | وضعیت |

---

## 2) Notification Center

### هدف
اعلان‌های زنده با Badge: اتمام موجودی، سفارش جدید، پاسخ تیکت، پیام مدیر، وضعیت تسویه.

### UX
- زنگوله در Header با شمارنده نخوانده
- Drawer/Popover: لیست، Mark as read، Mark all، لینک به موجودیت
- انواع: `inventory_low` | `order_new` | `ticket_reply` | `admin_message` | `wallet` | `system`

### رفتار فنی
- جدول `seller_notifications` با `seller_id`, `read_at`
- تولید رویداد از mutationهای مرتبط (موجودی، سفارش، تیکت)
- Polling سبک هر ۶۰s یا refresh روی focus؛ WebSocket الزامی نیست در F0

---

## 3) Keyboard Shortcuts

| میانبر | عمل |
|--------|-----|
| `Ctrl+K` | Global Search |
| `G` سپس `D` | داشبورد |
| `G` سپس `P` | محصولات |
| `G` سپس `O` | سفارشات |
| `G` سپس `I` | موجودی |
| `G` سپس `W` | کیف پول |
| `N` | Quick create (محصول جدید در صفحه محصولات) |
| `?` | راهنمای میانبرها |
| `Esc` | بستن overlay/modal |

قوانین: وقتی focus داخل input/textarea است، chordهای `G` فعال نشوند مگر modifier.

---

## 4) Activity Log

### هدف
شفافیت برای فروشنده: چه کسی (همان حساب) چه کاری، چه زمان، از چه IP.

### لیست
ستون‌ها: زمان، اقدام، موجودیت، خلاصه، IP

### فیلتر
بازه تاریخ، نوع اقدام، موجودیت

### ثبت اجباری
login، logout، product CRUD، inventory adjust، order status/tracking، withdrawal request، settings/profile change، import/export

---

## 5) استاندارد Data Grid

پیاده‌سازی در `components/seller/ui/DataTable` (یا shared با ادمین اگر extract شد).

### الزامات
1. Show/Hide Columns + persist
2. Rows per page
3. Saved Filters (نام‌دار، per module)
4. Advanced search drawer
5. Row selection + select page / select filtered (با سقف ایمنی مثلاً ۵۰۰)
6. Export/Print **فقط selected** به‌صورت پیش‌فرض
7. حالت‌های loading/empty/error یکسان در همه ماژول‌ها

### قرارداد props (مفهومی)

```ts
type SellerDataTableProps<T> = {
  columns: ColumnDef<T>[];
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  onSortChange?: (sort: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  bulkActions?: BulkAction[];
  storageKey: string; // مثلاً seller.products.grid
};
```

STOP اگر جدولی بدون pagination یا بدون scope seller ساخته شود.
