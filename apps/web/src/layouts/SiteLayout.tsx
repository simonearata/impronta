import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { CookieBanner } from "../components/CookieBanner";
import { Footer } from "../components/Footer";
import { NavBar } from "../components/NavBar";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return null;
}

export function SiteLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <ScrollToTop />
      <NavBar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <CookieBanner />
    </div>
  );
}
