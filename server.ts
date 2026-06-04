import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "PharmaDirect API is running" });
  });

  // --- DELIVERY INTEGRATIONS (Uber Direct / DoorDash Drive) ---

  // Dispatch to Uber Direct
  app.post("/api/delivery/uber/dispatch", async (req, res) => {
    const { orderId, pickupAddress, dropoffAddress, customerInfo } = req.body;
    
    try {
      // Logic for Uber Direct API would go here:
      // const response = await fetch('https://api.uber.com/v1/deliveries', {
      //   method: 'POST',
      //   headers: { 'Authorization': `Bearer ${process.env.UBER_DIRECT_SECRET}`, 'Content-Type': 'application/json' },
      //   body: JSON.stringify({...})
      // });
      
      console.log(`[LOGISTICS] Dispatching Order ${orderId} to Uber Direct`);
      
      // Mock Success Response
      res.json({
        deliveryId: "uber_" + Math.random().toString(36).substring(7),
        status: "dispatched",
        trackingUrl: "https://tracking.uber.com/mock-id",
        estimatedArrival: new Date(Date.now() + 45 * 60000).toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: "Uber Dispatch Failed" });
    }
  });

  // Dispatch to DoorDash Drive
  app.post("/api/delivery/doordash/dispatch", async (req, res) => {
    const { orderId, dropoffAddress } = req.body;
    
    try {
      // DoorDash Drive JWT logic...
      console.log(`[LOGISTICS] Dispatching Order ${orderId} to DoorDash`);
      
      res.json({
        deliveryId: "dash_" + Math.random().toString(36).substring(7),
        status: "dispatched",
        trackingUrl: "https://www.doordash.com/drive/tracking/mock",
        estimatedArrival: new Date(Date.now() + 30 * 60000).toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: "DoorDash Dispatch Failed" });
    }
  });

  // --- ROUTE OPTIMIZATION (Round-Trip / TSP Logic) ---
  app.post("/api/logistics/optimize-route", (req, res) => {
    const { driverId, orders, startLocation } = req.body;
    
    // PHARMACY BASE (Default if not provided)
    const BASE = startLocation || { lat: 25.7617, lng: -80.1918 }; 
    
    console.log(`[LOGISTICS] Optimizing Round-Trip Route for ${orders.length} orders`);

    // Helper: Haversine distance for basic geo-optimization
    const getDistance = (p1: any, p2: any) => {
      if (!p1.lat || !p1.lng || !p2.lat || !p2.lng) return 9999;
      const R = 6371; // km
      const dLat = (p2.lat - p1.lat) * Math.PI / 180;
      const dLng = (p2.lng - p1.lng) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    };

    // Nearest Neighbor Algorithm
    let currentPos = BASE;
    const remainingOrders = [...orders];
    const optimizedStops = [];
    let sequence = 1;

    while (remainingOrders.length > 0) {
      let closestIdx = 0;
      let minDistance = getDistance(currentPos, remainingOrders[0].shippingAddress);

      for (let i = 1; i < remainingOrders.length; i++) {
        const dist = getDistance(currentPos, remainingOrders[i].shippingAddress);
        if (dist < minDistance) {
          minDistance = dist;
          closestIdx = i;
        }
      }

      const nextOrder = remainingOrders.splice(closestIdx, 1)[0];
      optimizedStops.push({
        orderId: nextOrder.id,
        sequence: sequence++,
        distanceFromLast: minDistance,
        estimatedArrival: new Date(Date.now() + sequence * 15 * 60000).toISOString()
      });
      currentPos = nextOrder.shippingAddress;
    }

    // Add "Return to Base" info
    const returnDistance = getDistance(currentPos, BASE);

    res.json({
      routeId: "route_" + Math.random().toString(36).substring(7),
      optimizedStops,
      summary: {
        totalStops: optimizedStops.length,
        returnToBaseDistance: returnDistance,
        status: "optimized_round_trip"
      }
    });
  });

  // Mock Stripe Payment Intent
  app.post("/api/create-payment-intent", async (req, res) => {
    const { amount } = req.body;
    // In a real app: const paymentIntent = await stripe.paymentIntents.create({ amount, currency: 'usd' });
    res.json({ clientSecret: "mock_secret_" + Math.random().toString(36).substring(7) });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
