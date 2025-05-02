import express from "express";
import cors from "cors";
import apiRoutes from "../api/routes/routes";
import { Request, Response } from "express";

export function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(cors());
  app.use(apiRoutes);
  
  app.get("/health", (_: Request, res: Response) => {
    res.send("Welcome to the AI API");
  });
  
  return app;
}
