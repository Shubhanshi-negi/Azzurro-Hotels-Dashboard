import type { Request, Response } from "express";

const { app, initialize } = require("../server/server") as typeof import("../server/server");

async function handler(request: Request, response: Response) {
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

module.exports = handler;
