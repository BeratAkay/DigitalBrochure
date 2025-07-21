import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, Download, Building } from "lucide-react";
import type { Product, CampaignProduct } from "@shared/schema";

interface BrochureEditorProps {
  selectedProducts: (CampaignProduct & { product: Product })[];
  campaign: any;
  onCampaignUpdate: (campaign: any) => void;
}

const templates = [
  { id: 1, name: "Modern Gradient", gradient: "template-gradient-1" },
  { id: 2, name: "Fresh Green", gradient: "template-gradient-2" },
  { id: 3, name: "Warm Sunset", gradient: "template-gradient-3" },
  { id: 4, name: "Professional", gradient: "template-gradient-4" },
];

export default function BrochureEditor({
  selectedProducts,
  campaign,
  onCampaignUpdate,
}: BrochureEditorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState(1);
  const [companyName, setCompanyName] = useState("Your Company Name");
  const [validUntil, setValidUntil] = useState("Dec 31, 2023");

  const handleGeneratePDF = async () => {
    // In a real implementation, this would call the backend API to generate PDF
    alert("PDF generation would be implemented here");
  };

  const selectedTemplateData = templates.find(t => t.id === selectedTemplate);

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Brochure Designer</h2>
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm">
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
            <Button size="sm" onClick={handleGeneratePDF}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        {/* Campaign Settings */}
        <div className="mb-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Name
            </label>
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Enter company name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Valid Until
            </label>
            <Input
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              placeholder="Enter validity date"
            />
          </div>
        </div>

        {/* Brochure Canvas */}
        <div className="mb-6">
          <div
            className={`drag-drop-area border-2 border-dashed border-gray-300 rounded-xl relative mx-auto ${selectedTemplateData?.gradient}`}
            style={{ width: "600px", height: "800px" }}
          >
            {/* Company Logo */}
            <div className="absolute top-8 left-8 draggable-element cursor-move">
              <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center shadow-lg">
                <Building className="w-8 h-8 text-gray-400" />
              </div>
            </div>

            {/* Company Name */}
            <div className="absolute top-8 left-28 draggable-element cursor-move">
              <h1 className="text-2xl font-bold text-white drop-shadow-lg">
                {companyName}
              </h1>
            </div>

            {/* Campaign Date */}
            <div className="absolute top-8 right-8 draggable-element cursor-move">
              <div className="bg-white bg-opacity-90 px-4 py-2 rounded-lg">
                <span className="text-sm font-semibold text-gray-900">
                  Valid until {validUntil}
                </span>
              </div>
            </div>

            {/* Product Grid */}
            <div className="absolute top-24 left-8 right-8 bottom-8">
              <div className="bg-white bg-opacity-95 rounded-xl p-6 h-full overflow-y-auto">
                <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
                  Special Offers
                </h2>
                
                {selectedProducts.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No products added yet</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Add products from the left panel to see them here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {selectedProducts.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg"
                      >
                        {item.product.imageUrl && (
                          <img
                            src={item.product.imageUrl}
                            alt={item.product.name}
                            className="w-20 h-20 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-gray-900">
                            {item.product.name}
                          </h3>
                          <div className="flex items-center space-x-4 mt-2">
                            <span className="text-gray-500 line-through">
                              ${item.product.originalPrice.toFixed(2)}
                            </span>
                            <span className="text-2xl font-bold text-red-600">
                              ${item.newPrice.toFixed(2)}
                            </span>
                            {item.discountPercent > 0 && (
                              <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-sm font-medium">
                                {item.discountPercent}% OFF
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Template Selection */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Template</h3>
          <div className="grid grid-cols-4 gap-4">
            {templates.map((template) => (
              <div
                key={template.id}
                onClick={() => setSelectedTemplate(template.id)}
                className={`border-2 rounded-lg p-2 cursor-pointer transition-colors ${
                  selectedTemplate === template.id
                    ? "border-primary"
                    : "border-gray-300 hover:border-primary/50"
                }`}
              >
                <div className={`w-full h-24 rounded ${template.gradient}`}></div>
                <p className="text-xs text-center mt-2 font-medium">
                  {template.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
