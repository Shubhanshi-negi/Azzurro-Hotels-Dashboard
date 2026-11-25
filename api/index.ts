import type { Request, Response } from "express";
import { app, initialize } from "../server/server.js";

export default async function handler(request: Request, response: Response) {
  try {
    const url = new URL(request.url ?? "/", "http://vercel.local");
    const apiPath = url.searchParams.get("__vercel_path");
    if (apiPath !== null) {
      url.searchParams.delete("__vercel_path");
      const path = apiPath.startsWith("/") ? apiPath : `/${apiPath}`;
      const query = url.searchParams.toString();
      request.url = `/api${path}${query ? `?${query}` : ""}`;
    }

    await initialize();
    app(request, response);
  } catch (error) {
    console.error("Vercel API initialization failed:", error);
    response.status(500).json({ error: "The API could not be initialized." });
  }
}
