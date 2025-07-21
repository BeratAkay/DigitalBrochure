import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import ProductSearch from "@/components/products/product-search";
import SelectedProducts from "@/components/products/selected-products";
import BrochureEditor from "@/components/brochure/brochure-editor";
import type { Product, CampaignProduct } from "@shared/schema";

export default function CreateCampaign() {
  const { user } = useAuth();
  const [selectedProducts, setSelectedProducts] = useState<(CampaignProduct & { product: Product })[]>([]);
  const [currentCampaign, setCurrentCampaign] = useState<any>(null);

  const handleProductSelect = (product: Product) => {
    const campaignProduct: CampaignProduct & { product: Product } = {
      id: Date.now(), // Temporary ID
      campaignId: 0, // Will be set when campaign is created
      productId: product.id,
      quantity: 1,
      discountPercent: 0,
      newPrice: product.originalPrice,
      positionX: 0,
      positionY: 0,
      product,
    };
    setSelectedProducts(prev => [...prev, campaignProduct]);
  };

  const handleProductUpdate = (id: number, updates: Partial<CampaignProduct>) => {
    setSelectedProducts(prev => 
      prev.map(cp => 
        cp.id === id 
          ? { ...cp, ...updates }
          : cp
      )
    );
  };

  const handleProductRemove = (id: number) => {
    setSelectedProducts(prev => prev.filter(cp => cp.id !== id));
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex">
      {/* Left Panel - Product Selection */}
      <div className="w-1/3 border-r border-gray-200 bg-white">
        <ProductSearch onProductSelect={handleProductSelect} />
      </div>

      {/* Middle Panel - Selected Products */}
      <div className="w-1/3 bg-gray-50">
        <SelectedProducts
          products={selectedProducts}
          onProductUpdate={handleProductUpdate}
          onProductRemove={handleProductRemove}
        />
      </div>

      {/* Right Panel - Brochure Editor */}
      <div className="flex-1 bg-white">
        <BrochureEditor
          selectedProducts={selectedProducts}
          campaign={currentCampaign}
          onCampaignUpdate={setCurrentCampaign}
        />
      </div>
    </div>
  );
}
