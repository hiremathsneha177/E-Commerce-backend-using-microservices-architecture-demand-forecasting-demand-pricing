"""
Dynamic pricing: adjusts a product's base price up or down based on the
relationship between forecasted demand and current stock — the same logic
airlines/hotels use (surge pricing when demand outpaces supply, discounts
to move slow stock), scaled down to something explainable and bounded.

Pulls live stock + base price from Product Service over REST (synchronous
call, same pattern order-service already uses), then applies the forecast
from forecasting.py to compute a suggested price. The adjustment is capped
at +/-20% so it can never suggest something wildly off the base price —
an important guardrail for anything that's actually setting prices.
"""

import os
import requests
from src.forecasting import forecast_demand

PRODUCT_SERVICE_URL = os.environ.get("PRODUCT_SERVICE_URL", "http://localhost:5002")

MAX_ADJUSTMENT = 0.20  # price can move at most +/-20% from base


def _get_product(product_id: str) -> dict | None:
    try:
        resp = requests.get(f"{PRODUCT_SERVICE_URL}/api/products/{product_id}", timeout=3)
        if resp.status_code == 200:
            return resp.json()
    except requests.RequestException:
        pass
    return None


def suggest_price(product_id: str) -> dict:
    product = _get_product(product_id)
    if not product:
        return {"product_id": product_id, "error": "Product not found in Product Service"}

    base_price = product["price"]
    stock = product["stock"]

    forecast = forecast_demand(product_id)
    daily_forecast = forecast["daily_average_forecast"]

    # Days-of-stock-remaining at the forecasted daily sell-through rate.
    # Low days-remaining under real demand => raise price (scarcity).
    # High days-remaining with real demand => hold steady.
    # Any demand with excess stock => discount to move it.
    if daily_forecast <= 0:
        adjustment = 0.0
        reason = "No recent demand data — holding base price"
    else:
        days_of_stock = stock / daily_forecast

        if days_of_stock < 3:
            adjustment = MAX_ADJUSTMENT  # high demand, about to sell out
            reason = f"High demand relative to stock (~{days_of_stock:.1f} days of stock left) — price increased"
        elif days_of_stock > 21:
            adjustment = -MAX_ADJUSTMENT  # demand too slow for stock on hand
            reason = f"Stock far exceeds demand (~{days_of_stock:.0f} days of stock) — discount applied to move inventory"
        else:
            adjustment = 0.0
            reason = "Demand and stock are balanced — holding base price"

    suggested_price = round(base_price * (1 + adjustment), 2)

    return {
        "product_id": product_id,
        "base_price": base_price,
        "suggested_price": suggested_price,
        "adjustment_pct": round(adjustment * 100, 1),
        "reason": reason,
        "current_stock": stock,
        "forecast": forecast,
    }
