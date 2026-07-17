"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/admin/ui/DataTable";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { Input } from "@/components/ui/Input";
import { hajiasalPath } from "@/lib/paths";

type SellerStatus = "pending" | "active" | "suspended" | "rejected";

interface AdminSellerRow {
  id: string;
  shopName: string;
  ownerName: string;
  phone: string;
  city: string;
  status: SellerStatus;
  commissionPercent: number;
  joinedAt: string;
  productCount: number;
  pendingProductCount: number;
}

const STATUS_LABELS: Record<SellerStatus, string> = {
  pending: "در انتظار تأیید",
  active: "فعال",
  suspended: "معلق",
  rejected: "رد شده",
};

const STATUS_STYLES: Record<SellerStatus, string> = {
  pending: "bg-amber-50 text-amber-800 ring-amber-200",
  active: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  suspended: "bg-rose-50 text-rose-800 ring-rose-200",
  rejected: "bg-slate-100 text-slate-600 ring-slate-200",
};

export default function AdminSellersPage() {
  const router = useRouter();
  const [sellers, setSellers] = useState<AdminSellerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | SellerStatus>("all");

  const [shopName, setShopName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [city, setCity] = useState("");
  const [commission, setCommission] = useState("10");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/sellers");
      if (res.status === 401) {
        router.push(hajiasalPath("/admin"));
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا در بارگذاری");
      setSellers(data.sellers ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sellers.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (!q) return true;
      return (
        s.shopName.toLowerCase().includes(q) ||
        s.ownerName.toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        s.city.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
      );
    });
  }, [sellers, query, statusFilter]);

  const createSeller = async () => {
    if (!shopName.trim() || !ownerName.trim() || !phone.trim() || !password) {
      setError("نام فروشگاه، صاحب، موبایل و رمز الزامی است");
      return;
    }
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/admin/sellers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopName,
          ownerName,
          phone,
          password,
          city,
          commissionPercent: Number(commission) || 10,
          status: "active",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "ایجاد فروشنده ناموفق بود");
      setShopName("");
      setOwnerName("");
      setPhone("");
      setPassword("");
      setCity("");
      setCommission("10");
      await load();
      if (data.seller?.id) {
        router.push(hajiasalPath(`/admin/sellers/${data.seller.id}`));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setCreating(false);
    }
  };

  const setStatus = async (id: string, status: SellerStatus) => {
    setError("");
    const res = await fetch(`/api/admin/sellers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError((data as { error?: string }).error ?? "تغییر وضعیت ناموفق بود");
      return;
    }
    void load();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-3 text-sm font-medium text-slate-700">
          تعریف فروشنده جدید
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
            placeholder="رمز ورود"
            type="password"
            dir="ltr"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
        </div>
        <div className="mt-3">
          <AdminButton
            type="button"
            disabled={creating}
            onClick={() => void createSeller()}
          >
            {creating ? "در حال ایجاد..." : "ایجاد فروشنده"}
          </AdminButton>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="جستجو نام، موبایل، شهر..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs"
        />
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as "all" | SellerStatus)
          }
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="all">همه وضعیت‌ها</option>
          <option value="pending">در انتظار تأیید</option>
          <option value="active">فعال</option>
          <option value="suspended">معلق</option>
          <option value="rejected">رد شده</option>
        </select>
        <AdminButton type="button" variant="outline" onClick={() => void load()}>
          بروزرسانی
        </AdminButton>
        <p className="text-sm text-slate-500">
          {filtered.length.toLocaleString("fa-IR")} فروشنده
        </p>
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      {loading ? (
        <p className="text-sm text-slate-500">در حال بارگذاری...</p>
      ) : null}

      <DataTable
        data={filtered}
        rowKey={(row) => row.id}
        emptyMessage="فروشنده‌ای تعریف نشده است"
        columns={[
          {
            key: "shop",
            header: "فروشگاه",
            render: (row) => (
              <div>
                <Link
                  href={hajiasalPath(`/admin/sellers/${row.id}`)}
                  className="font-medium text-slate-900 hover:underline"
                >
                  {row.shopName}
                </Link>
                <p className="text-xs text-slate-400">{row.ownerName}</p>
              </div>
            ),
          },
          {
            key: "phone",
            header: "موبایل",
            render: (row) => (
              <span dir="ltr" className="text-xs">
                {row.phone}
              </span>
            ),
          },
          {
            key: "city",
            header: "شهر",
            render: (row) => row.city || "-",
          },
          {
            key: "status",
            header: "وضعیت",
            render: (row) => (
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[row.status]}`}
              >
                {STATUS_LABELS[row.status]}
              </span>
            ),
          },
          {
            key: "products",
            header: "محصولات",
            render: (row) => (
              <span className="text-sm">
                {row.productCount.toLocaleString("fa-IR")}
                {row.pendingProductCount > 0 ? (
                  <span className="ms-1 text-amber-700">
                    ({row.pendingProductCount.toLocaleString("fa-IR")} در انتظار)
                  </span>
                ) : null}
              </span>
            ),
          },
          {
            key: "commission",
            header: "کمیسیون",
            render: (row) =>
              `${row.commissionPercent.toLocaleString("fa-IR")}٪`,
          },
          {
            key: "actions",
            header: "",
            render: (row) => (
              <div className="flex flex-wrap gap-1">
                <AdminButton
                  type="button"
                  size="sm"
                  variant="outline"
                  href={hajiasalPath(`/admin/sellers/${row.id}`)}
                >
                  مدیریت
                </AdminButton>
                {row.status === "pending" ? (
                  <AdminButton
                    type="button"
                    size="sm"
                    onClick={() => void setStatus(row.id, "active")}
                  >
                    تأیید
                  </AdminButton>
                ) : null}
                {row.status === "active" ? (
                  <AdminButton
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => void setStatus(row.id, "suspended")}
                  >
                    تعلیق
                  </AdminButton>
                ) : null}
                {row.status === "suspended" ? (
                  <AdminButton
                    type="button"
                    size="sm"
                    onClick={() => void setStatus(row.id, "active")}
                  >
                    فعال‌سازی
                  </AdminButton>
                ) : null}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
