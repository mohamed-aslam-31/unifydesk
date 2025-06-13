import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Info } from "lucide-react";

interface TermsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
}

export function TermsModal({ open, onOpenChange, onAccept }: TermsModalProps) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  const handleScroll = (e: any) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
    setHasScrolledToBottom(isAtBottom);
  };

  useEffect(() => {
    if (!open) {
      setHasScrolledToBottom(false);
    }
  }, [open]);

  const handleAccept = () => {
    onAccept();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Terms of Service</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-96 pr-4" onScrollCapture={handleScroll}>
          <div className="prose dark:prose-invert max-w-none text-sm space-y-4">
            <section>
              <h3 className="text-lg font-semibold mb-2">1. Acceptance of Terms</h3>
              <p>By accessing and using UnifyDesk, you accept and agree to be bound by the terms and provision of this agreement.</p>
            </section>
            
            <section>
              <h3 className="text-lg font-semibold mb-2">2. Use License</h3>
              <p>Permission is granted to temporarily download one copy of UnifyDesk per device for personal, non-commercial transitory viewing only.</p>
            </section>
            
            <section>
              <h3 className="text-lg font-semibold mb-2">3. Disclaimer</h3>
              <p>The materials on UnifyDesk are provided on an 'as is' basis. UnifyDesk makes no warranties, expressed or implied.</p>
            </section>
            
            <section>
              <h3 className="text-lg font-semibold mb-2">4. Limitations</h3>
              <p>In no event shall UnifyDesk or its suppliers be liable for any damages arising out of the use or inability to use the materials on UnifyDesk.</p>
            </section>
            
            <section>
              <h3 className="text-lg font-semibold mb-2">5. Privacy Policy</h3>
              <p>Your privacy is important to us. Our Privacy Policy explains how we collect, use, and protect your information when you use our service.</p>
            </section>
            
            <section>
              <h3 className="text-lg font-semibold mb-2">6. Account Responsibilities</h3>
              <p>You are responsible for maintaining the confidentiality of your account and password and for restricting access to your account.</p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-2">7. Data Collection and Usage</h3>
              <p>We collect and process personal information in accordance with our Privacy Policy. This includes but is not limited to your name, email address, phone number, and usage data.</p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-2">8. Service Availability</h3>
              <p>We strive to maintain service availability but do not guarantee uninterrupted access. Scheduled maintenance and updates may cause temporary service interruptions.</p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-2">9. User Conduct</h3>
              <p>Users must not engage in illegal activities, harassment, spam, or any behavior that could harm other users or the platform's integrity.</p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-2">10. Termination</h3>
              <p>We reserve the right to terminate or suspend accounts that violate these terms or engage in prohibited activities.</p>
            </section>

            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  You must scroll to the bottom to accept these terms and continue with your registration.
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleAccept}
            disabled={!hasScrolledToBottom}
            className="bg-primary hover:bg-primary/90"
          >
            Accept Terms
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
