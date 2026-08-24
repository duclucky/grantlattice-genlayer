import { Route, Routes } from "react-router-dom";

import { AppShell } from "./components/AppShell";
import { AccessCheckPage } from "./pages/AccessCheckPage";
import { ActivityPage } from "./pages/ActivityPage";
import { DelegatePage } from "./pages/DelegatePage";
import { GrantDetailPage } from "./pages/GrantDetailPage";
import { GrantsPage } from "./pages/GrantsPage";
import { HelpPage } from "./pages/HelpPage";
import { HomePage } from "./pages/HomePage";
import { IntegratePage } from "./pages/IntegratePage";
import { NewGrantPage } from "./pages/NewGrantPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="grants" element={<GrantsPage />} />
        <Route path="grants/new" element={<NewGrantPage />} />
        <Route path="grants/:grantId" element={<GrantDetailPage />} />
        <Route path="grants/:grantId/delegate" element={<DelegatePage />} />
        <Route path="checks" element={<AccessCheckPage />} />
        <Route path="activity" element={<ActivityPage />} />
        <Route path="integrate" element={<IntegratePage />} />
        <Route path="help" element={<HelpPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
