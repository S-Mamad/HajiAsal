"use client";

import { useEffect, useState } from "react";
import { AdminCrudList } from "@/components/admin/ui/AdminCrudList";
import { AdminModal } from "@/components/admin/ui/AdminModal";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import {
  AdminInput,
  AdminSelect,
  AdminTextarea,
  FormField,
} from "@/components/admin/ui/AdminForm";
import { useAdminToast } from "@/components/admin/ui/AdminToast";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import type { AdminPermission } from "@/lib/admin/permissions";
import type { DataTableColumn } from "@/components/admin/ui/DataTable";

type Field =
  | { key: string; label: string; type?: "text" | "textarea" | "select"; required?: boolean; options?: { value: string; label: string }[]; dir?: "ltr" | "rtl" };

interface Props<T extends Record<string, unknown>> {
  endpoint: string;
  titleCreate: string;
  titleEdit: string;
  createPermission: AdminPermission;
  deletePermission?: AdminPermission;
  columns: DataTableColumn<T>[];
  searchKeys: (row: T) => string;
  fields: Field[];
  toPayload: (values: Record<string, string>, editing: T | null) => Record<string, unknown>;
  fromRow?: (row: T) => Record<string, string>;
  exportFilename?: string;
  method?: "POST" | "PATCH";
}

export function AdminSimpleModulePage<T extends { id: string }>({
  endpoint,
  titleCreate,
  titleEdit,
  createPermission,
  deletePermission,
  columns,
  searchKeys,
  fields,
  toPayload,
  fromRow,
  exportFilename,
  method = "POST",
}: Props<T>) {
  const toast = useAdminToast();
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  return (
    <AdminCrudList<T>
      endpoint={endpoint}
      dataKey="items"
      rowKey={(r) => r.id}
      searchKeys={searchKeys}
      createPermission={createPermission}
      deletePermission={deletePermission}
      exportFilename={exportFilename}
      exportRow={(r) => {
        const out: Record<string, string | number | boolean | null | undefined> = {
          id: r.id,
        };
        for (const f of fields) {
          out[f.key] = String((r as Record<string, unknown>)[f.key] ?? "");
        }
        return out;
      }}
      columns={columns}
      renderForm={({ open, editing, onClose, onSaved }) => (
        <FormModal
          open={open}
          editing={editing}
          onClose={onClose}
          title={editing ? titleEdit : titleCreate}
          fields={fields}
          values={values}
          setValues={setValues}
          fromRow={fromRow}
          saving={saving}
          onSave={async () => {
            setSaving(true);
            try {
              const res = await fetch(endpoint, {
                method,
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(toPayload(values, editing)),
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error ?? "خطا");
              toast.success("ذخیره شد");
              setValues({});
              onSaved();
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "خطا");
            } finally {
              setSaving(false);
            }
          }}
        />
      )}
    />
  );
}

function FormModal<T extends Record<string, unknown>>({
  open,
  editing,
  onClose,
  title,
  fields,
  values,
  setValues,
  fromRow,
  saving,
  onSave,
}: {
  open: boolean;
  editing: T | null;
  onClose: () => void;
  title: string;
  fields: Field[];
  values: Record<string, string>;
  setValues: (v: Record<string, string>) => void;
  fromRow?: (row: T) => Record<string, string>;
  saving: boolean;
  onSave: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    if (editing && fromRow) setValues(fromRow(editing));
    else if (!editing) {
      const empty: Record<string, string> = {};
      for (const f of fields) empty[f.key] = "";
      setValues(empty);
    }
  }, [open, editing, fields, fromRow, setValues]);

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <AdminButton disabled={saving} onClick={onSave}>
          {saving ? "..." : "ذخیره"}
        </AdminButton>
      }
    >
      <div className="space-y-3">
        {fields.map((f) => (
          <FormField key={f.key} label={f.label} required={f.required}>
            {f.type === "textarea" ? (
              <AdminTextarea
                value={values[f.key] ?? ""}
                onChange={(e) =>
                  setValues({ ...values, [f.key]: e.target.value })
                }
              />
            ) : f.type === "select" ? (
              <AdminSelect
                value={values[f.key] ?? ""}
                onChange={(e) =>
                  setValues({ ...values, [f.key]: e.target.value })
                }
              >
                {(f.options ?? []).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </AdminSelect>
            ) : (
              <AdminInput
                dir={f.dir}
                value={values[f.key] ?? ""}
                onChange={(e) =>
                  setValues({ ...values, [f.key]: e.target.value })
                }
              />
            )}
          </FormField>
        ))}
      </div>
    </AdminModal>
  );
}

export { StatusBadge };
