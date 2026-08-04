"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { Input } from "@/components/ui/Input";
import { SellerDataTable } from "@/components/seller/ui/SellerDataTable";
import { useSellerCan } from "@/components/seller/layout/SellerCapabilitiesContext";
import { hajiasalPath } from "@/lib/paths";

type Balance = { available: number; pending: number; totalEarned: number };
type Ledger = {
  id: string;
  type: string;
  amount: number;
  status: string;
  createdAt: string;
  note?: string;
};
type Withdrawal = {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
  note?: string;
  adminNote?: string;
};

export default function SellerWalletPage() {
  const router = useRouter();
  const canWithdraw = useSellerCan("wallet.withdraw");
  const [balance, setBalance] = useState<Balance | null>(null);
  const [ledger, setLedger] = useState<Ledger[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [hasSheba, setHasSheba] = useState(false);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/seller/wallet");
      if (res.status === 401) {
        router.push(hajiasalPath("/seller"));
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا");
      setBalance(data.balance);
      setLedger(data.ledger ?? []);
      setWithdrawals(data.withdrawals ?? []);
      setHasSheba(Boolean(data.hasSheba));
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const withdraw = async () => {
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/seller/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا");
      setMessage("درخواست تسویه ثبت شد");
      setAmount("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (n: number) => n.toLocaleString("fa-IR");

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      ) : null}
      {message ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-xs text-stone-500">قابل برداشت</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {fmt(balance?.available ?? 0)}
          </p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-xs text-stone-500">در انتظار</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {fmt(balance?.pending ?? 0)}
          </p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-xs text-stone-500">درآمد کل</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {fmt(balance?.totalEarned ?? 0)}
          </p>
        </div>
      </div>

      {canWithdraw ? (
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <h3 className="font-semibold">درخواست تسویه</h3>
          {!hasSheba ? (
            <p className="mt-3 text-sm text-amber-800">
              برای تسویه ابتدا شماره شبا را در{" "}
              <Link
                href={hajiasalPath("/seller/profile")}
                className="font-medium underline underline-offset-2"
              >
                پروفایل
              </Link>{" "}
              ثبت کنید.
            </p>
          ) : (
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div className="min-w-[160px] flex-1">
                <Input
                  label="مبلغ (تومان)"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  type="number"
                />
              </div>
              <AdminButton
                onClick={() => void withdraw()}
                disabled={submitting || !amount}
              >
                ثبت درخواست
              </AdminButton>
            </div>
          )}
        </div>
      ) : null}

      <SellerDataTable
        storageKey="seller.wallet.withdrawals"
        loading={loading}
        columns={[
          {
            key: "createdAt",
            header: "تاریخ",
            render: (r) => new Date(r.createdAt).toLocaleString("fa-IR"),
          },
          {
            key: "amount",
            header: "مبلغ",
            render: (r) => (
              <span className="tabular-nums">{fmt(r.amount)}</span>
            ),
          },
          { key: "status", header: "وضعیت", render: (r) => r.status },
          {
            key: "note",
            header: "یادداشت",
            render: (r) => r.adminNote || r.note || "-",
          },
        ]}
        data={withdrawals}
        rowKey={(r) => r.id}
        emptyMessage="درخواست تسویه‌ای ثبت نشده"
      />

      <SellerDataTable
        storageKey="seller.wallet.ledger"
        loading={loading}
        columns={[
          {
            key: "createdAt",
            header: "تاریخ",
            render: (r) => new Date(r.createdAt).toLocaleString("fa-IR"),
          },
          { key: "type", header: "نوع", render: (r) => r.type },
          {
            key: "amount",
            header: "مبلغ",
            render: (r) => (
              <span className="tabular-nums">{fmt(r.amount)}</span>
            ),
          },
          { key: "status", header: "وضعیت", render: (r) => r.status },
        ]}
        data={ledger}
        rowKey={(r) => r.id}
        emptyMessage="تراکنشی ثبت نشده"
      />
    </div>
  );
}
