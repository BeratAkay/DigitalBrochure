import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Eye, Download, Building, CalendarIcon, Image, Move } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
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
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [selectedLogoId, setSelectedLogoId] = useState<number | null>(null);
  const [companyName, setCompanyName] = useState("Your Company Name");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [draggedElement, setDraggedElement] = useState<string | null>(null);
  const [draggedProductId, setDraggedProductId] = useState<number | null>(null);
  const [elementPositions, setElementPositions] = useState({
    logo: { x: 32, y: 32 },
    companyName: { x: 112, y: 32 },
    dateRange: { x: 450, y: 32 },
  });
  const [productPositions, setProductPositions] = useState<Record<number, { x: number; y: number }>>({});
  const [productRotations, setProductRotations] = useState<Record<number, number>>({});
  const canvasRef = useRef<HTMLDivElement>(null);

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
  };

  const handleProductRotate = (productId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setProductRotations(prev => ({
      ...prev,
      [productId]: ((prev[productId] || 0) + 15) % 360
    }));
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
          x: Math.max(0, Math.min(x - 80, 600 - 160)), // Keep within canvas bounds (160px is product width)
          y: Math.max(0, Math.min(y - 80, 800 - 160))  // Keep within canvas bounds (160px is product height)
        }
      }));
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
              
              return (
                <div
                  key={item.id}
                  className={cn(
                    "absolute cursor-move select-none transition-all duration-200",
                    isDragging ? "z-10 scale-105" : "z-0 scale-100"
                  )}
                  style={{ 
                    left: position.x, 
                    top: position.y,
                    transform: `rotate(${rotation}deg) ${isDragging ? "scale(1.05)" : "scale(1)"}`,
                    filter: isDragging ? "drop-shadow(0 10px 20px rgba(0,0,0,0.3))" : "drop-shadow(0 4px 8px rgba(0,0,0,0.2))"
                  }}
                  onMouseDown={(e) => handleProductMouseDown(item.id, e)}
                >
                  {/* Control Buttons */}
                  <div className="absolute -top-3 -right-3 flex space-x-1 z-20">
                    {/* Rotate Button */}
                    <button
                      onClick={(e) => handleProductRotate(item.id, e)}
                      className="bg-green-500 hover:bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-lg transition-colors"
                      title="Rotate Product"
                    >
                      ↻
                    </button>
                    {/* Move Button */}
                    <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-lg">
                      <Move className="w-3 h-3" />
                    </div>
                  </div>
                  
                  {/* Main Product Container - Circular Market Style */}
                  <div className="relative">
                    {/* Circular Product Image */}
                    <div className="w-32 h-32 rounded-full bg-white shadow-xl border-4 border-yellow-400 flex items-center justify-center overflow-hidden relative">
                      {item.product.imageUrl ? (
                        <img
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          className="w-full h-full object-cover rounded-full"
                          draggable={false}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center rounded-full">
                          <span className="text-gray-400 text-xs font-medium">No Image</span>
                        </div>
                      )}
                      
                      {/* Discount Badge - Circular and Prominent */}
                      {item.discountPercent > 0 && (
                        <div className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-12 h-12 flex flex-col items-center justify-center text-xs font-bold border-2 border-white shadow-lg animate-pulse">
                          <span className="text-xs leading-none">{item.discountPercent}%</span>
                          <span className="text-xs leading-none">OFF</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Product Name - Floating below */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 text-center">
                      <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border border-gray-200">
                        <h3 className="font-bold text-sm text-gray-900 mb-1 max-w-32 truncate">
                          {item.product.name}
                        </h3>
                        
                        {/* Price Display */}
                        <div className="flex items-center justify-center space-x-2">
                          {item.discountPercent > 0 && (
                            <span className="text-xs text-gray-500 line-through">
                              ${item.product.originalPrice.toFixed(2)}
                            </span>
                          )}
                          <span className="text-lg font-bold text-red-600">
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
    </div>
  );
}
