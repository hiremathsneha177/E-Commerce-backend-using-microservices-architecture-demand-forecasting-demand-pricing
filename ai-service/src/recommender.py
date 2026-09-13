"""
Item-based collaborative filtering: "customers who bought X also bought Y".

For every order, every pair of distinct products in that order has its
co-purchase count incremented. Recommending for a product then means
looking up every pair involving it and ranking partners by how often
they've been bought together — the same underlying idea Amazon's original
"customers who bought this also bought" feature used, just without the
scale.
"""

from src.db import co_purchases


def _pair_key(product_a: str, product_b: str) -> str:
    # Order-independent key so (A, B) and (B, A) update the same document
    return "::".join(sorted([product_a, product_b]))


def record_order(item_product_ids: list[str]):
    """Called for every incoming order-placed event. Increments the
    co-purchase count for every unique pair of products in the order."""
    unique_ids = list(dict.fromkeys(item_product_ids))  # dedupe, keep order

    for i in range(len(unique_ids)):
        for j in range(i + 1, len(unique_ids)):
            a, b = sorted([unique_ids[i], unique_ids[j]])
            key = _pair_key(a, b)
            co_purchases.update_one(
                {"_id": key},
                {"$set": {"product_a": a, "product_b": b}, "$inc": {"count": 1}},
                upsert=True,
            )


def get_recommendations(product_id: str, limit: int = 5) -> list[dict]:
    """Returns the top-N products most frequently bought alongside product_id,
    ranked by co-purchase count."""
    matches = co_purchases.find(
        {"$or": [{"product_a": product_id}, {"product_b": product_id}]}
    ).sort("count", -1).limit(limit)

    results = []
    for m in matches:
        other = m["product_b"] if m["product_a"] == product_id else m["product_a"]
        results.append({"product_id": other, "co_purchase_count": m["count"]})

    return results
