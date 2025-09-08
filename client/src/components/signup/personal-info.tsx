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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Check, X, Loader2 } from "lucide-react";
import { PasswordStrength } from "./password-strength";
import { OTPInput } from "./otp-input";
import { TermsModal } from "./terms-modal";
import { VisualCaptcha } from "@/components/ui/visual-captcha";
import { validateField, sendOTP, verifyOTP, signup, SignupData } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface PersonalInfoProps {
  onSuccess: (sessionToken: string, user: any) => void;
}

export function PersonalInfo({ onSuccess }: PersonalInfoProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [emailStatus, setEmailStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [phoneStatus, setPhoneStatus] = useState<"idle" | "checking" | "valid" | "invalid" | "taken">("idle");
  const [showEmailOTP, setShowEmailOTP] = useState(false);
  const [showPhoneOTP, setShowPhoneOTP] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [emailOtpSendCount, setEmailOtpSendCount] = useState(0);
  const [phoneOtpSendCount, setPhoneOtpSendCount] = useState(0);
  const [emailLastSent, setEmailLastSent] = useState<Date | null>(null);
  const [phoneLastSent, setPhoneLastSent] = useState<Date | null>(null);
  const [emailBlocked, setEmailBlocked] = useState(false);
  const [phoneBlocked, setPhoneBlocked] = useState(false);
  const [emailAttempts, setEmailAttempts] = useState(0);
  const [phoneAttempts, setPhoneAttempts] = useState(0);
  const [emailCountdown, setEmailCountdown] = useState(0);
  const [phoneCountdown, setPhoneCountdown] = useState(0);
  const [emailOtpSessionId, setEmailOtpSessionId] = useState("");
  const [phoneOtpSessionId, setPhoneOtpSessionId] = useState("");
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [captchaSessionId, setCaptchaSessionId] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [showCaptchaError, setShowCaptchaError] = useState(false);
  const [showTermsError, setShowTermsError] = useState(false);
  const [countries, setCountries] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastVerifiedEmail, setLastVerifiedEmail] = useState("");
  const [lastVerifiedPhone, setLastVerifiedPhone] = useState("");
  
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
      gender: undefined,
      dateOfBirth: "",
      country: "India",
      state: "",
      city: "",
      address: "",
      password: "",
      confirmPassword: "",
      captchaAnswer: "",
      captchaSessionId: "",
      acceptTerms: false,
    },
  });

  // Load countries on mount and setup countdown timers
  useEffect(() => {
    // Set default country as India and load its states
    setCountries([{ country: "India" }]);
    handleCountryChange("India");
  }, []);

  // Email countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (emailLastSent) {
      interval = setInterval(() => {
        const cooldown = getEmailOTPCooldown();
        setEmailCountdown(cooldown);
        if (cooldown <= 0) {
          clearInterval(interval);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [emailLastSent]);

  // Phone countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (phoneLastSent) {
      interval = setInterval(() => {
        const cooldown = getPhoneOTPCooldown();
        setPhoneCountdown(cooldown);
        if (cooldown <= 0) {
          clearInterval(interval);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [phoneLastSent]);

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

  // Email validation with proper format checking
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = async (email: string) => {
    form.setValue("email", email);
    
    // If email changed from last verified, reset verification
    if (lastVerifiedEmail && email !== lastVerifiedEmail) {
      setEmailVerified(false);
      setShowEmailOTP(false);
      setLastVerifiedEmail("");
    }
    
    if (!email) {
      setEmailStatus("idle");
      return;
    }
    
    if (!isValidEmail(email)) {
      setEmailStatus("invalid");
      return;
    }
    
    setEmailStatus("checking");
    try {
      const result = await validateField("email", email);
      if (result.available) {
        setEmailStatus("available");
      } else {
        setEmailStatus("taken");
        // Reset email verification state if email is already taken
        setEmailVerified(false);
        setShowEmailOTP(false);
      }
    } catch (error) {
      setEmailStatus("idle");
    }
  };

  // Phone validation with country code specific rules
  const getPhoneValidation = (countryCode: string, phone: string) => {
    const phoneDigits = phone.replace(/\D/g, '');
    
    switch (countryCode) {
      case "+91": // India
        return phoneDigits.length === 10;
      case "+1": // US/Canada
        return phoneDigits.length === 10;
      case "+44": // UK
        return phoneDigits.length === 10 || phoneDigits.length === 11;
      case "+86": // China
        return phoneDigits.length === 11;
      case "+81": // Japan
        return phoneDigits.length === 10 || phoneDigits.length === 11;
      default:
        return phoneDigits.length >= 8 && phoneDigits.length <= 15;
    }
  };

  const handlePhoneChange = async (phone: string) => {
    form.setValue("phone", phone);
    const countryCode = form.getValues("countryCode");
    
    // If phone changed from last verified, reset verification
    if (lastVerifiedPhone && phone !== lastVerifiedPhone) {
      setPhoneVerified(false);
      setShowPhoneOTP(false);
      setLastVerifiedPhone("");
    }
    
    if (!phone) {
      setPhoneStatus("idle");
      return;
    }
    
    if (!getPhoneValidation(countryCode, phone)) {
      setPhoneStatus("invalid");
      return;
    }
    
    // Check if phone number is already registered
    setPhoneStatus("checking");
    try {
      const result = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field: "phone", value: phone, countryCode })
      });
      const data = await result.json();
      
      if (data.available) {
        setPhoneStatus("valid");
      } else {
        setPhoneStatus("taken");
        // Reset phone verification state if phone is already taken
        setPhoneVerified(false);
        setShowPhoneOTP(false);
      }
    } catch (error) {
      setPhoneStatus("valid"); // Fallback to valid if validation fails
    }
  };

  // OTP rate limiting functions
  const canSendEmailOTP = () => {
    if (emailBlocked) return false;
    if (emailOtpSendCount >= 5) return false;
    if (emailLastSent) {
      const timeDiff = new Date().getTime() - emailLastSent.getTime();
      return timeDiff >= 180000; // 3 minutes
    }
    return true;
  };

  const canSendPhoneOTP = () => {
    if (phoneBlocked) return false;
    if (phoneOtpSendCount >= 5) return false;
    if (phoneLastSent) {
      const timeDiff = new Date().getTime() - phoneLastSent.getTime();
      return timeDiff >= 180000; // 3 minutes
    }
    return true;
  };

  const getEmailOTPCooldown = () => {
    if (!emailLastSent) return 0;
    const timeDiff = new Date().getTime() - emailLastSent.getTime();
    const remaining = 180000 - timeDiff;
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
  };

  const getPhoneOTPCooldown = () => {
    if (!phoneLastSent) return 0;
    const timeDiff = new Date().getTime() - phoneLastSent.getTime();
    const remaining = 180000 - timeDiff;
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
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

  // OTP handlers with rate limiting
  const handleSendEmailOTP = async () => {
    const email = form.getValues("email");
    if (!email || !isValidEmail(email)) {
      toast({ title: "Enter the email properly", variant: "destructive" });
      return;
    }
    
    if (!canSendEmailOTP()) {
      if (emailBlocked) {
        toast({ title: "Email OTP blocked for 5 hours due to too many attempts", variant: "destructive" });
        return;
      }
      if (emailOtpSendCount >= 5) {
        setEmailBlocked(true);
        setTimeout(() => setEmailBlocked(false), 5 * 60 * 60 * 1000); // 5 hours
        toast({ title: "Too many OTP attempts. Blocked for 5 hours.", variant: "destructive" });
        return;
      }
      const cooldown = getEmailOTPCooldown();
      toast({ title: `Please wait ${cooldown} seconds before requesting another OTP`, variant: "destructive" });
      return;
    }
    
    try {
      const result = await sendOTP(email, "email");
      setEmailOtpSessionId(result.sessionId);
      setShowEmailOTP(true);
      setEmailOtpSendCount(prev => prev + 1);
      setEmailLastSent(new Date());
      toast({ title: "OTP sent to your email" });
    } catch (error) {
      toast({ title: "Failed to send OTP", variant: "destructive" });
    }
  };

  const handleSendPhoneOTP = async () => {
    const phone = form.getValues("phone");
    const countryCode = form.getValues("countryCode");
    if (!phone || !getPhoneValidation(countryCode, phone)) {
      toast({ title: "Enter the phone number properly", variant: "destructive" });
      return;
    }
    
    if (!canSendPhoneOTP()) {
      if (phoneBlocked) {
        toast({ title: "Phone OTP blocked for 5 hours due to too many attempts", variant: "destructive" });
        return;
      }
      if (phoneOtpSendCount >= 5) {
        setPhoneBlocked(true);
        setTimeout(() => setPhoneBlocked(false), 5 * 60 * 60 * 1000); // 5 hours
        toast({ title: "Too many OTP attempts. Blocked for 5 hours.", variant: "destructive" });
        return;
      }
      const cooldown = getPhoneOTPCooldown();
      toast({ title: `Please wait ${cooldown} seconds before requesting another OTP`, variant: "destructive" });
      return;
    }
    
    try {
      const result = await sendOTP(`${countryCode}${phone}`, "phone");
      setPhoneOtpSessionId(result.sessionId);
      setShowPhoneOTP(true);
      setPhoneOtpSendCount(prev => prev + 1);
      setPhoneLastSent(new Date());
      toast({ title: "OTP sent to your phone" });
    } catch (error) {
      toast({ title: "Failed to send OTP", variant: "destructive" });
    }
  };



  const handleEmailOTPComplete = async (otp: string) => {
    const email = form.getValues("email");
    try {
      await verifyOTP(email, "email", otp, emailOtpSessionId);
      setEmailVerified(true);
      setShowEmailOTP(false);
      setLastVerifiedEmail(email);
      setEmailAttempts(0);
      toast({ title: "Email verified successfully" });
    } catch (error: any) {
      try {
        const errorData = JSON.parse(error.message);
        setEmailAttempts(prev => prev + 1);
        
        if (errorData.showWarning) {
          toast({ 
            title: "Warning", 
            description: errorData.message,
            variant: "destructive" 
          });
        } else if (errorData.blockedUntil) {
          setEmailBlocked(true);
          setShowEmailOTP(false);
          toast({ 
            title: "Account blocked", 
            description: "Too many failed attempts. Please try again after 5 hours.",
            variant: "destructive" 
          });
        } else {
          toast({ 
            title: "Invalid OTP", 
            description: `${errorData.remainingAttempts || 0} attempts remaining`,
            variant: "destructive" 
          });
        }
      } catch {
        toast({ title: "Invalid OTP", variant: "destructive" });
      }
    }
  };

  const handlePhoneOTPComplete = async (otp: string) => {
    const phone = form.getValues("phone");
    const countryCode = form.getValues("countryCode");
    try {
      await verifyOTP(`${countryCode}${phone}`, "phone", otp, phoneOtpSessionId);
      setPhoneVerified(true);
      setShowPhoneOTP(false);
      setLastVerifiedPhone(phone);
      setPhoneAttempts(0);
      toast({ title: "Phone verified successfully" });
    } catch (error: any) {
      try {
        const errorData = JSON.parse(error.message);
        setPhoneAttempts(prev => prev + 1);
        
        if (errorData.showWarning) {
          toast({ 
            title: "Warning", 
            description: errorData.message,
            variant: "destructive" 
          });
        } else if (errorData.blockedUntil) {
          setPhoneBlocked(true);
          setShowPhoneOTP(false);
          toast({ 
            title: "Account blocked", 
            description: "Too many failed attempts. Please try again after 5 hours.",
            variant: "destructive" 
          });
        } else {
          toast({ 
            title: "Invalid OTP", 
            description: `${errorData.remainingAttempts || 0} attempts remaining`,
            variant: "destructive" 
          });
        }
      } catch {
        toast({ title: "Invalid OTP", variant: "destructive" });
      }
    }
  };



  // Auto-scroll to first error field
  const scrollToError = (fieldName: string) => {
    const element = document.querySelector(`[name="${fieldName}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Focus the field
      setTimeout(() => {
        (element as HTMLInputElement).focus();
      }, 500);
    }
  };

  const onSubmit = async (data: z.infer<typeof signupSchema>) => {
    console.log("Form submission started", { data, emailVerified, phoneVerified, captchaVerified, termsAccepted });
    
    // Force form validation to show field errors
    await form.trigger();
    
    // Check for form field validation errors
    const errors = form.formState.errors;
    if (Object.keys(errors).length > 0) {
      // Scroll to first error field
      const firstErrorField = Object.keys(errors)[0];
      scrollToError(firstErrorField);
      toast({ title: "Please fill in all required fields correctly", variant: "destructive" });
      return;
    }
    
    if (!emailVerified || !phoneVerified) {
      // Scroll to email field if not verified
      if (!emailVerified) {
        scrollToError("email");
      } else if (!phoneVerified) {
        scrollToError("phone");
      }
      toast({ title: "Please verify your email and phone number", variant: "destructive" });
      return;
    }

    if (!captchaVerified || !captchaSessionId || !captchaAnswer) {
      setShowCaptchaError(true);
      // Scroll to captcha section
      const captchaElement = document.querySelector('[data-testid="visual-captcha"]');
      if (captchaElement) {
        captchaElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      toast({ title: "Please complete the security verification", variant: "destructive" });
      return;
    }

    if (!termsAccepted) {
      setShowTermsError(true);
      // Scroll to terms section
      const termsElement = document.querySelector('#terms');
      if (termsElement) {
        termsElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      toast({ title: "Please accept the terms and conditions", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    console.log("Submitting signup data:", { captchaSessionId, captchaAnswer });
    
    try {
      const signupData = { 
        ...data as SignupData,
        captchaSessionId,
        captchaAnswer,
        acceptTerms: termsAccepted
      };
      console.log("Final signup data:", signupData);
      
      const result = await signup(signupData);
      console.log("Signup successful:", result);
      
      onSuccess(result.sessionToken, result.user);
      toast({ title: "Account created successfully!" });
    } catch (error: any) {
      console.error("Signup error:", error);
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
    <Card className="shadow-xl bg-white/95 dark:bg-slate-800/95 backdrop-blur border-0 min-w-[180px] mx-1 sm:mx-0">
      <CardHeader className="text-center pb-2 sm:pb-6 px-2 sm:px-6">
        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-primary to-primary/80 rounded-xl mx-auto mb-2 sm:mb-4 flex items-center justify-center">
          <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <CardTitle className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">
          Create Account
        </CardTitle>
        <p className="text-xs sm:text-base text-slate-600 dark:text-slate-400">
          Join UnifyDesk
        </p>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-6 px-2 sm:px-6 pb-4 sm:pb-6">



      <Form {...form}>
        <form 
          onSubmit={form.handleSubmit(onSubmit, (errors) => {
            console.log("Form validation errors:", errors);
            toast({ title: "Please fill in all required fields correctly", variant: "destructive" });
          })} 
          className="space-y-3 sm:space-y-6"
        >
          {/* Name Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
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
                  <FormLabel>Last Name</FormLabel>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
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
                      {!emailVerified && emailStatus !== "checking" && emailStatus === "available" && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleSendEmailOTP}
                          className="h-6 px-2 text-xs"
                          disabled={!field.value || emailStatus !== "available"}
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
                {emailStatus === "invalid" && (
                  <p className="text-xs text-red-600">Invalid Email Address</p>
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
                <div className="mt-4 flex flex-col items-center space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSendEmailOTP}
                    disabled={!canSendEmailOTP()}
                    className="text-xs"
                  >
                    {canSendEmailOTP() ? "Resend OTP" : `Resend in ${emailCountdown}s`}
                  </Button>
                  <p className="text-xs text-slate-500">
                    {emailOtpSendCount}/5 attempts used
                    {emailOtpSendCount >= 5 && " - Max attempts reached"}
                  </p>
                  <p className="text-xs text-slate-500">Check your spam folder if you don't see the email</p>
                </div>
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
                  <div className="flex space-x-1 sm:space-x-2">
                    <div className="flex items-center px-3 py-2 border border-input bg-background rounded-md text-sm font-medium">
                      🇮🇳 +91
                    </div>
                    <div className="flex-1 relative">
                      <Input 
                        type="tel" 
                        placeholder="Enter phone number" 
                        {...field}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        className="pr-20"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center space-x-2">
                        {phoneStatus === "checking" && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                        {phoneStatus === "valid" && !phoneVerified && <Check className="h-4 w-4 text-green-500" />}
                        {phoneStatus === "invalid" && <X className="h-4 w-4 text-red-500" />}
                        {!phoneVerified && phoneStatus !== "checking" && phoneStatus === "valid" && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleSendPhoneOTP}
                            className="h-6 px-2 text-xs"
                            disabled={!field.value || phoneStatus !== "valid"}
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
                          This is a WhatsApp number
                        </Label>
                      </div>
                    )}
                  />
                </div>
                {phoneStatus === "invalid" && (
                  <p className="text-xs text-red-600">Enter the phone number properly</p>
                )}
                {phoneStatus === "taken" && (
                  <p className="text-xs text-red-600">Phone number is already registered</p>
                )}
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
                <div className="mt-4 flex flex-col items-center space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSendPhoneOTP}
                    disabled={!canSendPhoneOTP()}
                    className="text-xs"
                  >
                    {canSendPhoneOTP() ? "Resend OTP" : `Resend in ${phoneCountdown}s`}
                  </Button>
                  <p className="text-xs text-slate-500">
                    {phoneOtpSendCount}/5 attempts used
                    {phoneOtpSendCount >= 5 && " - Max attempts reached"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Location */}
          <div className="space-y-2 sm:space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base">Location Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
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
                  <FormLabel>Address *</FormLabel>
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
          <div className="space-y-2 sm:space-y-4">
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
              render={({ field }) => {
                const password = form.watch("password");
                const confirmPassword = field.value;
                const isMatching = password && confirmPassword && password === confirmPassword;
                const isNotMatching = password && confirmPassword && password !== confirmPassword;
                
                return (
                  <FormItem>
                    <FormLabel>Confirm Password *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Re-enter your password"
                          {...field}
                          className={`pr-16 ${
                            isMatching 
                              ? "border-green-500 focus:border-green-500 focus:ring-green-500" 
                              : isNotMatching 
                              ? "border-red-500 focus:border-red-500 focus:ring-red-500" 
                              : ""
                          }`}
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center space-x-1">
                          {isMatching && <Check className="h-4 w-4 text-green-500" />}
                          {isNotMatching && <X className="h-4 w-4 text-red-500" />}
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4 text-slate-400" />
                            ) : (
                              <Eye className="h-4 w-4 text-slate-400" />
                            )}
                          </button>
                        </div>
                      </div>
                    </FormControl>
                    {isMatching && (
                      <p className="text-xs text-green-600">Passwords match</p>
                    )}
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
          </div>

          {/* Security Verification CAPTCHA */}
          <div>
            <VisualCaptcha
              onVerified={(sessionId, answer) => {
                setCaptchaVerified(true);
                setCaptchaSessionId(sessionId);
                setCaptchaAnswer(answer);
                setShowCaptchaError(false);
                form.setValue("captchaSessionId", sessionId);
                form.setValue("captchaAnswer", answer);
              }}
              onError={() => {
                setCaptchaVerified(false);
                setCaptchaSessionId("");
                setCaptchaAnswer("");
                setShowCaptchaError(true);
              }}
              hasError={showCaptchaError && !captchaVerified}
            />
            {showCaptchaError && !captchaVerified && (
              <p className="text-sm text-red-600 mt-2">Please verify the CAPTCHA</p>
            )}
          </div>

          {/* Terms and Conditions */}
          <FormField
            control={form.control}
            name="acceptTerms"
            render={({ field }) => (
              <FormItem>
                <div className={`${showTermsError && !field.value ? 'border-2 border-red-500 rounded-lg p-3' : ''}`}>
                  <div className="flex items-start space-x-3">
                    <FormControl>
                      <Checkbox
                        id="terms"
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          field.onChange(checked === true);
                          setTermsAccepted(checked === true);
                          if (checked) setShowTermsError(false);
                        }}
                        className={showTermsError && !field.value ? 'border-red-500' : ''}
                      />
                    </FormControl>
                    <Label htmlFor="terms" className="text-sm text-slate-600 dark:text-slate-400">
                      I agree to the{" "}
                      <button
                        type="button"
                        className="text-primary hover:text-primary/80 underline"
                        onClick={() => setTermsModalOpen(true)}
                      >
                        Terms of Conditions
                      </button>{" "}
                      and Privacy Policy
                    </Label>
                  </div>
                  {showTermsError && !field.value && (
                    <p className="text-sm text-red-600 mt-2">Please accept the terms and conditions</p>
                  )}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-semibold py-2 sm:py-3 text-sm sm:text-base shadow-lg hover:shadow-xl transition-all duration-300"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                <span className="text-xs sm:text-sm">Creating Account...</span>
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
      </CardContent>
    </Card>
  );
}
