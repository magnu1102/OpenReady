import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { AppShell } from "@/components/shell/AppShell";
import { WelcomeRoute } from "@/routes/WelcomeRoute";
import { DashboardRoute } from "@/routes/DashboardRoute";
import { RepositoryDetailRoute } from "@/routes/RepositoryDetailRoute";
import { SettingsRoute } from "@/routes/SettingsRoute";
import { NotFoundRoute } from "@/routes/NotFoundRoute";

const router = createMemoryRouter(
  [
    {
      path: "/",
      element: <AppShell />,
      children: [
        { index: true, element: <WelcomeRoute /> },
        { path: "dashboard", element: <DashboardRoute /> },
        { path: "dashboard/repo/:id", element: <RepositoryDetailRoute /> },
        { path: "settings", element: <SettingsRoute /> },
        { path: "*", element: <NotFoundRoute /> },
      ],
    },
  ],
  { initialEntries: ["/"] },
);

export function App() {
  return <RouterProvider router={router} />;
}

export default App;
