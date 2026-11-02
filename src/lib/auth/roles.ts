import type { Role } from "@prisma/client";

export const STAFF_ROLES: Role[] = ["SUPER_ADMIN", "STORE_MANAGER", "FULFILLMENT"];

export type Permission =
  | "dashboard:view"
  | "reports:view"
  | "products:manage"
  | "inventory:manage"
  | "orders:view"
  | "orders:fulfil"
  | "orders:cancel"
  | "orders:export"
  | "customers:view"
  | "customers:pii"
  | "discounts:manage"
  | "content:manage"
  | "shipping:manage"
  | "staff:manage"
  | "settings:manage"
  | "audit:view";

const MATRIX: Record<Role, Permission[]> = {
  CUSTOMER: [],
  FULFILLMENT: ["dashboard:view", "orders:view", "orders:fulfil"],
  STORE_MANAGER: [
    "dashboard:view",
    "reports:view",
    "products:manage",
    "inventory:manage",
    "orders:view",
    "orders:fulfil",
    "orders:cancel",
    "orders:export",
    "customers:view",
    "customers:pii",
    "discounts:manage",
    "content:manage",
    "shipping:manage",
  ],
  SUPER_ADMIN: [
    "dashboard:view",
    "reports:view",
    "products:manage",
    "inventory:manage",
    "orders:view",
    "orders:fulfil",
    "orders:cancel",
    "orders:export",
    "customers:view",
    "customers:pii",
    "discounts:manage",
    "content:manage",
    "shipping:manage",
    "staff:manage",
    "settings:manage",
    "audit:view",
  ],
};

export function permissionsFor(roles: Role[]): Set<Permission> {
  return new Set(roles.flatMap((r) => MATRIX[r] ?? []));
}

export function hasPermission(roles: Role[], permission: Permission): boolean {
  return permissionsFor(roles).has(permission);
}

export function isStaff(roles: Role[]): boolean {
  return roles.some((r) => STAFF_ROLES.includes(r));
}
