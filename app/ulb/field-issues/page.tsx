"use client";

import { Protected, RoleGuard } from "@components/Guards";
import PortalHomeLayout from "@components/PortalHomeLayout";
import { FieldIssuesWorkspace } from "../components/FieldIssuesWorkspace";

export default function Page() {
  return <Protected><RoleGuard roles={["ULB_OFFICER", "CITY_ADMIN", "COMMISSIONER"]}><PortalHomeLayout><FieldIssuesWorkspace /></PortalHomeLayout></RoleGuard></Protected>;
}
