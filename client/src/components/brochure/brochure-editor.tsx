//#region imports
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Eye,
  Download,
  Building,
  CalendarIcon,
  Image,
  Move,
  Save,
  FileText,
  Plus,
  Minus,
  RotateCw,
  Maximize2,
  Upload,
  Phone,
  Instagram,
  Facebook,
  Twitter,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import type { Product, CampaignProduct, Template, Logo } from "@shared/schema";
//#endregion

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
  //#region state
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(
    null
  );
  const [selectedLogoId, setSelectedLogoId] = useState<number | null>(null);
  const [companyName, setCompanyName] = useState("Your Company Name");
  const [showCompanyName, setShowCompanyName] = useState(true);
  const [isEditingCompanyName, setIsEditingCompanyName] = useState(false);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [campaignName, setCampaignName] = useState("");
  const [campaignDescription, setCampaignDescription] = useState("");
  const [isCreateCampaignOpen, setIsCreateCampaignOpen] = useState(false);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [isLogoSelectOpen, setIsLogoSelectOpen] = useState(false);
  const [draggedElement, setDraggedElement] = useState<string | null>(null);
  const [draggedProductId, setDraggedProductId] = useState<number | null>(null);
  const [rotatingProductId, setRotatingProductId] = useState<number | null>(
    null
  );
  const [resizingProductId, setResizingProductId] = useState<number | null>(
    null
  );
  const [lastMouseAngle, setLastMouseAngle] = useState<number>(0);
  // Logo transform state
  const [isRotatingLogo, setIsRotatingLogo] = useState<boolean>(false);
  const [isResizingLogo, setIsResizingLogo] = useState<boolean>(false);
  const [logoRotation, setLogoRotation] = useState<number>(0);
  const [logoScale, setLogoScale] = useState<number>(1);
  const [initialLogoResize, setInitialLogoResize] = useState<{
    startX: number;
    startY: number;
    startScale: number;
  } | null>(null);
  const [isLogoSelected, setIsLogoSelected] = useState<boolean>(false);
  const [selectedProductIdForControls, setSelectedProductIdForControls] =
    useState<number | null>(null);
  // Style & template controls
  const [showSupermarketTemplate, setShowSupermarketTemplate] = useState(true);
  const [headerBgColor, setHeaderBgColor] = useState<string>("#f59e0b"); // amber-500
  const [headerBgAlpha, setHeaderBgAlpha] = useState<number>(0.95); // header opacity
  const [bannerBgColor, setBannerBgColor] = useState<string>("#111827"); // gray-900
  const [bannerText, setBannerText] = useState<string>(
    "INDIRIMLI ALIŞVERİŞ REHBERİ"
  );
  const [bannerTextColor, setBannerTextColor] = useState<string>("#ffffff");
  const [footerBgColor, setFooterBgColor] = useState<string>("#f59e0b");
  const [titleColor, setTitleColor] = useState<string>("#a281fe"); // purple
  const [titleFont, setTitleFont] = useState<string>(
    "'Bebas Neue', 'Montserrat', 'Arial Black', sans-serif"
  );
  // Background customization (hex + opacity + optional image)
  const [bgBaseHex, setBgBaseHex] = useState<string>("#f5d68a");
  const [bgBaseAlpha, setBgBaseAlpha] = useState<number>(0.6);
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(null);
  const [bgImageOpacity, setBgImageOpacity] = useState<number>(0.35);
  const [pages, setPages] = useState<number>(initialPages);
  // Instagram format selection: "4:5" (1080x1350) or "1:1" (1080x1080)
  const [instagramFormat, setInstagramFormat] = useState<"4:5" | "1:1">("4:5");
  const [elementPositions, setElementPositions] = useState({
    logo: { x: 32, y: 32 },
    companyName: { x: 112, y: 32 },
    dateRange: { x: 450, y: 32 },
  });
  const [productPositions, setProductPositions] = useState<
    Record<number, { x: number; y: number }>
  >({});
  const [productRotations, setProductRotations] = useState<
    Record<number, number>
  >({});
  const [productScales, setProductScales] = useState<
    Record<number, { scaleX: number; scaleY: number }>
  >({});
  const [productPages, setProductPages] = useState<Record<number, number>>({});
  // Fixed 3x3 grid cell index per product (0..8)
  const [productGridIndex, setProductGridIndex] = useState<
    Record<number, number>
  >({});
  const [dropTargetPage, setDropTargetPage] = useState<number | null>(null);
  const [datePositions, setDatePositions] = useState<
    Record<number, { x: number; y: number }>
  >({});
  const [isDraggingDate, setIsDraggingDate] = useState<number | null>(null);
  const [dateDragStart, setDateDragStart] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [initialResizeState, setInitialResizeState] = useState<{
    startX: number;
    startY: number;
    startScale: { scaleX: number; scaleY: number };
  } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  //#endregion

  // Header/Footer editable content
  const [headerPhoneText, setHeaderPhoneText] = useState<string>(
    "Ücretsiz Sipariş Hattı"
  );
  const [headerPhoneNumber, setHeaderPhoneNumber] =
    useState<string>("0552 155 66 55");
  const [footerAddress, setFooterAddress] = useState<string>(
    "Kazımkarabekir Mah. Şht. Sblv. Beylerbeyi Sit. A Blok No:26 İlkadım/SAMSUN"
  );
  const [socialInstagram, setSocialInstagram] =
    useState<string>("karataymarket");
  const [socialFacebook, setSocialFacebook] = useState<string>("karataymarket");
  const [socialTwitter, setSocialTwitter] = useState<string>("karataymarket");

  // Add/Remove pages
  const addPage = () => setPages((prev) => prev + 1);
  const removePage = () => {
    if (pages > 1) {
      setPages((prev) => prev - 1);
      // Move products from the last page to the previous page
      setProductPages((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((productId) => {
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

  // Get canvas dimensions based on Instagram format
  const getCanvasDimensions = () => {
    if (isDesignMode) {
      return instagramFormat === "4:5"
        ? { width: 540, height: 675 } // 1080/2 x 1350/2
        : { width: 540, height: 540 }; // 1080/2 x 1080/2
    } else {
      return instagramFormat === "4:5"
        ? { width: 400, height: 500 } // Scaled for preview
        : { width: 400, height: 400 }; // Scaled for preview
    }
  };

  // Calculate dynamic product size and layout based on product count per page
  const calculateDynamicLayout = (
    productCount: number,
    canvasWidth: number,
    canvasHeight: number
  ) => {
    const marginX = 40;
    // Area between banner (top 120 + 44) and footer (80)
    const gridTop = 120 + 44 + 16;
    const gridBottomOffset = 80 + 16;
    const marginY = gridTop; // starting y for products
    const availableWidth = canvasWidth - 2 * marginX;
    const availableHeight = canvasHeight - gridTop - gridBottomOffset;

    let gridCols, gridRows, productSize;

    if (productCount === 1) {
      gridCols = 1;
      gridRows = 1;
      // Maximum size for single product to fully utilize space
      productSize = Math.min(380, availableWidth * 0.9, availableHeight * 0.8);
    } else if (productCount === 2) {
      gridCols = 2;
      gridRows = 1;
      // Very large size for 2 products to fill most of the width
      productSize = Math.min(300, (availableWidth - 20) / 2);
    } else if (productCount === 3) {
      gridCols = 3;
      gridRows = 1;
      // Large size for 3 products to fill the width completely
      productSize = Math.min(240, (availableWidth - 40) / 3);
    } else if (productCount === 4) {
      gridCols = 2;
      gridRows = 2;
      // Large 2x2 grid filling most of the available space
      productSize = Math.min(
        220,
        Math.min((availableWidth - 20) / 2, (availableHeight - 20) / 2)
      );
    } else if (productCount <= 6) {
      gridCols = 3;
      gridRows = 2;
      // 3x2 grid with decent sizing
      productSize = Math.min(
        150,
        Math.min((availableWidth - 60) / 3, (availableHeight - 30) / 2)
      );
    } else if (productCount <= 9) {
      gridCols = 3;
      gridRows = 3;
      // 3x3 grid with moderate sizing
      productSize = Math.min(
        130,
        Math.min((availableWidth - 60) / 3, (availableHeight - 60) / 3)
      );
    } else if (productCount <= 12) {
      gridCols = 4;
      gridRows = 3;
      // 4x3 grid for better organization
      productSize = Math.min(
        110,
        Math.min((availableWidth - 90) / 4, (availableHeight - 60) / 3)
      );
    } else {
      gridCols = 4;
      gridRows = Math.ceil(productCount / 4);
      // Compact sizing for many products
      productSize = Math.min(
        100,
        Math.min(
          (availableWidth - 90) / 4,
          (availableHeight - (gridRows - 1) * 20) / gridRows
        )
      );
    }

    return {
      gridCols,
      gridRows,
      productSize: Math.max(90, productSize), // Higher minimum size constraint
      availableWidth,
      availableHeight,
      marginX,
      marginY,
    };
  };

  // Adaptive grid geometry up to 20 items per page with deterministic 4x5 growth
  const getAdaptiveGridGeometry = (
    canvasWidth: number,
    canvasHeight: number,
    count: number
  ) => {
    const clampedCount = Math.max(1, Math.min(20, count));
    const marginX = 40;
    const gridTop = 120 + 44 + 16; // below banner
    const gridBottomOffset = 80 + 16; // above footer
    const areaX = marginX;
    const areaY = gridTop;
    const areaWidth = Math.max(0, canvasWidth - 2 * marginX);
    const areaHeight = Math.max(0, canvasHeight - gridTop - gridBottomOffset);
    const gap = 14;

    // Determine rows per column based on desired sequence to reach 4x5
    const rowsPerColumn: number[] = [1]; // start with 1 column, 1 row
    if (clampedCount >= 2) rowsPerColumn.push(1); // 2 columns
    if (clampedCount >= 3) rowsPerColumn[0] = 2; // split left column
    if (clampedCount >= 4) rowsPerColumn[1] = 2; // split right column

    let remaining = Math.max(0, clampedCount - Math.min(4, clampedCount));
    // Phase A: grow first two columns up to 5 rows with pattern [0,0,1,1,0,1]
    const pattern = [0, 0, 1, 1, 0, 1];
    let pi = 0;
    while (
      remaining > 0 &&
      rowsPerColumn.length >= 2 &&
      (rowsPerColumn[0] < 5 || rowsPerColumn[1] < 5)
    ) {
      const target = pattern[pi % pattern.length];
      if (rowsPerColumn[target] < 5) {
        rowsPerColumn[target] += 1;
        remaining -= 1;
      }
      pi += 1;
    }

    // Phase B: add third column and fill to 5
    if (remaining > 0 && rowsPerColumn.length < 3) {
      rowsPerColumn.push(1);
      remaining -= 1;
    }
    while (remaining > 0 && rowsPerColumn.length >= 3 && rowsPerColumn[2] < 5) {
      rowsPerColumn[2] += 1;
      remaining -= 1;
    }

    // Phase C: add fourth column and fill to 5
    if (remaining > 0 && rowsPerColumn.length < 4) {
      rowsPerColumn.push(1);
      remaining -= 1;
    }
    while (remaining > 0 && rowsPerColumn.length >= 4 && rowsPerColumn[3] < 5) {
      rowsPerColumn[3] += 1;
      remaining -= 1;
    }

    // Clamp to max columns 4 and rows 5
    const cols = Math.min(4, rowsPerColumn.length);
    const finalRowsPerCol = rowsPerColumn
      .slice(0, cols)
      .map((r) => Math.min(5, r));

    // Compute equal-width columns and equal-height rows within each column
    const totalColGaps = gap * (cols - 1);
    const colWidth = Math.floor((areaWidth - totalColGaps) / cols);
    const startX =
      areaX + Math.floor((areaWidth - (colWidth * cols + totalColGaps)) / 2);

    type Cell = {
      x: number;
      y: number;
      width: number;
      height: number;
      innerWidth: number;
      innerHeight: number;
    };
    const cells: Cell[] = [];
    for (let c = 0; c < cols; c++) {
      const colX = startX + c * (colWidth + gap);
      const rowsInCol = finalRowsPerCol[c];
      const totalRowGaps = gap * (rowsInCol - 1);
      const rowHeight = Math.floor((areaHeight - totalRowGaps) / rowsInCol);
      const colStartY =
        areaY +
        Math.floor((areaHeight - (rowHeight * rowsInCol + totalRowGaps)) / 2);
      for (let r = 0; r < rowsInCol; r++) {
        const cellX = colX;
        const cellY = colStartY + r * (rowHeight + gap);
        const width = Math.max(60, colWidth);
        const height = Math.max(60, rowHeight);
        const innerPad = 4;
        cells.push({
          x: cellX,
          y: cellY,
          width,
          height,
          innerWidth: Math.max(40, width - innerPad * 2),
          innerHeight: Math.max(40, height - innerPad * 2),
        });
      }
    }

    return { cells, gap };
  };

  // Initialize product positions when selectedProducts change
  useEffect(() => {
    try {
      const newPositions: Record<number, { x: number; y: number }> = {};
      const newScales: Record<number, { scaleX: number; scaleY: number }> = {};
      const newPages: Record<number, number> = {};
      const newGridIndex: Record<number, number> = {};

      selectedProducts.forEach((item, index) => {
        if (!productPositions[item.id]) {
          // Use saved position if available, otherwise arrange in a dynamic grid
          if (
            item.positionX !== undefined &&
            item.positionY !== undefined &&
            item.positionX !== null &&
            item.positionY !== null &&
            (item.positionX !== 0 || item.positionY !== 0)
          ) {
            newPositions[item.id] = {
              x: item.positionX,
              y: item.positionY,
            };
          } else {
            // Place into adaptive grid by order within page
            const pageNumber = item.pageNumber || 1;
            const pageProducts = selectedProducts.filter(
              (p) => (p.pageNumber || 1) === pageNumber
            );
            const indexInPage = pageProducts.findIndex((p) => p.id === item.id);
            const canvasDims = getCanvasDimensions();
            const grid = getAdaptiveGridGeometry(
              canvasDims.width,
              canvasDims.height,
              pageProducts.length
            );
            const cellIndex = Math.min(indexInPage, grid.cells.length - 1);
            newGridIndex[item.id] = cellIndex;
            newPositions[item.id] = {
              x: grid.cells[cellIndex].x,
              y: grid.cells[cellIndex].y,
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

      setProductPositions((prev) => ({ ...prev, ...newPositions }));
      setProductScales((prev) => ({ ...prev, ...newScales }));
      setProductPages((prev) => ({ ...prev, ...newPages }));
      if (Object.keys(newGridIndex).length > 0) {
        setProductGridIndex((prev) => ({ ...prev, ...newGridIndex }));
      }
    } catch (error) {
      console.error("Error initializing product positions:", error);
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

  // Re-apply smart layout when product list or page count changes
  useEffect(() => {
    if (selectedProducts.length > 0) {
      const id = setTimeout(() => handleAutoLayout(), 50);
      return () => clearTimeout(id);
    }
  }, [selectedProducts.length, pages]);

  // Initialize default date positions for each page
  useEffect(() => {
    const newDatePositions: Record<number, { x: number; y: number }> = {};
    for (let i = 1; i <= pages; i++) {
      if (!datePositions[i]) {
        newDatePositions[i] = { x: 320, y: 20 }; // Default position: top-right area
      }
    }
    if (Object.keys(newDatePositions).length > 0) {
      setDatePositions((prev) => ({ ...prev, ...newDatePositions }));
    }
  }, [pages]);

  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ["/api/templates", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetch(`/api/templates?userId=${user.id}`);
      if (!response.ok) throw new Error("Failed to fetch templates");
      return response.json();
    },
    enabled: !!user?.id,
  });

  const { data: logos = [] } = useQuery<Logo[]>({
    queryKey: ["/api/logos", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetch(`/api/logos?userId=${user.id}`);
      if (!response.ok) throw new Error("Failed to fetch logos");
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

  const selectedTemplate = templates?.find((t) => t.id === selectedTemplateId);
  const selectedLogo =
    logos?.find((l) => l.id === selectedLogoId) || activeLogo;

  const handleTemplateSelect = (value: string) => {
    try {
      const templateId = parseInt(value);
      setSelectedTemplateId(templateId);
    } catch (error) {
      console.error("Error selecting template:", error);
    }
  };

  const handleLogoSelect = (value: string) => {
    try {
      const logoId = parseInt(value);
      setSelectedLogoId(logoId);
    } catch (error) {
      console.error("Error selecting logo:", error);
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
      const angle =
        Math.atan2(mouseY - centerY, mouseX - centerX) * (180 / Math.PI);
      setLastMouseAngle(angle);
    }
  };

  // Logo rotate/resize start handlers
  const handleLogoRotateStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsRotatingLogo(true);
    setDraggedElement(null);
    setResizingProductId(null);
    setRotatingProductId(null);
    // Calculate initial angle from logo center
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const centerX = elementPositions.logo.x + 32; // base size 64
      const centerY = elementPositions.logo.y + 32;
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const angle =
        Math.atan2(mouseY - centerY, mouseX - centerX) * (180 / Math.PI);
      setLastMouseAngle(angle);
    }
  };

  const handleLogoResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizingLogo(true);
    setDraggedElement(null);
    setResizingProductId(null);
    setRotatingProductId(null);
    setInitialLogoResize({
      startX: e.clientX,
      startY: e.clientY,
      startScale: logoScale,
    });
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
      startScale: currentScale,
    });
  };

  const moveProductToPage = (productId: number, targetPage: number) => {
    setProductPages((prev) => ({
      ...prev,
      [productId]: targetPage,
    }));
  };

  // Automatically distribute products up to 20 per page
  const distributeProductsAcrossPages = (numPages: number) => {
    const newPages: Record<number, number> = {};
    selectedProducts.forEach((item, index) => {
      const targetPage = Math.floor(index / 20) + 1; // 20 per page
      newPages[item.id] = Math.min(targetPage, numPages);
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

  // Ensure enough pages for 20 per page when product list changes
  useEffect(() => {
    const requiredPages = Math.max(1, Math.ceil(selectedProducts.length / 20));
    if (requiredPages !== pages) {
      setPages(requiredPages);
      distributeProductsAcrossPages(requiredPages);
    }
  }, [selectedProducts.length]);

  const handleMouseMove = (e: React.MouseEvent, pageNumber?: number) => {
    const currentCanvas = e.currentTarget as HTMLDivElement;
    if (!currentCanvas) return;

    const rect = currentCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (draggedElement) {
      setElementPositions((prev) => ({
        ...prev,
        [draggedElement]: { x: Math.max(0, x - 25), y: Math.max(0, y - 25) },
      }));
    }

    if (isDraggingDate && dateDragStart && pageNumber) {
      setDatePositions((prev) => ({
        ...prev,
        [pageNumber]: {
          x: Math.max(0, Math.min(x - dateDragStart.x, rect.width - 120)),
          y: Math.max(0, Math.min(y - dateDragStart.y, rect.height - 30)),
        },
      }));
    }

    if (draggedProductId) {
      // FIXED: Dynamic boundary constraints based on actual canvas size
      const canvasWidth = rect.width;
      const canvasHeight = rect.height;
      const productSize = 132; // Product element size including text area

      setProductPositions((prev) => ({
        ...prev,
        [draggedProductId]: {
          x: Math.max(0, Math.min(x - 66, canvasWidth - productSize)),
          y: Math.max(0, Math.min(y - 66, canvasHeight - productSize)),
        },
      }));
    }

    if (isRotatingLogo) {
      const centerX = elementPositions.logo.x + 32;
      const centerY = elementPositions.logo.y + 32;
      const currentAngle =
        Math.atan2(y - centerY, x - centerX) * (180 / Math.PI);
      const angleDifference = currentAngle - lastMouseAngle;
      setLogoRotation((prev) => prev + angleDifference);
      setLastMouseAngle(currentAngle);
    }

    if (rotatingProductId) {
      const productPos = productPositions[rotatingProductId] || { x: 0, y: 0 };
      const centerX = productPos.x + 66; // Half of product width
      const centerY = productPos.y + 66; // Half of product height
      const currentAngle =
        Math.atan2(y - centerY, x - centerX) * (180 / Math.PI);
      const angleDifference = currentAngle - lastMouseAngle;

      setProductRotations((prev) => ({
        ...prev,
        [rotatingProductId]: (prev[rotatingProductId] || 0) + angleDifference,
      }));

      setLastMouseAngle(currentAngle);
    }

    if (isResizingLogo && initialLogoResize) {
      const deltaX = e.clientX - initialLogoResize.startX;
      const deltaY = e.clientY - initialLogoResize.startY;
      const avgDelta = (deltaX + deltaY) / 2;
      const scaleFactor = Math.max(
        0.2,
        initialLogoResize.startScale + avgDelta / 150
      );
      setLogoScale(scaleFactor);
    }

    if (resizingProductId && initialResizeState) {
      const deltaX = e.clientX - initialResizeState.startX;
      const deltaY = e.clientY - initialResizeState.startY;

      // FIXED: Bidirectional resizing - support both growing and shrinking
      const avgDelta = (deltaX + deltaY) / 2;
      const scaleFactor = Math.max(
        0.1,
        initialResizeState.startScale.scaleX + avgDelta / 150
      );

      setProductScales((prev) => ({
        ...prev,
        [resizingProductId]: {
          scaleX: scaleFactor,
          scaleY: scaleFactor,
        },
      }));
    }
  };

  const handleMouseUp = () => {
    // Save/Snap product position when dragging ends
    if (
      draggedProductId &&
      onProductPositionUpdate &&
      productPositions[draggedProductId]
    ) {
      const position = productPositions[draggedProductId];
      // Snap to nearest grid cell
      const canvasDims = getCanvasDimensions();
      const currentPage = productPages[draggedProductId] || 1;
      const pageProducts = selectedProducts.filter(
        (p) => (productPages[p.id] || 1) === currentPage
      );
      const grid = getAdaptiveGridGeometry(
        canvasDims.width,
        canvasDims.height,
        pageProducts.length
      );
      let nearestIndex = 0;
      let nearestDist = Number.MAX_VALUE;
      grid.cells.forEach((cell, idx) => {
        const dx = position.x - cell.x;
        const dy = position.y - cell.y;
        const d = dx * dx + dy * dy;
        if (d < nearestDist) {
          nearestDist = d;
          nearestIndex = idx;
        }
      });
      // Handle swap if cell is occupied on same page
      const occupant = selectedProducts.find(
        (p) =>
          (productPages[p.id] || 1) === currentPage &&
          productGridIndex[p.id] === nearestIndex
      );
      const prevIndex = productGridIndex[draggedProductId];
      setProductGridIndex((prev) => ({
        ...prev,
        [draggedProductId]: nearestIndex,
        ...(occupant ? { [occupant.id]: prevIndex } : {}),
      }));
      setProductPositions((prev) => ({
        ...prev,
        [draggedProductId]: {
          x: grid.cells[nearestIndex].x,
          y: grid.cells[nearestIndex].y,
        },
        ...(occupant
          ? {
              [occupant.id]:
                prevIndex != null
                  ? { x: grid.cells[prevIndex].x, y: grid.cells[prevIndex].y }
                  : prev[occupant.id],
            }
          : {}),
      }));
      onProductPositionUpdate(
        draggedProductId,
        grid.cells[nearestIndex].x,
        grid.cells[nearestIndex].y
      );
    }

    setDraggedElement(null);
    setDraggedProductId(null);
    setRotatingProductId(null);
    setResizingProductId(null);
    setInitialResizeState(null);
    setIsDraggingDate(null);
    setDateDragStart(null);
    setIsRotatingLogo(false);
    setIsResizingLogo(false);
    setInitialLogoResize(null);
  };

  const handleCreateCampaign = () => {
    if (selectedProducts.length === 0) {
      toast({
        title: "No products selected",
        description:
          "Please add some products to your brochure before creating a campaign.",
        variant: "destructive",
      });
      return;
    }
    setIsCreateCampaignOpen(true);
  };

  // Enhanced Auto Layout with precise dynamic sizing and positioning
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

    // Arrange products within each page with precise dynamic layout
    Object.entries(productsByPage).forEach(([pageNum, products]) => {
      const pageNumber = parseInt(pageNum);
      const itemsInPage = products.length;
      const canvasDims = getCanvasDimensions();
      const canvasWidth = canvasDims.width;
      const canvasHeight = canvasDims.height;

      const layout = calculateDynamicLayout(
        itemsInPage,
        canvasWidth,
        canvasHeight
      );

      products.forEach((item, indexInPage) => {
        const col = indexInPage % layout.gridCols;
        const row = Math.floor(indexInPage / layout.gridCols);

        // Calculate precise positioning with balanced gaps
        const minGap = 20; // Minimum gap between products
        const gapX =
          layout.gridCols > 1
            ? Math.max(
                minGap,
                (layout.availableWidth - layout.gridCols * layout.productSize) /
                  (layout.gridCols - 1)
              )
            : 0;
        const gapY =
          layout.gridRows > 1
            ? Math.max(
                minGap,
                (layout.availableHeight -
                  layout.gridRows * layout.productSize) /
                  (layout.gridRows - 1)
              )
            : 0;

        const actualSpaceX = layout.productSize + gapX;
        const actualSpaceY = layout.productSize + gapY;

        // Center the grid for optimal visual balance
        const actualRowsUsed = Math.ceil(itemsInPage / layout.gridCols);
        const totalGridWidth =
          (layout.gridCols - 1) * actualSpaceX + layout.productSize;
        const totalGridHeight =
          (actualRowsUsed - 1) * actualSpaceY + layout.productSize;
        const offsetX = (layout.availableWidth - totalGridWidth) / 2;
        const offsetY = (layout.availableHeight - totalGridHeight) / 2;

        newPositions[item.id] = {
          x: layout.marginX + offsetX + col * actualSpaceX,
          y: layout.marginY + offsetY + row * actualSpaceY,
        };

        // Reset scaling to 1 since we handle size dynamically in render
        newScales[item.id] = { scaleX: 1, scaleY: 1 };
      });
    });

    setProductPositions(newPositions);
    setProductScales(newScales);

    toast({
      title: "Smart Layout Applied",
      description:
        "Products automatically arranged with optimal sizing and spacing for perfect visual balance.",
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
      const firstAvailableTemplateId =
        pageTemplates && Object.keys(pageTemplates).length > 0
          ? Object.values(pageTemplates).find((id) => id !== null)
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
        description:
          "PDF generation will be implemented with a proper PDF library.",
      });
      setIsDownloadOpen(false);
      return;
    }

    try {
      // FIXED: Multi-page download functionality
      const pageElements = document.querySelectorAll("[data-page-canvas]");

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
      setDropTargetPage(null);
      const editControls = document.querySelectorAll(
        '[data-edit-control="true"]'
      );
      const originalVisibility = Array.from(editControls).map(
        (el) => (el as HTMLElement).style.visibility
      );
      editControls.forEach(
        (el) => ((el as HTMLElement).style.visibility = "hidden")
      );

      const html2canvas = await import("html2canvas");

      // Allow multiple frames for layout to fully settle and fonts to load
      await new Promise((resolve) => setTimeout(resolve, 200));
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const getTargetDimensions = () =>
        instagramFormat === "4:5"
          ? { width: 1080, height: 1350 }
          : { width: 1080, height: 1080 };

      const captureCanvas = async (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        const { width: targetWidth, height: targetHeight } =
          getTargetDimensions();
        
        // Calculate scale factors for each dimension to maintain exact aspect ratio
        const scaleX = targetWidth / rect.width;
        const scaleY = targetHeight / rect.height;

        const renderedCanvas = await html2canvas.default(element, {
          scale: 2,
          width: rect.width,
          height: rect.height,
          useCORS: true,
          allowTaint: true,
          backgroundColor: null,
          logging: false,
        });

        // Create final output canvas with exact target dimensions
        const outputCanvas = document.createElement("canvas");
        outputCanvas.width = targetWidth;
        outputCanvas.height = targetHeight;
        const ctx = outputCanvas.getContext("2d");
        if (ctx) {
          // Fill with transparent background
          ctx.clearRect(0, 0, targetWidth, targetHeight);
          // Draw the captured content scaled to exact target dimensions
          ctx.drawImage(
            renderedCanvas,
            0,
            0,
            renderedCanvas.width,
            renderedCanvas.height,
            0,
            0,
            targetWidth,
            targetHeight
          );
        }

        return outputCanvas;
      };

      if (pageElements.length === 1) {
        const element = pageElements[0] as HTMLElement;
        const finalCanvas = await captureCanvas(element);
        const link = document.createElement("a");
        link.download = `brochure.${format}`;
        link.href = finalCanvas.toDataURL(`image/${format}`, 0.95);
        link.click();
      } else {
        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();

        for (let i = 0; i < pageElements.length; i++) {
          const element = pageElements[i] as HTMLElement;
          const finalCanvas = await captureCanvas(element);
          const dataUrl = finalCanvas.toDataURL(`image/${format}`, 0.95);
          const base64Data = dataUrl.split(",")[1];
          zip.file(`page-${i + 1}.${format}`, base64Data, { base64: true });
        }

        const zipBlob = await zip.generateAsync({ type: "blob" });
        const link = document.createElement("a");
        link.download = `brochure-pages.zip`;
        link.href = URL.createObjectURL(zipBlob);
        link.click();
        URL.revokeObjectURL(link.href);
      }

      // Restore edit controls
      editControls.forEach((el, index) => {
        (el as HTMLElement).style.visibility = originalVisibility[index];
      });

      toast({
        title: "Download successful",
        description:
          pageElements.length > 1
            ? `Downloaded ${pageElements.length} pages as ZIP file.`
            : "Downloaded brochure successfully.",
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
    if (startDate && !endDate)
      return `From ${format(startDate, "MMM dd, yyyy")}`;
    if (!startDate && endDate)
      return `Until ${format(endDate, "MMM dd, yyyy")}`;
    return `${format(startDate!, "MMM dd")} - ${format(
      endDate!,
      "MMM dd, yyyy"
    )}`;
  };

  // helper to convert hex to rgb
  const hexToRgb = (hex: string) => {
    const clean = hex.replace("#", "");
    const bigint = parseInt(
      clean.length === 3
        ? clean
            .split("")
            .map((c) => c + c)
            .join("")
        : clean,
      16
    );
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return { r, g, b };
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Brochure Designer
          </h2>
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm" onClick={handleAutoLayout}>
              <Maximize2 className="w-4 h-4 mr-2" />
              Auto Layout
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDownloadOpen(true)}
            >
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
          {/* Instagram Format Selection */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Instagram Format
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setInstagramFormat("4:5")}
                className={cn(
                  "p-3 rounded-lg border-2 transition-all",
                  instagramFormat === "4:5"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 hover:border-gray-400"
                )}
              >
                <div className="text-sm font-medium text-gray-700 mb-1">
                  4:5 (Dikey)
                </div>
                <div className="text-xs text-gray-500">1080x1350 px</div>
              </button>
              <button
                onClick={() => setInstagramFormat("1:1")}
                className={cn(
                  "p-3 rounded-lg border-2 transition-all",
                  instagramFormat === "1:1"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 hover:border-gray-400"
                )}
              >
                <div className="text-sm font-medium text-gray-700 mb-1">
                  1:1 (Kare)
                </div>
                <div className="text-xs text-gray-500">1080x1080 px</div>
              </button>
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Campaign Dates
            </h3>
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
                      {startDate
                        ? format(startDate, "MMM dd, yyyy")
                        : "Pick a date"}
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
                      {endDate
                        ? format(endDate, "MMM dd, yyyy")
                        : "Pick a date"}
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

          {/* removed old header/style controls now moved to right sidebar */}
        </div>

        {/* Page Management - Only show if not in design mode */}
        {!isDesignMode && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Pages ({pages})
              </h3>
              <div className="flex items-center space-x-2">
                <Select
                  value={pages.toString()}
                  onValueChange={(value) => handlePagesChange(parseInt(value))}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} Page{num > 1 ? "s" : ""}
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
                Tip: Use the dropdown to change page count and automatically
                redistribute products, or drag products between pages manually.
              </p>
            )}
          </div>
        )}

        {/* Multi-Page Brochure Canvas */}
        <div className={isDesignMode ? "flex gap-6 items-start" : "space-y-8"}>
          {/* Left Sidebar Controls (Design Mode) */}
          {isDesignMode && (
            <div className="w-64 shrink-0">
              <div className="sticky top-4 border rounded-lg p-4 bg-white shadow-sm space-y-4">
                <h4 className="text-sm font-semibold text-gray-900">Content</h4>
                {/* Brand & Banner */}
                <div className="border rounded-lg p-3">
                  <h5 className="text-xs font-semibold text-gray-700 mb-2">
                    Brand & Banner
                  </h5>
                  <label className="block text-xs font-medium text-gray-600 mb-2">
                    Market Name
                  </label>
                  <div className="flex items-end gap-2 mb-3">
                    <Input
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Karatay Market"
                    />
                    <button
                      className={`px-3 py-2 rounded-md text-sm border ${
                        showCompanyName
                          ? "bg-green-50 border-green-200 text-green-700"
                          : "bg-white border-gray-200"
                      }`}
                      onClick={() => setShowCompanyName((s) => !s)}
                    >
                      {showCompanyName ? "Visible" : "Hidden"}
                    </button>
                  </div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">
                    Logo
                  </label>
                  <div className="flex items-center gap-2 mb-3">
                    <Select
                      value={(selectedLogoId ?? "").toString()}
                      onValueChange={handleLogoSelect}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose logo" />
                      </SelectTrigger>
                      <SelectContent>
                        {logos?.map((l) => (
                          <SelectItem key={l.id} value={l.id.toString()}>
                            {l.name}
                          </SelectItem>
                        ))}
                        <SelectItem value={"-1"}>Hide Logo</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsLogoSelectOpen(true)}
                    >
                      Upload
                    </Button>
                  </div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">
                    Banner Text
                  </label>
                  <Input
                    value={bannerText}
                    onChange={(e) => setBannerText(e.target.value)}
                  />
                </div>
                {/* Header right phone block */}
                <div className="border rounded-lg p-3">
                  <h5 className="text-xs font-semibold text-gray-700 mb-2">
                    Header Phone Area
                  </h5>
                  <label className="block text-xs text-gray-600 mb-1">
                    Text
                  </label>
                  <Input
                    value={headerPhoneText}
                    onChange={(e) => setHeaderPhoneText(e.target.value)}
                  />
                  <label className="block text-xs text-gray-600 mt-2 mb-1">
                    Phone Number
                  </label>
                  <Input
                    value={headerPhoneNumber}
                    onChange={(e) => setHeaderPhoneNumber(e.target.value)}
                  />
                </div>
                {/* Footer content settings */}
                <div className="border rounded-lg p-3">
                  <h5 className="text-xs font-semibold text-gray-700 mb-2">
                    Footer Content
                  </h5>
                  <label className="block text-xs text-gray-600 mb-1">
                    Address (left)
                  </label>
                  <Input
                    value={footerAddress}
                    onChange={(e) => setFooterAddress(e.target.value)}
                  />
                  <div className="grid grid-cols-1 gap-2 mt-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Instagram
                      </label>
                      <Input
                        value={socialInstagram}
                        onChange={(e) => setSocialInstagram(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Facebook
                      </label>
                      <Input
                        value={socialFacebook}
                        onChange={(e) => setSocialFacebook(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Twitter/X
                      </label>
                      <Input
                        value={socialTwitter}
                        onChange={(e) => setSocialTwitter(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Canvases */}
          <div
            className={
              isDesignMode ? "flex space-x-6 overflow-x-auto pb-4" : "space-y-8"
            }
          >
            {Array.from({ length: pages }, (_, pageIndex) => {
              const pageNumber = pageIndex + 1;
              const pageProducts = selectedProducts
                .map((p, idx) => ({ p, idx }))
                .filter(({ p }) => (productPages[p.id] || 1) === pageNumber)
                .slice(0, 20)
                .map(({ p }) => p);

              return (
                <div
                  key={pageNumber}
                  className={`relative ${isDesignMode ? "flex-shrink-0" : ""}`}
                >
                  <div
                    className={`flex items-center mb-2 ${
                      isDesignMode ? "justify-center" : ""
                    }`}
                  >
                    <span className="text-sm font-medium text-gray-700">
                      Page {pageNumber}
                    </span>
                    <span className="ml-2 text-xs text-gray-500">
                      ({pageProducts.length} products)
                    </span>
                  </div>

                  <div
                    ref={pageNumber === 1 ? canvasRef : undefined}
                    data-page-canvas={pageNumber}
                    className={cn(
                      "drag-drop-area relative mx-auto transition-colors overflow-visible",
                      dropTargetPage === pageNumber
                        ? "border-blue-400 bg-blue-50"
                        : "border-gray-300"
                    )}
                    style={{
                      borderRadius: "20px",
                      width: isDesignMode
                        ? instagramFormat === "4:5"
                          ? "540px" // 1080/2 for display
                          : "540px" // 1080/2 for display
                        : instagramFormat === "4:5"
                        ? "400px" // Scaled down for preview
                        : "400px", // Scaled down for preview
                      height: isDesignMode
                        ? instagramFormat === "4:5"
                          ? "675px" // 1350/2 for display
                          : "540px" // 1080/2 for display
                        : instagramFormat === "4:5"
                        ? "500px" // Scaled down for preview
                        : "400px", // Scaled down for preview
                      backgroundImage: (() => {
                        try {
                          // FIXED: Use page-specific template if available in design mode
                          const pageTemplateId = pageTemplates?.[pageNumber];
                          if (
                            pageTemplateId &&
                            templates &&
                            templates.length > 0
                          ) {
                            const pageTemplate = templates.find(
                              (t) => t.id === pageTemplateId
                            );
                            if (pageTemplate && pageTemplate.filePath) {
                              return `url(/uploads/${pageTemplate.filePath})`;
                            }
                          }
                          // Fallback to global selected template or modern supermarket gradient
                          if (selectedTemplate && selectedTemplate.filePath) {
                            return `url(/uploads/${selectedTemplate.filePath})`;
                          }
                          // Base color from background color + opacity
                          const rgb = hexToRgb(bgBaseHex);
                          const rgba = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${bgBaseAlpha})`;
                          return `linear-gradient(0deg, ${rgba}, ${rgba})`;
                        } catch (error) {
                          console.error("Error loading template:", error);
                          const rgb = hexToRgb(bgBaseHex);
                          const rgba = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${bgBaseAlpha})`;
                          return `linear-gradient(0deg, ${rgba}, ${rgba})`;
                        }
                      })(),
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      backgroundRepeat: "no-repeat",
                    }}
                    onMouseMove={(e) => handleMouseMove(e, pageNumber)}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onClick={() => {
                      setIsLogoSelected(false);
                      setSelectedProductIdForControls(null);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDropTargetPage(pageNumber);
                    }}
                    onDragLeave={() => setDropTargetPage(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      const productId = parseInt(
                        e.dataTransfer.getData("text/plain")
                      );
                      if (productId && !isNaN(productId)) {
                        moveProductToPage(productId, pageNumber);
                        setDropTargetPage(null);
                      }
                    }}
                  >
                    {/* Fixed: Supermarket-style template background layers */}
                    {showSupermarketTemplate && (
                      <>
                        {/* Header strip */}
                        <div
                          className="absolute left-0 top-0 w-full"
                          style={{
                            height: 120,
                            background: headerBgColor,
                            opacity: headerBgAlpha,
                            borderTopLeftRadius: "20px",
                            borderTopRightRadius: "20px",
                          }}
                        />
                        {/* Banner strip */}
                        <div
                          className="absolute left-0"
                          style={{
                            top: 120,
                            height: 44,
                            width: "100%",
                            background: bannerBgColor,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <span
                            className="font-black tracking-wide"
                            style={{ color: bannerTextColor }}
                          >
                            {bannerText}
                          </span>
                          {/* Header right: phone area */}
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 bg-white/20 px-2 py-1 rounded">
                            <Phone className="w-4 h-4 text-white" />
                            <span className="text-xs text-white whitespace-nowrap">
                              {headerPhoneText}
                            </span>
                            <span className="text-sm font-bold text-white whitespace-nowrap">
                              {headerPhoneNumber}
                            </span>
                          </div>
                        </div>
                        {/* Footer strip */}
                        <div
                          className="absolute left-0 bottom-0 w-full"
                          style={{
                            height: 80,
                            background: footerBgColor,
                            opacity: 0.2,
                            borderBottomLeftRadius: "20px",
                            borderBottomRightRadius: "20px",
                          }}
                        />
                        {/* Footer content: address left, socials right */}
                        <div className="absolute left-0 bottom-0 w-full h-20 flex items-center justify-between px-4">
                          <div className="text-xs text-white max-w-[60%]">
                            {footerAddress}
                          </div>
                          <div className="flex items-center gap-3 text-white">
                            <div className="flex items-center gap-1">
                              <Instagram className="w-4 h-4" />
                              <span className="text-xs">{socialInstagram}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Facebook className="w-4 h-4" />
                              <span className="text-xs">{socialFacebook}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Twitter className="w-4 h-4" />
                              <span className="text-xs">{socialTwitter}</span>
                            </div>
                          </div>
                        </div>
                        {/* Optional background image overlay */}
                        {bgImageUrl && (
                          <div
                            className="absolute inset-0"
                            style={{
                              backgroundImage: `url(${bgImageUrl})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                              opacity: bgImageOpacity,
                              pointerEvents: "none",
                            }}
                          />
                        )}
                      </>
                    )}

                    {/* FIXED: Interactive Company Logo - Only show if not explicitly removed */}
                    {selectedLogoId !== -1 && (
                      <div
                        className="absolute draggable-element cursor-move user-select-none z-40 group"
                        style={{
                          left: elementPositions.logo.x,
                          top: elementPositions.logo.y,
                        }}
                        onMouseDown={(e) => {
                          handleMouseDown("logo", e);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsLogoSelected(true);
                          setSelectedProductIdForControls(null);
                        }}
                      >
                        <div
                          className="bg-white rounded-lg flex items-center justify-center shadow-lg overflow-hidden relative"
                          style={{
                            width: `${64 * logoScale}px`,
                            height: `${64 * logoScale}px`,
                            transform: `rotate(${logoRotation}deg)`,
                          }}
                        >
                          {selectedLogo ? (
                            <>
                              <img
                                src={
                                  selectedLogo.filePath
                                    ? selectedLogo.filePath.startsWith(
                                        "/public/assets/"
                                      ) ||
                                      selectedLogo.filePath.startsWith(
                                        "public/assets/"
                                      )
                                      ? selectedLogo.filePath.startsWith("/")
                                        ? selectedLogo.filePath
                                        : `/${selectedLogo.filePath}`
                                      : `/uploads/${selectedLogo.filePath}`
                                    : ""
                                }
                                alt="Company Logo"
                                className="w-full h-full object-contain rounded-lg"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display =
                                    "none";
                                  (
                                    e.target as HTMLImageElement
                                  ).nextElementSibling?.removeAttribute(
                                    "style"
                                  );
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
                              {/* Logo controls overlay removed; use Transform panel instead */}
                            </>
                          ) : (
                            <div
                              className="w-full h-full flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
                              onClick={() => {
                                setIsLogoSelectOpen(true);
                                setIsLogoSelected(true);
                              }}
                            >
                              <Building className="w-8 h-8 text-gray-400" />
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black bg-opacity-50 rounded-lg transition-opacity">
                                <span className="text-white text-xs">
                                  Click to add logo
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Company Name */}
                    {showCompanyName && (
                      <div
                        className="absolute draggable-element cursor-move user-select-none z-30"
                        style={{
                          left: elementPositions.companyName.x,
                          top: elementPositions.companyName.y,
                        }}
                        onMouseDown={(e) => handleMouseDown("companyName", e)}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setIsEditingCompanyName(true);
                        }}
                      >
                        {isEditingCompanyName ? (
                          <input
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            onBlur={() => setIsEditingCompanyName(false)}
                            autoFocus
                            className="px-2 py-1 rounded-md border border-gray-300 bg-white/90 font-black text-3xl"
                            style={{ color: titleColor, fontFamily: titleFont }}
                          />
                        ) : (
                          <h1
                            className="supermarket-title text-3xl font-black drop-shadow-lg"
                            style={{ color: titleColor, fontFamily: titleFont }}
                          >
                            {companyName}
                          </h1>
                        )}
                      </div>
                    )}

                    {/* FIXED: Draggable Date Display on each page */}
                    {startDate && endDate && (
                      <div
                        className="absolute cursor-move user-select-none z-20 bg-white/90 px-3 py-1 rounded-md shadow-md text-sm font-medium text-gray-800 border border-gray-200"
                        style={{
                          left: datePositions[pageNumber]?.x || 320,
                          top: datePositions[pageNumber]?.y || 20,
                        }}
                        onMouseDown={(e) => {
                          setIsDraggingDate(pageNumber);
                          const rect = e.currentTarget.getBoundingClientRect();
                          setDateDragStart({
                            x: e.clientX - rect.left,
                            y: e.clientY - rect.top,
                          });
                          e.preventDefault();
                        }}
                        data-edit-control="true"
                      >
                        <CalendarIcon className="inline w-3 h-3 mr-1" />
                        {format(startDate, "MMM dd")} -{" "}
                        {format(endDate, "MMM dd, yyyy")}
                      </div>
                    )}

                    {/* Drop zone message when no products */}
                    {selectedProducts.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-black bg-opacity-50 rounded-lg p-6 text-center">
                          <p className="text-white font-semibold text-lg">
                            No products added yet
                          </p>
                          <p className="text-sm text-gray-200 mt-2">
                            Add products from the left panel and drag them to
                            position them on your brochure
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Draggable Products - Adaptive grid up to 20 per page */}
                    {pageProducts.map((item) => {
                      const canvasDims = getCanvasDimensions();
                      const grid = getAdaptiveGridGeometry(
                        canvasDims.width,
                        canvasDims.height,
                        pageProducts.length
                      );
                      const fallbackIndex = 0;
                      const cellIndex =
                        productGridIndex[item.id] !== undefined
                          ? productGridIndex[item.id]
                          : fallbackIndex;
                      const position =
                        grid.cells[cellIndex] || grid.cells[fallbackIndex];
                      const rotation = productRotations[item.id] || 0;
                      const scale = productScales[item.id] || {
                        scaleX: 1,
                        scaleY: 1,
                      };
                      const isDragging = draggedProductId === item.id;
                      const isRotating = rotatingProductId === item.id;
                      const isResizing = resizingProductId === item.id;

                      return (
                        <div
                          key={item.id}
                          className={cn(
                            "absolute select-none",
                            isDragging
                              ? "z-50"
                              : isRotating || isResizing
                              ? "z-40"
                              : "z-30"
                          )}
                          style={{
                            left: position.x,
                            top: position.y,
                            filter: isDragging
                              ? "drop-shadow(0 8px 16px rgba(0,0,0,0.25))"
                              : "drop-shadow(0 2px 4px rgba(0,0,0,0.1))",
                            transform: `scale(${isDragging ? 1.02 : 1})`,
                            transition:
                              isDragging || isRotating || isResizing
                                ? "none"
                                : "all 0.1s ease",
                          }}
                        >
                          {/* Control buttons removed per new sidebar controls */}

                          {/* Drag Handle for Moving Between Pages - Always show for page-to-page movement */}
                          <div
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData(
                                "text/plain",
                                item.id.toString()
                              );
                              e.dataTransfer.effectAllowed = "move";
                            }}
                            className="absolute -top-4 -left-4 bg-orange-500 hover:bg-orange-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg transition-colors cursor-grab active:cursor-grabbing z-30"
                            title="Drag to move to another page"
                            style={{
                              display:
                                selectedProductIdForControls === item.id
                                  ? "flex"
                                  : "none",
                            }}
                          >
                            📄
                          </div>

                          {/* Product + Price Container - Single grouped layout */}
                          <div
                            className="relative inline-block"
                            style={{
                              width: `${grid.cells[cellIndex].width}px`,
                              height: `${grid.cells[cellIndex].height}px`,
                            }}
                          >
                            {/* Fixed panel background inside, leaves a thin margin so price can hang past it */}
                            {/* ürün kartı */}
                            <div className="absolute inset-1 rounded-md  " />
                            {/* Pure Product Image - Clean container */}
                            <div
                              className="relative flex items-center justify-center"
                              style={{
                                width: `${grid.cells[cellIndex].innerWidth}px`,
                                height: `${grid.cells[cellIndex].innerHeight}px`,
                                transform: `rotate(${rotation}deg) scaleX(${scale.scaleX}) scaleY(${scale.scaleY})`,
                                transition:
                                  isRotating || isResizing
                                    ? "none"
                                    : "transform 0.1s ease",
                              }}
                              onMouseDown={(e) => {
                                handleProductMouseDown(item.id, e);
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedProductIdForControls(item.id);
                                setIsLogoSelected(false);
                              }}
                            >
                              {item.product.imageUrl ? (
                                <img
                                  src={item.product.imageUrl}
                                  alt={item.product.name}
                                  className="w-full h-full object-contain p-2"
                                  style={{
                                    background: "transparent",
                                    filter:
                                      "drop-shadow(0 4px 12px rgba(0,0,0,0.05))",
                                  }}
                                  draggable={false}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <span className="text-gray-600 text-sm font-medium bg-yellow-100/90 px-3 py-2 rounded-lg shadow-sm">
                                    No Image
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Header: Product Name (top-center inside cell) - Dynamic size based on product count */}
                            {(() => {
                              const productCount = pageProducts.length;
                              const nameSizeClass =
                                productCount === 1
                                  ? "text-lg"
                                  : productCount <= 3
                                  ? "text-base"
                                  : productCount <= 6
                                  ? "text-sm"
                                  : "text-xs";
                              const nameTop =
                                productCount === 1 ? "top-1" : "top-2";

                              return (
                                <div
                                  className={`absolute left-0 right-0 ${nameTop} px-2`}
                                >
                                  <h3
                                    className={`${nameSizeClass} font-bold text-gray-900 text-center truncate`}
                                  >
                                    {(item as any).displayName ??
                                      item.product.name}
                                  </h3>
                                </div>
                              );
                            })()}

                            {/* Modern Turkish Supermarket Style Price Tag - Red background with yellow text */}
                            {(() => {
                              const productCount = pageProducts.length;
                              const priceSizeClass =
                                productCount === 1
                                  ? "text-3xl"
                                  : productCount <= 3
                                  ? "text-2xl"
                                  : productCount <= 6
                                  ? "text-xl"
                                  : "text-lg";
                              const oldPriceSizeClass =
                                productCount === 1
                                  ? "text-base"
                                  : productCount <= 3
                                  ? "text-sm"
                                  : "text-xs";
                              const discountBadgeSize =
                                productCount === 1
                                  ? "w-14 h-14 text-base"
                                  : productCount <= 3
                                  ? "w-12 h-12 text-sm"
                                  : "w-10 h-10 text-xs";
                              const pricePadding =
                                productCount === 1
                                  ? "px-5 py-3"
                                  : productCount <= 3
                                  ? "px-4 py-2.5"
                                  : "px-3 py-2";
                              const priceBottom =
                                productCount === 1 ? "bottom-1" : "bottom-2";

                              return (
                                <div
                                  className={`absolute ${priceBottom} left-2 right-2 flex flex-col items-center gap-1`}
                                >
                                  {/* Old Price (if discount exists) */}
                                  {item.discountPercent > 0 && (
                                    <div
                                      className={`${oldPriceSizeClass} font-bold text-gray-700 bg-white/95 px-3 py-1 rounded-md line-through shadow-sm`}
                                    >
                                      {(
                                        (item as any).originalPriceOverride ??
                                        item.product.originalPrice
                                      ).toFixed(2)} TL
                                    </div>
                                  )}
                                  
                                  {/* New Price with Red Background and Yellow Text */}
                                  <div className="relative inline-block">
                                    <div
                                      className={`${pricePadding} bg-gradient-to-br from-red-600 to-red-700 text-yellow-400 shadow-xl rounded-lg ${priceSizeClass} font-black border-2 border-red-800`}
                                      style={{
                                        textShadow: "1px 1px 2px rgba(0,0,0,0.5)"
                                      }}
                                    >
                                      {item.newPrice.toFixed(2)} ₺
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                          {/* Turkish Supermarket Style Promotional Elements - Yellow badge with red text */}
                          <div className="absolute top-0 right-0 z-20">
                            {item.discountPercent > 0 && (() => {
                              const productCount = pageProducts.length;
                              const badgeSize =
                                productCount === 1
                                  ? "w-16 h-16 text-lg"
                                  : productCount <= 3
                                  ? "w-14 h-14 text-base"
                                  : productCount <= 6
                                  ? "w-12 h-12 text-sm"
                                  : "w-10 h-10 text-xs";
                              
                              return (
                                <div
                                  className={`${badgeSize} bg-gradient-to-br from-yellow-400 to-yellow-500 text-red-700 rounded-full flex items-center justify-center font-black shadow-lg border-2 border-yellow-600 transform rotate-12`}
                                  style={{
                                    textShadow: "0px 0px 2px rgba(255,255,255,0.8)"
                                  }}
                                >
                                  -{item.discountPercent}%
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Sidebar Controls (Design Mode) */}
          {isDesignMode && (
            <div className="w-64 shrink-0">
              <div className="sticky top-4 border rounded-lg p-4 bg-white shadow-sm">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  Transform
                </h4>
                {isLogoSelected || selectedProductIdForControls ? (
                  <>
                    <div className="mb-4">
                      <label className="block text-xs font-medium text-gray-600 mb-2">
                        Rotation (deg)
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="range"
                          min={-180}
                          max={180}
                          step={1}
                          className="flex-1"
                          value={
                            isLogoSelected
                              ? logoRotation || 0
                              : productRotations[
                                  selectedProductIdForControls || 0
                                ] || 0
                          }
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (isLogoSelected) {
                              setLogoRotation(val);
                            } else {
                              if (selectedProductIdForControls != null) {
                                setProductRotations((prev) => ({
                                  ...prev,
                                  [selectedProductIdForControls]: val,
                                }));
                              }
                            }
                          }}
                        />
                        <input
                          type="number"
                          className="w-16 border rounded px-1 py-1 text-sm"
                          value={
                            isLogoSelected
                              ? logoRotation || 0
                              : productRotations[
                                  selectedProductIdForControls || 0
                                ] || 0
                          }
                          onChange={(e) => {
                            const val = parseInt(e.target.value || "0");
                            if (isLogoSelected) {
                              setLogoRotation(val);
                            } else {
                              if (selectedProductIdForControls != null) {
                                setProductRotations((prev) => ({
                                  ...prev,
                                  [selectedProductIdForControls]: val,
                                }));
                              }
                            }
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-2">
                        Scale
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="range"
                          min={0.2}
                          max={2}
                          step={0.01}
                          className="flex-1"
                          value={
                            isLogoSelected
                              ? logoScale || 1
                              : productScales[selectedProductIdForControls || 0]
                                  ?.scaleX || 1
                          }
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (isLogoSelected) {
                              setLogoScale(val);
                            } else {
                              if (selectedProductIdForControls != null) {
                                setProductScales((prev) => ({
                                  ...prev,
                                  [selectedProductIdForControls]: {
                                    scaleX: val,
                                    scaleY: val,
                                  },
                                }));
                              }
                            }
                          }}
                        />
                        <input
                          type="number"
                          className="w-16 border rounded px-1 py-1 text-sm"
                          step={0.01}
                          min={0.2}
                          max={2}
                          value={
                            isLogoSelected
                              ? logoScale || 1
                              : productScales[selectedProductIdForControls || 0]
                                  ?.scaleX || 1
                          }
                          onChange={(e) => {
                            const val = parseFloat(e.target.value || "1");
                            if (isLogoSelected) {
                              setLogoScale(val);
                            } else {
                              if (selectedProductIdForControls != null) {
                                setProductScales((prev) => ({
                                  ...prev,
                                  [selectedProductIdForControls]: {
                                    scaleX: val,
                                    scaleY: val,
                                  },
                                }));
                              }
                            }
                          }}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">
                    Select a product to edit rotation and scale.
                  </p>
                )}
              </div>
              <hr className="my-4" />
              <h4 className="text-sm font-semibold text-gray-900 mb-3">
                Styles
              </h4>
              <div className="space-y-4">
                {/* Typography */}
                <div className="border rounded-lg p-3">
                  <h5 className="text-xs font-semibold text-gray-700 mb-2">
                    Typography
                  </h5>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-2">
                        Title Color
                      </label>
                      <input
                        type="color"
                        value={titleColor}
                        onChange={(e) => setTitleColor(e.target.value)}
                        className="h-9 w-16 p-1 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-2">
                        Title Font
                      </label>
                      <Select value={titleFont} onValueChange={setTitleFont}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="'Bebas Neue', 'Montserrat', 'Arial Black', sans-serif">
                            Bebas Neue
                          </SelectItem>
                          <SelectItem value="'Anton', 'Impact', 'Arial Black', sans-serif">
                            Anton
                          </SelectItem>
                          <SelectItem value="'Playfair Display', 'Times New Roman', 'Georgia', serif">
                            Playfair Display
                          </SelectItem>
                          <SelectItem value="'Abril Fatface', 'Times New Roman', serif">
                            Abril Fatface
                          </SelectItem>
                          <SelectItem value="'Raleway', 'Helvetica Neue', 'Arial', sans-serif">
                            Raleway
                          </SelectItem>
                          <SelectItem value="'Oswald', 'Arial Narrow', 'Helvetica', sans-serif">
                            Oswald
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                {/* Colors */}
                <div className="border rounded-lg p-3">
                  <h5 className="text-xs font-semibold text-gray-700 mb-2">
                    Colors
                  </h5>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Header Color
                      </label>
                      <input
                        type="color"
                        value={headerBgColor}
                        onChange={(e) => setHeaderBgColor(e.target.value)}
                        className="h-9 w-16 p-1 border rounded"
                      />
                      <div className="space-y-1 mt-2">
                        <span className="block text-xs text-gray-600">
                          Opacity
                        </span>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.01}
                            className="flex-1"
                            value={headerBgAlpha}
                            onChange={(e) =>
                              setHeaderBgAlpha(parseFloat(e.target.value))
                            }
                          />
                          <input
                            type="number"
                            min={0}
                            max={1}
                            step={0.01}
                            className="w-16 border rounded px-1 py-1 text-xs"
                            value={headerBgAlpha}
                            onChange={(e) =>
                              setHeaderBgAlpha(
                                Math.max(
                                  0,
                                  Math.min(1, parseFloat(e.target.value || "0"))
                                )
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Banner Color
                      </label>
                      <input
                        type="color"
                        value={bannerBgColor}
                        onChange={(e) => setBannerBgColor(e.target.value)}
                        className="h-9 w-16 p-1 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Banner Text Color
                      </label>
                      <input
                        type="color"
                        value={bannerTextColor}
                        onChange={(e) => setBannerTextColor(e.target.value)}
                        className="h-9 w-16 p-1 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Footer Color
                      </label>
                      <input
                        type="color"
                        value={footerBgColor}
                        onChange={(e) => setFooterBgColor(e.target.value)}
                        className="h-9 w-16 p-1 border rounded"
                      />
                    </div>
                  </div>
                </div>

                {/* Background */}
                <div className="border rounded-lg p-3">
                  <h5 className="text-xs font-semibold text-gray-700 mb-2">
                    Background
                  </h5>
                  <label className="block text-xs font-medium text-gray-600 mb-2">
                    Background Color
                  </label>
                  <div className="space-y-2">
                    <div>
                      <input
                        type="color"
                        value={bgBaseHex}
                        onChange={(e) => setBgBaseHex(e.target.value)}
                        className="h-9 w-16 p-1 border rounded"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="block text-xs text-gray-600">
                        Opacity
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.01}
                          className="flex-1"
                          value={bgBaseAlpha}
                          onChange={(e) =>
                            setBgBaseAlpha(parseFloat(e.target.value))
                          }
                        />
                        <input
                          type="number"
                          min={0}
                          max={1}
                          step={0.01}
                          className="w-16 border rounded px-1 py-1 text-xs"
                          value={bgBaseAlpha}
                          onChange={(e) =>
                            setBgBaseAlpha(
                              Math.max(
                                0,
                                Math.min(1, parseFloat(e.target.value || "0"))
                              )
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-gray-600 mb-2">
                      Background Image
                    </label>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          document.getElementById("bg-image-upload")?.click()
                        }
                      >
                        Upload
                      </Button>
                      {bgImageUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setBgImageUrl(null)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    <input
                      id="bg-image-upload"
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (!file) return;
                        const objectUrl = URL.createObjectURL(file);
                        setBgImageUrl(objectUrl);
                      }}
                    />
                    <div className="mt-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Background Image Opacity
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={bgImageOpacity}
                        onChange={(e) =>
                          setBgImageOpacity(parseFloat(e.target.value))
                        }
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Campaign Creation Dialog */}
      <Dialog
        open={isCreateCampaignOpen}
        onOpenChange={setIsCreateCampaignOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Campaign</DialogTitle>
            <DialogDescription>
              Enter a name and description for your campaign ({pages} page
              {pages > 1 ? "s" : ""})
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
              This campaign will include {selectedProducts.length} product
              {selectedProducts.length > 1 ? "s" : ""} distributed across{" "}
              {pages} page{pages > 1 ? "s" : ""}.
            </div>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setIsCreateCampaignOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveCampaign}
                disabled={!campaignName.trim()}
              >
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
            <p className="text-gray-600">
              Choose your preferred download format:
            </p>
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
                onClick={() =>
                  document.getElementById("logo-upload-input")?.click()
                }
                className="w-full text-gray-600 hover:text-gray-800"
              >
                <Upload className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm font-medium">Upload New Logo</p>
              </button>
            </div>

            {/* Existing logos grid */}
            {logos && logos.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Choose from existing logos:
                </h4>
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
                        src={
                          logo.filePath
                            ? logo.filePath.startsWith("/public/assets/") ||
                              logo.filePath.startsWith("public/assets/")
                              ? logo.filePath.startsWith("/")
                                ? logo.filePath
                                : `/${logo.filePath}`
                              : `/uploads/${logo.filePath}`
                            : ""
                        }
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
        style={{ display: "none" }}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file || !user?.id) return;

          const formData = new FormData();
          formData.append("file", file); // FIXED: Use 'file' field name to match server
          formData.append("name", file.name);
          formData.append("userId", user.id.toString());

          try {
            const response = await fetch("/api/logos", {
              method: "POST",
              body: formData,
            });

            if (response.ok) {
              const newLogo = await response.json();
              setSelectedLogoId(newLogo.id);
              setIsLogoSelectOpen(false);
              queryClient.invalidateQueries({ queryKey: ["/api/logos"] });
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
