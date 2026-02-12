import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Why It's Hot — Hot Sheet Editor",
  description: "Create complete Hot Sheet sell-in documents for brands",
};

export default function HotSheetLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
