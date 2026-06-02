import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireAuthAndOnboarding } from "@/lib/authGuard";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: requireAuthAndOnboarding,
  component: () => <Outlet />,
});
