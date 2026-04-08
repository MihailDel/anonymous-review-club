require("dotenv").config();

const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const { prisma } = require("./db");
const { swaggerSpec } = require("./swagger");
const authRoutes = require("./routes/auth");
const reviewsRoutes = require("./routes/reviews");
const tagsRoutes = require("./routes/tags");
const commentsRoutes = require("./routes/comments");
const bookmarkRoutes = require("./routes/bookmarks");

const app = express();
const PORT = process.env.PORT || 3001;

const ALLOWED_ORIGINS = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",")
  : ["http://localhost:3000"];

app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
}));
app.use(express.json({ limit: "100kb" }));

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: "Anonymous Review Club API",
  customCss: ".swagger-ui .topbar { display: none }",
  swaggerOptions: {
    persistAuthorization: true,
    docExpansion: "list",
    filter: true,
    tagsSorter: "alpha",
    operationsSorter: "method",
  },
}));
app.get("/api/docs.json", (_req, res) => {
  res.json(swaggerSpec);
});

app.use("/api/auth", authRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/tags", tagsRoutes);
app.use("/api/reviews", commentsRoutes);
app.use("/api", bookmarkRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: "Маршрут не найден" });
});

app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Внутренняя ошибка сервера" });
});

async function start() {
  try {
    await prisma.$connect();
    console.log("Database connected");

    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    const SHUTDOWN_TIMEOUT = 10000;

    const shutdown = async (signal) => {
      console.log(`${signal} received, shutting down...`);
      server.close(async () => {
        await prisma.$disconnect();
        console.log("Disconnected from database");
        process.exit(0);
      });
      setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

start();
