# Quick Start Guide - Mockup API Integration

## 🎯 Quick Links

- **API Docs**: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **Changes Summary**: [CHANGES_SUMMARY.md](./CHANGES_SUMMARY.md)

---

## 📋 5 Phút Setup

### Step 1: Verify Environment Variable
Đảm bảo `.env` hoặc `.env.local` có:
```
VITE_MOCKAPI_BASE_URL=https://69bcac962bc2a25b22ac140b.mockapi.io/api/v1
```

### Step 2: Contexts đã sẵn sàng
- ✅ AdminContext - quản lý đơn hàng admin
- ✅ UserContext - quản lý đơn hàng user
- ✅ Tự động đồng bộ khi app chạy

### Step 3: Import & Sử dụng

```typescript
// Với Admin - Cập nhật trạng thái
import { useAdmin } from '@/contexts/AdminContext';

function AdminOrdersPage() {
  const { orders, updateOrderStatus } = useAdmin();
  
  return (
    <div>
      {orders.map(order => (
        <div key={order.id}>
          <p>Status: {order.status}</p>
          <button onClick={() => updateOrderStatus(order.id, "Đang giao")}>
            Giao
          </button>
        </div>
      ))}
    </div>
  );
}
```

```typescript
// Với User - Xem đơn hàng
import { useUser } from '@/contexts/UserContext';

function UserOrdersPage() {
  const { orders, cancelOrder } = useUser();
  
  return (
    <div>
      {orders.map(order => (
        <div key={order.id}>
          <p>Trạng thái: {order.status}</p>
          {order.status === 'pending' && (
            <button onClick={() => cancelOrder(order.id, "Lý do")}>
              Hủy
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
```

---

## 🔥 Common Tasks

### Task 1: Hiển thị danh sách đơn hàng của user

```typescript
import { useUser } from '@/contexts/UserContext';

function OrderHistory() {
  const { orders } = useUser();
  
  return (
    <table>
      <tbody>
        {orders.map(order => (
          <tr key={order.id}>
            <td>#{order.id}</td>
            <td>{order.status}</td>
            <td>₫{order.total}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### Task 2: Admin cập nhật trạng thái hàng loạt

```typescript
import { useAdmin } from '@/contexts/AdminContext';

function BulkOrderUpdate() {
  const { orders, updateOrderStatus } = useAdmin();
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  
  const handleBulkUpdate = (newStatus) => {
    selectedOrders.forEach(orderId => {
      updateOrderStatus(orderId, newStatus);
    });
  };
  
  return (
    <div>
      {orders.map(order => (
        <div key={order.id}>
          <input 
            type="checkbox" 
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedOrders([...selectedOrders, order.id]);
              } else {
                setSelectedOrders(selectedOrders.filter(id => id !== order.id));
              }
            }}
          />
          {order.id} - {order.status}
        </div>
      ))}
      <button onClick={() => handleBulkUpdate("Đang giao")}>
        Giao ngay
      </button>
    </div>
  );
}
```

### Task 3: Hiển thị thống kê bán hàng seller

```typescript
import { useEffect, useState } from 'react';
import { getSellerSalesStats } from '@/lib/order-service';

function SellerStats({ sellerId }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchStats = async () => {
      const result = await getSellerSalesStats(sellerId, 'month');
      if (result.success) {
        setStats(result.data);
      }
      setLoading(false);
    };
    fetchStats();
  }, [sellerId]);
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      <h2>Thống kê kinh doanh - Tháng này</h2>
      <div>Doanh thu: ₫{stats?.totalRevenue.toLocaleString('vi-VN')}</div>
      <div>Đơn hàng: {stats?.totalOrdersSold}</div>
      <div>Trung bình: ₫{Math.round(stats?.averageOrderValue).toLocaleString('vi-VN')}</div>
      
      <h3>Top sản phẩm</h3>
      <ul>
        {stats?.topProducts?.map(product => (
          <li key={product.id}>
            {product.name}: {product.sold} cái (₫{product.revenue.toLocaleString('vi-VN')})
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Task 4: Số lượng đã bán của sản phẩm

```typescript
import { useEffect, useState } from 'react';
import { getProductSoldCount } from '@/data/sales-analytics';

function ProductCard({ productId, productName }) {
  const [soldCount, setSoldCount] = useState(0);
  
  useEffect(() => {
    getProductSoldCount(productId).then(count => {
      setSoldCount(count);
    });
  }, [productId]);
  
  return (
    <div>
      <h3>{productName}</h3>
      <p>Đã bán: {soldCount}</p>
    </div>
  );
}
```

### Task 5: Hiển thị tracking của đơn hàng

```typescript
function OrderTracking({ order }) {
  const statusColors = {
    'pending': 'gray',
    'confirmed': 'blue',
    'shipping': 'orange',
    'delivered': 'green',
    'cancelled': 'red'
  };
  
  const statusLabels = {
    'pending': 'Chờ xử lý',
    'confirmed': 'Đã xác nhận',
    'shipping': 'Đang giao',
    'delivered': 'Đã giao',
    'cancelled': 'Đã hủy'
  };
  
  return (
    <div>
      <h2>Theo dõi đơn hàng #{order.id}</h2>
      
      {/* Status Timeline */}
      <div className="timeline">
        {order.timeline?.map((event, idx) => (
          <div key={idx} className="timeline-item">
            <div className="dot"></div>
            <div>
              <p className="status">{event.status}</p>
              <p className="date">{event.date}</p>
              <p className="description">{event.description}</p>
            </div>
          </div>
        ))}
      </div>
      
      {/* Current Status Badge */}
      <div 
        style={{ 
          background: statusColors[order.status],
          color: 'white',
          padding: '10px',
          borderRadius: '5px'
        }}
      >
        {statusLabels[order.status]}
      </div>
    </div>
  );
}
```

### Task 6: Filter đơn hàng theo trạng thái

```typescript
import { useEffect, useState } from 'react';
import { useUser } from '@/contexts/UserContext';

function FilteredOrders() {
  const { orders } = useUser();
  const [filter, setFilter] = useState('all');
  
  const filtered = orders.filter(order => {
    if (filter === 'all') return true;
    return order.status === filter;
  });
  
  return (
    <div>
      <div className="filter-buttons">
        <button onClick={() => setFilter('all')}>Tất cả ({orders.length})</button>
        <button onClick={() => setFilter('pending')}>Chờ xử lý</button>
        <button onClick={() => setFilter('confirmed')}>Xác nhận</button>
        <button onClick={() => setFilter('shipping')}>Đang giao</button>
        <button onClick={() => setFilter('delivered')}>Đã giao</button>
        <button onClick={() => setFilter('cancelled')}>Hủy</button>
      </div>
      
      <div className="orders-list">
        {filtered.map(order => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>
    </div>
  );
}
```

---

## 🛠️ Troubleshooting

### Issue: "Orders not updating"
```javascript
// Check localStorage
console.log(localStorage.getItem('admin_orders'));
console.log(localStorage.getItem('userOrders'));

// Force refresh
window.location.reload();
```

### Issue: "API returns 404"
```javascript
// Check if order exists
fetch('https://69bcac962bc2a25b22ac140b.mockapi.io/api/v1/orders/1')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

### Issue: "Netlify function not working"
```javascript
// Test directly
fetch('/.netlify/functions/update-order-status', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    orderId: '1',
    status: 'Đang giao'
  })
})
.then(r => r.json())
.then(console.log);
```

---

## 📱 Real-world Examples

### Complete Admin Dashboard Order Management

```typescript
import { useAdmin } from '@/contexts/AdminContext';
import { updateOrderStatusViaNetlify } from '@/lib/order-service';
import { useState } from 'react';

function AdminOrderManagement() {
  const { orders, updateOrderStatus } = useAdmin();
  const [filter, setFilter] = useState('all');
  
  const handleStatusChange = async (orderId, newStatus) => {
    // Update via Netlify function (with sync)
    const result = await updateOrderStatusViaNetlify(orderId, newStatus, {
      adminId: 'admin123',
      adminName: 'Admin Name',
      note: `Updated to ${newStatus}`
    });
    
    if (result.success) {
      // Also update local state
      updateOrderStatus(orderId, newStatus);
      alert('Cập nhật thành công!');
    } else {
      alert('Lỗi: ' + result.error);
    }
  };
  
  const filteredOrders = orders.filter(o => 
    filter === 'all' || o.status === filter
  );
  
  return (
    <div>
      <h1>Quản lý đơn hàng</h1>
      
      <div className="filters">
        {['all', 'Chờ xử lý', 'Đã xác nhận', 'Đang giao', 'Đã giao'].map(f => (
          <button 
            key={f}
            onClick={() => setFilter(f)}
            className={filter === f ? 'active' : ''}
          >
            {f}
          </button>
        ))}
      </div>
      
      <table className="orders-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Customer</th>
            <th>Total</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredOrders.map(order => (
            <tr key={order.id}>
              <td>#{order.id}</td>
              <td>{order.customerName}</td>
              <td>₫{order.total.toLocaleString('vi-VN')}</td>
              <td><span className={`status-${order.status}`}>{order.status}</span></td>
              <td>
                <select 
                  value={order.status}
                  onChange={(e) => handleStatusChange(order.id, e.target.value)}
                >
                  <option value="Chờ xử lý">Chờ xử lý</option>
                  <option value="Đã xác nhận">Xác nhận</option>
                  <option value="Đang giao">Giao</option>
                  <option value="Đã giao">Hoàn thành</option>
                  <option value="Đã hủy">Hủy</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminOrderManagement;
```

---

## 🚀 Next Steps

1. ✅ Import contexts in your components
2. ✅ Render order lists using `orders` state
3. ✅ Add status update handlers
4. ✅ Test with real data flow
5. ✅ Monitor MockAPI usage

---

## 📞 Need Help?

- Check **API_DOCUMENTATION.md** for detailed API reference
- Check **CHANGES_SUMMARY.md** for what changed
- Look at example usage above
- Check browser network tab for API errors
- Check console for warnings/errors
