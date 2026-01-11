import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SubmissionData {
  pageName: string;
  formType: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  serviceType?: string;
  message?: string;
  additionalData?: Record<string, unknown>;
}

interface SubscriptionData {
  email: string;
  source: string;
}

export const useFormSubmission = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitForm = async (data: SubmissionData): Promise<boolean> => {
    setIsSubmitting(true);
    try {
      const { data: response, error } = await supabase.functions.invoke("send-notification/submit", {
        body: data,
      });

      if (error) {
        console.error("Submission error:", error);
        toast.error("Failed to send your request. Please try again.");
        return false;
      }

      toast.success("Your request has been sent successfully! We'll get back to you soon.");
      return true;
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("Failed to send your request. Please try again.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const subscribe = async (data: SubscriptionData): Promise<boolean> => {
    setIsSubmitting(true);
    try {
      const { data: response, error } = await supabase.functions.invoke("send-notification/subscribe", {
        body: data,
      });

      if (error) {
        console.error("Subscription error:", error);
        toast.error("Failed to subscribe. Please try again.");
        return false;
      }

      toast.success("Subscribed successfully! You'll receive updates about new content.");
      return true;
    } catch (error) {
      console.error("Subscription error:", error);
      toast.error("Failed to subscribe. Please try again.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { submitForm, subscribe, isSubmitting };
};
