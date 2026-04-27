import { Montserrat } from "next/font/google";
import "./globals.css";

// Подключаем шрифт (включая кириллицу)
const montserrat = Montserrat({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-montserrat",
});

// Настройки для SEO (то, что будет в гугле и на вкладке браузера)
export const metadata = {
  title: "FACEIT ELO Hub | Статистика и Виджеты",
  description: "Продвинутая статистика, история матчей и виджеты для стримеров на FACEIT.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru" className={montserrat.variable}>
      <body 
        className="font-sans antialiased text-gray-900 bg-gray-50 min-h-screen flex flex-col"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}