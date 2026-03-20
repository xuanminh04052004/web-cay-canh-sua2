/**
 * User Orders API
 * Mock API for user-specific orders and order history
 */

export interface UserOrderItem {
  productId: number;
  productName: string;
  quantity: number;
  price: number;
  image?: string;
}

export interface UserOrder {
  id: string;
  userId: string; // User ID from AuthContext
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: UserOrderItem[];
  total: number;
  status: "Chờ xử lý" | "Đã xác nhận" | "Đang giao" | "Đã giao" | "Đã hủy";
  paymentMethod: "Chuyển khoản" | "COD";
  paymentStatus: "Chưa thanh toán" | "Đã thanh toán";
  note?: string;
  cancelReason?: string;
  transferProof?: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

const NEW_MOCKAPI_BASE_URL = "https://69bce6272bc2a25b22acb171.mockapi.io/api/v1";

export const MOCKAPI_USER_ORDERS_URL = `${NEW_MOCKAPI_BASE_URL}/user-orders`;

/**
 * Fetch all orders for a specific user
 */
export const fetchUserOrders = async (userId: string): Promise<UserOrder[]> => {
  try {
    const response = await fetch(`${MOCKAPI_USER_ORDERS_URL}?userId=${userId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch user orders: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn("Failed to fetch user orders from API, using local storage:", error);
    // Fallback to local storage
    const localOrders = localStorage.getItem(`user_orders_${userId}`);
    return localOrders ? JSON.parse(localOrders) : [];
  }
};

/**
 * Fetch a single order by ID
 */
export const fetchUserOrderById = async (orderId: string): Promise<UserOrder | null> => {
  try {
    const response = await fetch(`${MOCKAPI_USER_ORDERS_URL}/${orderId}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to fetch order: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn("Failed to fetch user order by ID:", error);
    return null;
  }
};

/**
 * Create a new order for user
 */
export const createUserOrder = async (
  order: Omit<UserOrder, "id" | "createdAt" | "updatedAt">
): Promise<UserOrder> => {
  try {
    const response = await fetch(MOCKAPI_USER_ORDERS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...order,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create user order: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to create user order:", error);
    throw error;
  }
};

/**
 * Update user order status
 */
export const updateUserOrderStatus = async (
  orderId: string,
  status: UserOrder["status"],
  updatedAt: string = new Date().toISOString()
): Promise<UserOrder> => {
  try {
    const response = await fetch(`${MOCKAPI_USER_ORDERS_URL}/${orderId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status, updatedAt }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update user order status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to update user order status:", error);
    throw error;
  }
};

/**
 * Update full user order details
 */
export const updateUserOrder = async (
  orderId: string,
  data: Partial<Omit<UserOrder, "id" | "createdAt">>
): Promise<UserOrder> => {
  try {
    const response = await fetch(`${MOCKAPI_USER_ORDERS_URL}/${orderId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...data,
        updatedAt: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update user order: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to update user order:", error);
    throw error;
  }
};

/**
 * Cancel a user order
 */
export const cancelUserOrder = async (
  orderId: string,
  cancelReason: string
): Promise<UserOrder> => {
  try {
    const response = await fetch(`${MOCKAPI_USER_ORDERS_URL}/${orderId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "Đã hủy",
        cancelReason,
        updatedAt: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to cancel user order: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to cancel user order:", error);
    throw error;
  }
};

/**
 * Fetch user orders by status
 */
export const fetchUserOrdersByStatus = async (
  userId: string,
  status: UserOrder["status"]
): Promise<UserOrder[]> => {
  try {
    const response = await fetch(
      `${MOCKAPI_USER_ORDERS_URL}?userId=${userId}&status=${encodeURIComponent(status)}`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch orders by status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn("Failed to fetch user orders by status:", error);
    return [];
  }
};

/**
 * Delete a user order completely
 */
export const deleteUserOrder = async (orderId: string): Promise<void> => {
  try {
    const response = await fetch(`${MOCKAPI_USER_ORDERS_URL}/${orderId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error(`Failed to delete user order: ${response.status}`);
    }
  } catch (error) {
    console.error("Failed to delete user order:", error);
    throw error;
  }
};
