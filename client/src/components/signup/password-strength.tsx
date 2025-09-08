import { useMemo } from "react";
import { Check, X } from "lucide-react";

interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const requirements = useMemo(() => {
    return [
      {
        label: "Password must be at least 8 characters",
        met: password.length >= 8,
      },
      {
        label: "Password must contain an uppercase letter",
        met: /[A-Z]/.test(password),
      },
      {
        label: "Password must contain a number",
        met: /\d/.test(password),
      },
      {
        label: "Password must contain a special character",
        met: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      },
    ];
  }, [password]);

  const strength = requirements.filter(req => req.met).length;
  const strengthPercentage = (strength / requirements.length) * 100;

  const getStrengthColor = () => {
    if (strength <= 1) return "bg-red-500";
    if (strength <= 2) return "bg-yellow-500";
    if (strength <= 3) return "bg-blue-500";
    return "bg-green-500";
  };

  const getStrengthLabel = () => {
    if (strength <= 1) return "Weak";
    if (strength <= 2) return "Fair";
    if (strength <= 3) return "Good";
    return "Strong";
  };

  // Only show unmet requirements as errors
  const unmetRequirements = requirements.filter(req => !req.met && password.length > 0);

  if (password.length === 0) {
    return null;
  }

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-600 dark:text-slate-400">Password Strength</span>
        <span className={`text-sm font-medium ${
          strength <= 1 ? "text-red-500" :
          strength <= 2 ? "text-yellow-500" :
          strength <= 3 ? "text-blue-500" :
          "text-green-500"
        }`}>
          {getStrengthLabel()}
        </span>
      </div>
      
      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mb-3">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor()}`}
          style={{ width: `${strengthPercentage}%` }}
        />
      </div>

      {/* Show only unmet requirements as errors */}
      {unmetRequirements.length > 0 && (
        <div className="text-xs text-red-600 space-y-1">
          {unmetRequirements.map((requirement, index) => (
            <div key={index}>
              {requirement.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
