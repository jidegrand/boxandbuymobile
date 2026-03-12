import { Link } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { SellerMetricCard } from "../../components/seller/metric-card";
import { SellerStoreFilter } from "../../components/seller/store-filter";
import { Screen } from "../../components/ui/screen";
import { SectionCard } from "../../components/ui/section-card";
import { useSellerContext, useSellerDashboard } from "../../hooks/use-seller";
import { formatCurrency, formatDateTime, formatPercent } from "../../lib/format";
import { useAuthStore } from "../../store/auth.store";

export default function SellerScreen() {
  const hydrated = useAuthStore((state) => state.hydrated);
  const accessToken = useAuthStore((state) => state.accessToken);
  const [selectedStoreId, setSelectedStoreId] = useState<string | undefined>();
  const sellerContext = useSellerContext();
  const sellerDashboard = useSellerDashboard(
    { storeId: selectedStoreId },
    { enabled: sellerContext.isSuccess }
  );

  if (!hydrated) {
    return (
      <Screen title="Seller" subtitle="Preparing seller analytics access.">
        <SectionCard title="Seller dashboard">
          <Text className="text-sm text-muted">Loading seller session...</Text>
        </SectionCard>
      </Screen>
    );
  }

  if (!accessToken) {
    return (
      <Screen title="Seller" subtitle="Marketplace growth data is available after sign-in.">
        <SectionCard title="Authentication required">
          <Text className="text-sm leading-6 text-muted">
            Seller analytics use your authenticated BoxAndBuy customer session and marketplace seller scope.
          </Text>
          <Link href="/(auth)/login" className="rounded-xl bg-accent px-4 py-3 text-center text-white">
            Sign in
          </Link>
        </SectionCard>
      </Screen>
    );
  }

  return (
    <Screen title="Seller" subtitle="Growth Center metrics and marketplace health for your seller account.">
      <SectionCard title="Seller session">
        {sellerContext.isLoading ? <Text className="text-sm text-muted">Loading seller context...</Text> : null}
        {sellerContext.isError ? (
          <>
            <Text className="text-sm text-red-600">
              {sellerContext.error instanceof Error
                ? sellerContext.error.message
                : "Seller access is not available right now."}
            </Text>
            <Text className="text-sm leading-6 text-muted">
              Marketplace seller analytics are only available for approved seller owners or managers.
            </Text>
          </>
        ) : sellerContext.data ? (
          <>
            <Text className="text-base font-semibold text-ink">{sellerContext.data.seller.displayName}</Text>
            <Text className="text-sm text-muted">
              {sellerContext.data.seller.email ?? "No seller email available"} · {sellerContext.data.seller.role}
            </Text>
            <Text className="text-sm text-muted">
              {sellerContext.data.seller.stores.length} store
              {sellerContext.data.seller.stores.length === 1 ? "" : "s"} in scope
            </Text>
          </>
        ) : null}
      </SectionCard>

      {sellerContext.data ? (
        <SectionCard title="Stores">
          <SellerStoreFilter
            stores={sellerContext.data.seller.stores}
            selectedStoreId={selectedStoreId}
            onSelect={setSelectedStoreId}
          />
        </SectionCard>
      ) : null}

      {sellerContext.data ? (
        <SectionCard title="Operations">
          <Link href="/seller/profile" className="rounded-xl bg-ink px-4 py-3 text-center text-white">
            Manage seller profile
          </Link>
          <Link href="/seller/messages" className="rounded-xl border border-ink/10 px-4 py-3 text-center text-ink">
            Seller messages
          </Link>
          <Link href="/seller/payouts" className="rounded-xl border border-ink/10 px-4 py-3 text-center text-ink">
            Request payouts
          </Link>
          <Link href="/seller/activity" className="rounded-xl border border-ink/10 px-4 py-3 text-center text-ink">
            Action log
          </Link>
        </SectionCard>
      ) : null}

      {sellerContext.isSuccess ? (
        <>
          <SectionCard title="Overview">
            {sellerDashboard.isLoading ? <Text className="text-sm text-muted">Loading overview...</Text> : null}
            {sellerDashboard.isError ? (
              <Text className="text-sm text-red-600">
                {sellerDashboard.error instanceof Error
                  ? sellerDashboard.error.message
                  : "Unable to load seller dashboard right now."}
              </Text>
            ) : sellerDashboard.data ? (
              <>
                <Text className="text-sm text-muted">
                  Range: {sellerDashboard.data.filters.from} to {sellerDashboard.data.filters.to}
                </Text>
                <View className="flex-row flex-wrap gap-3">
                  <SellerMetricCard label="Revenue" value={formatCurrency(sellerDashboard.data.overview.revenue, "USD")} />
                  <SellerMetricCard label="Orders" value={String(sellerDashboard.data.overview.orders)} />
                  <SellerMetricCard
                    label="Conversion"
                    value={formatPercent(sellerDashboard.data.overview.conversionRate)}
                  />
                  <SellerMetricCard
                    label="Product Views"
                    value={String(sellerDashboard.data.overview.productViews)}
                  />
                  <SellerMetricCard
                    label="Add To Cart"
                    value={formatPercent(sellerDashboard.data.overview.addToCartRate)}
                  />
                </View>
              </>
            ) : null}
          </SectionCard>

          {sellerDashboard.data ? (
            <>
              <SectionCard title="Marketing Performance">
                <View className="flex-row flex-wrap gap-3">
                  <SellerMetricCard
                    label="Ad Spend"
                    value={formatCurrency(sellerDashboard.data.marketingPerformance.adSpend, "USD")}
                  />
                  <SellerMetricCard label="ROAS" value={String(sellerDashboard.data.marketingPerformance.roas)} />
                  <SellerMetricCard
                    label="CTR"
                    value={formatPercent(sellerDashboard.data.marketingPerformance.ctr)}
                  />
                  <SellerMetricCard
                    label="CAC"
                    value={formatCurrency(sellerDashboard.data.marketingPerformance.cac, "USD")}
                    hint={sellerDashboard.data.marketingPerformance.bestChannel}
                  />
                </View>
              </SectionCard>

              <SectionCard title="Creative Intelligence">
                <View className="flex-row flex-wrap gap-3">
                  <SellerMetricCard
                    label="Quality Score"
                    value={sellerDashboard.data.creativeIntelligence.averageQualityScore.toFixed(1)}
                  />
                  <SellerMetricCard
                    label="Avg CTR"
                    value={formatPercent(sellerDashboard.data.creativeIntelligence.averageCtr)}
                  />
                  <SellerMetricCard
                    label="Avg CVR"
                    value={formatPercent(sellerDashboard.data.creativeIntelligence.averageCvr)}
                  />
                  <SellerMetricCard
                    label="At Risk"
                    value={String(sellerDashboard.data.creativeIntelligence.atRiskAssets)}
                  />
                </View>
                {sellerDashboard.data.creativeIntelligence.topAssets.map((asset) => (
                  <View key={`${asset.name}-${asset.storeName}`} className="rounded-2xl border border-ink/10 px-4 py-4">
                    <Text className="font-semibold text-ink">{asset.name}</Text>
                    <Text className="text-sm text-muted">
                      {asset.channel} · {asset.assetType} · {asset.storeName}
                    </Text>
                    <Text className="text-sm text-muted">
                      Quality {asset.qualityScore.toFixed(1)} · CTR {formatPercent(asset.ctr)} · CVR {formatPercent(asset.cvr)}
                    </Text>
                  </View>
                ))}
              </SectionCard>

              <SectionCard title="Listing Health">
                <View className="flex-row flex-wrap gap-3">
                  <SellerMetricCard
                    label="Health Score"
                    value={sellerDashboard.data.listingHealth.averageHealthScore.toFixed(1)}
                  />
                  <SellerMetricCard
                    label="SEO Score"
                    value={sellerDashboard.data.listingHealth.averageSeoScore.toFixed(1)}
                  />
                  <SellerMetricCard
                    label="Buy Box"
                    value={formatPercent(sellerDashboard.data.listingHealth.averageBuyboxShare)}
                  />
                  <SellerMetricCard
                    label="At Risk"
                    value={String(sellerDashboard.data.listingHealth.atRiskCount)}
                  />
                </View>
                {sellerDashboard.data.listingHealth.issues.slice(0, 3).map((issue) => (
                  <View key={`${issue.productName}-${issue.storeName}`} className="rounded-2xl border border-ink/10 px-4 py-4">
                    <Text className="font-semibold text-ink">{issue.productName}</Text>
                    <Text className="text-sm text-muted">
                      {issue.storeName} · {issue.status}
                    </Text>
                    <Text className="text-sm text-muted">
                      Health {issue.healthScore.toFixed(1)} · Missing images {issue.missingImages} · Missing attributes {issue.missingAttributes}
                    </Text>
                  </View>
                ))}
              </SectionCard>

              <SectionCard title="Recommendations">
                {sellerDashboard.data.recommendations.length ? (
                  sellerDashboard.data.recommendations.map((recommendation) => (
                    <View
                      key={`${recommendation.title}-${recommendation.storeName}`}
                      className="rounded-2xl border border-ink/10 px-4 py-4"
                    >
                      <Text className="font-semibold text-ink">{recommendation.title}</Text>
                      <Text className="text-sm text-muted">
                        {recommendation.category} · {recommendation.priority} · {recommendation.storeName}
                      </Text>
                      <Text className="text-sm leading-6 text-muted">{recommendation.description}</Text>
                    </View>
                  ))
                ) : (
                  <Text className="text-sm text-muted">No open recommendations are available for the current scope.</Text>
                )}
              </SectionCard>

              <SectionCard title="Trend Snapshot">
                {sellerDashboard.data.trends.slice(-7).map((trend) => (
                  <View key={trend.date} className="flex-row items-center justify-between rounded-2xl border border-ink/10 px-4 py-4">
                    <View className="gap-1">
                      <Text className="font-semibold text-ink">{trend.date}</Text>
                      <Text className="text-sm text-muted">
                        Revenue {formatCurrency(trend.revenue, "USD")} · Spend {formatCurrency(trend.adSpend, "USD")}
                      </Text>
                    </View>
                    <Text className="text-sm font-medium text-ink">{trend.orders} orders</Text>
                  </View>
                ))}
              </SectionCard>

              <SectionCard title="Explore">
                <Link
                  href={{
                    pathname: "/seller/products",
                    params: selectedStoreId ? { storeId: selectedStoreId } : undefined
                  }}
                  className="rounded-xl bg-ink px-4 py-3 text-center text-white"
                >
                  Product analytics
                </Link>
                <Link
                  href={{
                    pathname: "/seller/campaigns",
                    params: selectedStoreId ? { storeId: selectedStoreId } : undefined
                  }}
                  className="rounded-xl border border-ink/10 px-4 py-3 text-center text-ink"
                >
                  Campaign performance
                </Link>
                <Link
                  href={{
                    pathname: "/seller/listings",
                    params: selectedStoreId ? { storeId: selectedStoreId } : undefined
                  }}
                  className="rounded-xl border border-ink/10 px-4 py-3 text-center text-ink"
                >
                  Listing health
                </Link>
                <Link
                  href={{
                    pathname: "/seller/affiliates",
                    params: selectedStoreId ? { storeId: selectedStoreId } : undefined
                  }}
                  className="rounded-xl border border-ink/10 px-4 py-3 text-center text-ink"
                >
                  Affiliate performance
                </Link>
              </SectionCard>
            </>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
