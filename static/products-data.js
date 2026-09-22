const categories = [
    "Electronics",
    "Fashion",
    "Beauty",
    "Home & Living",
    "Sports",
    "Books",
    "Gaming",
    "Accessories",
    "Grocery",
    "Footwear"
];

const categoryProducts = {
    "Electronics": [
        "Nova X Pro",
        "UltraBook Air",
        "SoundMax Pro",
        "Smart Watch X",
        "Vision 4K TV",
        "GameStation X",
        "PowerSound Speaker",
        "PowerBank Pro",
        "Smart Tablet",
        "Wireless Earbuds"
    ],

    "Fashion": [
        "Classic Denim Jacket",
        "Premium Hoodie",
        "Urban T-Shirt",
        "Casual Shirt",
        "Slim Fit Jeans",
        "Summer Dress",
        "Streetwear Jacket",
        "Cotton Kurta",
        "Cargo Pants",
        "Premium Sweatshirt"
    ],

    "Beauty": [
        "Glow Face Serum",
        "Pure Skin Cleanser",
        "Hydra Moisturizer",
        "Beauty Foundation",
        "Rose Lip Tint",
        "Silk Hair Serum",
        "Vitamin C Cream",
        "Luxury Perfume",
        "Face Mask Kit",
        "Beauty Care Set"
    ],

    "Home & Living": [
        "Modern Table Lamp",
        "Comfort Sofa",
        "Decor Wall Clock",
        "Smart LED Light",
        "Premium Bedsheet",
        "Kitchen Organizer",
        "Coffee Table",
        "Home Fragrance",
        "Storage Box",
        "Indoor Plant"
    ],

    "Sports": [
        "Pro Football",
        "Cricket Bat Pro",
        "Training Shoes",
        "Yoga Mat",
        "Fitness Dumbbells",
        "Basketball X",
        "Badminton Set",
        "Sports Bottle",
        "Gym Gloves",
        "Running Track Suit"
    ],

    "Books": [
        "Atomic Habits",
        "The Psychology Book",
        "Java Programming",
        "Python Basics",
        "Data Structures",
        "Machine Learning",
        "Web Development",
        "Database Systems",
        "Computer Networks",
        "Artificial Intelligence"
    ],

    "Gaming": [
        "Gaming Mouse X",
        "Mechanical Keyboard",
        "RGB Gaming Headset",
        "Pro Game Controller",
        "Gaming Chair",
        "RGB Mouse Pad",
        "Game Console X",
        "Streaming Mic",
        "Gaming Monitor",
        "VR Gaming Headset"
    ],

    "Accessories": [
        "Premium Backpack",
        "Leather Wallet",
        "Classic Watch",
        "Travel Sunglasses",
        "Metal Keychain",
        "Laptop Sleeve",
        "Card Holder",
        "Travel Pouch",
        "Premium Belt",
        "Phone Stand"
    ],

    "Grocery": [
        "Organic Rice",
        "Premium Wheat",
        "Fresh Almonds",
        "Organic Honey",
        "Green Tea",
        "Dark Chocolate",
        "Mixed Dry Fruits",
        "Fresh Coffee",
        "Organic Oats",
        "Healthy Snacks"
    ],

    "Footwear": [
        "Urban Runner",
        "Classic Sneakers",
        "Sports Shoes X",
        "Premium Loafers",
        "Casual Sneakers",
        "Running Shoes Pro",
        "Leather Boots",
        "Walking Shoes",
        "Canvas Shoes",
        "Training Sneakers"
    ]
};


const productImages = {
    "Electronics": [
        "https://images.unsplash.com/photo-1496181133206-80ce9b88a853",
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e",
        "https://images.unsplash.com/photo-1546435770-a3e426bf472b",
        "https://images.unsplash.com/photo-1523275335684-37898b6baf30",
        "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1"
    ],

    "Fashion": [
        "https://images.unsplash.com/photo-1529139574466-a303027c1d8b",
        "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3",
        "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab"
    ],

    "Beauty": [
        "https://images.unsplash.com/photo-1596462502278-27bfdc403348",
        "https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd",
        "https://images.unsplash.com/photo-1556228578-8c89e6adf883"
    ],

    "Home & Living": [
        "https://images.unsplash.com/photo-1507473885765-e6ed057f782c",
        "https://images.unsplash.com/photo-1555041469-a586c61ea9bc",
        "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15"
    ],

    "Sports": [
        "https://images.unsplash.com/photo-1461896836934-ffe607ba8211",
        "https://images.unsplash.com/photo-1546519638-68e109498ffc",
        "https://images.unsplash.com/photo-1517836357463-d25dfeac3438"
    ],

    "Books": [
        "https://images.unsplash.com/photo-1544947950-fa07a98d237f",
        "https://images.unsplash.com/photo-1512820790803-83ca734da794",
        "https://images.unsplash.com/photo-1495446815901-a7297e633e8d"
    ],

    "Gaming": [
        "https://images.unsplash.com/photo-1593305841991-05c297ba4575",
        "https://images.unsplash.com/photo-1600080972464-8e5f35f63d08",
        "https://images.unsplash.com/photo-1592840496694-26c035b52bca"
    ],

    "Accessories": [
        "https://images.unsplash.com/photo-1553062407-98eeb64c6a62",
        "https://images.unsplash.com/photo-1627123424574-724758594e93",
        "https://images.unsplash.com/photo-1524805444758-089113d48a6d"
    ],

    "Grocery": [
        "https://images.unsplash.com/photo-1586201375761-83865001e31c",
        "https://images.unsplash.com/photo-1587049352846-4a222e784d38",
        "https://images.unsplash.com/photo-1509440159596-0249088772ff"
    ],

    "Footwear": [
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff",
        "https://images.unsplash.com/photo-1495555961986-6d4c1ecb7be3",
        "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77"
    ]
};


const allProducts = [];

let productId = 1;

categories.forEach(category => {

    categoryProducts[category].forEach((name, index) => {

        const price = 799 + (index * 650) + (categories.indexOf(category) * 100);

        const oldPrice = price + Math.round(price * 0.25);

        const discount = Math.round(
            ((oldPrice - price) / oldPrice) * 100
        );

        const images = productImages[category];

        allProducts.push({
            id: productId++,
            name: name,
            category: category,
            price: price,
            oldPrice: oldPrice,
            discount: discount,
            rating: Number((4.1 + (index % 9) * 0.1).toFixed(1)),
            reviews: 40 + index * 27,
            image: images[index % images.length],
            badge: index === 0 ? "BEST SELLER" : "",
            description:
                `Premium ${name} from NexaCart with quality, modern design and excellent value.`
        });

    });

});