"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { DataTable, type DataTableColumn } from "@/components/admin/ui/DataTable";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { ConfirmModal } from "@/components/admin/ui/AdminModal";
import { useAdminToast } from "@/components/admin/ui/AdminToast";
import { Can } from "@/components/admin/auth/AdminAuthProvider";
import type { AdminPermission } from "@/lib/admin/permissions";
import { exportToCsv, exportToExcel } from "@/lib/admin/export";

interface AdminCrudListProps<T> {
  endpoint: string;
  rowKey: (row: T) => string;
  columns: DataTableColumn<T>[];
  searchKeys: (row: T) => string;
  emptyMessage?: string;
  createPermission?: AdminPermission;
  deletePermission?: AdminPermission;
  onCreateClick?: () => void;
  createLabel?: string;
  dataKey?: string;
  exportFilename?: string;
  exportRow?: (row: T) => Record<string, string | number | boolean | null | undefined>;
  renderForm?: (args: {
    open: boolean;
    editing: T | null;
    onClose: () => void;
    onSaved: () => void;
  }) => ReactNode;
  extraToolbar?: ReactNode;
}

export function AdminCrudList<T>({
  endpoint,
  rowKey,
  columns,
  searchKeys,
  emptyMessage,
  createPermission,
  deletePermission,
  onCreateClick,
  createLabel = "افزودن",
  dataKey = "items",
  exportFilename = "export",
  exportRow,
  renderForm,
  extraToolbar,
}: AdminCrudListProps<T>) {
  const toast = useAdminToast();
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(endpoint, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا در بارگذاری");
      setRows((data[dataKey] ?? data.items ?? data.rows ?? []) as T[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setLoading(false);
    }
  }, [endpoint, dataKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const bulkDelete = async () => {
    setDeleting(true);
    try {
      for (const id of selected) {
        const res = await fetch(`${endpoint}?id=${encodeURIComponent(id)}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "حذف ناموفق");
        }
      }
      toast.success("حذف انجام شد");
      setSelected([]);
      setConfirmOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در حذف");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <DataTable
        columns={[
          ...columns,
          {
            key: "_actions",
            header: "عملیات",
            render: (row) => (
              <div className="flex gap-2">
                <button
                  type="button"
                  className="text-xs text-amber-800 hover:underline"
                  onClick={() => {
                    setEditing(row);
                    setFormOpen(true);
                    onCreateClick?.();
                  }}
                >
                  ویرایش
                </button>
              </div>
            ),
          },
        ]}
        data={rows}
        rowKey={rowKey}
        loading={loading}
        error={error}
        onRetry={load}
        searchable
        searchKeys={searchKeys}
        emptyMessage={emptyMessage}
        selectable
        selectedKeys={selected}
        onSelectionChange={setSelected}
        toolbar={
          <div className="flex flex-wrap gap-2">
            {createPermission ? (
              <Can permission={createPermission}>
                <AdminButton
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setFormOpen(true);
                    onCreateClick?.();
                  }}
                >
                  {createLabel}
                </AdminButton>
              </Can>
            ) : null}
            {exportRow ? (
              <>
                <AdminButton
                  type="button"
                  variant="outline"
                  onClick={() =>
                    exportToCsv(
                      exportFilename,
                      rows.map(exportRow),
                    )
                  }
                >
                  CSV
                </AdminButton>
                <AdminButton
                  type="button"
                  variant="outline"
                  onClick={() =>
                    exportToExcel(
                      exportFilename,
                      rows.map(exportRow),
                    )
                  }
                >
                  Excel
                </AdminButton>
              </>
            ) : null}
            {extraToolbar}
          </div>
        }
        bulkActions={
          deletePermission ? (
            <Can permission={deletePermission}>
              <AdminButton
                type="button"
                variant="outline"
                onClick={() => setConfirmOpen(true)}
              >
                حذف گروهی
              </AdminButton>
            </Can>
          ) : null
        }
      />

      {renderForm?.({
        open: formOpen,
        editing,
        onClose: () => setFormOpen(false),
        onSaved: () => {
          setFormOpen(false);
          void load();
        },
      })}

      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void bulkDelete()}
        title="حذف موارد انتخاب‌شده"
        description={`${selected.length} مورد حذف می‌شود. این عمل قابل بازگشت نیست.`}
        confirmLabel="حذف"
        danger
        loading={deleting}
      />
    </div>
  );
}
