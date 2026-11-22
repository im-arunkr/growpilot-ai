
import "dotenv/config";
import app from "./app.js";

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log("-----------------------------------");
  console.log("🚀 GrowPilot AI Backend Started");
  console.log(`🌐 Server: http://localhost:${PORT}`);
  console.log(`❤️ Health: http://localhost:${PORT}/api/health`);
  console.log("-----------------------------------");
});

const shutdown = () => {
  console.log("Shutting down GrowPilot AI backend...");
  server.close(() => {
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
