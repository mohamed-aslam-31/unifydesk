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
import { Captcha } from "@/components/ui/captcha";
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
  const [emailCountdown, setEmailCountdown] = useState(0);
  const [phoneCountdown, setPhoneCountdown] = useState(0);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [captchaSessionId, setCaptchaSessionId] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
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
      country: "",
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
    fetch("/api/locations/countries")
      .then(res => res.json())
      .then(data => {
        if (data.data) {
          setCountries(data.data);
        }
      })
      .catch(err => console.error("Failed to load countries:", err));
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
      await sendOTP(email, "email");
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
      await sendOTP(`${countryCode}${phone}`, "phone");
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
      await verifyOTP(email, "email", otp);
      setEmailVerified(true);
      setShowEmailOTP(false);
      setLastVerifiedEmail(email);
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
      setLastVerifiedPhone(phone);
      toast({ title: "Phone verified successfully" });
    } catch (error) {
      toast({ title: "Invalid OTP", variant: "destructive" });
    }
  };



  const onSubmit = async (data: z.infer<typeof signupSchema>) => {
    if (!emailVerified || !phoneVerified) {
      toast({ title: "Please verify your email and phone number", variant: "destructive" });
      return;
    }

    if (!captchaVerified || !captchaSessionId || !captchaAnswer) {
      toast({ title: "Please complete the security verification", variant: "destructive" });
      return;
    }

    if (!termsAccepted) {
      toast({ title: "Please accept the terms and conditions", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await signup({ 
        ...data as SignupData,
        captchaSessionId,
        captchaAnswer,
        acceptTerms: termsAccepted
      });
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
    <Card className="shadow-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">
          Create Your Account
        </CardTitle>
        <p className="text-slate-600 dark:text-slate-400">
          Join UnifyDesk and streamline your business operations
        </p>
      </CardHeader>
      <CardContent className="space-y-6">



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
                  <p className="text-xs text-red-600">Enter the email properly</p>
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
                          This number uses WhatsApp
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
          <Captcha
            onVerified={(sessionId, answer) => {
              setCaptchaVerified(true);
              setCaptchaSessionId(sessionId);
              setCaptchaAnswer(answer);
              form.setValue("captchaSessionId", sessionId);
              form.setValue("captchaAnswer", answer);
            }}
            onError={() => {
              setCaptchaVerified(false);
              setCaptchaSessionId("");
              setCaptchaAnswer("");
            }}
          />

          {/* Terms and Conditions */}
          <div>
            <div className="flex items-start space-x-3">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked === true)}
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
      </CardContent>
    </Card>
  );
}
