import type { Metadata } from "next"
import { receiptFontVariables } from "@/lib/fonts"
import "./globals.css"

export const metadata: Metadata = {
  title: "Jargon Jar",
  description: "A virtual swear jar for corporate jargon",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={receiptFontVariables}>
      <body className="bg-[#F2ECD9] text-[#0B0B0E] antialiased">
        {children}
      </body>
    </html>
  )
}
