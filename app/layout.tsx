import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL('https://bizbyme-app.vercel.app'),
  title: "Biz By Me - Find Local Business Networking Events",
  description: "Search local networking opportunities to maximize your business development",
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
  },
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
