import { Protected, RoleGuard } from "@components/Guards";

const ALLOWED_ROLES = ["CITY_ADMIN", "HMS_SUPER_ADMIN", "COMMISSIONER", "ULB_OFFICER"] as const;

export default function CityAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Protected>
      <RoleGuard roles={[...ALLOWED_ROLES]}>
        <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "#f8fafc" }}>
          <div style={{ flex: 1, position: "relative" }}>
            {children}
          </div>
        </div>
      </RoleGuard>
    </Protected>
  );
}
