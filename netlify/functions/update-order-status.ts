/**
 * Netlify Serverless Function: Update Order Status
 * Admin function to update order status and sync to users
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

interface UpdateOrderStatusRequest {
  orderId: string;
  status: "Chờ xử lý" | "Đã xác nhận" | "Đang giao" | "Đã giao" | "Đã hủy";
  paymentStatus?: "Chưa thanh toán" | "Đã thanh toán";
  trackingNumber?: string;
  adminId?: string;
  adminName?: string;
  note?: string;
}

interface UpdateOrderStatusResponse {
  success: boolean;
  message: string;
  orderId?: string;
  newStatus?: string;
  error?: string;
}

const MOCKAPI_BASE_URL =
  process.env.VITE_MOCKAPI_BASE_URL ||
  "https://69bcac962bc2a25b22ac140b.mockapi.io/api/v1";

/**
 * Update order status in MockAPI
 */
async function updateOrderInMockAPI(
  orderId: string,
  updates: Record<string, any>
): Promise<boolean> {
  try {
    const response = await fetch(`${MOCKAPI_BASE_URL}/orders/${orderId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...updates,
        updatedAt: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      console.error(`Failed to update order in MockAPI: ${response.status}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error updating order in MockAPI:", error);
    return false;
  }
}

/**
 * Also update user orders endpoint if it exists
 */
async function updateUserOrderInMockAPI(
  orderId: string,
  updates: Record<string, any>
): Promise<boolean> {
  try {
    const response = await fetch(`${MOCKAPI_BASE_URL}/user-orders/${orderId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...updates,
        updatedAt: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      console.warn(`User order not found in user-orders: ${response.status}`);
      return false;
    }

    return true;
  } catch (error) {
    console.warn("Error updating user order in user-orders:", error);
    // This is not critical, so we don't throw
    return false;
  }
}

/**
 * Create audit log for order status changes
 */
async function createAuditLog(
  orderId: string,
  oldStatus: string,
  newStatus: string,
  adminId?: string,
  adminName?: string,
  note?: string
): Promise<void> {
  try {
    await fetch(`${MOCKAPI_BASE_URL}/audit-logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        orderId,
        action: "UPDATE_ORDER_STATUS",
        oldStatus,
        newStatus,
        adminId: adminId || "system",
        adminName: adminName || "System",
        note,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (error) {
    console.warn("Failed to create audit log:", error);
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
        "Access-Control-Allow-Methods": "POST, PUT, OPTIONS",
      },
      body: "",
    };
  }

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  if (event.httpMethod !== "PUT" && event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: "Method not allowed. Use PUT or POST.",
      } as UpdateOrderStatusResponse),
    };
  }

  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: "Request body is required",
        } as UpdateOrderStatusResponse),
      };
    }

    const request: UpdateOrderStatusRequest = JSON.parse(event.body);

    // Validate required fields
    if (!request.orderId || !request.status) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: "Missing required fields: orderId, status",
        } as UpdateOrderStatusResponse),
      };
    }

    // Validate status value
    const validStatuses = [
      "Chờ xử lý",
      "Đã xác nhận",
      "Đang giao",
      "Đã giao",
      "Đã hủy",
    ];
    if (!validStatuses.includes(request.status)) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: `Invalid status. Allowed: ${validStatuses.join(", ")}`,
        } as UpdateOrderStatusResponse),
      };
    }

    // Prepare update data
    const updateData: Record<string, any> = {
      status: request.status,
    };

    if (request.paymentStatus) {
      updateData.paymentStatus = request.paymentStatus;
    }

    if (request.trackingNumber) {
      updateData.trackingNumber = request.trackingNumber;
    }

    if (request.note) {
      updateData.note = request.note;
    }

    // Update order in MockAPI
    const updateSuccess = await updateOrderInMockAPI(request.orderId, updateData);

    // Try to update user orders as well
    const userUpdateSuccess = await updateUserOrderInMockAPI(
      request.orderId,
      updateData
    );

    // Create audit log
    await createAuditLog(
      request.orderId,
      "previous_status",
      request.status,
      request.adminId,
      request.adminName,
      request.note
    );

    if (!updateSuccess) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: "Failed to update order status in database",
          orderId: request.orderId,
        } as UpdateOrderStatusResponse),
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: `Order #${request.orderId} status updated to "${request.status}"`,
        orderId: request.orderId,
        newStatus: request.status,
      } as UpdateOrderStatusResponse),
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    console.error("Error in update-order-status:", errorMessage);

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: `Internal server error: ${errorMessage}`,
      } as UpdateOrderStatusResponse),
    };
  }
};
