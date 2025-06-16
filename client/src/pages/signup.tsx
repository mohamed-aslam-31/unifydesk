import { useEffect } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SignupWizard } from "@/components/signup/signup-wizard";
import { handleGoogleRedirect } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

export default function SignupPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Handle Google redirect if coming back from OAuth
    const handleGoogleAuth = async () => {
      try {
        const result = await handleGoogleRedirect();
        if (result && result.user) {
          const { user } = result;
          
          // Send user data to backend
          const response = await fetch("/api/auth/firebase", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              firebaseUid: user.uid,
              email: user.email,
              firstName: user.displayName?.split(" ")[0] || "",
              lastName: user.displayName?.split(" ").slice(1).join(" ") || "",
              profilePicture: user.photoURL,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            
            // Store session token
            localStorage.setItem("sessionToken", data.sessionToken);
            
            // Check if user already has a role
            if (data.user.role && data.user.role !== "customer") {
              toast({
                title: "Welcome back!",
                description: "Redirecting to your dashboard...",
              });
              setLocation("/home");
            } else {
              // New user or customer - redirect to role selection
              toast({
                title: "Google account connected",
                description: "Please select your role to continue",
              });
              setLocation("/choose-role");
            }
          } else {
            const errorData = await response.json();
            toast({
              title: "Authentication failed",
              description: errorData.message || "Please try again",
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        console.error("Google auth error:", error);
        toast({
          title: "Authentication error",
          description: "Please try signing in again",
          variant: "destructive",
        });
      }
    };

    handleGoogleAuth();
  }, [setLocation, toast]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      <Header />
      <main className="flex-1">
        <SignupWizard onComplete={() => setLocation("/login")} />
      </main>
      <Footer />
    </div>
  );
}
