/**
 * Sales Analytics API
 * Mock API for seller sales statistics and product sold counts
 */

export interface SalesStats {
  totalOrders: number;
  totalItemsSold: number;
  totalRevenue: number;
  averageOrderValue: number;
  topProducts: {
    productId: number;
    productName: string;
    sold: number;
    revenue: number;
  }[];
}

export interface SellerSalesStats {
  sellerId: string;
  shopName: string;
  totalRevenue: number;
  totalOrdersSold: number;
  totalItemsSold: number;
  averageOrderValue: number;
  period: string; // "today" | "week" | "month" | "all"
  lastUpdated: string;
}

const NEW_MOCKAPI_BASE_URL = "https://69bce6272bc2a25b22acb171.mockapi.io/api/v1";

export const MOCKAPI_SALES_STATS_URL = `${NEW_MOCKAPI_BASE_URL}/sales-stats`;

/**
 * Fetch overall sales statistics
 */
export const fetchSalesStats = async (): Promise<SalesStats> => {
  try {
    const response = await fetch(MOCKAPI_SALES_STATS_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch sales stats: ${response.status}`);
    }
    const data = await response.json();
    return Array.isArray(data) ? data[0] || {} : data;
  } catch (error) {
    console.warn("Failed to fetch sales stats, using fallback:", error);
    // Return fallback data
    return {
      totalOrders: 0,
      totalItemsSold: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      topProducts: [],
    };
  }
};

/**
 * Fetch seller-specific sales statistics
 */
export const fetchSellerSalesStats = async (
  sellerId: string,
  period: "today" | "week" | "month" | "all" = "all"
): Promise<SellerSalesStats> => {
  try {
    const url = `${MOCKAPI_SALES_STATS_URL}/${sellerId}?period=${period}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch seller sales stats: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn("Failed to fetch seller sales stats, using fallback:", error);
    // Return fallback data
    return {
      sellerId,
      shopName: "Shop",
      totalRevenue: 0,
      totalOrdersSold: 0,
      totalItemsSold: 0,
      averageOrderValue: 0,
      period,
      lastUpdated: new Date().toISOString(),
    };
  }
};

/**
 * Get total items sold for a specific product
 */
export const getProductSoldCount = async (productId: number): Promise<number> => {
  try {
    const stats = await fetchSalesStats();
    const product = stats.topProducts.find((p) => p.productId === productId);
    return product?.sold || 0;
  } catch (error) {
    console.warn("Failed to get product sold count:", error);
    return 0;
  }
};

/**
 * Update sales statistics (for admin use)
 */
export const updateSalesStats = async (
  stats: Partial<SalesStats> & { id?: string }
): Promise<SalesStats> => {
  try {
    const id = stats.id || "1";
    const response = await fetch(`${MOCKAPI_SALES_STATS_URL}/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(stats),
    });

    if (!response.ok) {
      throw new Error(`Failed to update sales stats: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to update sales stats:", error);
    throw error;
  }
};

/**
 * Create new sales record (for order creation)
 */
export const createSalesRecord = async (
  orderId: string,
  totalAmount: number,
  itemCount: number,
  products: Array<{ productId: number; quantity: number; revenue: number }>
): Promise<void> => {
  try {
    await fetch(`${NEW_MOCKAPI_BASE_URL}/sales-records`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        orderId,
        totalAmount,
        itemCount,
        products,
        date: new Date().toISOString(),
      }),
    });
  } catch (error) {
    console.warn("Failed to create sales record:", error);
  }
};
