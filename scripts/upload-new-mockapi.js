import axios from "axios";

const NEW_API_URL = "https://69bce6272bc2a25b22acb171.mockapi.io/api/v1";

const sampleSalesStats = [
  {
    "id": "1",
    "totalOrders": 150,
    "totalItemsSold": 320,
    "totalRevenue": 25000000,
    "averageOrderValue": 166666,
    "topProducts": [
      {
        "productId": 1,
        "productName": "Cây Kim Tiền",
        "sold": 45,
        "revenue": 4500000
      },
      {
        "productId": 2,
        "productName": "Cây Lưỡi Hổ",
        "sold": 30,
        "revenue": 2100000
      }
    ]
  }
];

const sampleUserOrders = [
  {
    "id": "1",
    "userId": "user-123",
    "customerName": "Nguyễn Văn A",
    "customerPhone": "0905123456",
    "customerAddress": "123 Lê Lợi, TP HCM",
    "items": [
      {
        "productId": 1,
        "productName": "Cây Kim Tiền",
        "quantity": 2,
        "price": 100000,
        "image": "https://example.com/tree1.jpg"
      }
    ],
    "total": 200000,
    "status": "Chờ xử lý",
    "paymentMethod": "COD",
    "paymentStatus": "Chưa thanh toán",
    "date": new Date().toISOString()
  }
];

const uploadSalesStats = async () => {
  console.log(`Uploading ${sampleSalesStats.length} sales stats...`);
  for (let i = 0; i < sampleSalesStats.length; i++) {
    try {
      const response = await axios.post(`${NEW_API_URL}/sales-stats`, sampleSalesStats[i], {
        headers: { "Content-Type": "application/json" },
      });
      console.log(`Success Sales Stats: id=${response.data.id}`);
    } catch (error) {
      console.error(`Fail Sales Stats: ${error.message}`);
    }
  }
};

const uploadUserOrders = async () => {
  console.log(`Uploading ${sampleUserOrders.length} user orders...`);
  for (let i = 0; i < sampleUserOrders.length; i++) {
    try {
      const response = await axios.post(`${NEW_API_URL}/user-orders`, sampleUserOrders[i], {
        headers: { "Content-Type": "application/json" },
      });
      console.log(`Success User Order: Customer=${sampleUserOrders[i].customerName}, id=${response.data.id}`);
    } catch (error) {
      console.error(`Fail User Order: ${error.message}`);
    }
  }
};

const run = async () => {
  await uploadSalesStats();
  await uploadUserOrders();
  console.log("All done.");
};

run().catch((err) => {
  console.error("Upload script failed", err);
  process.exit(1);
});
