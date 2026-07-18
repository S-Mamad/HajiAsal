export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToCsv(
  filename: string,
  rows: Record<string, string | number | boolean | null | undefined>[],
) {
  if (rows.length === 0) {
    downloadBlob(filename, new Blob(["\uFEFF"], { type: "text/csv;charset=utf-8" }));
    return;
  }
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const raw = row[h] ?? "";
          const str = String(raw).replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(","),
    ),
  ];
  const blob = new Blob(["\uFEFF" + lines.join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  downloadBlob(filename.endsWith(".csv") ? filename : `${filename}.csv`, blob);
}

export function exportToJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  downloadBlob(filename.endsWith(".json") ? filename : `${filename}.json`, blob);
}

export function printHtml(title: string, bodyHtml: string) {
  const win = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
  if (!win) return;
  win.document.write(`<!doctype html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { font-family: Tahoma, sans-serif; padding: 24px; color: #1c1917; }
    h1 { font-size: 18px; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #d6d3d1; padding: 8px; text-align: right; }
    th { background: #f5f5f4; }
    @media print { button { display: none; } }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${bodyHtml}
  <script>window.onload = () => { window.print(); };<\/script>
</body>
</html>`);
  win.document.close();
}

/** Excel-friendly TSV disguised as .xls for zero-dep export */
export function exportToExcel(
  filename: string,
  rows: Record<string, string | number | boolean | null | undefined>[],
) {
  if (rows.length === 0) {
    downloadBlob(
      filename.endsWith(".xls") ? filename : `${filename}.xls`,
      new Blob(["\uFEFF"], { type: "application/vnd.ms-excel" }),
    );
    return;
  }
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join("\t"),
    ...rows.map((row) => headers.map((h) => String(row[h] ?? "")).join("\t")),
  ];
  const blob = new Blob(["\uFEFF" + lines.join("\n")], {
    type: "application/vnd.ms-excel",
  });
  downloadBlob(filename.endsWith(".xls") ? filename : `${filename}.xls`, blob);
}
