import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface ContactFormProps {
  contactData: {
    name: string;
    phone: string;
    email: string;
    consent: boolean;
  };
  setContactData: (data: any) => void;
  t: any;
}

export default function ContactForm({ contactData, setContactData, t }: ContactFormProps) {
  const handleInputChange = (field: string, value: string | boolean) => {
    setContactData((prev: any) => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="mb-8" data-testid="contact-form">
      <CardContent className="p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground mb-2">{t.contactInfo}</h2>
          <p className="text-sm text-muted-foreground">{t.contactDesc}</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">{t.name}</Label>
            <Input
              type="text"
              placeholder={t.fullName}
              value={contactData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              data-testid="input-name"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">{t.phone}</Label>
            <Input
              type="tel"
              placeholder={t.phoneNumber}
              value={contactData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              data-testid="input-phone"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">{t.email}</Label>
            <Input
              type="email"
              placeholder={t.emailAddress}
              value={contactData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              data-testid="input-email"
            />
          </div>
        </div>
        
        <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg border border-border">
          <Checkbox
            id="consent"
            checked={contactData.consent}
            onCheckedChange={(checked) => handleInputChange('consent', checked as boolean)}
            data-testid="checkbox-consent"
          />
          <Label htmlFor="consent" className="text-sm text-foreground leading-relaxed">
            <span className="font-medium">{t.consentLabel}</span> {t.consentText}
          </Label>
        </div>
      </CardContent>
    </Card>
  );
}
