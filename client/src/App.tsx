import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
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
      <Route path="/signup" component={SignupPage} />
      <Route path="/choose-role" component={ChooseRolePage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/home" component={HomePage} />
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
