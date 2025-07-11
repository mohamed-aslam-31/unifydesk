import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { FloatingBackground } from "@/components/floating-background";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Loader2, AlertCircle, Hand, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LoginCaptcha } from "@/components/login-captcha";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const loginSchema = z.object({
  identifier: z.string().min(1, "Email or phone number is required"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().default(false),
});

const otpSchema = z.object({
  otp: z.string().length(6, "OTP must be 6 digits"),
});

type LoginStep = "login" | "otp" | "role-choice";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<LoginStep>("login");
  const [sessionTimer, setSessionTimer] = useState(30 * 60); // 30 minutes in seconds
  const [otpTimer, setOtpTimer] = useState(10 * 60); // 10 minutes in seconds
  const [resendTimer, setResendTimer] = useState(0);
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [userBlocked, setUserBlocked] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [userRole, setUserRole] = useState("");
  const [roleStatus, setRoleStatus] = useState("");
  const [captchaValid, setCaptchaValid] = useState(false);
  const [captchaSessionId, setCaptchaSessionId] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<"valid" | "invalid" | "">("");
  const [showValidationError, setShowValidationError] = useState(true);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: "",
    },
  });

  // Session timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (currentStep === "login" && sessionTimer > 0) {
      interval = setInterval(() => {
        setSessionTimer((prev) => {
          if (prev <= 1) {
            setLocation("/login");
            window.location.reload();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentStep, sessionTimer, setLocation]);

  // OTP timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (currentStep === "otp" && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => {
          if (prev <= 1) {
            setCurrentStep("login");
            toast({
              title: "Session expired",
              description: "Please login again",
              variant: "destructive",
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentStep, otpTimer, toast]);

  // Resend timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Live validation for identifier
  const validateIdentifier = useCallback(async (value: string) => {
    if (!value) {
      setValidationStatus("");
      return;
    }

    setIsValidating(true);
    try {
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      const isPhone = /^(\+\d{1,3})?[\s\-]?[\d\s\-\(\)]{8,15}$/.test(value);
      
      if (!isEmail && !isPhone) {
        setValidationStatus("invalid");
        setIsValidating(false);
        return;
      }

      const field = isEmail ? "email" : "phone";
      let requestBody;
      
      if (isPhone) {
        // For phone validation, extract country code and clean phone number
        let countryCode = '+91';
        let phoneNumber = value;
        
        if (value.startsWith('+')) {
          const match = value.match(/^(\+\d{1,3})(.+)$/);
          if (match) {
            countryCode = match[1];
            phoneNumber = match[2];
          }
        }
        
        phoneNumber = phoneNumber.replace(/\D/g, '');
        requestBody = { field, value: phoneNumber, countryCode };
      } else {
        requestBody = { field, value };
      }
      
      const response = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();
      setValidationStatus(result.available ? "invalid" : "valid");
      
      // Show error and set timer to hide it after 5 seconds
      if (result.available) {
        setShowValidationError(true);
        setTimeout(() => {
          setShowValidationError(false);
        }, 5000);
      }
    } catch (error) {
      setValidationStatus("");
    }
    setIsValidating(false);
  }, []);

  const onSubmit = async (data: z.infer<typeof loginSchema>) => {
    if (!captchaValid) {
      toast({
        title: "CAPTCHA required",
        description: "Please complete the CAPTCHA verification",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          captchaSessionId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        
        // Handle specific error cases
        if (response.status === 429) {
          // Account blocked
          setUserBlocked(true);
          toast({
            title: "Account Blocked",
            description: error.message,
            variant: "destructive",
          });
          return;
        }
        
        // Reset CAPTCHA on any error that requires it
        setCaptchaValid(false);
        setCaptchaSessionId("");
        
        throw new Error(error.message || "Login failed");
      }

      const result = await response.json();
      
      // Set masked contact info
      setMaskedEmail(result.maskedEmail);
      setMaskedPhone(result.maskedPhone);
      setUserRole(result.user.role);
      setRoleStatus(result.user.roleStatus);
      
      // Move to OTP step
      setCurrentStep("otp");
      setOtpTimer(10 * 60); // Reset OTP timer
      setResendTimer(3 * 60); // 3 minutes until resend
      
      toast({
        title: "OTP sent",
        description: "Please check your email and phone for the OTP",
      });
      
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
      setCaptchaValid(false); // Reset CAPTCHA on error
    } finally {
      setIsSubmitting(false);
    }
  };

  const onOtpSubmit = async (data: z.infer<typeof otpSchema>) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        setOtpAttempts(prev => prev + 1);
        
        if (otpAttempts >= 4) { // After 5 attempts total
          setUserBlocked(true);
          toast({
            title: "Account blocked",
            description: "Too many failed attempts. Account blocked for 5 hours.",
            variant: "destructive",
          });
          setCurrentStep("login");
          return;
        }
        
        throw new Error(error.message || "Invalid OTP");
      }

      const result = await response.json();
      
      // Store session token
      localStorage.setItem("sessionToken", result.sessionToken);
      
      toast({
        title: "Login successful!",
        description: "Welcome back to UnifyDesk",
      });

      // Redirect based on user role and status
      if (!userRole) {
        setLocation("/choose-role");
      } else if (roleStatus === "pending") {
        setLocation("/pending");
      } else if (roleStatus === "approved") {
        setLocation("/dashboard");
      } else {
        setLocation("/home");
      }
      
    } catch (error: any) {
      toast({
        title: "OTP verification failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resendOtp = async () => {
    try {
      const response = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to resend OTP");
      }

      setResendTimer(3 * 60); // Reset resend timer
      toast({
        title: "OTP resent",
        description: "A new OTP has been sent to your email and phone",
      });
      
    } catch (error: any) {
      toast({
        title: "Resend failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };



  const renderLoginForm = () => (
    <Card className="shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">
            Welcome Back
          </CardTitle>
          <div className="animate-waving">
            <Hand className="h-6 w-6 text-primary" />
          </div>
        </div>
        <p className="text-slate-600 dark:text-slate-400">
          Sign in to your UnifyDesk account
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="identifier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email or Phone Number</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="Enter your email or phone"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          validateIdentifier(e.target.value);
                        }}
                        className={`pr-10 ${validationStatus === "valid" ? "border-green-500" : validationStatus === "invalid" ? "border-red-500" : ""}`}
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        {isValidating && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                        {!isValidating && validationStatus === "valid" && (
                          <div className="h-2 w-2 bg-green-500 rounded-full" />
                        )}
                        {!isValidating && validationStatus === "invalid" && (
                          <div className="h-2 w-2 bg-red-500 rounded-full" />
                        )}
                      </div>
                    </div>
                  </FormControl>
                  {!isValidating && validationStatus === "invalid" && field.value && (
                    <div 
                      className={`text-red-500 text-xs mt-1 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded transition-opacity duration-500 ${
                        showValidationError ? 'opacity-100' : 'opacity-0'
                      }`}
                    >
                      {/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value) ? "No user matches this email ID" : "No user matches this phone number"}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
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
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <LoginCaptcha
                onValidation={(isValid: boolean, sessionId: string) => {
                  setCaptchaValid(isValid);
                  setCaptchaSessionId(sessionId);
                }}
                resetTrigger={!captchaValid}
              />
            </div>

            {userBlocked && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Account temporarily blocked due to too many failed attempts. Please try again later.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between">
              <FormField
                control={form.control}
                name="rememberMe"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="h-4 w-4"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-[12px] text-slate-600 dark:text-slate-400">
                        Remember me for 30 days
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              <a 
                href="/forgot-password" 
                className="text-sm text-primary hover:text-primary/80"
              >
                Forgot your password?
              </a>
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90"
              disabled={isSubmitting || !captchaValid || userBlocked}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </Form>

        <div className="text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Don't have an account?{" "}
            <a 
              href="/signup" 
              className="text-primary hover:text-primary/80 font-medium"
            >
              Sign up
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );

  const renderOtpForm = () => (
    <Card className="w-full max-w-sm mx-auto shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200 dark:border-slate-700">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          Verify OTP
        </CardTitle>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
          Enter the 6-digit code sent to your contacts
        </p>
      </CardHeader>
      <CardContent className="space-y-4 px-4 sm:px-6">
        {/* Contact Information Display */}
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 sm:p-4">
          <div className="text-center space-y-2">
            <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">
              OTP sent to both:
            </p>
            {maskedEmail && (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-mono">
                  {maskedEmail}
                </span>
              </div>
            )}
            {maskedPhone && (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-mono">
                  {maskedPhone}
                </span>
              </div>
            )}
          </div>
        </div>

        <Form {...otpForm}>
          <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-4">
            <FormField
              control={otpForm.control}
              name="otp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    6-Digit OTP Code
                  </FormLabel>
                  <FormControl>
                    <div className="flex justify-center px-2">
                      <InputOTP 
                        maxLength={6} 
                        {...field}
                        className="gap-2"
                      >
                        <InputOTPGroup className="gap-2">
                          <InputOTPSlot 
                            index={0} 
                            className="w-12 h-12 text-lg font-bold border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200" 
                          />
                          <InputOTPSlot 
                            index={1} 
                            className="w-12 h-12 text-lg font-bold border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200" 
                          />
                          <InputOTPSlot 
                            index={2} 
                            className="w-12 h-12 text-lg font-bold border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200" 
                          />
                          <InputOTPSlot 
                            index={3} 
                            className="w-12 h-12 text-lg font-bold border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200" 
                          />
                          <InputOTPSlot 
                            index={4} 
                            className="w-12 h-12 text-lg font-bold border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200" 
                          />
                          <InputOTPSlot 
                            index={5} 
                            className="w-12 h-12 text-lg font-bold border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200" 
                          />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Timer and Resend Section */}
            <div className="text-center py-2">
              {resendTimer > 0 ? (
                <div className="space-y-1">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Resend available in
                  </p>
                  <p className="text-lg font-mono font-semibold text-primary">
                    {formatTime(resendTimer)}
                  </p>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={resendOtp}
                  className="text-primary hover:text-primary/80 border-primary/20 hover:border-primary/40"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Resend OTP to Both
                </Button>
              )}
            </div>

            {/* Error Alert */}
            {otpAttempts > 0 && (
              <Alert variant="destructive" className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs sm:text-sm">
                  {otpAttempts >= 4 
                    ? "⚠️ Account will be blocked after one more failed attempt." 
                    : `${5 - otpAttempts} attempts remaining before account lock.`
                  }
                </AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-2 sm:py-3 text-sm sm:text-base transition-all duration-200"
              disabled={isSubmitting || otpAttempts >= 5}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying OTP...
                </>
              ) : (
                "Verify OTP Code"
              )}
            </Button>
          </form>
        </Form>

        {/* Back Button */}
        <div className="text-center pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentStep("login")}
            className="text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 text-xs sm:text-sm"
          >
            ← Back to Login
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-all duration-300 relative overflow-hidden">
      {/* Three.js Floating Background */}
      <FloatingBackground className="opacity-30 dark:opacity-20" />
      
      <Header />
      <main className="flex-1 flex items-center justify-center py-4 sm:py-8 lg:py-12 relative z-10 min-h-[calc(100vh-200px)]">
        <div className="w-full max-w-sm sm:max-w-md px-3 sm:px-4">
          {currentStep === "login" && renderLoginForm()}
          {currentStep === "otp" && renderOtpForm()}
        </div>
      </main>
      <Footer />
    </div>
  );
}
