import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { employeeRoleSchema } from "@shared/schema";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { UserRoundCheck, Upload, Clock, Loader2 } from "lucide-react";
import { submitRoleData } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface EmployeeFormProps {
  sessionToken: string;
  onSuccess: () => void;
  onBack: () => void;
}

export function EmployeeForm({ sessionToken, onSuccess, onBack }: EmployeeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [aadhaarImage, setAadhaarImage] = useState<string | null>(null);
  const [isNewEmployee, setIsNewEmployee] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof employeeRoleSchema>>({
    resolver: zodResolver(employeeRoleSchema),
    defaultValues: {
      isNewEmployee: false,
      experienceYears: undefined,
      lastShop: "",
      oldSalary: undefined,
      expectedSalary: undefined,
      education: "",
      guardianPhone: "",
      aadhaarNumber: "",
      profilePicture: "",
    },
  });

  const handleProfileImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB limit
        toast({
          title: "File too large",
          description: "Please select an image smaller than 1MB",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setProfileImage(result);
        form.setValue("profilePicture", result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAadhaarImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB limit
        toast({
          title: "File too large",
          description: "Please select an image smaller than 1MB",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setAadhaarImage(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: z.infer<typeof employeeRoleSchema>) => {
    setIsSubmitting(true);
    try {
      await submitRoleData("employee", data, sessionToken);
      toast({
        title: "Employee application submitted!",
        description: "Your application will be reviewed within 24 hours.",
      });
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Submission failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
            <UserRoundCheck className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Employee Registration
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Complete your employee profile setup
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Profile Picture */}
            <div>
              <Label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Profile Picture
              </Label>
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center overflow-hidden">
                  {profileImage ? (
                    <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 bg-slate-400 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">👤</span>
                    </div>
                  )}
                </div>
                <div>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleProfileImageUpload}
                    className="hidden"
                    id="employeeProfilePic"
                  />
                  <Label
                    htmlFor="employeeProfilePic"
                    className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 cursor-pointer transition-colors"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Photo
                  </Label>
                  <p className="text-xs text-slate-500 mt-1">Max 1MB</p>
                </div>
              </div>
            </div>

            {/* New Employee Checkbox */}
            <FormField
              control={form.control}
              name="isNewEmployee"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="newEmployee"
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        setIsNewEmployee(checked as boolean);
                      }}
                    />
                    <Label htmlFor="newEmployee" className="text-sm font-medium">
                      New Employee (no prior work experience)
                    </Label>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Experience Fields - Only show if not new employee */}
            {!isNewEmployee && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="experienceYears"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Years of Experience</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Enter years"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastShop"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Workplace</FormLabel>
                        <FormControl>
                          <Input placeholder="Company/Shop name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="oldSalary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Previous Salary (₹)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Enter amount"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="expectedSalary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expected Salary (₹)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Enter amount"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            {/* Education */}
            <FormField
              control={form.control}
              name="education"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Education Level</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select education level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="high-school">High School</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="bachelors">Bachelor's Degree</SelectItem>
                      <SelectItem value="masters">Master's Degree</SelectItem>
                      <SelectItem value="diploma">Diploma</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Guardian Phone */}
            <FormField
              control={form.control}
              name="guardianPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Guardian/Emergency Contact Phone</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="Enter phone number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Aadhaar Number */}
            <FormField
              control={form.control}
              name="aadhaarNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Aadhaar Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter 12-digit Aadhaar number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Aadhaar Photo */}
            <div>
              <Label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Aadhaar Card Photo
              </Label>
              <div className="flex items-center space-x-4">
                <div className="w-20 h-12 bg-slate-200 dark:bg-slate-700 rounded flex items-center justify-center overflow-hidden">
                  {aadhaarImage ? (
                    <img src={aadhaarImage} alt="Aadhaar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs text-slate-500">📄</span>
                  )}
                </div>
                <div>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleAadhaarImageUpload}
                    className="hidden"
                    id="aadhaarPhoto"
                  />
                  <Label
                    htmlFor="aadhaarPhoto"
                    className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 cursor-pointer transition-colors"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Aadhaar
                  </Label>
                  <p className="text-xs text-slate-500 mt-1">Max 1MB</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Employee Application"
                )}
              </Button>
            </div>
          </form>
        </Form>

        {/* Next Steps Info */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100">What's next?</h4>
              <p className="text-blue-800 dark:text-blue-200 text-sm mt-1">
                Your employee application will be reviewed within 24 hours. You'll receive an email once approved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
