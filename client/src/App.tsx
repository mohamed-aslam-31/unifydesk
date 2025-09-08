import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthGuard } from "@/components/auth-guard";
import NotFound from "@/pages/not-found";
import SignupPage from "@/pages/signup";
import ChooseRolePage from "@/pages/choose-role";
import LoginPage from "@/pages/login";
import HomePage from "@/pages/home";
import { ForgotPassword } from "@/components/ForgotPassword";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      
      {/* Public routes that don't require authentication */}
      <Route path="/signup">
        <AuthGuard requireAuth={false}>
          <SignupPage />
        </AuthGuard>
      </Route>
      
      <Route path="/login">
        <AuthGuard requireAuth={false}>
          <LoginPage />
        </AuthGuard>
      </Route>
      
      <Route path="/forgot-password">
        <AuthGuard requireAuth={false}>
          <ForgotPassword />
        </AuthGuard>
      </Route>
      
      {/* Protected routes that require authentication */}
      <Route path="/choose-role">
        <AuthGuard requireAuth={true}>
          <ChooseRolePage />
        </AuthGuard>
      </Route>
      
      <Route path="/home">
        <AuthGuard requireAuth={true}>
          <HomePage />
        </AuthGuard>
      </Route>
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="unifydesk-theme">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
