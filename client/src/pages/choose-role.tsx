import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { RoleSelection } from "@/components/signup/role-selection";
import { AdminForm } from "@/components/signup/admin-form";
import { EmployeeForm } from "@/components/signup/employee-form";
import { ShopkeeperForm } from "@/components/signup/shopkeeper-form";
import { useSession } from "@/hooks/use-session";

export default function ChooseRolePage() {
  const [, setLocation] = useLocation();
  const { user, sessionToken, isLoading } = useSession();
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [showRoleForm, setShowRoleForm] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/signup");
    }
  }, [user, isLoading, setLocation]);

  const handleRoleSelect = (role: string) => {
    setSelectedRole(role);
    
    if (role === "customer") {
      // Redirect customer to home immediately
      setLocation("/home");
      return;
    }
    
    // Show role-specific form
    setShowRoleForm(true);
  };

  const handleRoleFormSuccess = () => {
    setLocation("/login");
  };

  const handleBackToRole = () => {
    setShowRoleForm(false);
    setSelectedRole("");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      <Header />
      <main className="flex-1">
        {!showRoleForm ? (
          <RoleSelection user={user} onRoleSelect={handleRoleSelect} />
        ) : (
          <>
            {selectedRole === "admin" && (
              <AdminForm 
                sessionToken={sessionToken} 
                onSuccess={handleRoleFormSuccess}
                onBack={handleBackToRole}
              />
            )}
            {selectedRole === "employee" && (
              <EmployeeForm 
                sessionToken={sessionToken} 
                onSuccess={handleRoleFormSuccess}
                onBack={handleBackToRole}
              />
            )}
            {selectedRole === "shopkeeper" && (
              <ShopkeeperForm 
                sessionToken={sessionToken} 
                onSuccess={handleRoleFormSuccess}
                onBack={handleBackToRole}
              />
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
