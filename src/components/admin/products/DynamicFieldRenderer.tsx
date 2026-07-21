"use client";

import { Input } from "@/components/ui/Input";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import type { ProductFieldDefinition } from "@/types";
import { Plus, Trash } from "@phosphor-icons/react";
import { Icon } from "@/components/ui/Icon";

export function DynamicFieldRenderer({
  fields,
  values,
  onChange,
}: {
  fields: ProductFieldDefinition[];
  values: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  if (!fields.length) {
    return (
      <p className="text-sm text-stone-500">
        هنوز فیلد سفارشی تعریف نشده. از «فیلدهای سفارشی» در منو اضافه کنید.
      </p>
    );
  }

  const setValue = (key: string, value: unknown) => {
    onChange({ ...values, [key]: value });
  };

  return (
    <div className="space-y-4">
      {fields.map((field) => {
        const value = values[field.key];
        const label = `${field.label}${field.isRequired ? " *" : ""}`;

        if (field.type === "text" || field.type === "image") {
          return (
            <Input
              key={field.id}
              label={label}
              value={typeof value === "string" ? value : ""}
              onChange={(e) => setValue(field.key, e.target.value)}
              placeholder={field.type === "image" ? "https://..." : undefined}
            />
          );
        }

        if (field.type === "number") {
          return (
            <Input
              key={field.id}
              label={label}
              type="number"
              value={typeof value === "number" ? String(value) : ""}
              onChange={(e) =>
                setValue(
                  field.key,
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
            />
          );
        }

        if (field.type === "date") {
          return (
            <Input
              key={field.id}
              label={label}
              type="date"
              value={typeof value === "string" ? value : ""}
              onChange={(e) => setValue(field.key, e.target.value)}
            />
          );
        }

        if (field.type === "select") {
          const choices = field.options?.choices ?? [];
          return (
            <div key={field.id} className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-stone-700">
                {label}
              </label>
              <select
                className="h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm"
                value={typeof value === "string" ? value : ""}
                onChange={(e) => setValue(field.key, e.target.value)}
              >
                <option value="">انتخاب کنید</option>
                {choices.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          );
        }

        if (field.type === "repeater") {
          const items = Array.isArray(value) ? (value as string[]) : [];
          return (
            <div key={field.id} className="space-y-2">
              <p className="text-sm font-medium text-stone-700">{label}</p>
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    value={item}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx] = e.target.value;
                      setValue(field.key, next);
                    }}
                  />
                  <AdminButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setValue(
                        field.key,
                        items.filter((_, i) => i !== idx),
                      )
                    }
                  >
                    <Icon icon={Trash} size={16} />
                  </AdminButton>
                </div>
              ))}
              <AdminButton
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setValue(field.key, [...items, ""])}
              >
                <Icon icon={Plus} size={14} />
                افزودن ردیف
              </AdminButton>
            </div>
          );
        }

        if (field.type === "table") {
          const columns = field.options?.columns ?? ["ستون ۱"];
          const rows = Array.isArray(value)
            ? (value as Record<string, string>[])
            : [];
          return (
            <div key={field.id} className="space-y-2">
              <p className="text-sm font-medium text-stone-700">{label}</p>
              <div className="overflow-x-auto rounded-xl border border-stone-200">
                <table className="w-full text-sm">
                  <thead className="bg-stone-50 text-stone-500">
                    <tr>
                      {columns.map((col) => (
                        <th key={col} className="px-3 py-2 text-start">
                          {col}
                        </th>
                      ))}
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, rIdx) => (
                      <tr key={rIdx} className="border-t border-stone-100">
                        {columns.map((col) => (
                          <td key={col} className="px-2 py-1">
                            <input
                              className="h-9 w-full rounded-lg border border-stone-200 px-2 text-sm"
                              value={row[col] ?? ""}
                              onChange={(e) => {
                                const next = rows.map((r, i) =>
                                  i === rIdx
                                    ? { ...r, [col]: e.target.value }
                                    : r,
                                );
                                setValue(field.key, next);
                              }}
                            />
                          </td>
                        ))}
                        <td className="px-2">
                          <AdminButton
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setValue(
                                field.key,
                                rows.filter((_, i) => i !== rIdx),
                              )
                            }
                          >
                            <Icon icon={Trash} size={14} />
                          </AdminButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <AdminButton
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const blank: Record<string, string> = {};
                  columns.forEach((c) => {
                    blank[c] = "";
                  });
                  setValue(field.key, [...rows, blank]);
                }}
              >
                <Icon icon={Plus} size={14} />
                ردیف جدول
              </AdminButton>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}
