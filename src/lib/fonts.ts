import { Anton, Archivo_Black, IBM_Plex_Mono } from "next/font/google"

export const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-anton",
  display: "swap",
})

export const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-plex-mono",
  display: "swap",
})

export const archivoBlack = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-archivo-black",
  display: "swap",
})

export const receiptFontVariables = `${anton.variable} ${plexMono.variable} ${archivoBlack.variable}`
