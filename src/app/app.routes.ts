import { Routes } from "@angular/router";
import { adminGuard } from "./core/guards/admin.guard";
import { sheikhGuard } from "./core/guards/sheikh.guard";

export const routes: Routes = [
  // Default route
  { path: "", redirectTo: "login", pathMatch: "full" },

  // ── Public ──────────────────────────────────────────────────
  {
    path: "public",
    loadComponent: () =>
      import("./features/public/layout/public-layout.component").then(
        (m) => m.PublicLayoutComponent,
      ),
    children: [
      {
        path: "",
        loadComponent: () =>
          import("./features/public/home/home.component").then(
            (m) => m.HomeComponent,
          ),
      },
      {
        path: "register",
        loadComponent: () =>
          import("./features/public/register/register.component").then(
            (m) => m.RegisterComponent,
          ),
      },
    ],
  },

  // ── Auth ─────────────────────────────────────────────────────
  {
    path: "login",
    loadComponent: () =>
      import("./features/auth/login/login.component").then(
        (m) => m.LoginComponent,
      ),
  },

  // ── Admin ────────────────────────────────────────────────────
  {
    path: "admin",
    canActivate: [adminGuard],
    loadComponent: () =>
      import("./features/admin/layout/admin-layout.component").then(
        (m) => m.AdminLayoutComponent,
      ),
    children: [
      { path: "", redirectTo: "dashboard", pathMatch: "full" },
      {
        path: "dashboard",
        loadComponent: () =>
          import("./features/admin/dashboard/dashboard.component").then(
            (m) => m.DashboardComponent,
          ),
      },
      {
        path: "students",
        loadComponent: () =>
          import("./features/admin/students/students.component").then(
            (m) => m.StudentsComponent,
          ),
      },
      {
        path: "sheikhs",
        loadComponent: () =>
          import("./features/admin/sheikhs/sheikhs.component").then(
            (m) => m.SheikhsComponent,
          ),
      },
      {
        path: "sessions",
        loadComponent: () =>
          import("./features/admin/sessions/sessions.component").then(
            (m) => m.SessionsComponent,
          ),
      },
      {
        path: "results",
        loadComponent: () =>
          import("./features/admin/results/results.component").then(
            (m) => m.ResultsComponent,
          ),
      },
      {
        path: "reports",
        loadComponent: () =>
          import("./features/admin/reports/reports.component").then(
            (m) => m.ReportsComponent,
          ),
      },
      {
        path: "settings",
        loadComponent: () =>
          import("./features/admin/settings/settings.component").then(
            (m) => m.SettingsComponent,
          ),
      },
      {
        path: "previous-data",
        loadComponent: () =>
          import("./features/admin/previous-data/previous-data.component").then(
            (m) => m.PreviousDataComponent,
          ),
      },
      {
        path: "home-cms",
        loadComponent: () =>
          import("./features/admin/home-cms/home-cms.component").then(
            (m) => m.HomeCmsComponent,
          ),
      },
    ],
  },

  // ── Sheikh ───────────────────────────────────────────────────
  {
    path: "sheikh",
    canActivate: [sheikhGuard],
    loadComponent: () =>
      import("./features/sheikh/layout/sheikh-layout.component").then(
        (m) => m.SheikhLayoutComponent,
      ),
    children: [
      { path: "", redirectTo: "queue", pathMatch: "full" },
      {
        path: "queue",
        loadComponent: () =>
          import("./features/sheikh/queue/queue.component").then(
            (m) => m.QueueComponent,
          ),
      },
      {
        path: "scoring/:studentId",
        loadComponent: () =>
          import("./features/sheikh/scoring/scoring.component").then(
            (m) => m.ScoringComponent,
          ),
      },
    ],
  },

  { path: "**", redirectTo: "login" },
];
