import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, Check, X } from "lucide-react";
import { signupSchema } from "@shared/schema";
import { OTPInput } from "./otp-input";
import { TermsModal } from "./terms-modal";
import { VisualCaptcha } from "@/components/ui/visual-captcha";
import { validateField, sendOTP, verifyOTP, signup, SignupData } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { PhoneOtpModal } from "./phone-otp-modal";
import { PasswordStrength } from "./password-strength";
import { Textarea } from "@/components/ui/textarea";

interface PersonalInfoProps {
  onSuccess: (sessionToken: string, user: any) => void;
}

export function PersonalInfo({ onSuccess }: PersonalInfoProps) {
  const { toast } = useToast();
  
  // Form states
  const [firstNameError, setFirstNameError] = useState<string | null>(null);
  const [lastNameError, setLastNameError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [emailStatus, setEmailStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [phoneStatus, setPhoneStatus] = useState<"idle" | "checking" | "valid" | "invalid" | "taken">("idle");
  
  // Verification states
  const [showEmailOTP, setShowEmailOTP] = useState(false);
  const [showPhoneOtpModal, setShowPhoneOtpModal] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneOtpSentNumbers, setPhoneOtpSentNumbers] = useState<Set<string>>(new Set());
  const [phoneResendCounts, setPhoneResendCounts] = useState<Record<string, number>>({});
  const [phoneAttemptCounts, setPhoneAttemptCounts] = useState<Record<string, number>>({});
  const [phoneCooldowns, setPhoneCooldowns] = useState<Record<string, { endTime: number, seconds: number }>>({});
  const [phoneBlocked, setPhoneBlocked] = useState<Set<string>>(new Set());
  const [verifiedPhoneNumbers, setVerifiedPhoneNumbers] = useState<Set<string>>(new Set());
  
  // Email OTP states
  const [emailOtpSendCount, setEmailOtpSendCount] = useState(0);
  const [emailLastSent, setEmailLastSent] = useState<Date | null>(null);
  const [emailBlocked, setEmailBlocked] = useState(false);
  const [emailAttempts, setEmailAttempts] = useState(0);
  const [emailCountdown, setEmailCountdown] = useState(0);
  const [emailOtpSessionId, setEmailOtpSessionId] = useState("");
  
  // Other states
  const [lastVerifiedEmail, setLastVerifiedEmail] = useState("");
  const [lastVerifiedPhone, setLastVerifiedPhone] = useState("");
  const [countries, setCountries] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [captchaSessionId, setCaptchaSessionId] = useState<string | null>(null);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form setup with validation schema
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
      acceptTerms: false,
      captchaAnswer: "",
      captchaSessionId: "",
    },
  });

  // Load countries and Indian states on mount
  useEffect(() => {
    fetchCountries();
    fetchIndianStates();
  }, []);

  // Load verified phone numbers from localStorage and reset their counts
  useEffect(() => {
    try {
      const savedVerifiedNumbers = localStorage.getItem('verifiedPhoneNumbers');
      if (savedVerifiedNumbers) {
        const verifiedSet = new Set<string>(JSON.parse(savedVerifiedNumbers));
        setVerifiedPhoneNumbers(verifiedSet);
        
        // Reset counts for all verified phone numbers
        const updatedResendCounts = { ...phoneResendCounts };
        const updatedAttemptCounts = { ...phoneAttemptCounts };
        const updatedCooldowns = { ...phoneCooldowns };
        const updatedBlocked = new Set(phoneBlocked);
        
        verifiedSet.forEach(phone => {
          updatedResendCounts[phone] = 0;
          updatedAttemptCounts[phone] = 0;
          delete updatedCooldowns[phone];
          updatedBlocked.delete(phone);
        });
        
        setPhoneResendCounts(updatedResendCounts);
        setPhoneAttemptCounts(updatedAttemptCounts);
        setPhoneCooldowns(updatedCooldowns);
        setPhoneBlocked(updatedBlocked);
      }
    } catch (error) {
      console.log('Failed to load verified phone numbers');
    }
  }, []); // Run once on component mount

  // Email OTP timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (emailCountdown > 0) {
      interval = setInterval(() => {
        setEmailCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [emailCountdown]);

  // Reset verification when key fields change
  useEffect(() => {
    const email = form.watch("email");
    if (email !== lastVerifiedEmail && emailVerified) {
      setEmailVerified(false);
      setShowEmailOTP(false);
    }
  }, [form.watch("email"), emailVerified, lastVerifiedEmail]);

  useEffect(() => {
    const phone = form.watch("phone");
    if (phone !== lastVerifiedPhone) {
      if (phoneVerified) {
        setPhoneVerified(false);
        setShowPhoneOtpModal(false);
      }
      // Check if this number was previously verified
      if (phone === lastVerifiedPhone && lastVerifiedPhone) {
        setPhoneVerified(true);
      }
    }
  }, [form.watch("phone"), phoneVerified, lastVerifiedPhone]);

  // Fetch countries
  const fetchCountries = async () => {
    try {
      const response = await fetch("/api/locations/countries");
      const data = await response.json();
      if (!data.error) {
        setCountries(data.data);
      }
    } catch (error) {
      console.error("Error fetching countries:", error);
    }
  };

  // Fetch Indian states on component mount
  const fetchIndianStates = async () => {
    try {
      const response = await fetch("/api/locations/states", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country: "India" }),
      });
      const data = await response.json();
      if (!data.error) {
        setStates(data.data.states);
      }
    } catch (error) {
      console.error("Error fetching Indian states:", error);
    }
  };

  // Handle country change
  const handleCountryChange = async (country: string) => {
    // Reset city selection when country changes
    form.setValue("city", "");
    setCities([]);
    
    if (country === "India") {
      // States are already loaded on mount, just reset state selection
      form.setValue("state", "");
    } else {
      // For other countries, fetch their states if needed
      try {
        const response = await fetch("/api/locations/states", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ country }),
        });
        const data = await response.json();
        if (!data.error) {
          setStates(data.data.states);
        } else {
          setStates([]);
        }
      } catch (error) {
        console.error("Error fetching states:", error);
        setStates([]);
      }
    }
  };

  // Handle state change
  const handleStateChange = async (state: string) => {
    const selectedCountry = form.getValues("country") || "India";
    
    try {
      const response = await fetch("/api/locations/cities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country: selectedCountry, state }),
      });
      const data = await response.json();
      if (!data.error) {
        setCities(data.data);
      } else {
        setCities([]);
      }
      // Reset city selection when state changes
      form.setValue("city", "");
    } catch (error) {
      console.error("Error fetching cities:", error);
      setCities([]);
    }
  };

  // Handle field validations
  const validateFirstName = (value: string) => {
    if (!value.trim()) {
      setFirstNameError("Enter your First Name");
      return;
    }
    if (value.length > 40) {
      setFirstNameError("First name must not exceed 40 characters");
      return;
    }
    if (!/^[a-zA-Z]+( [a-zA-Z]+)*$/.test(value)) {
      setFirstNameError("First name can only contain letters and single spaces");
      return;
    }
    if (value.includes('  ')) {
      setFirstNameError("No consecutive spaces allowed");
      return;
    }
    setFirstNameError(null);
  };

  const validateLastName = (value: string) => {
    if (value && value.length > 60) {
      setLastNameError("Last name must not exceed 60 characters");
      return;
    }
    if (value && !/^[a-zA-Z]*( [a-zA-Z]+)*$/.test(value)) {
      setLastNameError("Last name can only contain letters and single spaces");
      return;
    }
    if (value && value.includes('  ')) {
      setLastNameError("No consecutive spaces allowed");
      return;
    }
    setLastNameError(null);
  };

  const validateUsername = async (value: string) => {
    if (!value.trim()) {
      setUsernameError("Enter your Username");
      setUsernameStatus("idle");
      return;
    }
    if (value.length < 8) {
      setUsernameError("Username must be at least 8 characters");
      setUsernameStatus("idle");
      return;
    }
    if (value.length > 15) {
      setUsernameError("Username must not exceed 15 characters");
      setUsernameStatus("idle");
      return;
    }
    if (!/^[a-zA-Z0-9_!@#$%^&*(),.?":{}|<>-]+$/.test(value)) {
      setUsernameError("Username cannot contain spaces");
      setUsernameStatus("idle");
      return;
    }

    setUsernameError(null);
    setUsernameStatus("checking");

    try {
      const isAvailable = await validateField("username", value);
      if (isAvailable) {
        setUsernameStatus("available");
      } else {
        setUsernameStatus("taken");
        setUsernameError("Username is already taken");
      }
    } catch (error) {
      setUsernameStatus("idle");
      setUsernameError("Error checking username");
    }
  };

  // Handle username change with debouncing
  const handleUsernameChange = (value: string) => {
    form.setValue("username", value);
    
    const timeoutId = setTimeout(() => {
      validateUsername(value);
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  // Handle first name change
  const handleFirstNameChange = (value: string) => {
    form.setValue("firstName", value);
    validateFirstName(value);
  };

  // Handle last name change
  const handleLastNameChange = (value: string) => {
    form.setValue("lastName", value);
    validateLastName(value);
  };

  // Handle email validation
  const handleEmailChange = async (value: string) => {
    form.setValue("email", value);
    
    if (!value) {
      setEmailStatus("idle");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      setEmailStatus("invalid");
      return;
    }

    setEmailStatus("checking");

    try {
      const isAvailable = await validateField("email", value);
      if (isAvailable) {
        setEmailStatus("available");
      } else {
        setEmailStatus("taken");
      }
    } catch (error) {
      setEmailStatus("idle");
    }
  };

  // Handle phone validation
  const handlePhoneChange = async (value: string) => {
    form.setValue("phone", value);
    
    if (!value) {
      setPhoneStatus("idle");
      return;
    }

    if (!/^\d{10}$/.test(value)) {
      setPhoneStatus("invalid");
      return;
    }

    setPhoneStatus("checking");

    try {
      const isAvailable = await validateField("phone", `+91${value}`);
      if (isAvailable) {
        setPhoneStatus("valid");
      } else {
        setPhoneStatus("taken");
      }
    } catch (error) {
      setPhoneStatus("idle");
    }
  };

  // Email OTP Functions
  const getEmailOTPCooldown = () => {
    if (!emailLastSent) return 0;
    const timeDiff = new Date().getTime() - emailLastSent.getTime();
    const remaining = 180000 - timeDiff; // 3 minutes
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
  };

  const canSendEmailOTP = () => {
    return emailCountdown === 0 && emailOtpSendCount < 5 && !emailBlocked;
  };

  const handleSendEmailOTP = async () => {
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
      const email = form.getValues("email");
      if (!email) return;

      const response = await sendOTP(email, "email");
      setEmailOtpSessionId(response.sessionId || "");
      setEmailOtpSendCount(prev => prev + 1);
      setEmailLastSent(new Date());
      setEmailCountdown(180); // 3 minutes
      setShowEmailOTP(true);
      
      toast({ title: "OTP sent", description: `Verification code sent to ${email}` });
    } catch (error) {
      console.error("Send Email OTP error:", error);
      toast({ title: "Failed to send OTP", description: "Please try again later", variant: "destructive" });
    }
  };

  const handleEmailOTPComplete = async (otp: string) => {
    try {
      const email = form.getValues("email");
      const countryCode = form.getValues("countryCode");
      
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

  // Phone OTP Functions
  const handleSendPhoneOTP = async () => {
    const phoneValue = form.getValues('phone');
    if (!phoneValue || phoneStatus !== 'valid') return;
    
    // Check if this phone number was already verified
    if (lastVerifiedPhone === phoneValue) {
      setPhoneVerified(true);
      toast({
        title: "Phone already verified",
        description: "This phone number is already verified!",
      });
      return;
    }
    
    // Check if this phone number is blocked locally
    if (phoneBlocked.has(phoneValue)) {
      toast({
        title: "Phone Number Blocked",
        description: "Your number was blocked due to too many failed OTP attempts. Please try again after 5 hours.",
        variant: "destructive",
      });
      return;
    }
    
    // If OTP was already sent for this number, just open modal
    if (phoneOtpSentNumbers.has(phoneValue)) {
      setShowPhoneOtpModal(true);
      return;
    }
    
    // Try to send OTP first - only open modal if successful
    try {
      const response = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          identifier: `+91${phoneValue}`,
          type: 'phone'
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 429) {
          // Mark as blocked locally
          setPhoneBlocked(prev => new Set(prev).add(phoneValue));
          toast({
            title: "Phone Number Blocked",
            description: "Your number was blocked due to too many failed OTP attempts. Please try again after 5 hours.",
            variant: "destructive",
          });
          return;
        }
        
        throw new Error(data.message || 'Failed to send OTP');
      }
      
      // Success - mark as sent, set cooldown, and open modal
      handlePhoneOtpSent(phoneValue);
      
      // Update resend count for this phone
      const newResendCount = (phoneResendCounts[phoneValue] || 0) + 1;
      setPhoneResendCounts(prev => ({ ...prev, [phoneValue]: newResendCount }));
      
      toast({
        title: "OTP sent",
        description: `Verification code sent to +91 ${phoneValue}`,
      });
      setShowPhoneOtpModal(true);
      
    } catch (error: any) {
      toast({
        title: "Failed to send OTP",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handlePhoneVerified = () => {
    const phoneValue = form.getValues('phone');
    setPhoneVerified(true);
    setLastVerifiedPhone(phoneValue);
    
    // Add to verified numbers set and save to localStorage
    const updatedVerifiedNumbers = new Set(verifiedPhoneNumbers);
    updatedVerifiedNumbers.add(phoneValue);
    setVerifiedPhoneNumbers(updatedVerifiedNumbers);
    
    try {
      localStorage.setItem('verifiedPhoneNumbers', JSON.stringify(Array.from(updatedVerifiedNumbers)));
    } catch (error) {
      console.log('Failed to save verified phone number');
    }
    
    // Clear all tracking for this phone since it's verified
    setPhoneOtpSentNumbers(prev => {
      const newSet = new Set(prev);
      newSet.delete(phoneValue);
      return newSet;
    });
    setPhoneResendCounts(prev => {
      const newCounts = { ...prev };
      delete newCounts[phoneValue];
      return newCounts;
    });
    setPhoneAttemptCounts(prev => {
      const newCounts = { ...prev };
      delete newCounts[phoneValue];
      return newCounts;
    });
    // Remove from blocked list
    setPhoneBlocked(prev => {
      const newSet = new Set(prev);
      newSet.delete(phoneValue);
      return newSet;
    });
    toast({
      title: "Phone verified",
      description: "Your phone number has been successfully verified!",
    });
  };
  
  const handlePhoneModalClose = () => {
    setShowPhoneOtpModal(false);
  };
  
  const handlePhoneOtpSent = (phone: string) => {
    setPhoneOtpSentNumbers(prev => new Set(prev).add(phone));
    // Set 3-minute cooldown
    const endTime = Date.now() + 180000; // 3 minutes from now
    setPhoneCooldowns(prev => ({ ...prev, [phone]: { endTime, seconds: 180 } }));
  };
  
  const handlePhoneResendUpdate = (phone: string, count: number) => {
    setPhoneResendCounts(prev => ({ ...prev, [phone]: count }));
  };
  
  const handlePhoneAttemptUpdate = (phone: string, count: number) => {
    setPhoneAttemptCounts(prev => ({ ...prev, [phone]: count }));
  };
  
  const handlePhoneCooldownUpdate = (phone: string, seconds: number) => {
    if (seconds <= 0) {
      setPhoneCooldowns(prev => {
        const newCooldowns = { ...prev };
        delete newCooldowns[phone];
        return newCooldowns;
      });
    } else {
      setPhoneCooldowns(prev => ({ 
        ...prev, 
        [phone]: { 
          endTime: prev[phone]?.endTime || Date.now() + seconds * 1000, 
          seconds 
        }
      }));
    }
  };
  
  const handlePhoneBlocked = (phone: string) => {
    setPhoneBlocked(prev => new Set(prev).add(phone));
  };

  // Form submission
  const onSubmit = async (data: z.infer<typeof signupSchema>) => {
    if (!emailVerified) {
      toast({ title: "Please verify your email first", variant: "destructive" });
      return;
    }

    if (!phoneVerified) {
      toast({ title: "Please verify your phone number first", variant: "destructive" });
      return;
    }

    if (!captchaSessionId) {
      toast({ title: "Please complete the CAPTCHA", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    try {
      const signupData: SignupData = {
        ...data,
        lastName: data.lastName || "",
        captchaAnswer: data.captchaAnswer || "",
        captchaSessionId: captchaSessionId,
      };

      const result = await signup(signupData);
      
      toast({
        title: "Account created successfully!",
        description: "Welcome to UnifyDesk",
      });

      onSuccess(result.sessionToken, result.user);
    } catch (error: any) {
      toast({
        title: "Signup failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">
          {/* Personal Information */}
          <div className="space-y-2 sm:space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base">Personal Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
              {/* First Name */}
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter first name" 
                        {...field}
                        onChange={(e) => handleFirstNameChange(e.target.value)}
                      />
                    </FormControl>
                    {firstNameError && (
                      <p className="text-xs text-red-600">{firstNameError}</p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Last Name */}
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name (optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter last name" 
                        {...field}
                        onChange={(e) => handleLastNameChange(e.target.value)}
                      />
                    </FormControl>
                    {lastNameError && (
                      <p className="text-xs text-red-600">{lastNameError}</p>
                    )}
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
                        placeholder="Enter username" 
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
                  {usernameError && (
                    <p className="text-xs text-red-600">{usernameError}</p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Gender and Date of Birth */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
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
                      <Input 
                        type="date" 
                        {...field}
                        max="2006-12-31"
                        min="1924-01-01"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-2 sm:space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base">Contact Information</h3>
            
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
                        placeholder="Enter email address" 
                        {...field}
                        onChange={(e) => handleEmailChange(e.target.value)}
                        className="pr-20"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center space-x-2">
                        {emailStatus === "checking" && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                        {emailStatus === "available" && !emailVerified && <Check className="h-4 w-4 text-green-500" />}
                        {emailStatus === "taken" && <X className="h-4 w-4 text-red-500" />}
                        {emailStatus === "invalid" && <X className="h-4 w-4 text-red-500" />}
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
                  {emailStatus === "invalid" && (
                    <p className="text-xs text-red-600">Invalid Email Address</p>
                  )}
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
                          {phoneStatus === "invalid" && <X className="h-4 w-4 text-red-500" />}
                          {phoneStatus === "taken" && <X className="h-4 w-4 text-red-500" />}
                          {/* Show verify button if phone is valid and not verified, or if it's a different number than verified */}
                          {!phoneVerified && phoneStatus === "valid" && field.value !== lastVerifiedPhone && (
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
                          {/* Show blue tick if phone is verified or matches last verified phone */}
                          {(phoneVerified || (field.value === lastVerifiedPhone && lastVerifiedPhone)) && phoneStatus === "valid" && (
                            <Check className="h-4 w-4 text-blue-500" />
                          )}
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
                    <p className="text-xs text-red-600">Invalid Phone Number</p>
                  )}
                  {phoneStatus === "taken" && (
                    <p className="text-xs text-red-600">Phone number is already registered</p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Phone OTP Modal */}
            <PhoneOtpModal
              open={showPhoneOtpModal}
              onClose={handlePhoneModalClose}
              phone={form.watch('phone') || ''}
              countryCode="+91"
              onVerified={handlePhoneVerified}
              autoSendOtp={false}
              onOtpSent={handlePhoneOtpSent}
              initialResendCount={phoneResendCounts[form.watch('phone') || ''] || 0}
              initialAttemptCount={phoneAttemptCounts[form.watch('phone') || ''] || 0}
              initialCooldown={phoneCooldowns[form.watch('phone') || '']}
              onResendUpdate={handlePhoneResendUpdate}
              onAttemptUpdate={handlePhoneAttemptUpdate}
              onCooldownUpdate={handlePhoneCooldownUpdate}
              onPhoneBlocked={handlePhoneBlocked}
            />
          </div>

          {/* Location Information */}
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
                    }} value={field.value}>
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                      placeholder="Enter your complete address"
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Account Security */}
          <div className="space-y-2 sm:space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base">Account Security</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password *</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Create password" {...field} />
                    </FormControl>
                    <PasswordStrength password={field.value || ''} />
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
                  const isNotMatching = confirmPassword && password && password !== confirmPassword;

                  return (
                    <FormItem>
                      <FormLabel>Confirm Password *</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Confirm password" {...field} />
                      </FormControl>
                      {isMatching && (
                        <p className="text-xs text-green-600">Passwords match</p>
                      )}
                      {isNotMatching && (
                        <p className="text-xs text-red-600">Passwords don't match</p>
                      )}
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>
          </div>

          {/* CAPTCHA */}
          <div className="space-y-2">
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base">Security Verification</h3>
            <VisualCaptcha onVerified={setCaptchaSessionId} />
          </div>

          {/* Terms and Conditions */}
          <FormField
            control={form.control}
            name="acceptTerms"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <Label className="text-sm">
                    I accept the{" "}
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(true)}
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline"
                    >
                      Terms and Conditions
                    </button>
                  </Label>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full h-12 text-base font-medium"
            size="lg"
            disabled={isSubmitting || !emailVerified || !phoneVerified}
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

      {/* Terms Modal */}
      <TermsModal
        open={showTermsModal}
        onOpenChange={setShowTermsModal}
        onAccept={() => {
          form.setValue("acceptTerms", true);
          setShowTermsModal(false);
        }}
      />
    </div>
  );
}