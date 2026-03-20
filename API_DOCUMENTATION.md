# Mockup API Documentation

## Tổng quan

Dự án đã được cập nhật với các mockup API mới cho quản lý đơn hàng, thống kê bán hàng, và đồng bộ trạng thái giữa admin và user.

## Các API mới

### 1. User Orders API (`src/data/user-orders.ts`)

API này quản lý đơn hàng của user với các endpoint:

#### Endpoints
- **GET** `/user-orders?userId={userId}` - Lấy tất cả đơn hàng của user
- **GET** `/user-orders/{orderId}` - Lấy chi tiết một đơn hàng
- **POST** `/user-orders` - Tạo đơn hàng mới
- **PUT** `/user-orders/{orderId}` - Cập nhật đơn hàng

#### Hàm sử dụng

```typescript
import {
  fetchUserOrders,           // Lấy đơn hàng của user
  fetchUserOrderById,        // Lấy một đơn hàng theo ID
  createUserOrder,           // Tạo đơn hàng mới
  updateUserOrderStatus,     // Cập nhật trạng thái
  updateUserOrder,           // Cập nhật toàn bộ đơn hàng
  cancelUserOrder,           // Hủy đơn hàng
  fetchUserOrdersByStatus,   // Lấy đơn hàng theo trạng thái
} from '@/data/user-orders';

// Ví dụ: Lấy đơn hàng của user
const orders = await fetchUserOrders(userId);

// Ví dụ: Cập nhật trạng thái đơn hàng
await updateUserOrderStatus(orderId, "Đã giao");

// Ví dụ: Hủy đơn hàng
await cancelUserOrder(orderId, "Lý do hủy");
```

### 2. Sales Analytics API (`src/data/sales-analytics.ts`)

API này cung cấp thống kê bán hàng cho sellers và admin:

#### Hàm sử dụng

```typescript
import {
  fetchSalesStats,          // Lấy thống kê bán hàng chung
  fetchSellerSalesStats,    // Lấy thống kê của seller cụ thể
  getProductSoldCount,      // Lấy số lượng đã bán của sản phẩm
  updateSalesStats,         // Cập nhật thống kê bán hàng
  createSalesRecord,        // Tạo bản ghi bán hàng mới
} from '@/data/sales-analytics';

// Ví dụ: Lấy thống kê của seller
const stats = await fetchSellerSalesStats(sellerId, "month");
console.log(stats.totalRevenue);      // Doanh thu tổng cộng
console.log(stats.totalOrdersSold);   // Số đơn hàng đã bán
console.log(stats.totalItemsSold);    // Số mặt hàng đã bán

// Ví dụ: Lấy số lượng bán của sản phẩm
const soldCount = await getProductSoldCount(productId);
```

### 3. Netlify Functions

#### A. Update Order Status Function (`netlify/functions/update-order-status.ts`)

Hàm này cập nhật trạng thái đơn hàng và đồng bộ giữa user và admin:

**URL**: `/.netlify/functions/update-order-status`

**Method**: PUT

**Request Body**:
```typescript
{
  orderId: string;
  status: "Chờ xử lý" | "Đã xác nhận" | "Đang giao" | "Đã giao" | "Đã hủy";
  paymentStatus?: "Chưa thanh toán" | "Đã thanh toán";
  trackingNumber?: string;
  adminId?: string;
  adminName?: string;
  note?: string;
}
```

**Response**:
```typescript
{
  success: boolean;
  message?: string;
  orderId?: string;
  newStatus?: string;
  error?: string;
}
```

#### B. Seller Sales Stats Function (`netlify/functions/seller-sales-stats.ts`)

Hàm này tính toán thống kê bán hàng từ dữ liệu đơn hàng:

**URL**: `/.netlify/functions/seller-sales-stats?period=month&sellerId=seller123`

**Method**: GET

**Query Parameters**:
- `period` (optional): "today" | "week" | "month" | "all" (mặc định: "all")
- `sellerId` (optional): ID của seller để lấy thống kê riêng

**Response**:
```typescript
{
  success: boolean;
  data?: {
    sellerId?: string;
    totalRevenue: number;
    totalOrdersSold: number;
    totalItemsSold: number;
    averageOrderValue: number;
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
```

### 4. Order Service (`src/lib/order-service.ts`)

Service này cung cấp các hàm helper để quản lý đơn hàng:

```typescript
import {
  updateOrderStatusViaNetlify,      // Cập nhật qua Netlify function
  updateOrderStatusWithFallback,    // Cập nhật với fallback
  getSellerSalesStats,              // Lấy thống kê seller
  syncOrderStatusToUser,            // Đồng bộ trạng thái đến user
  recordOrderSale,                  // Ghi nhân bán hàng
  mapStatusToUserFormat,            // Chuyển đổi trạng thái VN -> EN
  mapStatusToVietnamese,            // Chuyển đổi trạng thái EN -> VN
} from '@/lib/order-service';

// Ví dụ: Cập nhật trạng thái đơn hàng (với Netlify function)
const result = await updateOrderStatusViaNetlify(orderId, "Đang giao", {
  trackingNumber: "VN123456",
  adminId: "admin1",
  adminName: "Admin Name",
});

// Ví dụ: Lấy thống kê seller
const stats = await getSellerSalesStats(sellerId, "month");

// Ví dụ: Ghi nhân bán hàng
await recordOrderSale(orderId, totalAmount, items);
```

## Luồng Đồng bộ Dữ liệu

### Tạo Đơn hàng

1. **User** tạo đơn hàng trong `Checkout`
2. **UserContext** lưu đơn hàng vào state local
3. `addOrder()` gọi `createUserOrder()` để lưu vào MockAPI
4. **AdminContext** có thể thấy đơn hàng mới quanh đó

```
Checkout → UserContext.addOrder() → createUserOrder() + recordOrderSale()
             ↓
          LocalStorage
             ↓
          Admin thấy đơn hàng mới
```

### Cập nhật Trạng thái

1. **Admin** cập nhật trạng thái đơn hàng trong **AdminDashboard**
2. `updateOrderStatus()` gọi `updateOrderStatusWithFallback()`
3. Netlify function được gọi để update trong MockAPI
4. `syncOrderStatusToUser()` được gọi để đồng bộ đến user
5. **UserContext** cập nhật qua sync mechanism

```
Admin Dashboard → AdminContext.updateOrderStatus()
   ↓
updateOrderStatusWithFallback()
   ↓ (thử Netlify function trước)
/.netlify/functions/update-order-status
   ↓
MockAPI update (/orders + /user-orders)
   ↓
UserContext sync (via window.addEventListener + polling)
   ↓
User nhìn thấy cập nhật
```

### Hủy Đơn hàng

1. **User** hủy đơn hàng
2. `cancelOrder()` gọi `cancelUserOrder()`
3. Đơn hàng được mark "Đã hủy" trong MockAPI
4. Admin sync thông qua localStorage events
5. Thống kê bán hàng được cập nhật

```
User cancels → UserContext.cancelOrder()
   ↓
cancelUserOrder() (MockAPI)
   ↓
AdminContext sync (localStorage)
   ↓
Sales stats updated
```

## Status Mapping

### Vietnamese (DB) → English (UserContext)
```
Chờ xử lý → pending
Đã xác nhận → confirmed
Đang giao → shipping
Đã giao → delivered
Đã hủy → cancelled
```

### English → Vietnamese
```
pending → Chờ xử lý
confirmed → Đã xác nhận
shipping → Đang giao
delivered → Đã giao
cancelled → Đã hủy
```

## Cấu trúc Dữ liệu

### UserOrder

```typescript
interface UserOrder {
  id: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: {
    productId: number;
    productName: string;
    quantity: number;
    price: number;
    image?: string;
  }[];
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
```

### SalesStats

```typescript
interface SalesStats {
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
```

## Cách Tích hợp vào Components

### Trong Checkout Page

```typescript
import { useUser } from '@/contexts/UserContext';

function CheckoutPage() {
  const { addOrder } = useUser();

  const handleCheckout = (orderData) => {
    addOrder({
      status: 'pending',
      items: [...],
      total: 0,
      shippingAddress: {...},
      paymentMethod: 'COD',
      paymentStatus: 'Chưa thanh toán',
      date: new Date().toLocaleDateString('vi-VN'),
    });
  };
}
```

### Trong Order History Page

```typescript
import { fetchUserOrdersByStatus } from '@/data/user-orders';

function OrderHistoryPage() {
  const [orders, setOrders] = useState<UserOrder[]>([]);

  useEffect(() => {
    const loadOrders = async () => {
      const delivered = await fetchUserOrdersByStatus(userId, "Đã giao");
      setOrders(delivered);
    };
    loadOrders();
  }, []);
}
```

### Trong Admin Dashboard

```typescript
import { useAdmin } from '@/contexts/AdminContext';
import { updateOrderStatusViaNetlify } from '@/lib/order-service';

function AdminDashboard() {
  const { updateOrderStatus } = useAdmin();

  const handleStatusChange = async (orderId, newStatus) => {
    await updateOrderStatusViaNetlify(orderId, newStatus, {
      adminId: 'admin1',
      adminName: 'Admin Name',
    });
    updateOrderStatus(parseInt(orderId), newStatus);
  };
}
```

### Trong Seller Dashboard (Sales Stats)

```typescript
import { getSellerSalesStats } from '@/lib/order-service';

function SellerDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const loadStats = async () => {
      const result = await getSellerSalesStats(sellerId, 'month');
      if (result.success) {
        setStats(result.data);
      }
    };
    loadStats();
  }, []);

  return (
    <div>
      <p>Doanh thu: {stats?.totalRevenue}</p>
      <p>Đơn hàng bán: {stats?.totalOrdersSold}</p>
      <p>Trung bình: {stats?.averageOrderValue}</p>
    </div>
  );
}
```

## Environment Variables

Thêm vào `.env` hoặc `.env.local`:

```
VITE_MOCKAPI_BASE_URL=https://69bcac962bc2a25b22ac140b.mockapi.io/api/v1
```

## Lỗi Thường gặp & Giải pháp

### 1. "Order not found" khi update status

**Nguyên nhân**: Order ID không tồn tại trong MockAPI

**Giải pháp**: 
- Kiểm tra ID format (phải là string)
- Đảm bảo order đã được tạo trước

### 2. Thay đổi không đồng bộ giữa admin và user

**Nguyên nhân**: Event listener chưa trigger

**Giải pháp**:
- Kiểm tra localStorage keys: `admin_orders`, `userOrders`
- Refresh page để force sync
- Kiểm tra browser console để xem lỗi

### 3. Sales stats không update

**Nguyên nhân**: Orders chưa ở trạng thái "Đã giao" hoặc "Đang giao"

**Giải pháp**:
- Chỉ orders với status "Đã giao" hoặc "Đang giao" được tính vào stats
- Update status của order trước

## Testing APIs

### Sử dụng Netlify CLI

```bash
# Test update-order-status function
curl -X PUT http://localhost:8888/.netlify/functions/update-order-status \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "1",
    "status": "Đang giao",
    "trackingNumber": "VN123456",
    "adminId": "admin1",
    "adminName": "Admin"
  }'

# Test seller-sales-stats function
curl http://localhost:8888/.netlify/functions/seller-sales-stats?period=month
```

## Thời gian Sync

- **Polling interval**: 2 giây (trong UserContext)
- **localStorage event listener**: Immediately
- **MockAPI latency**: Thường < 1 giây

## Giới hạn & Lưu ý

1. **MockAPI quota**: 1000 requests/ngày (phải kiểm tra)
2. **Orders chỉ đếm vào stats khi status là "Đã giao" hoặc "Đang giao"**
3. **User chỉ có thể hủy đơn với status "pending" hoặc "confirmed"**
4. **Payment status không ảnh hưởng đến order status**
5. **Một order có thể tồn tại ở cả admin và user context (chỉ sync)**

## Future Improvements

1. [ ] Implement real-time WebSocket notifications
2. [ ] Add order tracking history
3. [ ] Email notifications khi order status thay đổi
4. [ ] SMS notifications cho customer
5. [ ] Bulk order status updates
6. [ ] Advanced analytics & reports
7. [ ] Order forecasting using ML
