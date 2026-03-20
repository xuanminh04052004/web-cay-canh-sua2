/**
 * Order Service
 * Helper functions for managing orders across the application
 */

import {
  updateOrderStatusInApi,
  updateOrderInApi,
  OrderApiItem,
} from "@/data/orders";
import {
  UserOrder,
} from "@/data/user-orders";
import {
  fetchSalesStats,
  updateSalesStats,
  createSalesRecord,
} from "@/data/sales-analytics";

const NETLIFY_BASE_URL = "/.netlify/functions";

/**
 * Update order status via Netlify function
 * This will sync the change to both orders endpoint and user-orders endpoint
 */
export async function updateOrderStatusViaNetlify(
  orderId: string,
  status: "Chờ xử lý" | "Đã xác nhận" | "Đang giao" | "Đã giao" | "Đã hủy",
  options?: {
    paymentStatus?: "Chưa thanh toán" | "Đã thanh toán";
    trackingNumber?: string;
    adminId?: string;
    adminName?: string;
    note?: string;
  }
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const response = await fetch(`${NETLIFY_BASE_URL}/update-order-status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        orderId,
        status,
        ...options,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.error || "Failed to update order status",
      };
    }

    const result = await response.json();
    return {
      success: true,
      message: result.message,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to update order status:", message);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Update order status with local fallback
 * If Netlify function fails, falls back to direct MockAPI calls
 */
export async function updateOrderStatusWithFallback(
  orderId: string,
  status: "Chờ xử lý" | "Đã xác nhận" | "Đang giao" | "Đã giao" | "Đã hủy",
  options?: {
    paymentStatus?: "Chưa thanh toán" | "Đã thanh toán";
    trackingNumber?: string;
  }
): Promise<boolean> {
  try {
    // Try Netlify function first
    const result = await updateOrderStatusViaNetlify(orderId, status, options);
    if (result.success) {
      return true;
    }

    console.warn("Netlify function failed, falling back to direct API calls");

    // Fallback to direct API calls
    const updateData: any = { status };
    if (options?.paymentStatus) {
      updateData.paymentStatus = options.paymentStatus;
    }
    if (options?.trackingNumber) {
      updateData.trackingNumber = options.trackingNumber;
    }

    // Update in orders endpoint
    try {
      await updateOrderStatusInApi(orderId, status);
    } catch (error) {
      console.warn("Failed to update orders endpoint:", error);
    }

    // Orders and User-Orders are now the same endpoint, so one update is enough.

    return true;
  } catch (error) {
    console.error("Failed to update order status:", error);
    return false;
  }
}

/**
 * Get seller sales statistics
 */
export async function getSellerSalesStats(
  sellerId?: string,
  period: "today" | "week" | "month" | "all" = "all"
): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const url = new URL(`${NETLIFY_BASE_URL}/seller-sales-stats`, window.location.origin);
    url.searchParams.append("period", period);
    if (sellerId) {
      url.searchParams.append("sellerId", sellerId);
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch sales stats: ${response.status}`,
      };
    }

    const result = await response.json();
    return {
      success: result.success,
      data: result.data,
      error: result.error,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to get seller sales stats:", message);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Sync order status between admin and user
 * Should be called after admin updates order status
 */
export async function syncOrderStatusToUser(
  orderId: string,
  status: "Chờ xử lý" | "Đã xác nhận" | "Đang giao" | "Đã giao" | "Đã hủy"
): Promise<void> {
  try {
    // Already synced because Admin and User share the same MockAPI table now.
    // await updateUserOrderStatus(orderId, status);
  } catch (error) {
    console.warn("Failed to sync order status to user:", error);
    // Don't throw, just log warning
  }
}

/**
 * Create sales record when order is placed
 */
export async function recordOrderSale(
  orderId: string,
  total: number,
  items: Array<{
    plantId: number;
    quantity: number;
    price: number;
  }>
): Promise<void> {
  try {
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const products = items.map((item) => ({
      productId: item.plantId,
      quantity: item.quantity,
      revenue: item.price * item.quantity,
    }));

    await createSalesRecord(orderId, total, itemCount, products);

    // Update aggregate stats immediately since MockAPI doesn't have backend logic
    try {
      const currentStats = await fetchSalesStats();
      const newStats = {
        ...currentStats,
        id: "1", // Ensure we update the first/main stats record
        totalOrders: (currentStats.totalOrders || 0) + 1,
        totalRevenue: (currentStats.totalRevenue || 0) + total,
        totalItemsSold: (currentStats.totalItemsSold || 0) + itemCount,
      };
      
      // Update basic product top lists (simplistic, just pushes or increments)
      for (const p of products) {
        const existing = newStats.topProducts?.find(x => x.productId === p.productId);
        if (existing) {
          existing.sold += p.quantity;
          existing.revenue += p.revenue;
        } else {
          if (!newStats.topProducts) newStats.topProducts = [];
          newStats.topProducts.push({
            productId: p.productId,
            productName: `Sản phẩm ${p.productId}`, // We don't have the full name here unless passed in
            sold: p.quantity,
            revenue: p.revenue
          });
        }
      }
      
      await updateSalesStats(newStats);
    } catch (statsUpdateError) {
      console.warn("Failed to update aggregate sales stats:", statsUpdateError);
    }

  } catch (error) {
    console.warn("Failed to record order sale:", error);
  }
}

/**
 * Map Vietnamese status to English status (for UserContext compatibility)
 */
export function mapStatusToUserFormat(
  vietnameseStatus: string
): "pending" | "confirmed" | "shipping" | "delivered" | "cancelled" {
  const statusMap: Record<
    string,
    "pending" | "confirmed" | "shipping" | "delivered" | "cancelled"
  > = {
    "Chờ xử lý": "pending",
    "Đã xác nhận": "confirmed",
    "Đang giao": "shipping",
    "Đã giao": "delivered",
    "Đã hủy": "cancelled",
  };

  return statusMap[vietnameseStatus] || "pending";
}

/**
 * Map English status to Vietnamese status
 */
export function mapStatusToVietnamese(
  englishStatus: string
): "Chờ xử lý" | "Đã xác nhận" | "Đang giao" | "Đã giao" | "Đã hủy" {
  const statusMap: Record<
    string,
    "Chờ xử lý" | "Đã xác nhận" | "Đang giao" | "Đã giao" | "Đã hủy"
  > = {
    pending: "Chờ xử lý",
    confirmed: "Đã xác nhận",
    shipping: "Đang giao",
    delivered: "Đã giao",
    cancelled: "Đã hủy",
  };

  return statusMap[englishStatus] || "Chờ xử lý";
}
