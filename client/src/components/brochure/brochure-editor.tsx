import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Eye, Download, Building, CalendarIcon, Image } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Product, CampaignProduct, Template, Logo } from "@shared/schema";

interface BrochureEditorProps {
  selectedProducts: (CampaignProduct & { product: Product })[];
  campaign: any;
  onCampaignUpdate: (campaign: any) => void;
}

export default function BrochureEditor({
  selectedProducts,
  campaign,
  onCampaignUpdate,
}: BrochureEditorProps) {
  const { user } = useAuth();
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [selectedLogoId, setSelectedLogoId] = useState<number | null>(null);
  const [companyName, setCompanyName] = useState("Your Company Name");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [draggedElement, setDraggedElement] = useState<string | null>(null);
  const [elementPositions, setElementPositions] = useState({
    logo: { x: 32, y: 32 },
    companyName: { x: 112, y: 32 },
    dateRange: { x: 450, y: 32 },
  });
  const canvasRef = useRef<HTMLDivElement>(null);

  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ["/api/templates", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetch(`/api/templates?userId=${user.id}`);
      if (!response.ok) throw new Error('Failed to fetch templates');
      return response.json();
    },
    enabled: !!user?.id,
  });

  const { data: logos = [] } = useQuery<Logo[]>({
    queryKey: ["/api/logos", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetch(`/api/logos?userId=${user.id}`);
      if (!response.ok) throw new Error('Failed to fetch logos');
      return response.json();
    },
    enabled: !!user?.id,
  });

  const { data: activeLogo } = useQuery<Logo | null>({
    queryKey: ["/api/logos/active", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const response = await fetch(`/api/logos/active?userId=${user.id}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!user?.id,
  });

  const selectedTemplate = templates?.find(t => t.id === selectedTemplateId);
  const selectedLogo = logos?.find(l => l.id === selectedLogoId) || activeLogo;

  const handleTemplateSelect = (value: string) => {
    try {
      const templateId = parseInt(value);
      setSelectedTemplateId(templateId);
    } catch (error) {
      console.error('Error selecting template:', error);
    }
  };

  const handleLogoSelect = (value: string) => {
    try {
      const logoId = parseInt(value);
      setSelectedLogoId(logoId);
    } catch (error) {
      console.error('Error selecting logo:', error);
    }
  };

  const handleMouseDown = (elementType: string, e: React.MouseEvent) => {
    e.preventDefault();
    setDraggedElement(elementType);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggedElement || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setElementPositions(prev => ({
      ...prev,
      [draggedElement]: { x: Math.max(0, x - 25), y: Math.max(0, y - 25) }
    }));
  };

  const handleMouseUp = () => {
    setDraggedElement(null);
  };

  const handleGeneratePDF = async () => {
    alert("PDF generation would be implemented here");
  };

  const formatDateRange = () => {
    if (!startDate && !endDate) return "Select dates";
    if (startDate && !endDate) return `From ${format(startDate, "MMM dd, yyyy")}`;
    if (!startDate && endDate) return `Until ${format(endDate, "MMM dd, yyyy")}`;
    return `${format(startDate!, "MMM dd")} - ${format(endDate!, "MMM dd, yyyy")}`;
  };

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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Choose Template
              </label>
              <Select value={selectedTemplateId?.toString()} onValueChange={handleTemplateSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(templates) && templates.map((template) => (
                    <SelectItem key={template.id} value={template.id.toString()}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Choose Logo
              </label>
              <Select value={selectedLogoId?.toString() || activeLogo?.id?.toString()} onValueChange={handleLogoSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a logo" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(logos) && logos.map((logo) => (
                    <SelectItem key={logo.id} value={logo.id.toString()}>
                      {logo.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
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
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "MMM dd, yyyy") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "MMM dd, yyyy") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Brochure Canvas */}
        <div className="mb-6">
          <div
            ref={canvasRef}
            className="drag-drop-area border-2 border-dashed border-gray-300 rounded-xl relative mx-auto"
            style={{ 
              width: "600px", 
              height: "800px",
              backgroundImage: selectedTemplate ? `url(/uploads/${selectedTemplate.filePath})` : 'linear-gradient(135deg, #60a5fa 0%, #a855f7 100%)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Company Logo */}
            <div 
              className="absolute draggable-element cursor-move user-select-none"
              style={{ left: elementPositions.logo.x, top: elementPositions.logo.y }}
              onMouseDown={(e) => handleMouseDown('logo', e)}
            >
              <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center shadow-lg">
                {selectedLogo ? (
                  <img 
                    src={selectedLogo.filePath} 
                    alt="Company Logo" 
                    className="w-full h-full object-contain rounded-lg"
                  />
                ) : (
                  <Building className="w-8 h-8 text-gray-400" />
                )}
              </div>
            </div>

            {/* Company Name */}
            <div 
              className="absolute draggable-element cursor-move user-select-none"
              style={{ left: elementPositions.companyName.x, top: elementPositions.companyName.y }}
              onMouseDown={(e) => handleMouseDown('companyName', e)}
            >
              <h1 className="text-2xl font-bold text-white drop-shadow-lg">
                {companyName}
              </h1>
            </div>

            {/* Campaign Date Range */}
            <div 
              className="absolute draggable-element cursor-move user-select-none"
              style={{ left: elementPositions.dateRange.x, top: elementPositions.dateRange.y }}
              onMouseDown={(e) => handleMouseDown('dateRange', e)}
            >
              <div className="bg-white bg-opacity-90 px-4 py-2 rounded-lg">
                <span className="text-sm font-semibold text-gray-900">
                  {formatDateRange()}
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


      </div>
    </div>
  );
}
