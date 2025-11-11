import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  loginSchema,
  insertCampaignSchema,
  insertCampaignProductSchema,
} from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure multer for file uploads - use persistent directory
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Create public/assets directory for persistent storage
const publicAssetsDir = path.join(process.cwd(), "public", "assets");
if (!fs.existsSync(publicAssetsDir)) {
  fs.mkdirSync(publicAssetsDir, { recursive: true });
}

// JSON files for persistent metadata
const productsJsonPath = path.join(publicAssetsDir, "products.json");
const logosJsonPath = path.join(publicAssetsDir, "logos.json");
const templatesJsonPath = path.join(publicAssetsDir, "templates.json");

async function ensureJson(filePath: string) {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
  } catch {
    await fs.promises.writeFile(filePath, JSON.stringify([], null, 2), "utf-8");
  }
}

async function readJsonArray<T = any>(filePath: string): Promise<T[]> {
  await ensureJson(filePath);
  const data = await fs.promises.readFile(filePath, "utf-8");
  try {
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeJsonArray(filePath: string, arr: any[]): Promise<void> {
  await fs.promises.writeFile(filePath, JSON.stringify(arr, null, 2), "utf-8");
}

function nextId(items: { id?: number }[]): number {
  const maxId = items.reduce(
    (m, it) => (typeof it.id === "number" && it.id! > m ? it.id! : m),
    0
  );
  return maxId + 1;
}

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

// Helper function to sanitize filename
function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-z0-9]/gi, "_")
    .toLowerCase()
    .substring(0, 50);
}

// Helper function to copy file to public/assets with custom name
async function copyToPublicAssets(
  sourcePath: string,
  customName: string,
  originalExtension: string
): Promise<string> {
  const timestamp = Date.now();
  const sanitizedName = sanitizeFilename(customName);
  const fileName = `${sanitizedName}_${timestamp}${originalExtension}`;
  const destPath = path.join(publicAssetsDir, fileName);

  await fs.promises.copyFile(sourcePath, destPath);
  return `/public/assets/${fileName}`;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve uploaded files statically
  app.use("/uploads", express.static(uploadDir));
  // Serve public assets statically
  app.use("/public/assets", express.static(publicAssetsDir));

  // Authentication
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      const user = await storage.getUserByUsername(username);

      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      res.json({
        user: { id: user.id, username: user.username, name: user.name },
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  // Campaigns
  app.get("/api/campaigns", async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string);
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const campaigns = await storage.getCampaigns(userId);
      res.json(campaigns);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });

  app.get("/api/campaigns/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const campaign = await storage.getCampaign(id);

      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      res.json(campaign);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch campaign" });
    }
  });

  app.post("/api/campaigns", async (req, res) => {
    try {
      const campaignData = insertCampaignSchema.parse(req.body);
      const campaign = await storage.createCampaign(campaignData);
      res.status(201).json(campaign);
    } catch (error) {
      res.status(400).json({ message: "Invalid campaign data" });
    }
  });

  app.put("/api/campaigns/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;

      const campaign = await storage.updateCampaign(id, updates);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      res.json(campaign);
    } catch (error) {
      res.status(500).json({ message: "Failed to update campaign" });
    }
  });

  app.delete("/api/campaigns/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteCampaign(id);

      if (!deleted) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      res.json({ message: "Campaign deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete campaign" });
    }
  });

  // Products
  app.get("/api/products", async (req, res) => {
    try {
      const search = (req.query.search as string) || "";
      const category = (req.query.category as string) || "";

      const jsonProducts = await readJsonArray<any>(productsJsonPath);
      let products = jsonProducts;
      if (search) {
        const s = search.toLowerCase();
        products = products.filter(
          (p) =>
            p.name?.toLowerCase().includes(s) ||
            p.description?.toLowerCase().includes(s)
        );
      }
      if (category && category !== "all") {
        products = products.filter((p) => p.category === category);
      }

      // Fallback to in-memory storage if JSON empty
      if (!products || products.length === 0) {
        const fallback = await storage.getProducts(search, category);
        return res.json(fallback);
      }

      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.post("/api/products", upload.single("image"), async (req, res) => {
    try {
      const { name, description, originalPrice, category } = req.body;

      let imageUrl = null;
      let publicAssetsUrl = null;

      if (req.file) {
        imageUrl = `/uploads/${req.file.filename}`;
        const fileExtension = path.extname(
          req.file.originalname || req.file.filename
        );
        try {
          publicAssetsUrl = await copyToPublicAssets(
            req.file.path,
            name || "product",
            fileExtension
          );
        } catch (error) {
          console.error(
            "Failed to copy product image to public/assets:",
            error
          );
        }
      }

      const productData = {
        name,
        description: description || null,
        originalPrice: parseFloat(originalPrice),
        category,
        imageUrl: publicAssetsUrl || imageUrl,
      };

      // Create in-memory (for compatibility)
      const product = await storage.createProduct(productData);

      // Persist to JSON
      const productsArr = await readJsonArray<any>(productsJsonPath);
      const record = {
        id: product?.id ?? nextId(productsArr),
        ...productData,
      };
      productsArr.push(record);
      await writeJsonArray(productsJsonPath, productsArr);

      res.status(201).json(record);
    } catch (error) {
      console.error("Product creation error:", error);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.patch("/api/products/:id", upload.single("image"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name, description, originalPrice, category } = req.body;

      const updates: any = {};
      if (name) updates.name = name;
      if (description !== undefined) updates.description = description || null;
      if (originalPrice) updates.originalPrice = parseFloat(originalPrice);
      if (category) updates.category = category;

      if (req.file) {
        const productName =
          name || (await storage.getProduct(id))?.name || "product";
        const fileExtension = path.extname(
          req.file.originalname || req.file.filename
        );
        try {
          const publicAssetsUrl = await copyToPublicAssets(
            req.file.path,
            productName,
            fileExtension
          );
          updates.imageUrl = publicAssetsUrl;
        } catch (error) {
          console.error(
            "Failed to copy product image to public/assets:",
            error
          );
          updates.imageUrl = `/uploads/${req.file.filename}`;
        }
      }

      // Update in-memory
      const product = await storage.updateProduct(id, updates);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Update JSON
      const productsArr = await readJsonArray<any>(productsJsonPath);
      const idx = productsArr.findIndex((p) => p.id === id);
      if (idx !== -1) {
        productsArr[idx] = { ...productsArr[idx], ...updates };
        await writeJsonArray(productsJsonPath, productsArr);
      }

      res.json(productsArr.find((p) => p.id === id) || product);
    } catch (error) {
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteProduct(id);

      const productsArr = await readJsonArray<any>(productsJsonPath);
      const remaining = productsArr.filter((p) => p.id !== id);
      await writeJsonArray(productsJsonPath, remaining);

      if (!deleted && productsArr.length === remaining.length) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Campaign Products
  app.get("/api/campaigns/:campaignId/products", async (req, res) => {
    try {
      const campaignId = parseInt(req.params.campaignId);
      const campaignProducts = await storage.getCampaignProducts(campaignId);

      // Enrich with product details
      const enrichedProducts = await Promise.all(
        campaignProducts.map(async (cp) => {
          const product = await storage.getProduct(cp.productId);
          return { ...cp, product };
        })
      );

      res.json(enrichedProducts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch campaign products" });
    }
  });

  app.post("/api/campaigns/:campaignId/products", async (req, res) => {
    try {
      const campaignId = parseInt(req.params.campaignId);
      const productData = { ...req.body, campaignId };

      const campaignProduct = await storage.addProductToCampaign(productData);
      res.status(201).json(campaignProduct);
    } catch (error) {
      res.status(400).json({ message: "Invalid product data" });
    }
  });

  app.put("/api/campaign-products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;

      const campaignProduct = await storage.updateCampaignProduct(id, updates);
      if (!campaignProduct) {
        return res.status(404).json({ message: "Campaign product not found" });
      }

      res.json(campaignProduct);
    } catch (error) {
      res.status(500).json({ message: "Failed to update campaign product" });
    }
  });

  app.delete("/api/campaign-products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.removeCampaignProduct(id);

      if (!deleted) {
        return res.status(404).json({ message: "Campaign product not found" });
      }

      res.json({ message: "Product removed from campaign" });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Failed to remove product from campaign" });
    }
  });

  // Templates
  app.get("/api/templates", async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string);
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const arr = await readJsonArray<any>(templatesJsonPath);
      const templates = arr.filter(
        (t) => t.userId === userId || t.userId == null
      );
      if (templates.length === 0) {
        const fallback = await storage.getTemplates(userId);
        return res.json(fallback);
      }
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  app.post("/api/templates", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { name, description, userId } = req.body;
      if (!name || !userId) {
        return res
          .status(400)
          .json({ message: "Name and user ID are required" });
      }

      // Validate file type - allow image files and common design files for templates
      const allowedMimes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/svg+xml",
        "application/pdf",
        "text/html",
        "application/postscript",
      ];

      if (!allowedMimes.includes(req.file.mimetype)) {
        return res.status(400).json({
          message:
            "Invalid file type. Please upload an image, PDF, or HTML file.",
        });
      }

      // Copy also to public/assets for persistence
      const fileExtension = path.extname(
        req.file.originalname || req.file.filename
      );
      try {
        await copyToPublicAssets(req.file.path, name, fileExtension);
      } catch (e) {
        console.warn("Failed to duplicate template file to public/assets", e);
      }

      // Create in-memory for compatibility
      const template = await storage.createTemplate({
        name,
        description: description || null,
        filePath: req.file.filename, // keep filename for existing UI which uses /uploads/
        userId: parseInt(userId),
      });

      // Persist to JSON
      const arr = await readJsonArray<any>(templatesJsonPath);
      const record = {
        id: template?.id ?? nextId(arr),
        name,
        description: description || null,
        filePath: req.file.filename, // keep filename to work with /uploads/
        userId: parseInt(userId),
        createdAt: new Date().toISOString(),
      };
      arr.push(record);
      await writeJsonArray(templatesJsonPath, arr);

      res.status(201).json(record);
    } catch (error) {
      console.error("Template upload error:", error);
      res.status(500).json({ message: "Failed to upload template" });
    }
  });

  // Logos
  app.get("/api/logos", async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string);
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const logos = await readJsonArray<any>(logosJsonPath);
      const filtered = logos.filter(
        (l) => l.userId === userId || l.userId == null
      );
      if (filtered.length === 0) {
        const fallback = await storage.getLogos(userId);
        return res.json(fallback);
      }
      res.json(filtered);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch logos" });
    }
  });

  app.get("/api/logos/active", async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string);
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const logos = await readJsonArray<any>(logosJsonPath);
      const active = logos.find((l) => l.userId === userId && l.isActive);
      res.json(active || null);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active logo" });
    }
  });

  app.post("/api/logos", upload.single("file"), async (req, res) => {
    try {
      const { name, userId } = req.body;

      if (!req.file) {
        return res.status(400).json({ message: "File is required" });
      }

      const logoName = name || req.file.originalname || "logo";
      const fileExtension = path.extname(
        req.file.originalname || req.file.filename
      );

      let fileNameOnly = req.file.filename;
      try {
        const publicAssetsPath = await copyToPublicAssets(
          req.file.path,
          logoName,
          fileExtension
        );
        fileNameOnly = publicAssetsPath.replace("/public/assets/", "");
      } catch (error) {
        console.error("Failed to copy logo to public/assets:", error);
      }

      // In-memory compatibility
      const logo = await storage.createLogo({
        name: logoName,
        userId: parseInt(userId),
        filePath: fileNameOnly,
        isActive: false,
      });

      // Persist JSON
      const arr = await readJsonArray<any>(logosJsonPath);
      const record = {
        id: logo?.id ?? nextId(arr),
        name: logoName,
        userId: parseInt(userId),
        filePath: fileNameOnly, // frontend supports public/assets check
        isActive: false,
        createdAt: new Date().toISOString(),
      };
      arr.push(record);
      await writeJsonArray(logosJsonPath, arr);

      res.status(201).json(record);
    } catch (error) {
      console.error("Logo upload error:", error);
      res.status(500).json({ message: "Failed to upload logo" });
    }
  });

  app.put("/api/logos/:id/activate", async (req, res) => {
    try {
      const logoId = parseInt(req.params.id);
      const { userId } = req.body;

      const logos = await readJsonArray<any>(logosJsonPath);
      let found = false;
      const updated = logos.map((l) => {
        if (l.userId === userId) {
          const isTarget = l.id === logoId;
          if (isTarget) found = true;
          return { ...l, isActive: isTarget };
        }
        return l;
      });
      if (!found) {
        return res.status(404).json({ message: "Logo not found" });
      }
      await writeJsonArray(logosJsonPath, updated);

      // keep in-memory in sync
      await storage.setActiveLogo(userId, logoId);

      res.json({ message: "Logo activated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to activate logo" });
    }
  });

  // Generate PDF (placeholder endpoint)
  app.post("/api/campaigns/:id/generate-pdf", async (req, res) => {
    try {
      // In a real implementation, you would use a library like puppeteer or jsPDF
      // to generate a PDF from the brochure design
      res.json({
        message: "PDF generation would be implemented here",
        downloadUrl: "/api/downloads/brochure.pdf",
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });

  // Statistics endpoint
  app.get("/api/statistics", async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string);
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const campaigns = await storage.getCampaigns(userId);
      const templates = await storage.getTemplates(userId);

      const stats = {
        totalCampaigns: campaigns.length,
        activeCampaigns: campaigns.filter((c) => c.status === "active").length,
        totalTemplates: templates.length,
        totalDownloads: 156, // Mock value for demo
      };

      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
