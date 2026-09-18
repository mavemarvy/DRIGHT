import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Smart Better App",
  description: "Correct-score combination planner with 676 two-match combinations.",
};

export default function SmartBetterAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
