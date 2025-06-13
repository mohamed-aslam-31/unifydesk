import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ReCaptchaProvider } from "@/components/recaptcha-provider";
import NotFound from "@/pages/not-found";
import SignupPage from "@/pages/signup";
import ChooseRolePage from "@/pages/choose-role";
import LoginPage from "@/pages/login";
import HomePage from "@/pages/home";
import { useEffect } from "react";
import { handleGoogleRedirect } from "@/lib/firebase";

function Router() {
  useEffect(() => {
    // Handle Firebase redirect on app initialization
    const initializeFirebase = async () => {
      try {
        const result = await handleGoogleRedirect();
        if (result) {
          console.log("Firebase initialized and redirect handled");
        }
      } catch (error) {
        console.warn("Firebase not initialized. Skipping Google redirect handling.");
      }
    };
    
    initializeFirebase();
  }, []);

  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/signup" component={SignupPage} />
      <Route path="/choose-role" component={ChooseRolePage} />
      <Route path="/login" component={LoginPage} />
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
        <ReCaptchaProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ReCaptchaProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
