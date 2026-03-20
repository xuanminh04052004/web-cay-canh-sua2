/**
 * Netlify Serverless Function: Seller Sales Statistics
 * Get sales stats for a specific seller or overall platform sales
 */

// Type definitions for Netlify Functions
type Handler = (event: HandlerEvent, context: HandlerContext) => Promise<{ statusCode: number; body: string; headers?: Record<string, string> }>;

interface HandlerEvent {
  httpMethod: string;
  queryStringParameters?: Record<string, string>;
  body?: string;
}

interface HandlerContext {
  functionVersion: string;
}

interface SalesStatsResponse {
  success: boolean;
  data?: {
    sellerId?: string;
    totalRevenue: number;
    totalOrdersSold: number;
    totalItemsSold: number;
    averageOrderValue: number;
    period: string;
    topProducts: Array<{
      id: number;
      name: string;
      sold: number;
      revenue: number;
    }>;
    lastUpdated: string;
  };
  error?: string;
}

const MOCKAPI_BASE_URL =
  process.env.VITE_MOCKAPI_BASE_URL ||
  "https://69bcac962bc2a25b22ac140b.mockapi.io/api/v1";

/**
 * Calculate sales stats from orders
 */
async function calculateSalesStats(
  period: string = "all"
): Promise<SalesStatsResponse["data"]> {
  try {
    const ordersResponse = await fetch(`${MOCKAPI_BASE_URL}/orders`);
    if (!ordersResponse.ok) {
      throw new Error("Failed to fetch orders");
    }

    const orders = await ordersResponse.json();

    // Filter by period
    let filteredOrders = orders;
    if (period !== "all") {
      const now = new Date();
      const periodMs = {
        today: 1000 * 60 * 60 * 24,
        week: 1000 * 60 * 60 * 24 * 7,
        month: 1000 * 60 * 60 * 24 * 30,
      }[period] || 0;

      const cutoffDate = new Date(now.getTime() - periodMs);
      filteredOrders = orders.filter((order: any) => {
        const orderDate = new Date(order.date);
        return orderDate >= cutoffDate;
      });
    }

    // Calculate stats
    let totalRevenue = 0;
    let totalOrdersSold = 0;
    let totalItemsSold = 0;
    const productStats: Map<number, { name: string; sold: number; revenue: number }> =
      new Map();

    filteredOrders.forEach((order: any) => {
      // Only count completed/delivered orders
      if (["Đã giao", "Đang giao"].includes(order.status)) {
        totalRevenue += order.total || 0;
        totalOrdersSold += 1;

        order.items?.forEach((item: any) => {
          const quantity = item.quantity || 0;
          totalItemsSold += quantity;

          const productId = item.plantId || item.productId;
          if (productId) {
            if (!productStats.has(productId)) {
              productStats.set(productId, {
                name: item.plantName || item.productName || "Unknown",
                sold: 0,
                revenue: 0,
              });
            }

            const stats = productStats.get(productId)!;
            stats.sold += quantity;
            stats.revenue += (item.price || 0) * quantity;
          }
        });
      }
    });

    // Convert to array and sort by sold count
    const topProducts = Array.from(productStats.entries())
      .map(([id, stats]) => ({
        id,
        ...stats,
      }))
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 10);

    const averageOrderValue = totalOrdersSold > 0 ? totalRevenue / totalOrdersSold : 0;

    return {
      totalRevenue,
      totalOrdersSold,
      totalItemsSold,
      averageOrderValue,
      period,
      topProducts,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error calculating sales stats:", error);
    throw error;
  }
}

/**
 * Calculate seller-specific sales stats
 */
async function calculateSellerStats(
  sellerId: string,
  period: string = "all"
): Promise<SalesStatsResponse["data"] | null> {
  try {
    const ordersResponse = await fetch(`${MOCKAPI_BASE_URL}/orders`);
    if (!ordersResponse.ok) {
      throw new Error("Failed to fetch orders");
    }

    const orders = await ordersResponse.json();

    // For now, we'll calculate based on all orders
    // In a real system, orders would have sellerId field
    const stats = await calculateSalesStats(period);

    if (!stats) {
      return null;
    }

    return {
      sellerId,
      ...stats,
    };
  } catch (error) {
    console.error("Error calculating seller stats:", error);
    throw error;
  }
}

export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
): Promise<{ statusCode: number; body: string; headers?: Record<string, string> }> => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      },
      body: "",
    };
  }

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: "Method not allowed. Use GET.",
      } as SalesStatsResponse),
    };
  }

  try {
    // Parse query parameters
    const queryParams = event.queryStringParameters || {};
    const sellerId = queryParams.sellerId as string | undefined;
    const period = (queryParams.period as string) || "all";

    // Validate period
    const validPeriods = ["today", "week", "month", "all"];
    if (!validPeriods.includes(period)) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: `Invalid period. Allowed: ${validPeriods.join(", ")}`,
        } as SalesStatsResponse),
      };
    }

    let data: SalesStatsResponse["data"] | null;
    if (sellerId) {
      data = await calculateSellerStats(sellerId, period);
    } else {
      data = await calculateSalesStats(period);
    }

    if (!data) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: "Failed to calculate sales stats",
        } as SalesStatsResponse),
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        data,
      } as SalesStatsResponse),
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    console.error("Error in seller-sales-stats:", errorMessage);

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: `Internal server error: ${errorMessage}`,
      } as SalesStatsResponse),
    };
  }
};
