import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import ProductSearch from "@/components/products/product-search";
import SelectedProducts from "@/components/products/selected-products";
import BrochureEditor from "@/components/brochure/brochure-editor";
import type { Product, CampaignProduct } from "@shared/schema";

export default function CreateCampaign() {
  const { user } = useAuth();
  const [location] = useLocation();
  const [selectedProducts, setSelectedProducts] = useState<(CampaignProduct & { product: Product })[]>([]);
  const [currentCampaign, setCurrentCampaign] = useState<any>(null);

  // Check if we're editing an existing campaign
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const campaignId = urlParams.get('campaignId');
  const isEditing = !!campaignId;

  // Fetch campaign data if editing
  const { data: campaign } = useQuery({
    queryKey: ["/api/campaigns", campaignId],
    queryFn: async () => {
      const response = await fetch(`/api/campaigns/${campaignId}`);
      if (!response.ok) throw new Error('Failed to fetch campaign');
      return response.json();
    },
    enabled: isEditing && !!campaignId,
  });

  // Fetch campaign products if editing
  const { data: campaignProducts } = useQuery({
    queryKey: ["/api/campaigns", campaignId, "products"],
    queryFn: async () => {
      const response = await fetch(`/api/campaigns/${campaignId}/products`);
      if (!response.ok) throw new Error('Failed to fetch campaign products');
      return response.json();
    },
    enabled: isEditing && !!campaignId,
  });

  // Load campaign data when editing
  useEffect(() => {
    if (isEditing && campaign) {
      setCurrentCampaign(campaign);
    }
  }, [campaign, isEditing]);

  // Load campaign products when editing
  useEffect(() => {
    if (isEditing && campaignProducts) {
      setSelectedProducts(campaignProducts);
    }
  }, [campaignProducts, isEditing]);

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

  const handleProductPositionUpdate = (productId: number, x: number, y: number) => {
    setSelectedProducts(prev => 
      prev.map(cp => 
        cp.id === productId 
          ? { ...cp, positionX: x, positionY: y }
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
          onProductPositionUpdate={handleProductPositionUpdate}
        />
      </div>
    </div>
  );
}
