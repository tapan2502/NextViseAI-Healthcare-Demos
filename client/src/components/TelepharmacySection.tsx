import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface PharmacyProduct {
  id: string;
  name: string;
  nameDE?: string;
  nameAR?: string;
  description: string;
  descriptionDE?: string;
  descriptionAR?: string;
  price: string;
  currency: string;
  stockQuantity: number;
  activeIngredient?: string;
  dosage?: string;
  requiresPrescription: boolean;
}

interface TelepharmacySectionProps {
  contactData: {
    name: string;
    phone: string;
    email: string;
    consent: boolean;
  };
  t: any;
}

export default function TelepharmacySection({ contactData, t }: TelepharmacySectionProps) {
  const { toast } = useToast();
  const [cart, setCart] = useState<{ id: string; qty: number }[]>([]);
  const [summaryChannel, setSummaryChannel] = useState<"sms" | "whatsapp" | "email">("sms");
  const [summaryType, setSummaryType] = useState<"consultation" | "product" | "prescription">("product");

  // Fetch pharmacy products from database
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['/api/pharmacy/products'],
    queryFn: async () => {
      const response = await fetch('/api/pharmacy/products');
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      return response.json() as Promise<PharmacyProduct[]>;
    }
  });

  const addToCart = (productId: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === productId);
      if (existing) {
        return prev.map(item =>
          item.id === productId ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { id: productId, qty: 1 }];
    });
    
    toast({
      title: "Added to Cart",
      description: `Product added to your cart`,
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const sendSummaryMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/telepharmacy/summary", {
        contactData,
        channel: summaryChannel,
        summaryType,
        cart
      });
    },
    onSuccess: () => {
      toast({
        title: "Summary Sent",
        description: `Pharmacy summary sent via ${summaryChannel.toUpperCase()}`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send summary. Please try again.",
        variant: "destructive",
      });
    }
  });

  const generatePrescriptionMutation = useMutation({
    mutationFn: async () => {
      // Convert cart items to prescription format with product details
      const prescriptionItems = cart.map(cartItem => {
        const product = products.find(p => p.id === cartItem.id);
        return {
          id: cartItem.id,
          name: product?.name || cartItem.id,
          quantity: cartItem.qty,
          dosage: product?.dosage || "As directed",
          activeIngredient: product?.activeIngredient || "",
          instructions: "Take as prescribed by your pharmacist"
        };
      });

      return apiRequest("POST", "/api/telepharmacy/prescription", {
        contactData,
        items: prescriptionItems,
        pharmacyContext: "telepharmacy consultation"
      });
    },
    onSuccess: async (response) => {
      const htmlContent = await response.text();
      const blob = new Blob([htmlContent], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      toast({
        title: "e-Prescription Generated",
        description: "Electronic prescription has been generated and opened in a new tab",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate e-prescription. Please try again.",
        variant: "destructive",
      });
    }
  });

  const voiceAgentUrl = import.meta.env.VITE_VOICE_AGENT_URL || "#";

  return (
    <section className="space-y-8" data-testid="telepharmacy-section">
      {/* Service Hero */}
      <div className="bg-gradient-to-r from-secondary to-accent rounded-2xl p-8 text-white">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold mb-4">{t.tpTitle}</h2>
          <p className="text-lg text-white/90 mb-6">{t.tpSub}</p>
          <div className="flex flex-wrap gap-4">
            <Button
              className="bg-white text-secondary hover:bg-white/90"
              onClick={() => window.open(voiceAgentUrl, "_blank")}
              data-testid="button-start-consultation"
            >
              <i className="fas fa-comments mr-2"></i>
              Start Consultation
            </Button>
            <Button
              variant="outline"
              className="bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30"
              data-testid="button-browse-products"
            >
              <i className="fas fa-search mr-2"></i>
              Browse Products
            </Button>
          </div>
        </div>
      </div>

      {/* Product Catalog and Pharmacist Avatar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Product Catalog */}
        <div className="lg:col-span-2">
          <Card data-testid="product-catalog">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <i className="fas fa-pills text-secondary"></i>
                {t.productCatalog}
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {productsLoading ? (
                  <div className="col-span-full text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p>Loading products...</p>
                  </div>
                ) : products.map((product) => {
                  // Get localized product name based on current language
                  const getProductName = () => {
                    switch(t.lang) {
                      case 'de': return product.nameDE || product.name;
                      case 'ar': return product.nameAR || product.name;
                      default: return product.name;
                    }
                  };

                  const getProductDescription = () => {
                    switch(t.lang) {
                      case 'de': return product.descriptionDE || product.description;
                      case 'ar': return product.descriptionAR || product.description;
                      default: return product.description;
                    }
                  };

                  return (
                    <div key={product.id} className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                          <i className="fas fa-tablets text-muted-foreground"></i>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-foreground">{getProductName()}</h4>
                          {product.dosage && (
                            <p className="text-sm text-muted-foreground">
                              {product.activeIngredient} {product.dosage}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{getProductDescription()}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-sm font-medium">${product.price}</span>
                            <Button
                              size="sm"
                              className="bg-secondary hover:bg-secondary/90"
                              onClick={() => addToCart(product.id)}
                              data-testid={`button-add-${product.id.replace(/[^a-z0-9]/gi, '_')}`}
                              disabled={product.stockQuantity <= 0}
                            >
                              {product.stockQuantity <= 0 ? 'Out of Stock' : t.add}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Shopping Cart */}
              {cart.length > 0 && (
                <div className="border-t border-border pt-6">
                  <h4 className="font-medium mb-4 flex items-center gap-2">
                    <i className="fas fa-shopping-cart text-accent"></i>
                    {t.cart} ({cart.length} items)
                  </h4>
                  <div className="space-y-2 mb-4" data-testid="cart-items">
                    {cart.map((item) => {
                      const product = products.find(p => p.id === item.id);
                      
                      const getProductName = () => {
                        if (!product) return item.id;
                        switch(t.lang) {
                          case 'de': return product.nameDE || product.name;
                          case 'ar': return product.nameAR || product.name;
                          default: return product.name;
                        }
                      };

                      return (
                        <div key={item.id} className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-md">
                          <span className="text-sm">
                            {getProductName()} × {item.qty}
                            {product && <span className="text-xs text-muted-foreground ml-2">${(parseFloat(product.price) * item.qty).toFixed(2)}</span>}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive/80 text-xs h-auto p-1"
                            onClick={() => removeFromCart(item.id)}
                            data-testid={`button-remove-${item.id.replace(/[^a-z0-9]/gi, '_')}`}
                          >
                            Remove
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Pharmacist Avatar */}
        <Card data-testid="pharmacist-avatar">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <i className="fas fa-user-graduate text-accent"></i>
              {t.pharmacistAvatar}
            </h3>
            <div className="avatar-container rounded-lg p-6 min-h-[300px] flex flex-col items-center justify-center border border-border">
              <div className="text-center mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-accent to-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-user-md text-white text-2xl"></i>
                </div>
                <p className="font-medium text-foreground">PharmD. Maria Rodriguez</p>
                <p className="text-sm text-muted-foreground">Licensed Pharmacist</p>
              </div>
              
              <div className="w-full space-y-3">
                <Button 
                  className="w-full bg-accent hover:bg-accent/90"
                  size="sm"
                  data-testid="button-ask-products"
                >
                  {t.askProducts}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  size="sm"
                  data-testid="button-get-instructions"
                >
                  {t.getInstructions}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* e-Prescription Generation */}
      <Card data-testid="e-prescription-section">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <i className="fas fa-file-medical text-blue-600"></i>
            Generate e-Prescription (e-Rx)
          </h3>
          
          {cart.length === 0 ? (
            <div className="text-center py-8 bg-muted/30 rounded-lg">
              <i className="fas fa-prescription-bottle text-4xl text-muted-foreground mb-4"></i>
              <p className="text-muted-foreground mb-2">No medications in cart</p>
              <p className="text-sm text-muted-foreground">Add prescription medications to your cart to generate an e-Rx</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                  <i className="fas fa-pills text-blue-600"></i>
                  Prescription Items ({cart.length})
                </h4>
                <div className="space-y-2">
                  {cart.map((item) => {
                    const product = products.find(p => p.id === item.id);
                    const getProductName = () => {
                      if (!product) return item.id;
                      switch(t.lang) {
                        case 'de': return product.nameDE || product.name;
                        case 'ar': return product.nameAR || product.name;
                        default: return product.name;
                      }
                    };

                    return (
                      <div key={item.id} className="flex items-center justify-between py-2 px-3 bg-white dark:bg-gray-800 rounded border">
                        <div className="flex-1">
                          <span className="font-medium text-sm">{getProductName()}</span>
                          {product?.activeIngredient && (
                            <span className="text-xs text-muted-foreground ml-2">
                              ({product.activeIngredient} {product.dosage})
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-blue-600 font-medium">
                          Qty: {item.qty}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">
                    Patient: <span className="font-medium text-foreground">{contactData.name}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Contact: <span className="font-medium text-foreground">{contactData.email || contactData.phone}</span>
                  </p>
                </div>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => generatePrescriptionMutation.mutate()}
                  disabled={!contactData.consent || generatePrescriptionMutation.isPending || cart.length === 0}
                  data-testid="button-generate-prescription"
                >
                  {generatePrescriptionMutation.isPending ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Generating...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-file-medical mr-2"></i>
                      Generate e-Rx
                    </>
                  )}
                </Button>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <p className="text-xs text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
                  <i className="fas fa-exclamation-triangle"></i>
                  <span>This is a demonstration e-prescription system. Generated prescriptions are for demo purposes only and are not valid for dispensing medications.</span>
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Communication Channels */}
      <Card data-testid="communication-channels">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <i className="fas fa-paper-plane text-primary"></i>
            {t.sendFollowup}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t.preferredChannel}</label>
              <select
                value={summaryChannel}
                onChange={(e) => setSummaryChannel(e.target.value as any)}
                className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:border-ring focus:ring-2 focus:ring-ring/20 transition-colors"
                data-testid="select-channel"
              >
                <option value="sms">{t.sms}</option>
                <option value="whatsapp">{t.whatsapp}</option>
                <option value="email">{t.emailCh}</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t.language}</label>
              <select
                className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:border-ring focus:ring-2 focus:ring-ring/20 transition-colors"
                data-testid="select-language"
              >
                <option value="en">English</option>
                <option value="de">Deutsch</option>
                <option value="ar">العربية</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t.summaryType}</label>
              <select
                value={summaryType}
                onChange={(e) => setSummaryType(e.target.value as any)}
                className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:border-ring focus:ring-2 focus:ring-ring/20 transition-colors"
                data-testid="select-summary-type"
              >
                <option value="consultation">{t.consultationSummary}</option>
                <option value="product">{t.productInfo}</option>
                <option value="prescription">{t.prescriptionDetails}</option>
              </select>
            </div>
            <Button
              className="bg-primary hover:bg-primary/90"
              onClick={() => sendSummaryMutation.mutate()}
              disabled={!contactData.consent || sendSummaryMutation.isPending}
              data-testid="button-send-summary"
            >
              {sendSummaryMutation.isPending ? "Sending..." : t.sendSummary}
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
