import { useState, useEffect } from "react";
import { PersonalInfo } from "./personal-info";
import { RoleSelection } from "./role-selection";
import { AdminForm } from "./admin-form";
import { EmployeeForm } from "./employee-form";
import { ShopkeeperForm } from "./shopkeeper-form";
import { Progress } from "@/components/ui/progress";
import { FloatingBackground } from "@/components/floating-background";
import { useLocation } from "wouter";

interface SignupWizardProps {
  onComplete?: () => void;
}

type WizardStep = "personal" | "role" | "admin" | "employee" | "shopkeeper" | "complete";

export function SignupWizard({ onComplete }: SignupWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>("personal");
  const [sessionToken, setSessionToken] = useState<string>("");
  const [user, setUser] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [, setLocation] = useLocation();

  const getStepNumber = () => {
    switch (currentStep) {
      case "personal": return 1;
      case "role": return 2;
      case "admin":
      case "employee":
      case "shopkeeper": return 3;
      default: return 3;
    }
  };

  const getStepLabel = () => {
    switch (currentStep) {
      case "personal": return "Personal Information";
      case "role": return "Role Selection";
      case "admin": return "Admin Details";
      case "employee": return "Employee Details";
      case "shopkeeper": return "Shop Details";
      default: return "Complete";
    }
  };

  const getProgressPercentage = () => {
    const step = getStepNumber();
    return ((step - 1) / 2) * 100;
  };

  const handlePersonalInfoSuccess = (token: string, userData: any) => {
    setSessionToken(token);
    setUser(userData);
    setCurrentStep("role");
  };

  const handleRoleSelect = (role: string) => {
    setSelectedRole(role);
    
    if (role === "customer") {
      // Redirect customer to home immediately
      setLocation("/home");
      return;
    }
    
    // Show role-specific form
    setCurrentStep(role as WizardStep);
  };

  const handleRoleFormSuccess = () => {
    setCurrentStep("complete");
    if (onComplete) {
      onComplete();
    }
  };

  const handleBackToRole = () => {
    setCurrentStep("role");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-all duration-300 relative overflow-hidden">
      {/* Three.js Floating Background */}
      <FloatingBackground className="opacity-30 dark:opacity-20" />
      
      {/* Welcome Section */}
      {currentStep !== "complete" && (
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 py-6 sm:py-8 relative z-10">
          <div className="max-w-2xl mx-auto px-2 sm:px-4 lg:px-8">
            <div className="text-center space-y-4">
              {/* Animated Icon */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center animate-pulse">
                    <svg className="w-8 h-8 text-white animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-ping"></div>
                </div>
              </div>
              
              {/* Welcome Message */}
              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                  Welcome to UnifyDesk
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-300 font-medium">
                  Create your account to scale your business
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Join thousands of entrepreneurs who trust UnifyDesk to streamline their operations and boost productivity
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className="py-4 sm:py-8 flex items-center justify-center relative z-10">
        <div className="w-full max-w-2xl px-1 sm:px-4">
          {currentStep === "personal" && (
            <PersonalInfo onSuccess={handlePersonalInfoSuccess} />
          )}
          
          {currentStep === "role" && user && (
            <RoleSelection user={user} onRoleSelect={handleRoleSelect} />
          )}
          
          {currentStep === "admin" && (
            <AdminForm 
              sessionToken={sessionToken} 
              onSuccess={handleRoleFormSuccess}
              onBack={handleBackToRole}
            />
          )}
          
          {currentStep === "employee" && (
            <EmployeeForm 
              sessionToken={sessionToken} 
              onSuccess={handleRoleFormSuccess}
              onBack={handleBackToRole}
            />
          )}
          
          {currentStep === "shopkeeper" && (
            <ShopkeeperForm 
              sessionToken={sessionToken} 
              onSuccess={handleRoleFormSuccess}
              onBack={handleBackToRole}
            />
          )}
          
          {currentStep === "complete" && (
            <div className="text-center">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  Application Submitted!
                </h2>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  Your {selectedRole} application has been submitted for review. You'll receive an email once it's processed.
                </p>
                <button
                  onClick={() => setLocation("/login")}
                  className="px-6 py-3 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg transition-colors"
                >
                  Go to Login
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
