const { Kafka } = require("kafkajs");

/**
 * Publishes an event every time an order is successfully placed. This is
 * fire-and-forget event publishing on top of the existing synchronous REST
 * calls (stock check, payment) — Kafka isn't on the critical path for
 * placing an order, it's for everything downstream that wants to react to
 * "an order happened" without the Order Service needing to know who's
 * listening. Right now that's the Recommendation Service building
 * "customers also bought" data, but the same topic could feed analytics,
 * email/notification services, etc. without touching order-service again.
 */
const kafka = new Kafka({
  clientId: "order-service",
  brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
  retry: { retries: 3 },
});

const producer = kafka.producer();
let isConnected = false;

async function connectProducer() {
  if (!isConnected) {
    await producer.connect();
    isConnected = true;
    console.log("Order Service: connected to Kafka");
  }
}

async function publishOrderPlaced(order) {
  try {
    await connectProducer();
    await producer.send({
      topic: "order-placed",
      messages: [
        {
          key: String(order.userId),
          value: JSON.stringify({
            orderId: order._id,
            userId: order.userId,
            items: order.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
            totalAmount: order.totalAmount,
            timestamp: new Date().toISOString(),
          }),
        },
      ],
    });
  } catch (err) {
    // Kafka being down should never fail an order — log and move on.
    console.error("Failed to publish order-placed event:", err.message);
  }
}

module.exports = { publishOrderPlaced };
