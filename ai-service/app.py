from flask import Flask, jsonify, request
from flask_cors import CORS

from src.recommender import get_recommendations
from src.forecasting import forecast_demand
from src.pricing import suggest_price
from src.consumer import start_consumer_thread

app = Flask(__name__)
CORS(app)


@app.route("/health")
def health():
    return jsonify({"status": "ai-service is up"})


@app.route("/api/recommendations/<product_id>", methods=["GET"])
def recommendations(product_id):
    limit = request.args.get("limit", default=5, type=int)
    results = get_recommendations(product_id, limit)
    return jsonify({"product_id": product_id, "also_bought": results})


@app.route("/api/forecast/<product_id>", methods=["GET"])
def forecast(product_id):
    return jsonify(forecast_demand(product_id))


@app.route("/api/pricing/<product_id>", methods=["GET"])
def pricing(product_id):
    result = suggest_price(product_id)
    if "error" in result:
        return jsonify(result), 404
    return jsonify(result)


if __name__ == "__main__":
    start_consumer_thread()
    app.run(host="0.0.0.0", port=5005, debug=False)
