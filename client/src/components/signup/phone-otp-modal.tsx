import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';

interface PhoneOtpModalProps {
  open: boolean;
  onClose: () => void;
  phone: string;
  countryCode: string;
  onVerified: () => void;
  autoSendOtp?: boolean;
  onOtpSent?: (phone: string) => void;
  initialResendCount?: number;
  initialAttemptCount?: number;
  initialCooldown?: { endTime: number, seconds: number };
  onResendUpdate?: (phone: string, count: number) => void;
  onAttemptUpdate?: (phone: string, count: number) => void;
  onCooldownUpdate?: (phone: string, seconds: number) => void;
}

export function PhoneOtpModal({ 
  open, 
  onClose, 
  phone, 
  countryCode, 
  onVerified, 
  autoSendOtp = true, 
  onOtpSent,
  initialResendCount = 0,
  initialAttemptCount = 0,
  initialCooldown,
  onResendUpdate,
  onAttemptUpdate,
  onCooldownUpdate
}: PhoneOtpModalProps) {
  const [otp, setOtp] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCount, setResendCount] = useState(initialResendCount);
  const [cooldownTime, setCooldownTime] = useState(() => {
    if (initialCooldown && initialCooldown.endTime > Date.now()) {
      return Math.ceil((initialCooldown.endTime - Date.now()) / 1000);
    }
    return 0;
  });
  const [wrongAttempts, setWrongAttempts] = useState(initialAttemptCount);
  const [isBlocked, setIsBlocked] = useState(false);
  const { toast } = useToast();

  // Timer for resend cooldown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (cooldownTime > 0) {
      interval = setInterval(() => {
        setCooldownTime(prev => {
          const newTime = prev - 1;
          // Update parent with new cooldown time
          if (onCooldownUpdate) {
            onCooldownUpdate(phone, newTime);
          }
          return newTime > 0 ? newTime : 0;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [cooldownTime, phone, onCooldownUpdate]);

  // Format cooldown time as MM:SS
  const formatCooldown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Send OTP initially when modal opens (only if autoSendOtp is true)
  useEffect(() => {
    if (open && !sessionId && autoSendOtp) {
      handleSendOtp();
    }
  }, [open, autoSendOtp]);

  const handleSendOtp = async () => {
    // Check if still in cooldown
    if (cooldownTime > 0) {
      toast({
        title: "Please wait",
        description: `Wait ${formatCooldown(cooldownTime)} before requesting another OTP`,
        variant: "destructive",
      });
      return;
    }
    
    try {
      const response = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          identifier: `${countryCode}${phone}`,
          type: 'phone'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.remainingCooldown) {
          setCooldownTime(data.remainingCooldown);
          toast({
            title: "Please wait",
            description: `Wait ${formatCooldown(data.remainingCooldown)} before requesting another OTP`,
            variant: "destructive",
          });
          return;
        }
        
        if (response.status === 429) {
          if (data.message.includes("Maximum resend attempts")) {
            toast({
              title: "Resend limit reached",
              description: "You have reached the maximum number of resend attempts. Please try again later.",
              variant: "destructive",
            });
            return;
          }
          
          if (data.message.includes("Blocked")) {
            setIsBlocked(true);
            toast({
              title: "Account blocked",
              description: "Too many attempts. Your account is blocked for 5 hours.",
              variant: "destructive",
            });
            return;
          }
        }

        throw new Error(data.message);
      }

      setSessionId(data.sessionId);
      const newCount = resendCount + 1;
      setResendCount(newCount);
      setCooldownTime(180); // 3 minutes
      
      // Notify parent that OTP was sent for this phone number
      if (onOtpSent) {
        onOtpSent(phone);
      }
      
      // Update parent with new resend count
      if (onResendUpdate) {
        onResendUpdate(phone, newCount);
      }
      
      // Update parent with cooldown
      if (onCooldownUpdate) {
        onCooldownUpdate(phone, 180);
      }
      
      toast({
        title: "OTP sent",
        description: `Verification code sent to ${countryCode} ${phone}`,
      });

    } catch (error: any) {
      toast({
        title: "Failed to send OTP",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleResendOtp = async () => {
    if (cooldownTime > 0) {
      toast({
        title: "Please wait",
        description: `Wait ${formatCooldown(cooldownTime)} before resending`,
        variant: "destructive",
      });
      return;
    }
    if (resendCount >= 3) {
      toast({
        title: "Resend limit reached",
        description: "Maximum 3 resends allowed per phone number",
        variant: "destructive",
      });
      return;
    }
    await handleSendOtp();
  };

  const handleSubmitOtp = async () => {
    if (otp.length !== 6) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          identifier: `${countryCode}${phone}`,
          type: 'phone',
          otp,
          sessionId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        
        const newAttempts = wrongAttempts + 1;
        setWrongAttempts(newAttempts);
        
        // Update parent with new attempt count
        if (onAttemptUpdate) {
          onAttemptUpdate(phone, newAttempts);
        }
        
        if (response.status === 429) {
          setIsBlocked(true);
          toast({
            title: "Account blocked",
            description: "Too many failed attempts. Your account is blocked for 5 hours.",
            variant: "destructive",
          });
          onClose();
          return;
        }

        if (newAttempts >= 5) {
          setIsBlocked(true);
          toast({
            title: "Account blocked",
            description: "Too many failed OTP attempts. Your account is blocked for 5 hours.",
            variant: "destructive",
          });
          onClose();
          return;
        }

        toast({
          title: "Invalid OTP",
          description: `${5 - newAttempts} attempts remaining.`,
          variant: "destructive",
        });
        
        setOtp(''); // Clear OTP field for retry
        return;
      }

      toast({
        title: "Phone verified",
        description: "Your phone number has been successfully verified!",
      });
      
      onVerified();
      onClose();

    } catch (error: any) {
      toast({
        title: "Verification failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset OTP input when modal closes or opens
  useEffect(() => {
    if (!open) {
      setOtp('');
    }
  }, [open]);
  
  // Update counts from props when phone changes
  useEffect(() => {
    setOtp('');
    setSessionId(null);
    setResendCount(initialResendCount);
    setWrongAttempts(initialAttemptCount);
    setIsBlocked(false);
    
    // Set cooldown from parent if active
    if (initialCooldown && initialCooldown.endTime > Date.now()) {
      const remainingSeconds = Math.ceil((initialCooldown.endTime - Date.now()) / 1000);
      setCooldownTime(remainingSeconds);
    } else {
      setCooldownTime(0);
    }
  }, [phone, initialResendCount, initialAttemptCount, initialCooldown]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-semibold">
            Verify Phone Number
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Phone number display */}
          <div className="text-center space-y-2">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Enter the 6-digit code sent to
            </p>
            <p className="font-medium text-slate-900 dark:text-slate-100">
              {countryCode} {phone}
            </p>
          </div>

          {/* OTP Input */}
          <div className="flex justify-center">
            <InputOTP 
              maxLength={6} 
              value={otp}
              onChange={(value) => {
                // Only allow numbers
                const numbersOnly = value.replace(/[^0-9]/g, '');
                setOtp(numbersOnly);
              }}
              disabled={isSubmitting || isBlocked}
            >
              <InputOTPGroup className="gap-2">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <InputOTPSlot 
                    key={index}
                    index={index} 
                    className="w-12 h-12 text-lg border-2 rounded-lg"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>


          {/* Submit Button */}
          <Button
            onClick={handleSubmitOtp}
            disabled={otp.length !== 6 || isSubmitting || isBlocked}
            className="w-full h-12 text-base font-medium"
            size="lg"
          >
            {isSubmitting ? "Verifying..." : "Submit"}
          </Button>

          {/* Resend Section */}
          <div className="text-center space-y-2">
            {cooldownTime > 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Resend OTP in {formatCooldown(cooldownTime)}
              </p>
            ) : resendCount >= 3 ? (
              <p className="text-sm text-red-600">
                Maximum resend attempts reached
              </p>
            ) : (
              <button
                onClick={handleResendOtp}
                disabled={isSubmitting || isBlocked}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Resend OTP
              </button>
            )}
            
            {resendCount > 0 && resendCount < 3 && (
              <p className="text-xs text-slate-500">
                {resendCount}/3 resends used
              </p>
            )}
          </div>

          {/* Cancel Button */}
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}