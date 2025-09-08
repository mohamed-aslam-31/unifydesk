import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { adminRoleSchema } from "@shared/schema";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Crown, Upload, Clock, Loader2, Crop as CropIcon } from "lucide-react";
import { submitRoleData } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import ReactCrop, { Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface AdminFormProps {
  sessionToken: string;
  onSuccess: () => void;
  onBack: () => void;
}

export function AdminForm({ sessionToken, onSuccess, onBack }: AdminFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();
  const imageRef = useRef<HTMLImageElement>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof adminRoleSchema>>({
    resolver: zodResolver(adminRoleSchema),
    defaultValues: {
      handlerType: "" as any,
      additionalInfo: "",
      profilePicture: "",
    },
  });

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImageToCrop(result);
        setShowCropModal(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const crop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90,
        },
        1,
        width,
        height
      ),
      width,
      height,
    );
    setCrop(crop);
  };

  const getCroppedImg = async () => {
    if (!imageRef.current || !completedCrop) {
      return null;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return null;
    }

    const image = imageRef.current;
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    return canvas.toDataURL('image/jpeg', 0.8);
  };

  const handleCropConfirm = async () => {
    const croppedImage = await getCroppedImg();
    if (croppedImage) {
      setProfileImage(croppedImage);
      form.setValue("profilePicture", croppedImage);
      setShowCropModal(false);
      setImageToCrop(null);
      toast({
        title: "Image cropped successfully!",
        description: "Profile picture has been set.",
      });
    }
  };

  const handleCropCancel = () => {
    setShowCropModal(false);
    setImageToCrop(null);
    setCrop(undefined);
    setCompletedCrop(undefined);
  };

  const onSubmit = async (data: z.infer<typeof adminRoleSchema>) => {
    setIsSubmitting(true);
    try {
      await submitRoleData("admin", data, sessionToken);
      toast({
        title: "Admin request submitted!",
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
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Admin Registration
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Complete your admin profile setup
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Profile Picture */}
            <FormField
              control={form.control}
              name="profilePicture"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Profile Picture *
                  </FormLabel>
                  <FormControl>
                    <div className="flex items-center space-x-4">
                      <div className="w-20 h-20 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center overflow-hidden border-2 border-dashed border-slate-300 dark:border-slate-600">
                        {profileImage ? (
                          <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 bg-slate-400 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">👤</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          id="adminProfilePic"
                        />
                        <Label
                          htmlFor="adminProfilePic"
                          className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 cursor-pointer transition-colors"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {profileImage ? 'Change Photo' : 'Upload Photo'}
                        </Label>
                        <p className="text-xs text-slate-500 mt-2">
                          Max 5MB • JPG, PNG, GIF • Will be cropped to square
                        </p>
                        {profileImage && (
                          <button
                            type="button"
                            onClick={() => setProfileImage(null)}
                            className="text-xs text-red-500 hover:text-red-700 mt-1 block"
                          >
                            Remove image
                          </button>
                        )}
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Handler Type */}
            <FormField
              control={form.control}
              name="handlerType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Handler Type *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select handler type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="owner">Business Owner</SelectItem>
                      <SelectItem value="accountant">Accountant</SelectItem>
                      <SelectItem value="auditor">Auditor</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Additional Information */}
            <FormField
              control={form.control}
              name="additionalInfo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Information</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={4}
                      placeholder="Tell us about your business and administrative needs..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Send Admin Login Request"
                )}
              </Button>
            </div>
          </form>
        </Form>

        {/* Next Steps Info */}
        <div className="mt-6 bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Clock className="w-5 h-5 text-purple-600 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-medium text-purple-900 dark:text-purple-100">What's next?</h4>
              <p className="text-purple-800 dark:text-purple-200 text-sm mt-1">
                Your admin request will be reviewed within 24 hours. You'll receive an email with login credentials once approved.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Image Crop Modal */}
      <Dialog open={showCropModal} onOpenChange={setShowCropModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CropIcon className="w-5 h-5" />
              Crop Profile Picture
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {imageToCrop && (
              <div className="max-h-96 overflow-auto flex justify-center">
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={1}
                  minWidth={100}
                  minHeight={100}
                  circularCrop
                >
                  <img
                    ref={imageRef}
                    alt="Crop me"
                    src={imageToCrop}
                    style={{ maxHeight: '400px', width: 'auto' }}
                    onLoad={onImageLoad}
                  />
                </ReactCrop>
              </div>
            )}
            <div className="flex justify-between items-center pt-4 border-t">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Drag to reposition and resize to crop your image to a perfect square
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCropCancel}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleCropConfirm}
                  disabled={!completedCrop}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <CropIcon className="w-4 h-4 mr-2" />
                  Apply Crop
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
