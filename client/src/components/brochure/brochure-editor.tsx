import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, Download, Building, CalendarIcon, Image, Move, Save, FileText } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import type { Product, CampaignProduct, Template, Logo } from "@shared/schema";

interface BrochureEditorProps {
  selectedProducts: (CampaignProduct & { product: Product })[];
  campaign: any;
  onCampaignUpdate: (campaign: any) => void;
  onProductPositionUpdate?: (productId: number, x: number, y: number) => void;
}

export default function BrochureEditor({
  selectedProducts,
  campaign,
  onCampaignUpdate,
  onProductPositionUpdate,
}: BrochureEditorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [selectedLogoId, setSelectedLogoId] = useState<number | null>(null);
  const [companyName, setCompanyName] = useState("Your Company Name");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [campaignName, setCampaignName] = useState("");
  const [campaignDescription, setCampaignDescription] = useState("");
  const [isCreateCampaignOpen, setIsCreateCampaignOpen] = useState(false);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [draggedElement, setDraggedElement] = useState<string | null>(null);
  const [draggedProductId, setDraggedProductId] = useState<number | null>(null);
  const [rotatingProductId, setRotatingProductId] = useState<number | null>(null);
  const [lastMouseAngle, setLastMouseAngle] = useState<number>(0);
  const [elementPositions, setElementPositions] = useState({
    logo: { x: 32, y: 32 },
    companyName: { x: 112, y: 32 },
    dateRange: { x: 450, y: 32 },
  });
  const [productPositions, setProductPositions] = useState<Record<number, { x: number; y: number }>>({});
  const [productRotations, setProductRotations] = useState<Record<number, number>>({});
  const canvasRef = useRef<HTMLDivElement>(null);

  // Initialize campaign settings when campaign prop changes
  useEffect(() => {
    if (campaign) {
      setCampaignName(campaign.name || "");
      setCampaignDescription(campaign.description || "");
      setCompanyName(campaign.companyName || "Your Company Name");
      setSelectedTemplateId(campaign.templateId || null);
      setSelectedLogoId(campaign.logoId || null);
      if (campaign.startDate) setStartDate(new Date(campaign.startDate));
      if (campaign.endDate) setEndDate(new Date(campaign.endDate));
    }
  }, [campaign]);

  // Initialize product positions when selectedProducts change
  useEffect(() => {
    const newPositions: Record<number, { x: number; y: number }> = {};
    selectedProducts.forEach((item, index) => {
      if (!productPositions[item.id]) {
        // Use saved position if available, otherwise arrange in a 3-column grid
        if (item.positionX !== undefined && item.positionY !== undefined && item.positionX !== null && item.positionY !== null && (item.positionX !== 0 || item.positionY !== 0)) {
          newPositions[item.id] = {
            x: item.positionX,
            y: item.positionY,
          };
        } else {
          const col = index % 3;
          const row = Math.floor(index / 3);
          newPositions[item.id] = {
            x: 50 + (col * 180), // 180px apart horizontally
            y: 150 + (row * 200), // 200px apart vertically
          };
        }
      } else {
        newPositions[item.id] = productPositions[item.id];
      }
    });
    setProductPositions(newPositions);
  }, [selectedProducts]);

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
    setDraggedProductId(null);
  };

  const handleProductMouseDown = (productId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedProductId(productId);
    setDraggedElement(null);
    setRotatingProductId(null);
  };

  const handleProductRotateStart = (productId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setRotatingProductId(productId);
    setDraggedProductId(null);
    setDraggedElement(null);
    
    // Calculate initial angle from product center
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const productPos = productPositions[productId] || { x: 0, y: 0 };
      const centerX = productPos.x + 66; // Half of product width (132px)
      const centerY = productPos.y + 66; // Half of product height (132px)
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const angle = Math.atan2(mouseY - centerY, mouseX - centerX) * (180 / Math.PI);
      setLastMouseAngle(angle);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (draggedElement) {
      setElementPositions(prev => ({
        ...prev,
        [draggedElement]: { x: Math.max(0, x - 25), y: Math.max(0, y - 25) }
      }));
    }
    
    if (draggedProductId) {
      setProductPositions(prev => ({
        ...prev,
        [draggedProductId]: { 
          x: Math.max(0, Math.min(x - 66, 600 - 132)), // Keep within canvas bounds (132px is product width)
          y: Math.max(0, Math.min(y - 66, 800 - 180))  // Keep within canvas bounds (180px including text)
        }
      }));
    }
    
    if (rotatingProductId) {
      const productPos = productPositions[rotatingProductId] || { x: 0, y: 0 };
      const centerX = productPos.x + 66; // Half of product width
      const centerY = productPos.y + 66; // Half of product height
      const currentAngle = Math.atan2(y - centerY, x - centerX) * (180 / Math.PI);
      const angleDifference = currentAngle - lastMouseAngle;
      
      setProductRotations(prev => ({
        ...prev,
        [rotatingProductId]: (prev[rotatingProductId] || 0) + angleDifference
      }));
      
      setLastMouseAngle(currentAngle);
    }
  };

  const handleMouseUp = () => {
    // Save product position when dragging ends
    if (draggedProductId && onProductPositionUpdate && productPositions[draggedProductId]) {
      const position = productPositions[draggedProductId];
      onProductPositionUpdate(draggedProductId, position.x, position.y);
    }
    
    setDraggedElement(null);
    setDraggedProductId(null);
    setRotatingProductId(null);
  };

  

  const handleCreateCampaign = () => {
    if (selectedProducts.length === 0) {
      toast({
        title: "No products selected",
        description: "Please add some products to your brochure before creating a campaign.",
        variant: "destructive",
      });
      return;
    }
    setIsCreateCampaignOpen(true);
  };

  const handleSaveCampaign = async () => {
    if (!campaignName.trim()) {
      toast({
        title: "Campaign name required",
        description: "Please enter a name for your campaign.",
        variant: "destructive",
      });
      return;
    }

    try {
      // First create the campaign
      const campaignData = {
        name: campaignName,
        description: campaignDescription || null,
        status: "active",
        companyName: companyName,
        userId: user?.id,
        startDate: startDate?.toISOString() || null,
        endDate: endDate?.toISOString() || null,
        templateId: selectedTemplateId,
        logoId: selectedLogoId,
      };

      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(campaignData),
      });

      if (!response.ok) throw new Error("Campaign creation failed");
      
      const newCampaign = await response.json();

      // Now save all the campaign products with their positions
      for (const product of selectedProducts) {
        const position = productPositions[product.id] || { x: 0, y: 0 };
        const campaignProductData = {
          campaignId: newCampaign.id,
          productId: product.product.id,
          quantity: product.quantity,
          discountPercent: product.discountPercent,
          newPrice: product.newPrice,
          positionX: position.x,
          positionY: position.y,
        };

        await fetch(`/api/campaigns/${newCampaign.id}/products`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(campaignProductData),
        });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: "Campaign created successfully",
        description: "Your campaign has been saved with all product positions.",
      });
      setIsCreateCampaignOpen(false);
      setLocation("/dashboard");

    } catch (error) {
      toast({
        title: "Campaign creation failed",
        description: "There was an error creating your campaign.",
        variant: "destructive",
      });
    }
  };

  const handleDownload = (format: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Hide all edit controls before capturing
    const editControls = canvas.querySelectorAll('[data-edit-control="true"]');
    const originalDisplay = Array.from(editControls).map(el => (el as HTMLElement).style.display);
    editControls.forEach(el => ((el as HTMLElement).style.display = 'none'));

    if (format === "pdf") {
      // For PDF, we would use a library like html2pdf or puppeteer
      toast({
        title: "PDF Download",
        description: "PDF generation will be implemented with a proper PDF library.",
      });
      // Restore edit controls
      editControls.forEach((el, index) => ((el as HTMLElement).style.display = originalDisplay[index]));
    } else {
      // For image formats, we can use html2canvas
      import('html2canvas').then((module) => {
        const html2canvas = module.default;
        html2canvas(canvas).then((downloadCanvas) => {
          const link = document.createElement('a');
          link.download = `brochure.${format}`;
          link.href = downloadCanvas.toDataURL(`image/${format}`);
          link.click();
          
          // Restore edit controls after download
          editControls.forEach((el, index) => ((el as HTMLElement).style.display = originalDisplay[index]));
        });
      }).catch(() => {
        toast({
          title: "Download failed",
          description: "Could not generate image. Please try again.",
          variant: "destructive",
        });
        // Restore edit controls even on error
        editControls.forEach((el, index) => ((el as HTMLElement).style.display = originalDisplay[index]));
      });
    }
    setIsDownloadOpen(false);
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
            <Button variant="outline" size="sm" onClick={() => setIsDownloadOpen(true)}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button size="sm" onClick={handleCreateCampaign}>
              <Save className="w-4 h-4 mr-2" />
              Create Campaign
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
              <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center shadow-lg overflow-hidden">
                {selectedLogo ? (
                  <img 
                    src={selectedLogo.filePath ? `/uploads/${selectedLogo.filePath.split('/').pop()}` : ''} 
                    alt="Company Logo" 
                    className="w-full h-full object-contain rounded-lg"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).nextElementSibling?.removeAttribute('style');
                    }}
                  />
                ) : null}
                <Building className={`w-8 h-8 text-gray-400 ${selectedLogo ? 'hidden' : ''}`} />
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

            {/* Drop zone message when no products */}
            {selectedProducts.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-black bg-opacity-50 rounded-lg p-6 text-center">
                  <p className="text-white font-semibold text-lg">No products added yet</p>
                  <p className="text-sm text-gray-200 mt-2">
                    Add products from the left panel and drag them to position them on your brochure
                  </p>
                </div>
              </div>
            )}

            {/* Draggable Products - Market Style Circular */}
            {selectedProducts.map((item) => {
              const position = productPositions[item.id] || { x: 0, y: 0 };
              const rotation = productRotations[item.id] || 0;
              const isDragging = draggedProductId === item.id;
              const isRotating = rotatingProductId === item.id;
              
              return (
                <div
                  key={item.id}
                  className={cn(
                    "absolute select-none",
                    isDragging ? "z-20" : isRotating ? "z-10" : "z-0"
                  )}
                  style={{ 
                    left: position.x, 
                    top: position.y,
                    filter: isDragging ? "drop-shadow(0 8px 16px rgba(0,0,0,0.25))" : "drop-shadow(0 2px 4px rgba(0,0,0,0.1))",
                    transform: isDragging ? "scale(1.02)" : "scale(1)",
                    transition: isDragging || isRotating ? "none" : "all 0.1s ease"
                  }}
                >
                  {/* Control Buttons */}
                  <div className="absolute -top-4 -right-4 flex space-x-1 z-30" data-edit-control="true">
                    {/* Rotate Handle */}
                    <div
                      onMouseDown={(e) => handleProductRotateStart(item.id, e)}
                      className="bg-green-500 hover:bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm shadow-lg transition-colors cursor-grab active:cursor-grabbing"
                      title="Drag to rotate product"
                    >
                      ↻
                    </div>
                    {/* Move Handle */}
                    <div 
                      onMouseDown={(e) => handleProductMouseDown(item.id, e)}
                      className="bg-blue-500 hover:bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg transition-colors cursor-grab active:cursor-grabbing"
                      title="Drag to move product"
                    >
                      <Move className="w-4 h-4" />
                    </div>
                  </div>
                  
                  {/* Main Product Container - Circular Market Style */}
                  <div className="relative">
                    {/* Circular Product Image - Only this part rotates */}
                    <div 
                      className="w-32 h-32 rounded-full bg-white shadow-xl border-4 border-yellow-400 flex items-center justify-center overflow-hidden relative"
                      style={{
                        transform: `rotate(${rotation}deg)`,
                        transition: isRotating ? "none" : "transform 0.1s ease"
                      }}
                    >
                      {item.product.imageUrl ? (
                        <img
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                          draggable={false}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                          <span className="text-gray-400 text-xs font-medium">No Image</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Discount Badge - Fixed position, doesn't rotate */}
                    {item.discountPercent > 0 && (
                      <div className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-10 h-10 flex flex-col items-center justify-center font-bold border-2 border-white shadow-lg">
                        <span className="text-xs leading-none">{item.discountPercent}%</span>
                        <span style={{ fontSize: '6px' }} className="leading-none">OFF</span>
                      </div>
                    )}
                    
                    {/* Product Name - Fixed position, doesn't rotate */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-3 text-center">
                      <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border border-gray-200 min-w-max">
                        <h3 className="font-bold text-sm text-gray-900 mb-1 whitespace-nowrap max-w-36 truncate">
                          {item.product.name}
                        </h3>
                        
                        {/* Price Display */}
                        <div className="flex items-center justify-center space-x-2">
                          {item.discountPercent > 0 && (
                            <span className="text-xs text-gray-500 line-through">
                              ${item.product.originalPrice.toFixed(2)}
                            </span>
                          )}
                          <span className="text-base font-bold text-red-600">
                            ${item.newPrice.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Campaign Creation Dialog */}
      <Dialog open={isCreateCampaignOpen} onOpenChange={setIsCreateCampaignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Campaign Name
              </label>
              <Input
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="Enter campaign name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <Input
                value={campaignDescription}
                onChange={(e) => setCampaignDescription(e.target.value)}
                placeholder="Enter campaign description"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setIsCreateCampaignOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveCampaign}>
                Create Campaign
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Download Dialog */}
      <Dialog open={isDownloadOpen} onOpenChange={setIsDownloadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Download Brochure</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">Choose your preferred download format:</p>
            <div className="grid grid-cols-3 gap-3">
              <Button variant="outline" onClick={() => handleDownload("pdf")}>
                <FileText className="w-4 h-4 mr-2" />
                PDF
              </Button>
              <Button variant="outline" onClick={() => handleDownload("png")}>
                <Image className="w-4 h-4 mr-2" />
                PNG
              </Button>
              <Button variant="outline" onClick={() => handleDownload("jpeg")}>
                <Image className="w-4 h-4 mr-2" />
                JPEG
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
