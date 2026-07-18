const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "src/app/api/admin");

const map = {
  dashboard: { GET: "dashboard.view" },
  products: {
    GET: "products.view",
    POST: "products.create",
    PATCH: "products.edit",
    PUT: "products.edit",
    DELETE: "products.delete",
  },
  categories: {
    GET: "categories.view",
    POST: "categories.manage",
    PATCH: "categories.manage",
    PUT: "categories.manage",
    DELETE: "categories.manage",
  },
  orders: {
    GET: "orders.view",
    POST: "orders.edit",
    PATCH: "orders.edit",
    PUT: "orders.edit",
    DELETE: "orders.edit",
  },
  customers: {
    GET: "customers.view",
    POST: "customers.edit",
    PATCH: "customers.edit",
    PUT: "customers.edit",
    DELETE: "customers.edit",
  },
  inventory: {
    GET: "inventory.view",
    POST: "inventory.edit",
    PATCH: "inventory.edit",
    PUT: "inventory.edit",
  },
  sellers: {
    GET: "sellers.view",
    POST: "sellers.manage",
    PATCH: "sellers.manage",
    PUT: "sellers.manage",
    DELETE: "sellers.manage",
  },
  reviews: {
    GET: "reviews.view",
    POST: "reviews.moderate",
    PATCH: "reviews.moderate",
    PUT: "reviews.moderate",
    DELETE: "reviews.moderate",
  },
  coupons: {
    GET: "coupons.view",
    POST: "coupons.manage",
    PATCH: "coupons.manage",
    PUT: "coupons.manage",
    DELETE: "coupons.manage",
  },
  messages: {
    GET: "messages.view",
    POST: "messages.manage",
    PATCH: "messages.manage",
    PUT: "messages.manage",
  },
  newsletter: {
    GET: "newsletter.view",
    POST: "newsletter.manage",
    PATCH: "newsletter.manage",
    DELETE: "newsletter.manage",
  },
  content: {
    GET: "content.view",
    POST: "content.manage",
    PATCH: "content.manage",
    PUT: "content.manage",
  },
  reports: { GET: "reports.view" },
  settings: {
    GET: "settings.view",
    POST: "settings.edit",
    PATCH: "settings.edit",
    PUT: "settings.edit",
  },
  "seller-products": {
    GET: "sellers.view",
    PATCH: "sellers.manage",
    PUT: "sellers.manage",
    POST: "sellers.manage",
  },
};

function walk(dir, files = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, files);
    else if (e.name === "route.ts" && !p.includes(`${path.sep}auth${path.sep}`))
      files.push(p);
  }
  return files;
}

function detectKey(file) {
  const rel = file.replace(/\\/g, "/");
  if (rel.includes("/export/")) return "export";
  const keys = Object.keys(map);
  return keys.find((k) => rel.includes(`/api/admin/${k}`)) || "dashboard";
}

const files = walk(root);
let changed = 0;

for (const file of files) {
  let src = fs.readFileSync(file, "utf8");
  if (!src.includes("isAdminRequestAuthenticatedAsync")) continue;

  const key = detectKey(file);
  const perms =
    key === "export"
      ? { GET: "reports.export", POST: "reports.export" }
      : map[key] || { GET: "dashboard.view" };

  // Remove old import
  src = src.replace(
    /import\s*\{([^}]*)\}\s*from\s*"@\/lib\/server\/admin";\n?/,
    (m, inner) => {
      const names = inner
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .filter((n) => n !== "isAdminRequestAuthenticatedAsync");
      if (names.length === 0) return "";
      return `import { ${names.join(", ")} } from "@/lib/server/admin";\n`;
    },
  );

  if (!src.includes('from "@/lib/server/admin-gate"')) {
    src = `import { gateAdmin } from "@/lib/server/admin-gate";\n` + src;
  }

  // Replace auth if-blocks — assign permission by nearest export async function
  const methodPerm = (method) => perms[method] || perms.GET || "dashboard.view";

  src = src.replace(
    /export async function (GET|POST|PATCH|PUT|DELETE)\(([^)]*)\)\s*\{([\s\S]*?)(?=\nexport async function |\n*$)/g,
    (full, method, args, body) => {
      let newBody = body.replace(
        /if\s*\(\s*!\s*\(\s*await\s+isAdminRequestAuthenticatedAsync\s*\(\s*request\s*\)\s*\)\s*\)\s*\{[\s\S]*?\n\s*\}/,
        `const __gate = await gateAdmin(request, "${methodPerm(method)}");\n  if (!__gate.ok) return __gate.response;`,
      );
      return `export async function ${method}(${args}) {${newBody}`;
    },
  );

  // leftover cleanup
  src = src.replace(/isAdminRequestAuthenticatedAsync/g, "/* removed */ gateAdmin");

  fs.writeFileSync(file, src);
  changed++;
  console.log("updated", file);
}

console.log("done", changed);
