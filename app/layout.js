import "./globals.css";

export const metadata = {
  title: "PackageGraph",
  description: "PackageGraph",
};

const THEME_BOOTSTRAP = `
(function () {
  try {
    var stored = localStorage.getItem("pg-theme");
    var theme = stored || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
