import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SignupWizard } from "@/components/signup/signup-wizard";

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      <Header />
      <main className="flex-1">
        <SignupWizard />
      </main>
      <Footer />
    </div>
  );
}
