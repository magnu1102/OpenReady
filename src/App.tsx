import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { AppShell } from "@/components/shell/AppShell";
import { WelcomeRoute } from "@/routes/WelcomeRoute";
import { DashboardRoute } from "@/routes/DashboardRoute";
import { CompareRoute } from "@/routes/CompareRoute";
import { PortfolioRoute } from "@/routes/PortfolioRoute";
import { RepositoryDetailRoute } from "@/routes/RepositoryDetailRoute";
import { SettingsRoute } from "@/routes/SettingsRoute";
import { NotFoundRoute } from "@/routes/NotFoundRoute";

function createAppRouter(initialEntries = ["/"]) {
  return createMemoryRouter(
    [
      {
        path: "/",
        element: <AppShell />,
        children: [
          { index: true, element: <WelcomeRoute /> },
          { path: "dashboard", element: <DashboardRoute /> },
          { path: "dashboard/compare", element: <CompareRoute /> },
          { path: "dashboard/repo/:id", element: <RepositoryDetailRoute /> },
          { path: "portfolio", element: <PortfolioRoute /> },
          { path: "settings", element: <SettingsRoute /> },
          { path: "*", element: <NotFoundRoute /> },
        ],
      },
    ],
    { initialEntries },
  );
}

export function App() {
  const router = createAppRouter();
  return <RouterProvider router={router} />;
}

export default App;
