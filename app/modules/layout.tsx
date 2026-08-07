import { Protected } from "@components/Guards";

export default function ModulesLayout({ children }: { children: React.ReactNode }) {
  return (
    <Protected>
      {children}
    </Protected>
  );
}
