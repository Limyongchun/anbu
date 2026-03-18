import express, { type Express } from "express";
import cors from "cors";
import router from "./routes";

const app: Express = express();

const ALLOWED_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim())
  : undefined;

app.use(
  cors(
    ALLOWED_ORIGINS
      ? { origin: ALLOWED_ORIGINS, credentials: true }
      : undefined,
  ),
);
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

app.use("/api", router);

export default app;
