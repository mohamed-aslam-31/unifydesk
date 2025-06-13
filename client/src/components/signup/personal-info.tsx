import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema } from "@shared/schema";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Eye, EyeOff, Check, X, Loader2 } from "lucide-react";
import { PasswordStrength } from "./password-strength";
import { OTPInput } from "./otp-input";
import { TermsModal } from "./terms-modal";
import { validateField, sendOTP, verifyOTP, signup, SignupData } from "@/lib/auth";
import { signInWithGoogle } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

interface PersonalInfoProps {
  onSuccess: (sessionToken: string, user: any) => void;
}

export function PersonalInfo({ onSuccess }: PersonalInfoProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [emailStatus, setEmailStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [showEmailOTP, setShowEmailOTP] = useState(false);
  const [showPhoneOTP, setShowPhoneOTP] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [countries, setCountries] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();

  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      username: "",
      email: "",
      phone: "",
      countryCode: "+91",
      isWhatsApp: false,
      gender: "",
      dateOfBirth: "",
      country: "",
      state: "",
      city: "",
      address: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Load countries on mount
  useEffect(() => {
    fetch("/api/locations/countries")
      .then(res => res.json())
      .then(data => {
        if (data.data) {
          setCountries(data.data);
        }
      })
      .catch(err => console.error("Failed to load countries:", err));
  }, []);

  // Username validation
  const handleUsernameChange = async (username: string) => {
    form.setValue("username", username);
    
    if (username.length >= 3) {
      setUsernameStatus("checking");
      try {
        const result = await validateField("username", username);
        setUsernameStatus(result.available ? "available" : "taken");
      } catch (error) {
        setUsernameStatus("idle");
      }
    } else {
      setUsernameStatus("idle");
    }
  };

  // Email validation
  const handleEmailChange = async (email: string) => {
    form.setValue("email", email);
    
    if (email.includes("@")) {
      setEmailStatus("checking");
      try {
        const result = await validateField("email", email);
        setEmailStatus(result.available ? "available" : "taken");
      } catch (error) {
        setEmailStatus("idle");
      }
    } else {
      setEmailStatus("idle");
    }
  };

  // Location cascading
  const handleCountryChange = async (country: string) => {
    form.setValue("country", country);
    form.setValue("state", "");
    form.setValue("city", "");
    setCities([]);
    
    try {
      const response = await fetch("/api/locations/states", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country }),
      });
      const data = await response.json();
      if (data.data && data.data.states) {
        setStates(data.data.states);
      }
    } catch (error) {
      console.error("Failed to load states:", error);
    }
  };

  const handleStateChange = async (state: string) => {
    form.setValue("state", state);
    form.setValue("city", "");
    
    try {
      const response = await fetch("/api/locations/cities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          country: form.getValues("country"),
          state 
        }),
      });
      const data = await response.json();
      if (data.data) {
        setCities(data.data);
      }
    } catch (error) {
      console.error("Failed to load cities:", error);
    }
  };

  // OTP handlers
  const handleSendEmailOTP = async () => {
    const email = form.getValues("email");
    if (!email) return;
    
    try {
      await sendOTP(email, "email");
      setShowEmailOTP(true);
      toast({ title: "OTP sent to your email" });
    } catch (error) {
      toast({ title: "Failed to send OTP", variant: "destructive" });
    }
  };

  const handleSendPhoneOTP = async () => {
    const phone = form.getValues("phone");
    const countryCode = form.getValues("countryCode");
    if (!phone) return;
    
    try {
      await sendOTP(`${countryCode}${phone}`, "phone");
      setShowPhoneOTP(true);
      toast({ title: "OTP sent to your phone" });
    } catch (error) {
      toast({ title: "Failed to send OTP", variant: "destructive" });
    }
  };

  const handleEmailOTPComplete = async (otp: string) => {
    const email = form.getValues("email");
    try {
      await verifyOTP(email, "email", otp);
      setEmailVerified(true);
      setShowEmailOTP(false);
      toast({ title: "Email verified successfully" });
    } catch (error) {
      toast({ title: "Invalid OTP", variant: "destructive" });
    }
  };

  const handlePhoneOTPComplete = async (otp: string) => {
    const phone = form.getValues("phone");
    const countryCode = form.getValues("countryCode");
    try {
      await verifyOTP(`${countryCode}${phone}`, "phone", otp);
      setPhoneVerified(true);
      setShowPhoneOTP(false);
      toast({ title: "Phone verified successfully" });
    } catch (error) {
      toast({ title: "Invalid OTP", variant: "destructive" });
    }
  };

  const handleGoogleSignup = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      toast({ title: "Google signup failed", variant: "destructive" });
    }
  };

  const onSubmit = async (data: z.infer<typeof signupSchema>) => {
    if (!emailVerified || !phoneVerified) {
      toast({ title: "Please verify your email and phone number", variant: "destructive" });
      return;
    }

    if (!termsAccepted) {
      toast({ title: "Please accept the terms and conditions", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await signup(data as SignupData);
      onSuccess(result.sessionToken, result.user);
      toast({ title: "Account created successfully!" });
    } catch (error: any) {
      toast({ 
        title: "Signup failed", 
        description: error.message || "Please try again",
        variant: "destructive" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 transition-all duration-300">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Create Your Account</h1>
        <p className="text-slate-600 dark:text-slate-400">Join UnifyDesk and streamline your business operations</p>
      </div>

      {/* Google Signup Button */}
      <Button
        type="button"
        variant="outline"
        className="w-full mb-6"
        onClick={handleGoogleSignup}
      >
        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google
      </Button>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-300 dark:border-slate-600"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white dark:bg-slate-800 text-slate-500">or continue with email</span>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Name Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your first name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your last name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Username */}
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username *</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input 
                      placeholder="Choose a username" 
                      {...field}
                      onChange={(e) => handleUsernameChange(e.target.value)}
                      className="pr-10"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      {usernameStatus === "checking" && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                      {usernameStatus === "available" && <Check className="h-4 w-4 text-green-500" />}
                      {usernameStatus === "taken" && <X className="h-4 w-4 text-red-500" />}
                    </div>
                  </div>
                </FormControl>
                {usernameStatus === "checking" && (
                  <p className="text-xs text-slate-500">Checking availability...</p>
                )}
                {usernameStatus === "available" && (
                  <p className="text-xs text-green-600">Username is available</p>
                )}
                {usernameStatus === "taken" && (
                  <p className="text-xs text-red-600">Username is already taken</p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Gender and DOB */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Birth *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <p className="text-xs text-slate-500">Must be 18 or older</p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Email */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address *</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input 
                      type="email" 
                      placeholder="Enter your email" 
                      {...field}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      className="pr-20"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center space-x-2">
                      {emailStatus === "checking" && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                      {emailStatus === "available" && !emailVerified && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleSendEmailOTP}
                          className="h-6 px-2 text-xs"
                        >
                          Verify
                        </Button>
                      )}
                      {emailVerified && <Check className="h-4 w-4 text-green-500" />}
                    </div>
                  </div>
                </FormControl>
                {emailStatus === "taken" && (
                  <p className="text-xs text-red-600">Email is already registered</p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Email OTP */}
          {showEmailOTP && (
            <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-4">
              <div className="text-center">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Verify Your Email</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Enter the 6-digit code sent to your email
                </p>
                <OTPInput onComplete={handleEmailOTPComplete} />
                <p className="text-xs text-slate-500 mt-2">Check your spam folder if you don't see the email</p>
              </div>
            </div>
          )}

          {/* Phone */}
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number *</FormLabel>
                <FormControl>
                  <div className="flex space-x-2">
                    <FormField
                      control={form.control}
                      name="countryCode"
                      render={({ field: countryCodeField }) => (
                        <Select onValueChange={countryCodeField.onChange} defaultValue={countryCodeField.value}>
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="+1">🇺🇸 +1</SelectItem>
                            <SelectItem value="+91">🇮🇳 +91</SelectItem>
                            <SelectItem value="+44">🇬🇧 +44</SelectItem>
                            <SelectItem value="+86">🇨🇳 +86</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <div className="flex-1 relative">
                      <Input 
                        type="tel" 
                        placeholder="Enter phone number" 
                        {...field}
                        className="pr-20"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        {!phoneVerified && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleSendPhoneOTP}
                            className="h-6 px-2 text-xs"
                          >
                            Verify
                          </Button>
                        )}
                        {phoneVerified && <Check className="h-4 w-4 text-green-500" />}
                      </div>
                    </div>
                  </div>
                </FormControl>
                <div className="mt-2">
                  <FormField
                    control={form.control}
                    name="isWhatsApp"
                    render={({ field }) => (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="whatsapp"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                        <Label htmlFor="whatsapp" className="text-sm text-slate-600 dark:text-slate-400">
                          This number uses WhatsApp
                        </Label>
                      </div>
                    )}
                  />
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Phone OTP */}
          {showPhoneOTP && (
            <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-4">
              <div className="text-center">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Verify Your Phone</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Enter the 6-digit code sent to your phone
                </p>
                <OTPInput onComplete={handlePhoneOTPComplete} />
              </div>
            </div>
          )}

          {/* Location */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-white">Location Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country *</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      handleCountryChange(value);
                    }} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {countries.map((country) => (
                          <SelectItem key={country.country} value={country.country}>
                            {country.country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State *</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      handleStateChange(value);
                    }} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {states.map((state) => (
                          <SelectItem key={state.name} value={state.name}>
                            {state.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select city" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cities.map((city) => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Enter your complete address"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Password */}
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a strong password"
                        {...field}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-slate-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-slate-400" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <PasswordStrength password={field.value} />
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Re-enter your password"
                        {...field}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-slate-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-slate-400" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* reCAPTCHA */}
          <div className="flex justify-center">
            <div className="bg-slate-100 dark:bg-slate-700 p-4 rounded-lg border border-slate-300 dark:border-slate-600 inline-block">
              <div className="flex items-center space-x-3">
                <Checkbox id="recaptcha" />
                <Label htmlFor="recaptcha" className="text-sm text-slate-700 dark:text-slate-300">
                  I'm not a robot
                </Label>
                <div className="w-4 h-4 bg-slate-400 rounded"></div>
              </div>
            </div>
          </div>

          {/* Terms and Conditions */}
          <div>
            <div className="flex items-start space-x-3">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={setTermsAccepted}
              />
              <Label htmlFor="terms" className="text-sm text-slate-600 dark:text-slate-400">
                I agree to the{" "}
                <button
                  type="button"
                  className="text-primary hover:text-primary/80 underline"
                  onClick={() => setTermsModalOpen(true)}
                >
                  Terms of Service
                </button>{" "}
                and Privacy Policy
              </Label>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Account...
              </>
            ) : (
              "Create Account"
            )}
          </Button>
        </form>
      </Form>

      <div className="text-center mt-6">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Already have an account?{" "}
          <a href="/login" className="text-primary hover:text-primary/80 font-medium">
            Sign in
          </a>
        </p>
      </div>

      <TermsModal
        open={termsModalOpen}
        onOpenChange={setTermsModalOpen}
        onAccept={() => setTermsAccepted(true)}
      />
    </div>
  );
}
