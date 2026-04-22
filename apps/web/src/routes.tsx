import { createBrowserRouter } from "react-router-dom";
import { SiteLayout } from "./layouts/SiteLayout";
import { ContactPage } from "./pages/ContactPage";
import { HomePage } from "./pages/HomePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { ProducerDetailPage } from "./pages/ProducerDetailPage";
import { ProducersPage } from "./pages/ProducersPage";
import { WineDetailPage } from "./pages/WineDetailPage";
import { WinesPage } from "./pages/WinesPage";
import { ZoneDetailPage } from "./pages/ZoneDetailPage";
import { ZonesPage } from "./pages/ZonesPage";
import { AdminLoginPage } from "./pages/AdminLoginPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { AdminShell } from "./components/AdminShell";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { AdminZonesListPage } from "./pages/AdminZonesListPage";
import { AdminZoneEditPage } from "./pages/AdminZoneEditPage";
import { AdminProducersListPage } from "./pages/AdminProducersListPage";
import { AdminProducerEditPage } from "./pages/AdminProducerEditPage";
import { AdminWinesListPage } from "./pages/AdminWinesListPage";
import { AdminWineEditPage } from "./pages/AdminWineEditPage";
import { AdminHomeEditorPage } from "./pages/AdminHomeEditorPage";
import { AdminContactsEditorPage } from "./pages/AdminContactsEditorPage";
import { MyProjectPage } from "./pages/MyProjectPage";
import { AdminInventoryPage } from "./pages/AdminInventoryPage";
import { AdminInvoiceUploadPage } from "./pages/AdminInvoiceUploadPage";
import { RequireAdmin } from "./auth/RequireAdmin";

export const router = createBrowserRouter([
  { path: "/admin/login", element: <AdminLoginPage /> },
  { path: "/admin/reset-password", element: <ResetPasswordPage /> },
  {
    path: "/admin",
    element: (
      <RequireAdmin>
        <AdminShell />
      </RequireAdmin>
    ),
    children: [
      { index: true, element: <AdminDashboardPage /> },
      { path: "zone", element: <AdminZonesListPage /> },
      { path: "zone/:id", element: <AdminZoneEditPage /> },
      { path: "aziende", element: <AdminProducersListPage /> },
      { path: "aziende/:id", element: <AdminProducerEditPage /> },
      { path: "vini", element: <AdminWinesListPage /> },
      { path: "vini/:id", element: <AdminWineEditPage /> },
      { path: "home", element: <AdminHomeEditorPage /> },
      { path: "contatti", element: <AdminContactsEditorPage /> },
      { path: "magazzino", element: <AdminInventoryPage /> },
      { path: "magazzino/nuova-fattura", element: <AdminInvoiceUploadPage /> },
    ],
  },
  {
    element: <SiteLayout />,
    errorElement: <NotFoundPage />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/my-project", element: <MyProjectPage /> },
      { path: "/zone", element: <ZonesPage /> },
      { path: "/zone/:slug", element: <ZoneDetailPage /> },
      { path: "/aziende", element: <ProducersPage /> },
      { path: "/aziende/:slug", element: <ProducerDetailPage /> },
      { path: "/vini", element: <WinesPage /> },
      { path: "/vini/:slug", element: <WineDetailPage /> },
      { path: "/contatti", element: <ContactPage /> },
      { path: "/privacy", element: <PrivacyPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
