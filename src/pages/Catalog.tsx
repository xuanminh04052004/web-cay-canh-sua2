import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Star,
  ShoppingCart,
  Search,
  X,
  Droplets,
  Sun,
  Thermometer,
  Wind,
  Eye,
  SlidersHorizontal,
  Store,
} from "lucide-react";
import PageLayout from "@/components/PageLayout";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useSeller } from "@/contexts/SellerContext";
import { useAdmin } from "@/contexts/AdminContext";
import { toast } from "sonner";
import bgShop from "@/assets/bg-shop.jpg";
import { Link } from "react-router-dom";
import { categories, formatPrice } from "@/data/plants";
import { searchMatch } from "@/lib/searchUtils";

const priceRanges = [
  { label: "Tất cả giá", min: 0, max: Infinity },
  { label: "Dưới 200K", min: 0, max: 200000 },
  { label: "200K - 400K", min: 200000, max: 400000 },
  { label: "400K - 600K", min: 400000, max: 600000 },
  { label: "Trên 600K", min: 600000, max: Infinity },
];

const careLevels = ["Tất cả", "Dễ", "Trung bình", "Khó"];

const Catalog = () => {
  const [activeCategory, setActiveCategory] = useState("Tất cả");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlant, setSelectedPlant] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPriceRange, setSelectedPriceRange] = useState(0);
  const [selectedCareLevel, setSelectedCareLevel] = useState("Tất cả");
  const [sortBy, setSortBy] = useState("default");
  const [productSource, setProductSource] = useState<
    "all" | "greenie" | "sellers"
  >("all");

  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { allSellerProducts, getSellerById } = useSeller();
  const { products: plantsData, isLoading, fetchError } = useAdmin();

  if (isLoading) {
    return (
      <PageLayout showHero heroImage={bgShop} heroTitle="Bộ Sưu Tập Cây">
        <div className="text-center py-12">Đang tải sản phẩm...</div>
      </PageLayout>
    );
  }

  if (fetchError) {
    return (
      <PageLayout showHero heroImage={bgShop} heroTitle="Bộ Sưu Tập Cây">
        <div className="text-center py-12 text-red-500">
          Lỗi: {fetchError}
        </div>
      </PageLayout>
    );
  }

  // ✅ Gộp data trực tiếp (mock API đã đồng bộ format)
  const allProducts =
    productSource === "greenie"
      ? plantsData
      : productSource === "sellers"
      ? allSellerProducts
      : [...plantsData, ...allSellerProducts];

  // ✅ Filter + Sort
  const filteredPlants = allProducts
    .filter((plant) => {
      const isActive =
        !plant.status ||
        plant.status === "active" ||
        plant.status === "approved";

      const matchesCategory =
        activeCategory === "Tất cả" || plant.category === activeCategory;

      const matchesSearch = searchMatch(
        searchQuery,
        plant.name,
        plant.description,
        plant.benefits,
        plant.location
      );

      const matchesPrice =
        plant.price >= priceRanges[selectedPriceRange].min &&
        plant.price <= priceRanges[selectedPriceRange].max;

      const matchesCare =
        selectedCareLevel === "Tất cả" ||
        plant.careLevel === selectedCareLevel;

      return (
        isActive &&
        matchesCategory &&
        matchesSearch &&
        matchesPrice &&
        matchesCare
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "price-asc":
          return a.price - b.price;
        case "price-desc":
          return b.price - a.price;
        case "rating":
          return b.rating - a.rating;
        case "sold":
          return b.sold - a.sold;
        default:
          return 0;
      }
    });

  const handleAddToCart = (plant: any) => {
    addToCart({
      id: plant.id,
      name: plant.name,
      price: plant.price,
      image: plant.image,
      sellerId: plant.sellerId,
    });
    toast.success(`Đã thêm ${plant.name} vào giỏ hàng!`);
  };

  const handleToggleWishlist = (plant: any) => {
    toggleWishlist({
      id: plant.id,
      name: plant.name,
      price: plant.price,
      image: plant.image,
      category: plant.category,
    });
  };

  const clearFilters = () => {
    setSelectedPriceRange(0);
    setSelectedCareLevel("Tất cả");
    setSortBy("default");
    setActiveCategory("Tất cả");
    setSearchQuery("");
  };

  return (
    <PageLayout showHero heroImage={bgShop} heroTitle="Bộ Sưu Tập Cây">
      <div className="container mx-auto px-6 py-12">
        {/* Search */}
        <div className="flex gap-4 mb-6">
          <div className="relative w-full">
            <Search className="absolute left-3 top-3 w-5 h-5" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm cây..."
              className="w-full pl-10 p-3 rounded-lg border"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-2 flex-wrap mb-6">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={`px-4 py-2 rounded-full ${
                activeCategory === c ? "bg-primary text-white" : "bg-gray-100"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Products */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {filteredPlants.map((plant, i) => (
            <motion.div
              key={plant.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              className="border rounded-xl overflow-hidden"
            >
              <img src={plant.image} className="w-full h-48 object-cover" />

              <div className="p-4">
                <h3 className="font-semibold">{plant.name}</h3>

                {/* Seller */}
                {plant.sellerId && (
                  <Link
                    to={`/shop/${plant.sellerId}`}
                    className="text-xs text-gray-500 flex items-center gap-1"
                  >
                    <Store className="w-3 h-3" />
                    {plant.sellerName ||
                      getSellerById(plant.sellerId)?.shopName}
                  </Link>
                )}

                <div className="text-sm text-gray-500 flex gap-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  {plant.rating}
                </div>

                <div className="flex justify-between mt-3">
                  <span className="font-bold text-primary">
                    {formatPrice(plant.price)}
                  </span>

                  <button onClick={() => handleAddToCart(plant)}>
                    <ShoppingCart />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {filteredPlants.length === 0 && (
          <div className="text-center mt-10">
            Không có sản phẩm
            <button onClick={clearFilters} className="block text-primary mt-2">
              Reset filter
            </button>
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default Catalog;
