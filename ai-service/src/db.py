import os
from pymongo import MongoClient

MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017/recommendation-service")

client = MongoClient(MONGO_URI)
db = client.get_default_database()

# co_purchases: { _id: "productA::productB" (sorted pair), product_a, product_b, count }
co_purchases = db["co_purchases"]
co_purchases.create_index("product_a")
co_purchases.create_index("product_b")

# daily_sales: { _id: "productId::YYYY-MM-DD", product_id, date, quantity }
# One document per product per day — the raw time series that demand
# forecasting is built on.
daily_sales = db["daily_sales"]
daily_sales.create_index("product_id")
