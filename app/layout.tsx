import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Biz By Me - Find Local Business Networking Events",
  description: "Search local networking opportunities to maximize your business development",
  icons: {
    icon: "/bizbyme-logo.png",
    apple: "/bizbyme-logo.png",
  },
  openGraph: {
    title: "Biz By Me - Find Local Business Networking Events",
    description: "Search local networking opportunities to maximize your business development",
    images: ["/bizbyme-logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
