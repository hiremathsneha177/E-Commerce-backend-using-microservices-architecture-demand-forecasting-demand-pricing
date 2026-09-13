"""
Runs in a background thread inside the Flask app. Listens to the
'order-placed' topic (published by order-service in Node) and feeds each
order's items into the co-purchase recommender.

Using kafka-python's KafkaConsumer directly rather than an async framework
keeps this simple enough to reason about for a resume project, while still
demonstrating real cross-language event-driven communication: Node.js
produces, Python consumes.
"""

import os
import json
import threading
from kafka import KafkaConsumer
from kafka.errors import NoBrokersAvailable

from src.recommender import record_order
from src.db import daily_sales
from datetime import date

KAFKA_BROKER = os.environ.get("KAFKA_BROKER", "localhost:9092")
TOPIC = "order-placed"


def _record_daily_sales(items: list[dict]):
    """Feeds the demand-forecasting time series: one document per
    product per day, incremented by the quantity ordered."""
    today = date.today().isoformat()
    for item in items:
        product_id = item["productId"]
        quantity = item.get("quantity", 1)
        key = f"{product_id}::{today}"
        daily_sales.update_one(
            {"_id": key},
            {"$set": {"product_id": product_id, "date": today}, "$inc": {"quantity": quantity}},
            upsert=True,
        )


def _consume_loop():
    try:
        consumer = KafkaConsumer(
            TOPIC,
            bootstrap_servers=[KAFKA_BROKER],
            value_deserializer=lambda v: json.loads(v.decode("utf-8")),
            auto_offset_reset="earliest",
            group_id="recommendation-service",
        )
    except NoBrokersAvailable:
        print(f"Recommendation Service: Kafka broker unavailable at {KAFKA_BROKER}. "
              "Consumer will not start — recommendations will be empty until Kafka is reachable.")
        return

    print(f"Recommendation Service: listening on Kafka topic '{TOPIC}'")

    for message in consumer:
        try:
            event = message.value
            product_ids = [item["productId"] for item in event.get("items", [])]
            if len(product_ids) >= 2:
                record_order(product_ids)
            _record_daily_sales(event.get("items", []))
            print(f"Recorded sales/co-purchase data for order {event.get('orderId')}")
        except Exception as err:
            print(f"Failed to process order-placed event: {err}")


def start_consumer_thread():
    thread = threading.Thread(target=_consume_loop, daemon=True)
    thread.start()
