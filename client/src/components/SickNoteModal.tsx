import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface SickNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactData: {
    name: string;
    phone: string;
    email: string;
    consent: boolean;
  };
  t: any;
}

export default function SickNoteModal({ isOpen, onClose, contactData, t }: SickNoteModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    reason: "",
    startDate: new Date().toISOString().split('T')[0],
    duration: 3,
    country: "DE",
    employerEmail: ""
  });

  const generateSickNoteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/telehealth/sick-note", {
        contactData,
        ...formData
      });
    },
    onSuccess: async (response) => {
      const htmlContent = await response.text();
      const blob = new Blob([htmlContent], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      toast({
        title: "Sick Note Generated",
        description: "Medical certificate has been generated and opened in a new tab",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate sick note. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactData.consent) {
      toast({
        title: "Consent Required",
        description: "Please provide consent to generate medical documents.",
        variant: "destructive",
      });
      return;
    }
    generateSickNoteMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-md" data-testid="sick-note-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <i className="fas fa-file-medical-alt text-secondary"></i>
            {t.snTitle}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">{t.reason}</Label>
            <Textarea
              className="resize-none"
              rows={3}
              placeholder="Brief description of symptoms..."
              value={formData.reason}
              onChange={(e) => handleInputChange('reason', e.target.value)}
              data-testid="textarea-reason"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">{t.startDate}</Label>
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
                data-testid="input-start-date"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">{t.duration}</Label>
              <Input
                type="number"
                min={1}
                max={30}
                value={formData.duration}
                onChange={(e) => handleInputChange('duration', parseInt(e.target.value) || 1)}
                data-testid="input-duration"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">{t.country}</Label>
            <select
              value={formData.country}
              onChange={(e) => handleInputChange('country', e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:border-ring focus:ring-2 focus:ring-ring/20 transition-colors"
              data-testid="select-country"
            >
              <option value="DE">Germany</option>
              <option value="US">United States</option>
              <option value="UK">United Kingdom</option>
              <option value="CA">Canada</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">{t.employerEmail}</Label>
            <Input
              type="email"
              placeholder="hr@company.com"
              value={formData.employerEmail}
              onChange={(e) => handleInputChange('employerEmail', e.target.value)}
              data-testid="input-employer-email"
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              className="flex-1 bg-secondary hover:bg-secondary/90"
              disabled={generateSickNoteMutation.isPending}
              data-testid="button-create-sick-note"
            >
              {generateSickNoteMutation.isPending ? "Creating..." : t.create}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              data-testid="button-cancel"
            >
              {t.cancel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
