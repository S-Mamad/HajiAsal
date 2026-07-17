"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight } from "@phosphor-icons/react";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { DataTable } from "@/components/admin/ui/DataTable";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { hajiasalPath } from "@/lib/paths";
import type { Product, ProductApprovalStatus } from "@/types";

type SellerStatus = "pending" | "active" | "suspended" | "rejected";

interface SellerDetail {
  id: string;
  shopName: string;
  ownerName: string;
  phone: string;
  city: string;
  status: SellerStatus;
  notes?: string;
  commissionPercent: number;
  joinedAt: string;
  reviewNote?: string;
}

interface SellerOrderRow {
  id: string;
  status: string;
  sellerSubtotal: number;
  createdAt: string;
  customer: { fullName: string; phone: string };
}

const STATUS_LABELS: Record<SellerStatus, string> = {
  pending: "در انتظار تأیید",
  active: "فعال",
  suspended: "معلق",
  rejected: "رد شده",
};

const APPROVAL_LABELS: Record<ProductApprovalStatus, string> = {
  pending: "در انتظار تأیید",
  approved: "تأیید شده",
  rejected: "رد شده",
};

export default function AdminSellerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [seller, setSeller] = useState<SellerDetail | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<SellerOrderRow[]>([]);
  const [stats, setStats] = useState({
    productCount: 0,
    pendingProductCount: 0,
    orderCount: 0,
    revenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [shopName, setShopName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [commission, setCommission] = useState("10");
  const [notes, setNotes] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<SellerStatus>("pending");
  const [reviewNote, setReviewNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/sellers/${params.id}`);
      if (res.status === 401) {
        router.push(hajiasalPath("/admin"));
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا");
      const s = data.seller as SellerDetail;
      setSeller(s);
      setProducts(data.products ?? []);
      setOrders(data.orders ?? []);
      setStats(
        data.stats ?? {
          productCount: 0,
          pendingProductCount: 0,
          orderCount: 0,
          revenue: 0,
        },
      );
      setShopName(s.shopName);
      setOwnerName(s.ownerName);
      setPhone(s.phone);
      setCity(s.city ?? "");
      setCommission(String(s.commissionPercent ?? 10));
      setNotes(s.notes ?? "");
      setStatus(s.status);
      setReviewNote(s.reviewNote ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
      setSeller(null);
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const payload: Record<string, unknown> = {
        shopName,
        ownerName,
        phone,
        city,
        commissionPercent: Number(commission) || 0,
        notes: notes || null,
        status,
        reviewNote: reviewNote || null,
      };
      if (password.trim()) payload.password = password.trim();

      const res = await fetch(`/api/admin/sellers/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "ذخیره ناموفق بود");
      setPassword("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setSaving(false);
    }
  };

  const quickSetStatus = async (next: SellerStatus) => {
    setStatus(next);
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/sellers/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (data as { error?: string }).error ?? "تغییر وضعیت ناموفق بود",
        );
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setSaving(false);
    }
  };

  const setProductApproval = async (
    productId: string,
    approvalStatus: ProductApprovalStatus,
  ) => {
    setError("");
    const res = await fetch(`/api/admin/seller-products/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approvalStatus }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(
        (data as { error?: string }).error ?? "تغییر وضعیت محصول ناموفق بود",
      );
      return;
    }
    void load();
  };

  const removeSeller = async () => {
    if (
      !confirm(
        "حذف فروشنده؟ محصولات اختصاصی او هم حذف می‌شوند (در صورت اتصال دیتابیس).",
      )
    ) {
      return;
    }
    setError("");
    const res = await fetch(`/api/admin/sellers/${params.id}`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError((data as { error?: string }).error ?? "حذف ناموفق بود");
      return;
    }
    router.push(hajiasalPath("/admin/sellers"));
  };

  if (loading) {
    return <p className="text-sm text-slate-500">در حال بارگذاری...</p>;
  }

  if (!seller) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-500">{error || "فروشنده یافت نشد"}</p>
        <AdminButton href={hajiasalPath("/admin/sellers")} variant="outline">
          بازگشت
        </AdminButton>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href={hajiasalPath("/admin/sellers")}
            className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
          >
            <Icon icon={ArrowRight} size={16} />
            بازگشت به فروشندگان
          </Link>
          <h2 className="text-xl font-semibold text-slate-900">
            {seller.shopName}
          </h2>
          <p className="text-sm text-slate-500">
            {STATUS_LABELS[seller.status]} · از {seller.joinedAt}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AdminButton
            type="button"
            variant="outline"
            onClick={() => void load()}
          >
            بروزرسانی
          </AdminButton>
          <AdminButton
            type="button"
            variant="ghost"
            onClick={() => void removeSeller()}
            className="!text-rose-700"
          >
            حذف فروشنده
          </AdminButton>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["محصولات", stats.productCount],
          ["در انتظار تأیید", stats.pendingProductCount],
          ["سفارش‌ها", stats.orderCount],
          ["درآمد", `${stats.revenue.toLocaleString("fa-IR")} ت`],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {typeof value === "number"
                ? value.toLocaleString("fa-IR")
                : value}
            </p>
          </div>
        ))}
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-3 text-sm font-medium text-slate-700">
          ویرایش مشخصات و دسترسی
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Input
            placeholder="نام فروشگاه"
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
          />
          <Input
            placeholder="نام صاحب"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
          />
          <Input
            placeholder="موبایل"
            dir="ltr"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Input
            placeholder="شهر"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
          <Input
            placeholder="کمیسیون %"
            dir="ltr"
            type="number"
            value={commission}
            onChange={(e) => setCommission(e.target.value)}
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as SellerStatus)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="pending">در انتظار تأیید</option>
            <option value="active">فعال</option>
            <option value="suspended">معلق</option>
            <option value="rejected">رد شده</option>
          </select>
          <Input
            placeholder="رمز جدید (اختیاری)"
            type="password"
            dir="ltr"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="sm:col-span-2"
          />
          <Input
            placeholder="یادداشت داخلی ادمین"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="sm:col-span-2"
          />
          <Input
            placeholder="توضیح تأیید / رد حساب"
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            className="sm:col-span-2"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <AdminButton
            type="button"
            disabled={saving}
            onClick={() => void save()}
          >
            {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
          </AdminButton>
          {status !== "active" ? (
            <AdminButton
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => void quickSetStatus("active")}
            >
              وضعیت: فعال
            </AdminButton>
          ) : null}
          {status === "active" ? (
            <AdminButton
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => void quickSetStatus("suspended")}
            >
              وضعیت: معلق
            </AdminButton>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-slate-800">
          محصولات فروشنده (تأیید اجباری)
        </h3>
        <DataTable
          data={products}
          rowKey={(p) => p.id}
          emptyMessage="محصولی ثبت نشده"
          columns={[
            {
              key: "title",
              header: "محصول",
              render: (p) => (
                <div>
                  <p className="font-medium">{p.title}</p>
                  <p className="text-xs text-slate-400" dir="ltr">
                    {p.slug}
                  </p>
                </div>
              ),
            },
            {
              key: "approval",
              header: "وضعیت تأیید",
              render: (p) => {
                const st = p.approvalStatus ?? "approved";
                return APPROVAL_LABELS[st];
              },
            },
            {
              key: "stock",
              header: "موجودی",
              render: (p) => (p.inStock ? "موجود" : "ناموجود"),
            },
            {
              key: "actions",
              header: "",
              render: (p) => (
                <div className="flex flex-wrap gap-1">
                  {p.approvalStatus !== "approved" ? (
                    <AdminButton
                      type="button"
                      size="sm"
                      onClick={() => void setProductApproval(p.id, "approved")}
                    >
                      تأیید
                    </AdminButton>
                  ) : null}
                  {p.approvalStatus !== "rejected" ? (
                    <AdminButton
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => void setProductApproval(p.id, "rejected")}
                    >
                      رد
                    </AdminButton>
                  ) : null}
                  {p.approvalStatus === "approved" ? (
                    <AdminButton
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void setProductApproval(p.id, "pending")}
                    >
                      بازگشت به بررسی
                    </AdminButton>
                  ) : null}
                </div>
              ),
            },
          ]}
        />
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-slate-800">سفارش‌های مرتبط</h3>
        <DataTable
          data={orders}
          rowKey={(o) => o.id}
          emptyMessage="سفارشی ثبت نشده"
          columns={[
            {
              key: "id",
              header: "سفارش",
              render: (o) => (
                <Link
                  href={hajiasalPath(`/admin/orders/${o.id}`)}
                  className="font-mono text-xs hover:underline"
                  dir="ltr"
                >
                  {o.id}
                </Link>
              ),
            },
            {
              key: "customer",
              header: "مشتری",
              render: (o) => o.customer.fullName,
            },
            {
              key: "total",
              header: "سهم فروشنده",
              render: (o) =>
                `${o.sellerSubtotal.toLocaleString("fa-IR")} تومان`,
            },
            {
              key: "status",
              header: "وضعیت",
              render: (o) => o.status,
            },
            {
              key: "date",
              header: "تاریخ",
              render: (o) =>
                new Date(o.createdAt).toLocaleDateString("fa-IR"),
            },
          ]}
        />
      </div>
    </div>
  );
}
