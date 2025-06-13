import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { shopkeeperRoleSchema } from "@shared/schema";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Store, Clock, Loader2 } from "lucide-react";
import { submitRoleData } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface ShopkeeperFormProps {
  sessionToken: string;
  onSuccess: () => void;
  onBack: () => void;
}

export function ShopkeeperForm({ sessionToken, onSuccess, onBack }: ShopkeeperFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasGSTIN, setHasGSTIN] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof shopkeeperRoleSchema>>({
    resolver: zodResolver(shopkeeperRoleSchema),
    defaultValues: {
      ownerName: "",
      shopName: "",
      yearsRunning: 0,
      hasGSTIN: false,
      gstinNumber: "",
      landline: "",
      isOldCustomer: false,
    },
  });

  const onSubmit = async (data: z.infer<typeof shopkeeperRoleSchema>) => {
    setIsSubmitting(true);
    try {
      await submitRoleData("shopkeeper", data, sessionToken);
      toast({
        title: "Shop keeper application submitted!",
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
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
            <Store className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Shop Keeper Registration
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Complete your shop registration details
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Owner Name */}
            <FormField
              control={form.control}
              name="ownerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Owner Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter owner's full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Shop Name */}
            <FormField
              control={form.control}
              name="shopName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Shop Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your shop name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Years Running */}
            <FormField
              control={form.control}
              name="yearsRunning"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Years Running *</FormLabel>
                  <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select years in business" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="0">New Business (0 years)</SelectItem>
                      <SelectItem value="1">1 year</SelectItem>
                      <SelectItem value="2">2 years</SelectItem>
                      <SelectItem value="3">3 years</SelectItem>
                      <SelectItem value="4">4 years</SelectItem>
                      <SelectItem value="5">5 years</SelectItem>
                      <SelectItem value="6">6-10 years</SelectItem>
                      <SelectItem value="11">11-15 years</SelectItem>
                      <SelectItem value="16">16-20 years</SelectItem>
                      <SelectItem value="21">20+ years</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* GSTIN Checkbox */}
            <FormField
              control={form.control}
              name="hasGSTIN"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hasGSTIN"
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        setHasGSTIN(checked as boolean);
                      }}
                    />
                    <Label htmlFor="hasGSTIN" className="text-sm font-medium">
                      I have a GSTIN number
                    </Label>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* GSTIN Number - Only show if has GSTIN */}
            {hasGSTIN && (
              <FormField
                control={form.control}
                name="gstinNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GSTIN Number *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter 15-digit GSTIN number" 
                        {...field}
                        maxLength={15}
                      />
                    </FormControl>
                    <p className="text-xs text-slate-500">Format: 22AAAAA0000A1Z5</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Landline */}
            <FormField
              control={form.control}
              name="landline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Landline Number (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      type="tel" 
                      placeholder="Enter landline number with STD code" 
                      {...field} 
                    />
                  </FormControl>
                  <p className="text-xs text-slate-500">Example: 044-12345678</p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Old Customer Checkbox */}
            <FormField
              control={form.control}
              name="isOldCustomer"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isOldCustomer"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                    <Label htmlFor="isOldCustomer" className="text-sm font-medium">
                      I am an existing UnifyDesk customer
                    </Label>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Business Information Note */}
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Store className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-medium text-green-900 dark:text-green-100 mb-1">Business Verification</h4>
                  <p className="text-green-800 dark:text-green-200 text-sm">
                    Your business details will be verified as part of the approval process. Please ensure all information is accurate.
                  </p>
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
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Shop Registration"
                )}
              </Button>
            </div>
          </form>
        </Form>

        {/* Next Steps Info */}
        <div className="mt-6 bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Clock className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-medium text-green-900 dark:text-green-100">What's next?</h4>
              <p className="text-green-800 dark:text-green-200 text-sm mt-1">
                Your shop registration will be reviewed within 24 hours. You'll receive an email with access credentials once approved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
