"use client";

import { Protected, RoleGuard } from "@components/Guards";
import { FieldIssuesWorkspace } from "../../../ulb/components/FieldIssuesWorkspace";

export default function Page() {
  return <Protected><RoleGuard roles={["COMMISSIONER"]}><FieldIssuesWorkspace /></RoleGuard></Protected>;
}
