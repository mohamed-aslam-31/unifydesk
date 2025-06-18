import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Header } from './header';
import { Footer } from './footer';
import { FloatingBackground } from './floating-background';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Eye, EyeOff, ArrowLeft, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from './ui/input-otp';

interface CaptchaData {
  question: string;
  sessionId: string;
}

interface PasswordStrength {
  score: number;
  feedback: string[];
  meets: {
    length: boolean;
    uppercase: boolean;
    number: boolean;
    special: boolean;
  };
}

export function ForgotPassword() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<'email' | 'otp' | 'reset' | 'success'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [identifierType, setIdentifierType] = useState<'email' | 'phone'>('email');
  const [captcha, setCaptcha] = useState<CaptchaData | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaCanvas, setCaptchaCanvas] = useState<string>('');
  const [otpCode, setOtpCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isValidIdentifier, setIsValidIdentifier] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sessionTimeout, setSessionTimeout] = useState(0);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    feedback: [],
    meets: { length: false, uppercase: false, number: false, special: false }
  });
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);
  const [showVerifiedText, setShowVerifiedText] = useState(false);
  const [maskedIdentifier, setMaskedIdentifier] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [resendTimer, setResendTimer] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [captchaMessageTimer, setCaptchaMessageTimer] = useState(0);
  const [validationErrorTimer, setValidationErrorTimer] = useState(0);
  const [showValidationError, setShowValidationError] = useState(true);
  const [otpTimeLeft, setOtpTimeLeft] = useState(600); // 10 minutes for OTP session
  const [showMessage, setShowMessage] = useState(false);
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  // Mask email and phone functions
  const maskEmail = (email: string) => {
    const [username, domain] = email.split('@');
    const maskedUsername = username.length > 3 
      ? username.slice(0, 2) + '*'.repeat(username.length - 4) + username.slice(-2)
      : username[0] + '*'.repeat(username.length - 1);
    return `${maskedUsername}@${domain}`;
  };

  const maskPhone = (phone: string) => {
    return phone.slice(0, 2) + '*'.repeat(6) + phone.slice(-2);
  };

  // Resend timer management
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendTimer > 0) {
      timer = setTimeout(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [resendTimer]);

  // Auto-hide captcha text messages after 5 seconds (but keep visual checkmark)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (captchaMessageTimer > 0) {
      timer = setTimeout(() => {
        setCaptchaMessageTimer(prev => {
          if (prev <= 1) {
            // Clear error messages and verified text, keep isCaptchaVerified for visual checkmark
            setError('');
            setShowVerifiedText(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [captchaMessageTimer]);

  // Auto-hide validation error messages after 5 seconds
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (validationErrorTimer > 0) {
      timer = setTimeout(() => {
        setValidationErrorTimer(prev => {
          if (prev <= 1) {
            setShowValidationError(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [validationErrorTimer]);

  // OTP session timeout management (10 minutes)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (step === 'otp' && otpTimeLeft > 0) {
      timer = setTimeout(() => {
        setOtpTimeLeft(prev => {
          if (prev <= 1) {
            setError('OTP session expired. Please try again.');
            setLocation('/login');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => clearTimeout(timer);
  }, [otpTimeLeft, step]);

  // Auto-hide messages after 6 seconds with fade effect
  useEffect(() => {
    if (showMessage) {
      const timer = setTimeout(() => {
        setShowMessage(false);
        setError('');
        setSuccess('');
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [showMessage]);

  // Session timeout management (hidden as requested)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (step === 'email' && sessionTimeout === 0) {
      setSessionTimeout(600); // 10 minutes for email step
    } else if (step === 'reset' && sessionTimeout === 0) {
      setSessionTimeout(300); // 5 minutes for reset step
    }
    
    if (sessionTimeout > 0) {
      timer = setTimeout(() => {
        setSessionTimeout(prev => {
          if (prev <= 1) {
            setLocation('/login');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => clearTimeout(timer);
  }, [sessionTimeout, step, setLocation]);

  // Generate captcha
  const generateCaptcha = async () => {
    try {
      // Reset verification state when generating new captcha
      setIsCaptchaVerified(false);
      setShowVerifiedText(false);
      setCaptchaAnswer('');
      setError('');
      setCaptchaMessageTimer(0);
      
      const response = await fetch('/api/captcha/generate');
      const data = await response.json();
      setCaptcha(data);
      
      // Create canvas to draw captcha
      const canvas = document.createElement('canvas');
      canvas.width = 150;
      canvas.height = 50;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Background
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, 150, 50);
        
        // Add noise lines
        for (let i = 0; i < 5; i++) {
          ctx.strokeStyle = `hsl(${Math.random() * 360}, 50%, 70%)`;
          ctx.beginPath();
          ctx.moveTo(Math.random() * 150, Math.random() * 50);
          ctx.lineTo(Math.random() * 150, Math.random() * 50);
          ctx.stroke();
        }
        
        // Draw text
        ctx.font = 'bold 20px Arial';
        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';
        ctx.fillText(data.question, 75, 30);
        
        // Add noise dots
        for (let i = 0; i < 50; i++) {
          ctx.fillStyle = `hsl(${Math.random() * 360}, 50%, 80%)`;
          ctx.fillRect(Math.random() * 150, Math.random() * 50, 2, 2);
        }
        
        setCaptchaCanvas(canvas.toDataURL());
      }
    } catch (error) {
      console.error('Failed to generate captcha:', error);
    }
  };

  // Validate identifier (email or phone) with live database check
  const validateIdentifier = async (value: string) => {
    if (!value.trim()) {
      setIsValidIdentifier(false);
      setError('');
      return;
    }

    // Check if it's valid email or 10-digit phone
    const isEmail = value.includes('@');
    const isPhone = /^\d{10}$/.test(value.trim());
    
    if (!isEmail && !isPhone) {
      setIsValidIdentifier(false);
      setError('Enter a valid email or 10-digit phone number');
      return;
    }

    setIsValidating(true);
    setError('');
    
    try {
      const response = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field: isEmail ? 'email' : 'phone',
          value: value.trim(),
          countryCode: isEmail ? undefined : '+91'
        })
      });

      const data = await response.json();
      const userExists = !data.available; // User exists if NOT available
      setIsValidIdentifier(userExists);
      setIdentifierType(isEmail ? 'email' : 'phone');
      
      if (!userExists) {
        setError(`User not found with this ${isEmail ? 'email' : 'phone number'}`);
        setShowValidationError(true);
        setValidationErrorTimer(5); // Start 5-second timer for validation error
      } else {
        // Set masked identifier for display
        const masked = isEmail ? maskEmail(value.trim()) : maskPhone(value.trim());
        setMaskedIdentifier(masked);
      }
    } catch (error) {
      setIsValidIdentifier(false);
      setError('Unable to verify. Please try again.');
      setShowValidationError(true);
      setValidationErrorTimer(5); // Start 5-second timer for network error
    } finally {
      setIsValidating(false);
    }
  };

  // Verify captcha separately
  const verifyCaptcha = async () => {
    if (!captcha || !captchaAnswer.trim()) {
      setError('Please enter the captcha');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/captcha/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: captcha.sessionId,
          answer: captchaAnswer.trim()
        })
      });

      const data = await response.json();
      if (data.valid) {
        setIsCaptchaVerified(true);
        setShowVerifiedText(true);
        setError('');
        setCaptchaMessageTimer(5); // Start 5-second timer for verified message
      } else {
        setError('Invalid captcha. Please try again.');
        setCaptchaMessageTimer(5); // Start 5-second timer for error message
        generateCaptcha();
        setCaptchaAnswer('');
        setIsCaptchaVerified(false);
      }
    } catch (error) {
      setError('Failed to verify captcha. Please try again.');
      setCaptchaMessageTimer(5); // Start 5-second timer for error message
      setIsCaptchaVerified(false);
    } finally {
      setLoading(false);
    }
  };

  // Password strength checker
  const checkPasswordStrength = (pwd: string) => {
    const meets = {
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      number: /\d/.test(pwd),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pwd)
    };

    const score = Object.values(meets).filter(Boolean).length;
    const feedback = [];

    if (!meets.length) feedback.push('At least 8 characters');
    if (!meets.uppercase) feedback.push('Contains uppercase letter');
    if (!meets.number) feedback.push('Contains number');
    if (!meets.special) feedback.push('Contains special character');

    let strengthText = 'Very Weak';
    if (score === 1) strengthText = 'Weak';
    else if (score === 2) strengthText = 'Fair';
    else if (score === 3) strengthText = 'Good';
    else if (score === 4) strengthText = 'Strong';

    setPasswordStrength({
      score,
      feedback: [`Password Strength: ${strengthText}`, ...feedback],
      meets
    });
  };

  // Handle form submissions
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidIdentifier || !isCaptchaVerified) {
      setError('Please verify both email/phone and captcha first');
      return;
    }

    if (isBlocked) {
      setError('Account is temporarily blocked. Please try again later.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Send reset OTP to both email and phone
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          type: identifierType,
          sendToBoth: true // Send to both email and phone
        })
      });

      const data = await response.json();
      if (response.ok) {
        setStep('otp');
        setOtpTimeLeft(600); // Start 10-minute OTP session timer
        setSessionTimeout(0);
        setOtpAttempts(prev => prev + 1);
        setResendTimer(180); // 3 minutes
        setSuccess('Reset code sent to both email and phone');
        setShowMessage(true);
        setMessageType('success');
        
        // Store masked identifiers from response - server now sends both email and phone
        if (data.maskedEmail) {
          setMaskedEmail(data.maskedEmail);
        }
        if (data.maskedPhone) {
          setMaskedPhone(data.maskedPhone);
        }
        
        // Set the primary masked identifier for fallback display
        if (data.maskedIdentifier) {
          setMaskedIdentifier(data.maskedIdentifier);
        }
        
        // Block account if 5+ attempts
        if (otpAttempts >= 4) {
          setIsBlocked(true);
          setTimeout(() => setIsBlocked(false), 5 * 60 * 60 * 1000); // 5 hours
        }
      } else {
        setError(data.message || 'Failed to send reset code');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const resendOtp = async () => {
    if (resendTimer > 0 || otpAttempts >= 5 || isBlocked) return;

    setLoading(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          type: identifierType,
          sendToBoth: true
        })
      });

      const data = await response.json();
      if (response.ok) {
        setOtpAttempts(prev => prev + 1);
        setResendTimer(180);
        setSuccess('New reset code sent');
        
        if (otpAttempts >= 4) {
          setIsBlocked(true);
          setTimeout(() => setIsBlocked(false), 5 * 60 * 60 * 1000);
        }
      } else {
        setError(data.message || 'Failed to resend code');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/verify-reset-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          otp: otpCode
        })
      });

      const data = await response.json();
      if (response.ok) {
        setStep('reset');
        setOtpTimeLeft(0); // Stop OTP timer
        setSessionTimeout(0);
        setSuccess('OTP verified successfully! Redirecting to reset password...');
        setShowMessage(true);
        setMessageType('success');
        setError('');
        setOtpCode('');
        // Generate new captcha for reset step
        generateCaptcha();
      } else {
        setError(data.message || 'Invalid OTP. Please try again.');
        setShowMessage(true);
        setMessageType('error');
        setOtpCode('');
      }
    } catch (error) {
      setError('Network error. Please try again.');
      setShowMessage(true);
      setMessageType('error');
      setOtpCode('');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (passwordStrength.score < 2) {
      setError('Password is too weak. Please follow the requirements.');
      return;
    }
    if (!captcha || !captchaAnswer.trim()) {
      setError('Please complete the captcha');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Verify captcha first
      const captchaResponse = await fetch('/api/captcha/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: captcha.sessionId,
          answer: captchaAnswer.trim()
        })
      });

      const captchaResult = await captchaResponse.json();
      if (!captchaResult.valid) {
        setError('Invalid captcha. Please try again.');
        generateCaptcha();
        setCaptchaAnswer('');
        return;
      }

      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password: password,
          type: identifierType
        })
      });

      const data = await response.json();
      if (response.ok) {
        setStep('success');
        setSuccess('Password reset successfully! An email confirmation has been sent.');
      } else {
        setError(data.message || 'Failed to reset password');
        generateCaptcha();
        setCaptchaAnswer('');
      }
    } catch (error) {
      setError('Network error. Please try again.');
      generateCaptcha();
      setCaptchaAnswer('');
    } finally {
      setLoading(false);
    }
  };

  // Initialize captcha on mount and step changes
  useEffect(() => {
    if (step === 'email' || step === 'reset') {
      generateCaptcha();
    }
  }, [step]);

  // Validate identifier on change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (identifier.trim()) {
        validateIdentifier(identifier);
      } else {
        setIsValidIdentifier(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [identifier]);

  // Check password strength
  useEffect(() => {
    if (password) {
      checkPasswordStrength(password);
    }
  }, [password]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderEmailForm = () => (
    <Card className="w-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-xl">
      <CardHeader className="text-center pb-6">
        <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Forgot Password
        </CardTitle>
        <p className="text-slate-600 dark:text-slate-400 text-sm mt-2">
          Enter your email or phone to reset your password
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {success && (
          <Alert>
            <AlertDescription className="text-green-600">{success}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div>
            <Label htmlFor="identifier" className="text-slate-700 dark:text-slate-300">Email or Phone Number</Label>
            <div className="relative">
              <Input
                id="identifier"
                type="text"
                placeholder="Enter email or Phone"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className={`pr-10 bg-white/50 dark:bg-slate-700/50 transition-colors ${
                  identifier && !isValidating 
                    ? isValidIdentifier 
                      ? 'border-green-500 dark:border-green-400' 
                      : 'border-red-500 dark:border-red-400'
                    : 'border-slate-300 dark:border-slate-600'
                }`}
                required
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                {isValidating ? (
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : identifier && (
                  isValidIdentifier ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )
                )}
              </div>
            </div>
            {/* Error message under input - small font */}
            {identifier && !isValidating && !isValidIdentifier && error && error.includes('User not found') && showValidationError && (
              <div className="mt-1">
                <p className="text-xs text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded border border-red-200 dark:border-red-800">
                  {error}
                </p>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="captcha" className="text-slate-700 dark:text-slate-300">Captcha</Label>
            <div className="flex items-center space-x-2 mb-2">
              <div className="relative">
                {captchaCanvas && (
                  <img 
                    src={captchaCanvas} 
                    alt="Captcha" 
                    className="border rounded bg-white"
                  />
                )}
                {/* Green checkmark overlay when verified */}
                {isCaptchaVerified && (
                  <div className="absolute top-1 right-1 bg-green-500 rounded-full p-1">
                    <CheckCircle className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={generateCaptcha}
                className="border-slate-300 dark:border-slate-600"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex space-x-2">
              <Input
                id="captcha"
                type="text"
                placeholder="Enter captcha"
                value={captchaAnswer}
                onChange={(e) => {
                  setCaptchaAnswer(e.target.value);
                  setIsCaptchaVerified(false);
                  setShowVerifiedText(false);
                  setSuccess('');
                  // Clear captcha-specific errors
                  if (error && (error.includes('captcha') || error.includes('Invalid captcha'))) {
                    setError('');
                  }
                }}
                className={`bg-white/50 dark:bg-slate-700/50 transition-colors ${
                  isCaptchaVerified 
                    ? 'border-green-500 dark:border-green-400' 
                    : error && (error.includes('captcha') || error.includes('Invalid captcha'))
                      ? 'border-red-500 dark:border-red-400'
                      : 'border-slate-300 dark:border-slate-600'
                }`}
                required
              />
              <Button
                type="button"
                onClick={verifyCaptcha}
                disabled={!captchaAnswer.trim() || loading || isCaptchaVerified}
                className="px-4"
                variant={isCaptchaVerified ? "default" : "outline"}
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : isCaptchaVerified ? (
                  <CheckCircle className="w-4 h-4 text-white" />
                ) : (
                  'Verify'
                )}
              </Button>
            </div>
            {/* Captcha error message under input - small font */}
            {error && (error.includes('captcha') || error.includes('Invalid captcha')) && (
              <div className="mt-1">
                <p className="text-xs text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded border border-red-200 dark:border-red-800">
                  Wrong captcha! Please try again
                </p>
              </div>
            )}
            {/* Captcha success message */}
            {showVerifiedText && (
              <div className="mt-1">
                <p className="text-xs text-green-600 dark:text-green-400 font-medium bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded border border-green-200 dark:border-green-800 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Verified
                </p>
              </div>
            )}
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation('/login')}
              className="flex-1 border-slate-300 dark:border-slate-600"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Button>
            <Button
              type="submit"
              disabled={!isValidIdentifier || !isCaptchaVerified || loading || isBlocked}
              className="flex-1"
            >
              {loading ? 'Sending...' : 'Continue'}
            </Button>
          </div>
          
          {otpAttempts >= 5 && (
            <div className="text-center">
              <p className="text-sm text-red-600">
                Maximum attempts reached. Account blocked for 5 hours.
              </p>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );

  const renderOtpForm = () => (
    <Card className="w-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-xl">
      <CardHeader className="text-center pb-6">
        <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          OTP Verification
        </CardTitle>
        <p className="text-slate-600 dark:text-slate-400 text-sm mt-2">
          OTP sent to both email and phone number
        </p>
        <div className="text-center space-y-2 mt-4">
          {maskedEmail && (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-slate-700 dark:text-slate-300 font-mono">
                {maskedEmail}
              </span>
            </div>
          )}
          {maskedPhone && (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-slate-700 dark:text-slate-300 font-mono">
                {maskedPhone}
              </span>
            </div>
          )}
          {!maskedEmail && !maskedPhone && maskedIdentifier && (
            <div className="text-sm text-slate-700 dark:text-slate-300 font-mono">
              {maskedIdentifier}
            </div>
          )}

        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Small messages with auto-hide and fade effect */}
        {showMessage && (success || error) && (
          <div className={`transition-opacity duration-500 ${showMessage ? 'opacity-100' : 'opacity-0'}`}>
            {success && (
              <div className="text-center">
                <p className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded border border-green-200 dark:border-green-800">
                  {success}
                </p>
              </div>
            )}
            {error && (
              <div className="text-center">
                <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded border border-red-200 dark:border-red-800">
                  {error}
                </p>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleOtpSubmit} className="space-y-6">
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={otpCode}
              onChange={setOtpCode}
              className="gap-2"
            >
              <InputOTPGroup className="gap-2">
                <InputOTPSlot index={0} className="w-12 h-12 text-lg font-semibold bg-white/50 dark:bg-slate-700/50 border-slate-300 dark:border-slate-600" />
                <InputOTPSlot index={1} className="w-12 h-12 text-lg font-semibold bg-white/50 dark:bg-slate-700/50 border-slate-300 dark:border-slate-600" />
                <InputOTPSlot index={2} className="w-12 h-12 text-lg font-semibold bg-white/50 dark:bg-slate-700/50 border-slate-300 dark:border-slate-600" />
              </InputOTPGroup>
              <InputOTPGroup className="gap-2">
                <InputOTPSlot index={3} className="w-12 h-12 text-lg font-semibold bg-white/50 dark:bg-slate-700/50 border-slate-300 dark:border-slate-600" />
                <InputOTPSlot index={4} className="w-12 h-12 text-lg font-semibold bg-white/50 dark:bg-slate-700/50 border-slate-300 dark:border-slate-600" />
                <InputOTPSlot index={5} className="w-12 h-12 text-lg font-semibold bg-white/50 dark:bg-slate-700/50 border-slate-300 dark:border-slate-600" />
              </InputOTPGroup>
            </InputOTP>
          </div>

          {/* Timer and Resend Section */}
          <div className="text-center py-2">
            {resendTimer > 0 ? (
              <div className="space-y-1">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Resend available in
                </p>
                <p className="text-lg font-mono font-semibold text-primary">
                  {Math.floor(resendTimer / 60)}:{(resendTimer % 60).toString().padStart(2, '0')}
                </p>
              </div>
            ) : otpAttempts < 5 && !isBlocked ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resendOtp}
                disabled={loading}
                className="text-primary hover:text-primary/80 border-primary/20 hover:border-primary/40"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Resend OTP ({5 - otpAttempts} left)
              </Button>
            ) : (
              <p className="text-sm text-red-600">
                Maximum resend attempts reached
              </p>
            )}
          </div>

          <div className="flex space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep('email')}
              className="flex-1 border-slate-300 dark:border-slate-600"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              type="submit"
              disabled={otpCode.length !== 6 || loading}
              className="flex-1"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );

  const renderResetForm = () => (
    <Card className="w-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-xl">
      <CardHeader className="text-center pb-6">
        <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Reset Password
        </CardTitle>
        <p className="text-slate-600 dark:text-slate-400 text-sm mt-2">
          Enter your new password
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {success && (
          <Alert>
            <AlertDescription className="text-green-600">{success}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handlePasswordReset} className="space-y-4">
          <div>
            <Label htmlFor="password" className="text-slate-700 dark:text-slate-300">New Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10 bg-white/50 dark:bg-slate-700/50 border-slate-300 dark:border-slate-600"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            {passwordStrength.feedback.length > 0 && (
              <div className="mt-2 space-y-1">
                {passwordStrength.feedback.map((feedback, index) => (
                  <p
                    key={index}
                    className={`text-xs ${
                      index === 0
                        ? passwordStrength.score < 2
                          ? 'text-red-600'
                          : passwordStrength.score < 3
                          ? 'text-yellow-600'
                          : 'text-green-600'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {feedback}
                  </p>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="confirmPassword" className="text-slate-700 dark:text-slate-300">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pr-10 bg-white/50 dark:bg-slate-700/50 border-slate-300 dark:border-slate-600"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="resetCaptcha" className="text-slate-700 dark:text-slate-300">Captcha</Label>
            <div className="flex items-center space-x-2 mb-2">
              {captchaCanvas && (
                <img 
                  src={captchaCanvas} 
                  alt="Captcha" 
                  className="border rounded bg-white"
                />
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={generateCaptcha}
                className="border-slate-300 dark:border-slate-600"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
            <Input
              id="resetCaptcha"
              type="text"
              placeholder="Enter captcha"
              value={captchaAnswer}
              onChange={(e) => setCaptchaAnswer(e.target.value)}
              className="bg-white/50 dark:bg-slate-700/50 border-slate-300 dark:border-slate-600"
              required
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep('otp')}
              className="flex-1 border-slate-300 dark:border-slate-600"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              type="submit"
              disabled={password !== confirmPassword || passwordStrength.score < 2 || !captchaAnswer.trim() || loading}
              className="flex-1"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );

  const renderSuccessForm = () => (
    <Card className="w-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-xl">
      <CardHeader className="text-center pb-6">
        <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Password Reset
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 text-center">
        <div className="flex justify-center">
          <CheckCircle className="w-16 h-16 text-green-500" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Password Reset Successfully!
          </h3>
          <p className="text-slate-600 dark:text-slate-400">
            Your password has been updated. You can now login with your new password.
          </p>
        </div>
        <Button
          onClick={() => setLocation('/login')}
          className="w-full"
        >
          Back to Login
        </Button>
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
          {step === 'email' && renderEmailForm()}
          {step === 'otp' && renderOtpForm()}
          {step === 'reset' && renderResetForm()}
          {step === 'success' && renderSuccessForm()}
        </div>
      </main>
      <Footer />
    </div>
  );
}