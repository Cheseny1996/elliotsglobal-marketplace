import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Elliot’s Global — A little marketplace for a lot of good things",
  description: "Meet independent makers and brilliant little brands. Shop thoughtful finds across tech, home, style, beauty, outdoors, and food.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
