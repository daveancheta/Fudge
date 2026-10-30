import WebThemeProvider from "./theme-provider";
import WebSidebar from "./web-sidebar";

export default function WebLayout({ children }: { children: React.ReactNode }) {
  return (
    <WebThemeProvider>
      <main className="web-shell web-app-frame min-h-screen">
        <WebSidebar />
        <section className="web-main-content min-w-0">
          {children}
        </section>
      </main>
    </WebThemeProvider>
  );
}
