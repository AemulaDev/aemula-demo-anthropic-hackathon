import { Montserrat, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: 'variable',
});

const sourceSerif4 = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: 'variable',
});

export const metadata = {
  title: "Aemula",
  description: "News without the media",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${montserrat.variable} ${sourceSerif4.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
