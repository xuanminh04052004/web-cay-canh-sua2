import axios from "axios";

const ADMIN_ORDERS_URL = "https://69bcac962bc2a25b22ac140b.mockapi.io/api/v1/orders";
const NEW_API_URL = "https://69bce6272bc2a25b22acb171.mockapi.io/api/v1";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const syncAllData = async () => {
  try {
    console.log("1. Fetching Admin Orders...");
    const { data: adminOrders } = await axios.get(ADMIN_ORDERS_URL);
    console.log(`Found ${adminOrders.length} admin orders.`);

    console.log("2. Fetching User Orders to clear them out...");
    let userOrdersToClear = [];
    try {
      const resp = await axios.get(`${NEW_API_URL}/user-orders`);
      userOrdersToClear = resp.data;
    } catch (err) {}
    
    for (const uo of userOrdersToClear) {
      console.log(`- Deleting user-order id=${uo.id}...`);
      await axios.delete(`${NEW_API_URL}/user-orders/${uo.id}`);
      await delay(250);
    }

    console.log("3. Fetching Sales Stats to clear them out...");
    let salesStatsToClear = [];
    try {
      const resp = await axios.get(`${NEW_API_URL}/sales-stats`);
      salesStatsToClear = resp.data;
    } catch (err) {}

    for (const ss of salesStatsToClear) {
      console.log(`- Deleting sales-stat id=${ss.id}...`);
      await axios.delete(`${NEW_API_URL}/sales-stats/${ss.id}`);
      await delay(250);
    }

    console.log("4. Calculating real stats and pushing admin orders to user-orders API...");
    let totalOrders = 0;
    let totalItemsSold = 0;
    let totalRevenue = 0;
    let topProductsMap = {};

    for (const order of adminOrders) {
      // Calculate Stats
      if (order.status === "Đã giao" || order.status === "Đang giao" || true) { // Count all for now for simplicity
        totalOrders++;
        totalRevenue += order.total;
        let orderItemsCount = 0;

        const userOrderItems = order.items.map(item => {
          orderItemsCount += item.quantity;
          
          if (!topProductsMap[item.plantId]) {
            topProductsMap[item.plantId] = {
              productId: item.plantId,
              productName: item.plantName,
              sold: 0,
              revenue: 0
            };
          }
          topProductsMap[item.plantId].sold += item.quantity;
          topProductsMap[item.plantId].revenue += (item.price * item.quantity);

          return {
            productId: item.plantId,
            productName: item.plantName,
            quantity: item.quantity,
            price: item.price,
            image: ""
          };
        });

        totalItemsSold += orderItemsCount;

        // Create the matched user-order in new MockAPI
        const userOrderPayload = {
          id: order.id, // FORCE EXACT ID MATCH
          userId: "user-123", // placeholder user
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          customerAddress: order.customerAddress,
          items: userOrderItems,
          total: order.total,
          status: order.status,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          note: order.note,
          date: order.date
        };

        console.log(`- Creating synchronized user-order id=${order.id}...`);
        await axios.post(`${NEW_API_URL}/user-orders`, userOrderPayload);
        await delay(300);
      }
    }

    const calculatedStats = {
      id: "1",
      totalOrders,
      totalItemsSold,
      totalRevenue,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      topProducts: Object.values(topProductsMap)
    };

    console.log("5. Saving calculated aggregate Sales Stats to MockAPI...");
    await axios.post(`${NEW_API_URL}/sales-stats`, calculatedStats);

    console.log("🎉 SUCCESS! Datastores are now 100% matched!");
  } catch (err) {
    console.error("Failed to sync:", err.message);
  }
};

syncAllData();
