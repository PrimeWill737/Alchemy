import type { UserRole } from "@/types/crm";

export type AdminLayer = "super_admin" | "admin";

export function isAdminLayer(role: UserRole): role is AdminLayer {
  return role === "super_admin" || role === "admin";
}

export function adminLayerLabel(layer: AdminLayer) {
  return layer === "super_admin" ? "Super Admin" : "Admin";
}
