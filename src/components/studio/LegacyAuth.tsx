"use client";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
const Provider = dynamic(
  () => import("@/components/auth/AuthProvider").then((m) => m.AuthProvider),
  { ssr: false },
);
export function LegacyAuth({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return /^\/(dashboard|checkout|sign-in|sign-up|admin|pricing)(\/|$)/.test(
    path,
  ) ? (
    <Provider>{children}</Provider>
  ) : (
    children
  );
}
