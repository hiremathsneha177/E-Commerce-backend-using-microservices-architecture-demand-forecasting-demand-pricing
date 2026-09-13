"""
Demand forecasting for a product based on its own order history (the same
daily_sales time series built from Kafka order-placed events).

Method: a weighted moving average over the last N days (recent days count
more than older ones) combined with a simple linear trend term, computed
with basic Python/statistics rather than a heavy time-series library —
appropriate for the amount of data a project like this actually has, and
easy to explain in an interview: "I weight recent days more heavily, and
add a trend correction if sales are consistently rising or falling."

This deliberately avoids overclaiming a sophisticated model (ARIMA/Prophet
would be overkill and largely untestable without real historical volume) in
favor of a transparent, explainable calculation — which is also a stronger
interview answer than naming a library you can't walk through.
"""

from datetime import date, timedelta
from src.db import daily_sales

LOOKBACK_DAYS = 14


def _get_recent_sales(product_id: str, days: int = LOOKBACK_DAYS) -> list[int]:
    today = date.today()
    series = []
    for i in range(days - 1, -1, -1):  # oldest -> newest
        day = (today - timedelta(days=i)).isoformat()
        doc = daily_sales.find_one({"_id": f"{product_id}::{day}"})
        series.append(doc["quantity"] if doc else 0)
    return series


def forecast_demand(product_id: str, horizon_days: int = 7) -> dict:
    series = _get_recent_sales(product_id)

    if sum(series) == 0:
        return {
            "product_id": product_id,
            "forecast_next_7_days": 0,
            "daily_average_forecast": 0,
            "trend": "no_data",
            "based_on_days": LOOKBACK_DAYS,
        }

    # Weighted moving average: more recent days weighted higher (weights 1..N)
    weights = list(range(1, len(series) + 1))
    weighted_avg = sum(v * w for v, w in zip(series, weights)) / sum(weights)

    # Simple trend: compare average of the most recent half vs the older half
    midpoint = len(series) // 2
    older_avg = sum(series[:midpoint]) / max(midpoint, 1)
    recent_avg = sum(series[midpoint:]) / max(len(series) - midpoint, 1)

    if recent_avg > older_avg * 1.1:
        trend = "rising"
        trend_multiplier = 1.1
    elif recent_avg < older_avg * 0.9:
        trend = "falling"
        trend_multiplier = 0.9
    else:
        trend = "stable"
        trend_multiplier = 1.0

    daily_forecast = weighted_avg * trend_multiplier
    forecast_next_7 = round(daily_forecast * horizon_days, 1)

    return {
        "product_id": product_id,
        "forecast_next_7_days": forecast_next_7,
        "daily_average_forecast": round(daily_forecast, 2),
        "trend": trend,
        "based_on_days": LOOKBACK_DAYS,
    }
