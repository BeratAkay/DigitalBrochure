import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Eye, Download, Building, CalendarIcon, Image, Move, Save, FileText, Plus, Minus, RotateCw, Maximize2, Upload } from "lucide-react";
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
  isDesignMode?: boolean;
  initialPages?: number;
  pageTemplates?: Record<number, number | null>;
}

export default function BrochureEditor({
  selectedProducts,
  campaign,
  onCampaignUpdate,
  onProductPositionUpdate,
  isDesignMode = false,
  initialPages = 1,
  pageTemplates = {},
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
  const [isLogoSelectOpen, setIsLogoSelectOpen] = useState(false);
  const [draggedElement, setDraggedElement] = useState<string | null>(null);
  const [draggedProductId, setDraggedProductId] = useState<number | null>(null);
  const [rotatingProductId, setRotatingProductId] = useState<number | null>(null);
  const [resizingProductId, setResizingProductId] = useState<number | null>(null);
  const [lastMouseAngle, setLastMouseAngle] = useState<number>(0);
  const [pages, setPages] = useState<number>(initialPages);
  const [elementPositions, setElementPositions] = useState({
    logo: { x: 32, y: 32 },
    companyName: { x: 112, y: 32 },
    dateRange: { x: 450, y: 32 },
  });
  const [productPositions, setProductPositions] = useState<Record<number, { x: number; y: number }>>({});
  const [productRotations, setProductRotations] = useState<Record<number, number>>({});
  const [productScales, setProductScales] = useState<Record<number, { scaleX: number; scaleY: number }>>({});
  const [productPages, setProductPages] = useState<Record<number, number>>({});
  const [dropTargetPage, setDropTargetPage] = useState<number | null>(null);
  const [datePositions, setDatePositions] = useState<Record<number, { x: number; y: number }>>({});
  const [isDraggingDate, setIsDraggingDate] = useState<number | null>(null);
  const [dateDragStart, setDateDragStart] = useState<{ x: number; y: number } | null>(null);
  const [initialResizeState, setInitialResizeState] = useState<{
    startX: number;
    startY: number;
    startScale: { scaleX: number; scaleY: number };
  } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Add/Remove pages
  const addPage = () => setPages(prev => prev + 1);
  const removePage = () => {
    if (pages > 1) {
      setPages(prev => prev - 1);
      // Move products from the last page to the previous page
      setProductPages(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(productId => {
          if (updated[parseInt(productId)] === pages) {
            updated[parseInt(productId)] = pages - 1;
          }
        });
        return updated;
      });
    }
  };

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
    try {
      const newPositions: Record<number, { x: number; y: number }> = {};
      const newScales: Record<number, { scaleX: number; scaleY: number }> = {};
      const newPages: Record<number, number> = {};
      
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
        
        // Initialize scales and pages
        if (!productScales[item.id]) {
          newScales[item.id] = {
            scaleX: item.scaleX || 1,
            scaleY: item.scaleY || 1,
          };
        }
        
        if (!productPages[item.id]) {
          newPages[item.id] = item.pageNumber || 1;
        }
      });
      
      setProductPositions(prev => ({ ...prev, ...newPositions }));
      setProductScales(prev => ({ ...prev, ...newScales }));
      setProductPages(prev => ({ ...prev, ...newPages }));
    } catch (error) {
      console.error('Error initializing product positions:', error);
    }
  }, [selectedProducts]);

  // Set initial pages when in design mode and apply auto layout
  useEffect(() => {
    if (isDesignMode && initialPages > 0) {
      setPages(initialPages);
      // FIXED: Auto-apply layout when entering design mode
      if (selectedProducts.length > 0) {
        setTimeout(() => handleAutoLayout(), 100);
      }
    }
  }, [isDesignMode, initialPages]);

  // Initialize default date positions for each page
  useEffect(() => {
    const newDatePositions: Record<number, { x: number; y: number }> = {};
    for (let i = 1; i <= pages; i++) {
      if (!datePositions[i]) {
        newDatePositions[i] = { x: 320, y: 20 }; // Default position: top-right area
      }
    }
    if (Object.keys(newDatePositions).length > 0) {
      setDatePositions(prev => ({ ...prev, ...newDatePositions }));
    }
  }, [pages]);

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
    setResizingProductId(null);
    
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

  const handleProductResizeStart = (productId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingProductId(productId);
    setDraggedProductId(null);
    setDraggedElement(null);
    setRotatingProductId(null);
    
    // Store initial resize state
    const currentScale = productScales[productId] || { scaleX: 1, scaleY: 1 };
    setInitialResizeState({
      startX: e.clientX,
      startY: e.clientY,
      startScale: currentScale
    });
  };

  const moveProductToPage = (productId: number, targetPage: number) => {
    setProductPages(prev => ({
      ...prev,
      [productId]: targetPage
    }));
  };

  // Automatically distribute products equally across pages
  const distributeProductsAcrossPages = (numPages: number) => {
    const newPages: Record<number, number> = {};
    selectedProducts.forEach((item, index) => {
      const targetPage = (index % numPages) + 1;
      newPages[item.id] = targetPage;
    });
    setProductPages(newPages);
  };

  // Handle page changes and redistribute products
  const handlePagesChange = (newPageCount: number) => {
    setPages(newPageCount);
    if (selectedProducts.length > 0) {
      distributeProductsAcrossPages(newPageCount);
    }
  };

  const handleMouseMove = (e: React.MouseEvent, pageNumber?: number) => {
    const currentCanvas = e.currentTarget as HTMLDivElement;
    if (!currentCanvas) return;
    
    const rect = currentCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (draggedElement) {
      setElementPositions(prev => ({
        ...prev,
        [draggedElement]: { x: Math.max(0, x - 25), y: Math.max(0, y - 25) }
      }));
    }
    
    if (isDraggingDate && dateDragStart && pageNumber) {
      setDatePositions(prev => ({
        ...prev,
        [pageNumber]: { 
          x: Math.max(0, Math.min(x - dateDragStart.x, rect.width - 120)), 
          y: Math.max(0, Math.min(y - dateDragStart.y, rect.height - 30)) 
        }
      }));
    }

    if (draggedProductId) {
      // FIXED: Dynamic boundary constraints based on actual canvas size
      const canvasWidth = rect.width;
      const canvasHeight = rect.height;
      const productSize = 132; // Product element size including text area
      
      setProductPositions(prev => ({
        ...prev,
        [draggedProductId]: { 
          x: Math.max(0, Math.min(x - 66, canvasWidth - productSize)),
          y: Math.max(0, Math.min(y - 66, canvasHeight - productSize))
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

    if (resizingProductId && initialResizeState) {
      const deltaX = e.clientX - initialResizeState.startX;
      const deltaY = e.clientY - initialResizeState.startY;
      
      // FIXED: Bidirectional resizing - support both growing and shrinking
      const avgDelta = (deltaX + deltaY) / 2;
      const scaleFactor = Math.max(0.1, initialResizeState.startScale.scaleX + (avgDelta / 150));
      
      setProductScales(prev => ({
        ...prev,
        [resizingProductId]: {
          scaleX: scaleFactor,
          scaleY: scaleFactor,
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
    setRotatingProductId(null);
    setResizingProductId(null);
    setInitialResizeState(null);
    setIsDraggingDate(null);
    setDateDragStart(null);
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

  // FIXED: Auto Layout that preserves page assignments
  const handleAutoLayout = () => {
    const newPositions: Record<number, { x: number; y: number }> = {};
    const newScales: Record<number, { scaleX: number; scaleY: number }> = {};
    
    // Group products by their current page assignments
    const productsByPage: Record<number, any[]> = {};
    selectedProducts.forEach((item) => {
      const pageNumber = productPages[item.id] || 1;
      if (!productsByPage[pageNumber]) {
        productsByPage[pageNumber] = [];
      }
      productsByPage[pageNumber].push(item);
    });
    
    // Arrange products within each page while preserving page assignments
    Object.entries(productsByPage).forEach(([pageNum, products]) => {
      const pageNumber = parseInt(pageNum);
      const itemsInPage = products.length;
      const gridCols = Math.min(3, Math.ceil(Math.sqrt(itemsInPage)));
      const gridRows = Math.ceil(itemsInPage / gridCols);
      
      const canvasWidth = isDesignMode ? 400 : 600;
      const canvasHeight = isDesignMode ? 533 : 800;
      const productSize = 132;
      const marginX = 40;
      const marginY = 150;
      
      const availableWidth = canvasWidth - (2 * marginX);
      const availableHeight = canvasHeight - marginY - 40;
      const spaceX = availableWidth / gridCols;
      const spaceY = availableHeight / gridRows;
      
      products.forEach((item, indexInPage) => {
        const col = indexInPage % gridCols;
        const row = Math.floor(indexInPage / gridCols);
        
        newPositions[item.id] = {
          x: marginX + (col * spaceX) + (spaceX - productSize) / 2,
          y: marginY + (row * spaceY) + (spaceY - productSize) / 2
        };
        
        newScales[item.id] = { scaleX: 1, scaleY: 1 };
      });
    });
    
    setProductPositions(newPositions);
    setProductScales(newScales);
    // Don't modify productPages - preserve user's page assignments
    
    toast({
      title: "Auto Layout Applied",
      description: "Products repositioned while preserving page assignments.",
    });
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
      // FIXED: Handle multiple pages by using the first available template
      const firstAvailableTemplateId = pageTemplates && Object.keys(pageTemplates).length > 0 
        ? Object.values(pageTemplates).find(id => id !== null) 
        : selectedTemplateId;

      // First create the campaign
      const campaignData = {
        name: campaignName,
        description: campaignDescription || null,
        status: "active",
        companyName: companyName,
        userId: user?.id,
        startDate: startDate?.toISOString() || null,
        endDate: endDate?.toISOString() || null,
        templateId: firstAvailableTemplateId,
        logoId: selectedLogoId,
        pageCount: pages, // Include page count
      };

      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(campaignData),
      });

      if (!response.ok) throw new Error("Campaign creation failed");
      
      const newCampaign = await response.json();

      // FIXED: Save all campaign products with their positions AND page assignments
      for (const product of selectedProducts) {
        const position = productPositions[product.id] || { x: 0, y: 0 };
        const pageNumber = productPages[product.id] || 1;
        const scale = productScales[product.id] || { scaleX: 1, scaleY: 1 };
        const rotation = productRotations[product.id] || 0;
        
        const campaignProductData = {
          campaignId: newCampaign.id,
          productId: product.product.id,
          quantity: product.quantity,
          discountPercent: product.discountPercent,
          newPrice: product.newPrice,
          positionX: position.x,
          positionY: position.y,
          pageNumber: pageNumber,
          scaleX: scale.scaleX,
          scaleY: scale.scaleY,
          rotation: rotation,
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

  const handleDownload = async (format: string) => {
    if (format === "pdf") {
      toast({
        title: "PDF Download",
        description: "PDF generation will be implemented with a proper PDF library.",
      });
      setIsDownloadOpen(false);
      return;
    }

    try {
      // FIXED: Multi-page download functionality
      const pageElements = document.querySelectorAll('[data-page-canvas]');
      
      if (pageElements.length === 0) {
        toast({
          title: "Download failed",
          description: "No pages found to download.",
          variant: "destructive",
        });
        setIsDownloadOpen(false);
        return;
      }

      // Hide all edit controls before capturing
      const editControls = document.querySelectorAll('[data-edit-control="true"]');
      const originalDisplay = Array.from(editControls).map(el => (el as HTMLElement).style.display);
      editControls.forEach(el => ((el as HTMLElement).style.display = 'none'));

      const html2canvas = await import('html2canvas');
      
      if (pageElements.length === 1) {
        // Single page download with enhanced quality
        const canvas = await html2canvas.default(pageElements[0] as HTMLElement, {
          scale: 2, // FIXED: Higher resolution for better quality
          useCORS: true,
          allowTaint: true,
          backgroundColor: null,
          logging: false,
          width: pageElements[0].clientWidth,
          height: pageElements[0].clientHeight
        });
        const link = document.createElement('a');
        link.download = `brochure.${format}`;
        link.href = canvas.toDataURL(`image/${format}`, 0.95); // High quality JPEG
        link.click();
      } else {
        // Multi-page download as ZIP
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        
        for (let i = 0; i < pageElements.length; i++) {
          const canvas = await html2canvas.default(pageElements[i] as HTMLElement, {
            scale: 2, // FIXED: Higher resolution for better quality
            useCORS: true,
            allowTaint: true,
            backgroundColor: null,
            logging: false,
            width: pageElements[i].clientWidth,
            height: pageElements[i].clientHeight
          });
          const dataUrl = canvas.toDataURL(`image/${format}`, 0.95); // High quality JPEG
          const base64Data = dataUrl.split(',')[1];
          zip.file(`page-${i + 1}.${format}`, base64Data, { base64: true });
        }
        
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.download = `brochure-pages.zip`;
        link.href = URL.createObjectURL(zipBlob);
        link.click();
        URL.revokeObjectURL(link.href);
      }

      // Restore edit controls
      editControls.forEach((el, index) => ((el as HTMLElement).style.display = originalDisplay[index]));
      
      toast({
        title: "Download successful",
        description: pageElements.length > 1 ? `Downloaded ${pageElements.length} pages as ZIP file.` : "Downloaded brochure successfully.",
      });
      
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Could not generate image. Please try again.",
        variant: "destructive",
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
            <Button variant="outline" size="sm" onClick={handleAutoLayout}>
              <Maximize2 className="w-4 h-4 mr-2" />
              Auto Layout
            </Button>
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
        {/* FIXED: Date selector moved outside design area */}
        <div className="mb-6 space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Campaign Dates</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  Start Date
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3 w-3" />
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
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  End Date
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3 w-3" />
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
        </div>

        {/* Page Management - Only show if not in design mode */}
        {!isDesignMode && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Pages ({pages})</h3>
              <div className="flex items-center space-x-2">
                <Select
                  value={pages.toString()}
                  onValueChange={(value) => handlePagesChange(parseInt(value))}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6].map(num => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} Page{num > 1 ? 's' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => distributeProductsAcrossPages(pages)}
                  className="flex items-center space-x-1"
                  disabled={selectedProducts.length === 0}
                >
                  <span>Redistribute</span>
                </Button>
              </div>
            </div>
            {selectedProducts.length > 0 && (
              <p className="text-sm text-gray-600 mb-4">
                Tip: Use the dropdown to change page count and automatically redistribute products, or drag products between pages manually.
              </p>
            )}
          </div>
        )}

        {/* Multi-Page Brochure Canvas */}
        <div className={isDesignMode ? "flex space-x-6 overflow-x-auto pb-4" : "space-y-8"}>
          {Array.from({ length: pages }, (_, pageIndex) => {
            const pageNumber = pageIndex + 1;
            const pageProducts = selectedProducts.filter(
              item => (productPages[item.id] || 1) === pageNumber
            );
            
            return (
              <div key={pageNumber} className={`relative ${isDesignMode ? 'flex-shrink-0' : ''}`}>
                <div className={`flex items-center mb-2 ${isDesignMode ? 'justify-center' : ''}`}>
                  <span className="text-sm font-medium text-gray-700">Page {pageNumber}</span>
                  <span className="ml-2 text-xs text-gray-500">
                    ({pageProducts.length} products)
                  </span>
                </div>
                
                <div
                  ref={pageNumber === 1 ? canvasRef : undefined}
                  data-page-canvas={pageNumber}
                  className={cn(
                    "drag-drop-area border-2 border-dashed rounded-xl relative mx-auto transition-colors",
                    dropTargetPage === pageNumber 
                      ? "border-blue-400 bg-blue-50" 
                      : "border-gray-300"
                  )}
                  style={{ 
                    width: isDesignMode ? "400px" : "600px", 
                    height: isDesignMode ? "533px" : "800px",
                    backgroundImage: (() => {
                      try {
                        // FIXED: Use page-specific template if available in design mode
                        const pageTemplateId = pageTemplates?.[pageNumber];
                        if (pageTemplateId && templates && templates.length > 0) {
                          const pageTemplate = templates.find(t => t.id === pageTemplateId);
                          if (pageTemplate && pageTemplate.filePath) {
                            return `url(/uploads/${pageTemplate.filePath})`;
                          }
                        }
                        // Fallback to global selected template or gradient
                        if (selectedTemplate && selectedTemplate.filePath) {
                          return `url(/uploads/${selectedTemplate.filePath})`;
                        }
                        return 'linear-gradient(135deg, #60a5fa 0%, #a855f7 100%)';
                      } catch (error) {
                        console.error('Error loading template:', error);
                        return 'linear-gradient(135deg, #60a5fa 0%, #a855f7 100%)';
                      }
                    })(),
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                  onMouseMove={(e) => handleMouseMove(e, pageNumber)}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDropTargetPage(pageNumber);
                  }}
                  onDragLeave={() => setDropTargetPage(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    const productId = parseInt(e.dataTransfer.getData("text/plain"));
                    if (productId && !isNaN(productId)) {
                      moveProductToPage(productId, pageNumber);
                      setDropTargetPage(null);
                    }
                  }}
                >
            {/* FIXED: Interactive Company Logo - Only show if not explicitly removed */}
            {selectedLogoId !== -1 && (
              <div 
                className="absolute draggable-element cursor-move user-select-none z-20 group"
                style={{ left: elementPositions.logo.x, top: elementPositions.logo.y }}
                onMouseDown={(e) => handleMouseDown('logo', e)}
              >
              <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center shadow-lg overflow-hidden relative">
                {selectedLogo ? (
                  <>
                    <img 
                      src={selectedLogo.filePath ? `/uploads/${selectedLogo.filePath.split('/').pop()}` : ''} 
                      alt="Company Logo" 
                      className="w-full h-full object-contain rounded-lg"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).nextElementSibling?.removeAttribute('style');
                      }}
                    />
                    {/* Remove logo button */}
                    <button
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsLogoSelectOpen(true); // Open selection dialog instead of just removing
                      }}
                      data-edit-control="true"
                    >
                      ×
                    </button>
                  </>
                ) : (
                  <div 
                    className="w-full h-full flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setIsLogoSelectOpen(true)}
                  >
                    <Building className="w-8 h-8 text-gray-400" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black bg-opacity-50 rounded-lg transition-opacity">
                      <span className="text-white text-xs">Click to add logo</span>
                    </div>
                  </div>
                )}
              </div>
              </div>
            )}

            {/* Company Name */}
            <div 
              className="absolute draggable-element cursor-move user-select-none z-20"
              style={{ left: elementPositions.companyName.x, top: elementPositions.companyName.y }}
              onMouseDown={(e) => handleMouseDown('companyName', e)}
            >
              <h1 className="text-2xl font-bold text-white drop-shadow-lg">
                {companyName}
              </h1>
            </div>

            {/* FIXED: Draggable Date Display on each page */}
            {startDate && endDate && (
              <div 
                className="absolute cursor-move user-select-none z-20 bg-white/90 px-3 py-1 rounded-md shadow-md text-sm font-medium text-gray-800 border border-gray-200"
                style={{ 
                  left: datePositions[pageNumber]?.x || 320, 
                  top: datePositions[pageNumber]?.y || 20 
                }}
                onMouseDown={(e) => {
                  setIsDraggingDate(pageNumber);
                  const rect = e.currentTarget.getBoundingClientRect();
                  setDateDragStart({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                  });
                  e.preventDefault();
                }}
                data-edit-control="true"
              >
                <CalendarIcon className="inline w-3 h-3 mr-1" />
                {format(startDate, "MMM dd")} - {format(endDate, "MMM dd, yyyy")}
              </div>
            )}



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

                  {/* Draggable Products - Market Style Circular for this page */}
                  {pageProducts.map((item) => {
                    const position = productPositions[item.id] || { x: 0, y: 0 };
                    const rotation = productRotations[item.id] || 0;
                    const scale = productScales[item.id] || { scaleX: 1, scaleY: 1 };
                    const isDragging = draggedProductId === item.id;
                    const isRotating = rotatingProductId === item.id;
                    const isResizing = resizingProductId === item.id;
                    
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "absolute select-none",
                          isDragging ? "z-50" : isRotating || isResizing ? "z-40" : "z-30"
                        )}
                        style={{ 
                          left: position.x, 
                          top: position.y,
                          filter: isDragging ? "drop-shadow(0 8px 16px rgba(0,0,0,0.25))" : "drop-shadow(0 2px 4px rgba(0,0,0,0.1))",
                          transform: `scale(${isDragging ? 1.02 : 1})`,
                          transition: isDragging || isRotating || isResizing ? "none" : "all 0.1s ease"
                        }}

                      >
                        {/* Control Buttons */}
                        <div className="absolute -top-4 -right-4 flex space-x-1 z-30" data-edit-control="true">
                          {/* Resize Handle */}
                          <div
                            onMouseDown={(e) => handleProductResizeStart(item.id, e)}
                            className="bg-purple-500 hover:bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg transition-colors cursor-nw-resize"
                            title="Drag to resize (proportional)"
                          >
                            ⤡
                          </div>
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
                            title="Drag to move product on page"
                          >
                            <Move className="w-4 h-4" />
                          </div>
                        </div>
                        
                        {/* Drag Handle for Moving Between Pages - Always show for page-to-page movement */}
                        <div 
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/plain", item.id.toString());
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          className="absolute -top-4 -left-4 bg-orange-500 hover:bg-orange-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg transition-colors cursor-grab active:cursor-grabbing z-30"
                          title="Drag to move to another page"
                        >
                          📄
                        </div>
                        
                        {/* Main Product Container - Circular Market Style */}
                        <div className="relative">
                          {/* Circular Product Image - Only this part rotates and scales */}
                          <div 
                            className="w-32 h-32 rounded-full bg-white shadow-xl border-4 border-yellow-400 flex items-center justify-center overflow-hidden relative"
                            style={{
                              transform: `rotate(${rotation}deg) scaleX(${scale.scaleX}) scaleY(${scale.scaleY})`,
                              transition: isRotating || isResizing ? "none" : "transform 0.1s ease"
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
            );
          })}
        </div>
      </div>

      {/* Campaign Creation Dialog */}
      <Dialog open={isCreateCampaignOpen} onOpenChange={setIsCreateCampaignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Campaign</DialogTitle>
            <DialogDescription>
              Enter a name and description for your campaign ({pages} page{pages > 1 ? 's' : ''})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Campaign Name *
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
            <div className="text-sm text-gray-600">
              This campaign will include {selectedProducts.length} product{selectedProducts.length > 1 ? 's' : ''} distributed across {pages} page{pages > 1 ? 's' : ''}.
            </div>
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setIsCreateCampaignOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateCampaign} disabled={!campaignName.trim()}>
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

      {/* Logo Selection Dialog */}
      <Dialog open={isLogoSelectOpen} onOpenChange={setIsLogoSelectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Logo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Upload new logo option */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
              <button
                onClick={() => document.getElementById('logo-upload-input')?.click()}
                className="w-full text-gray-600 hover:text-gray-800"
              >
                <Upload className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm font-medium">Upload New Logo</p>
              </button>
            </div>
            
            {/* Existing logos grid */}
            {logos && logos.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Choose from existing logos:</h4>
                <div className="grid grid-cols-3 gap-3">
                  {logos.map((logo) => (
                    <button
                      key={logo.id}
                      onClick={() => {
                        setSelectedLogoId(logo.id);
                        setIsLogoSelectOpen(false);
                      }}
                      className="aspect-square border rounded-lg p-2 hover:border-blue-500 transition-colors"
                    >
                      <img
                        src={logo.filePath ? `/uploads/${logo.filePath.split('/').pop()}` : ''}
                        alt={logo.name}
                        className="w-full h-full object-contain"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Remove logo option */}
            <div className="pt-2 border-t">
              <button
                onClick={() => {
                  setSelectedLogoId(-1); // Use -1 to indicate completely removed
                  setIsLogoSelectOpen(false);
                }}
                className="w-full text-left text-red-600 hover:text-red-800 text-sm"
              >
                Remove logo area entirely
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden logo upload input */}
      <input
        id="logo-upload-input"
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file || !user?.id) return;
          
          const formData = new FormData();
          formData.append('file', file); // FIXED: Use 'file' field name to match server
          formData.append('name', file.name);
          formData.append('userId', user.id.toString());
          
          try {
            const response = await fetch('/api/logos', {
              method: 'POST',
              body: formData,
            });
            
            if (response.ok) {
              const newLogo = await response.json();
              setSelectedLogoId(newLogo.id);
              setIsLogoSelectOpen(false);
              queryClient.invalidateQueries({ queryKey: ['/api/logos'] });
              toast({
                title: "Logo uploaded successfully",
                description: "Your logo has been added to the brochure.",
              });
            }
          } catch (error) {
            toast({
              title: "Upload failed",
              description: "Could not upload logo. Please try again.",
              variant: "destructive",
            });
          }
        }}
      />
    </div>
  );
}
