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
        const user = await handleGoogleRedirect();
        if (user) {
          // Check if user already exists
          const response = await fetch("/api/auth/google", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              firebaseUid: user.uid,
              email: user.email,
              firstName: user.displayName?.split(" ")[0] || "",
              lastName: user.displayName?.split(" ").slice(1).join(" ") || "",
            }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.exists) {
              setLocation("/login?already=true");
              return;
            }
            // Continue with signup flow
            toast({
              title: "Google account connected",
              description: "Please complete your profile information",
            });
          }
        }
      } catch (error) {
        console.error("Google auth error:", error);
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
