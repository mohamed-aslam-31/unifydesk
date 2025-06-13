import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, UserRoundCheck, Store, ShoppingBag, Info } from "lucide-react";

interface RoleSelectionProps {
  user: any;
  onRoleSelect: (role: string) => void;
}

const roles = [
  {
    id: "admin",
    name: "Admin",
    description: "Manage business operations, oversee teams, and handle administrative tasks",
    icon: Crown,
    color: "from-purple-500 to-purple-600",
    buttonColor: "bg-purple-600 hover:bg-purple-700",
    features: [
      "Full system access",
      "Team management", 
      "Business analytics",
      "Approval workflow"
    ]
  },
  {
    id: "employee",
    name: "Employee", 
    description: "Join as a team member to handle daily operations and customer service",
    icon: UserRoundCheck,
    color: "from-blue-500 to-blue-600",
    buttonColor: "bg-blue-600 hover:bg-blue-700",
    features: [
      "Task management",
      "Customer support",
      "Team collaboration", 
      "Performance tracking"
    ]
  },
  {
    id: "shopkeeper",
    name: "Shop Keeper",
    description: "Manage your retail business with inventory and sales tools",
    icon: Store,
    color: "from-green-500 to-green-600", 
    buttonColor: "bg-green-600 hover:bg-green-700",
    features: [
      "Inventory management",
      "Sales tracking",
      "Customer database",
      "GST compliance"
    ]
  },
  {
    id: "customer",
    name: "Customer",
    description: "Browse products, make purchases, and track your orders", 
    icon: ShoppingBag,
    color: "from-orange-500 to-orange-600",
    buttonColor: "bg-orange-600 hover:bg-orange-700",
    features: [
      "Product browsing",
      "Order management", 
      "Support tickets",
      "Loyalty rewards"
    ]
  }
];

export function RoleSelection({ user, onRoleSelect }: RoleSelectionProps) {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const handleRoleClick = (roleId: string) => {
    setSelectedRole(roleId);
    if (roleId === "customer") {
      // Customer gets instant access
      onRoleSelect(roleId);
    }
  };

  const handleContinue = () => {
    if (selectedRole) {
      onRoleSelect(selectedRole);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
          Hi {user.firstName}! Choose your account type.
        </h1>
        <p className="text-xl text-slate-600 dark:text-slate-400">
          Select the role that best describes how you'll use UnifyDesk
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {roles.map((role) => {
          const IconComponent = role.icon;
          const isSelected = selectedRole === role.id;
          
          return (
            <Card
              key={role.id}
              className={`cursor-pointer transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl ${
                isSelected ? "ring-2 ring-primary border-primary" : "border-transparent hover:border-primary/50"
              }`}
              onClick={() => handleRoleClick(role.id)}
            >
              <CardContent className="p-6 text-center">
                <div className={`w-16 h-16 bg-gradient-to-br ${role.color} rounded-xl mx-auto mb-4 flex items-center justify-center`}>
                  <IconComponent className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  {role.name}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
                  {role.description}
                </p>
                <div className="text-xs text-slate-500 dark:text-slate-500 space-y-1 mb-6">
                  {role.features.map((feature, index) => (
                    <div key={index}>• {feature}</div>
                  ))}
                </div>
                <Button
                  className={`w-full ${role.buttonColor} text-white transition-colors`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRoleClick(role.id);
                  }}
                >
                  Choose {role.name}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Continue Button for non-customer roles */}
      {selectedRole && selectedRole !== "customer" && (
        <div className="text-center mb-8">
          <Button 
            onClick={handleContinue}
            className="px-8 py-3 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg"
          >
            Continue with {roles.find(r => r.id === selectedRole)?.name}
          </Button>
        </div>
      )}

      {/* Role Selection Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              What happens after role selection?
            </h4>
            <ul className="text-blue-800 dark:text-blue-200 text-sm space-y-1">
              <li>
                <strong>Admin & Employee:</strong> Your application will be reviewed and you'll receive an approval email
              </li>
              <li>
                <strong>Shop Keeper:</strong> Complete business verification process for full access
              </li>
              <li>
                <strong>Customer:</strong> Instant access to browse and shop
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
