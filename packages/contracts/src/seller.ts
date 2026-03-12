import { z } from "zod";

export const sellerRoleSchema = z.enum(["owner", "manager", "analyst"]);

export const sellerStoreSchema = z.object({
  id: z.string(),
  externalStoreId: z.string().optional(),
  name: z.string(),
  currencyCode: z.string().optional(),
  locale: z.string().optional(),
  region: z.string().optional()
});

export const sellerIdentitySchema = z.object({
  sellerId: z.string(),
  userSub: z.string(),
  role: sellerRoleSchema,
  displayName: z.string(),
  email: z.email().optional(),
  stores: z.array(sellerStoreSchema)
});

export const sellerOverviewSchema = z.object({
  revenue: z.number(),
  orders: z.number().int().nonnegative(),
  conversionRate: z.number(),
  productViews: z.number().int().nonnegative(),
  addToCartRate: z.number()
});

export const sellerMarketingPerformanceSchema = z.object({
  adSpend: z.number(),
  roas: z.number(),
  ctr: z.number(),
  cac: z.number(),
  bestChannel: z.string()
});

export const sellerCreativeAssetSchema = z.object({
  name: z.string(),
  channel: z.string(),
  assetType: z.string(),
  qualityScore: z.number(),
  ctr: z.number(),
  cvr: z.number(),
  spend: z.number(),
  storeName: z.string()
});

export const sellerCreativeIntelligenceSchema = z.object({
  averageQualityScore: z.number(),
  averageCtr: z.number(),
  averageCvr: z.number(),
  atRiskAssets: z.number().int().nonnegative(),
  topAssets: z.array(sellerCreativeAssetSchema)
});

export const sellerListingIssueSchema = z.object({
  productName: z.string(),
  status: z.string(),
  healthScore: z.number(),
  seoScore: z.number(),
  missingImages: z.number().int().nonnegative(),
  missingAttributes: z.number().int().nonnegative(),
  buyboxShare: z.number(),
  storeName: z.string()
});

export const sellerListingHealthSchema = z.object({
  averageHealthScore: z.number(),
  averageSeoScore: z.number(),
  averageBuyboxShare: z.number(),
  atRiskCount: z.number().int().nonnegative(),
  issues: z.array(sellerListingIssueSchema)
});

export const sellerRecommendationSchema = z.object({
  category: z.string(),
  title: z.string(),
  description: z.string(),
  impactScore: z.number(),
  priority: z.string(),
  status: z.string(),
  storeName: z.string()
});

export const sellerProductSchema = z.object({
  sku: z.string(),
  name: z.string(),
  category: z.string().optional(),
  price: z.number(),
  productViews: z.number().int().nonnegative(),
  addToCartRate: z.number(),
  conversionRate: z.number(),
  inventory: z.number().int(),
  status: z.string(),
  storeName: z.string()
});

export const sellerCampaignSchema = z.object({
  name: z.string(),
  channel: z.string(),
  spend: z.number(),
  revenue: z.number(),
  roas: z.number(),
  clicks: z.number().int().nonnegative(),
  impressions: z.number().int().nonnegative(),
  acquisitions: z.number().int().nonnegative(),
  status: z.string(),
  reportDate: z.string(),
  storeName: z.string()
});

export const sellerAffiliateSchema = z.object({
  name: z.string(),
  status: z.string(),
  conversions: z.number().int().nonnegative(),
  revenue: z.number(),
  commission: z.number(),
  updatedAt: z.string(),
  storeName: z.string()
});

export const sellerTrendSchema = z.object({
  date: z.string(),
  revenue: z.number(),
  orders: z.number().int().nonnegative(),
  adSpend: z.number()
});

export const sellerFilterQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  storeId: z.string().trim().min(1).optional()
});

export const sellerResolvedFilterSchema = z.object({
  from: z.string(),
  to: z.string(),
  selectedStoreId: z.string().optional()
});

export const sellerContextResponseSchema = z.object({
  seller: sellerIdentitySchema
});

export const sellerDashboardResponseSchema = z.object({
  seller: sellerIdentitySchema,
  filters: sellerResolvedFilterSchema,
  overview: sellerOverviewSchema,
  marketingPerformance: sellerMarketingPerformanceSchema,
  creativeIntelligence: sellerCreativeIntelligenceSchema,
  listingHealth: sellerListingHealthSchema,
  recommendations: z.array(sellerRecommendationSchema),
  trends: z.array(sellerTrendSchema)
});

export const sellerProductsResponseSchema = z.object({
  items: z.array(sellerProductSchema)
});

export const sellerCampaignsResponseSchema = z.object({
  items: z.array(sellerCampaignSchema)
});

export const sellerListingsResponseSchema = z.object({
  items: z.array(sellerListingIssueSchema)
});

export const sellerAffiliatesResponseSchema = z.object({
  items: z.array(sellerAffiliateSchema)
});

export const sellerTrendsResponseSchema = z.object({
  items: z.array(sellerTrendSchema)
});

export type SellerRole = z.infer<typeof sellerRoleSchema>;
export type SellerStore = z.infer<typeof sellerStoreSchema>;
export type SellerIdentity = z.infer<typeof sellerIdentitySchema>;
export type SellerOverview = z.infer<typeof sellerOverviewSchema>;
export type SellerMarketingPerformance = z.infer<typeof sellerMarketingPerformanceSchema>;
export type SellerCreativeAsset = z.infer<typeof sellerCreativeAssetSchema>;
export type SellerCreativeIntelligence = z.infer<typeof sellerCreativeIntelligenceSchema>;
export type SellerListingIssue = z.infer<typeof sellerListingIssueSchema>;
export type SellerListingHealth = z.infer<typeof sellerListingHealthSchema>;
export type SellerRecommendation = z.infer<typeof sellerRecommendationSchema>;
export type SellerProduct = z.infer<typeof sellerProductSchema>;
export type SellerCampaign = z.infer<typeof sellerCampaignSchema>;
export type SellerAffiliate = z.infer<typeof sellerAffiliateSchema>;
export type SellerTrend = z.infer<typeof sellerTrendSchema>;
export type SellerFilterQuery = z.infer<typeof sellerFilterQuerySchema>;
export type SellerResolvedFilter = z.infer<typeof sellerResolvedFilterSchema>;
export type SellerContextResponse = z.infer<typeof sellerContextResponseSchema>;
export type SellerDashboardResponse = z.infer<typeof sellerDashboardResponseSchema>;
export type SellerProductsResponse = z.infer<typeof sellerProductsResponseSchema>;
export type SellerCampaignsResponse = z.infer<typeof sellerCampaignsResponseSchema>;
export type SellerListingsResponse = z.infer<typeof sellerListingsResponseSchema>;
export type SellerAffiliatesResponse = z.infer<typeof sellerAffiliatesResponseSchema>;
export type SellerTrendsResponse = z.infer<typeof sellerTrendsResponseSchema>;
