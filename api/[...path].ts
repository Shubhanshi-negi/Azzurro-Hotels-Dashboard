import type { Request, Response } from "express";
import { app, initialize } from "../server/server";

export default async function handler(request: Request, response: Response) {
  try {
    await initialize();
    app(request, response);
  } catch (error) {
    console.error("Vercel API initialization failed:", error);
    response.status(500).json({ error: "The API could not be initialized." });
  }
}
