#!/usr/bin/env node
import { createMcpServer } from "./server.js";
import { closeBrowser } from "./renderer/playwright.js";

const args = process.argv.slice(2);
const useHttp =
  args.includes("--http") || process.env.MCP_TRANSPORT === "http";

async function runStdio() {
  const { StdioServerTransport } = await import(
    "@modelcontextprotocol/sdk/server/stdio.js"
  );
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdio: 로그는 stderr로 (stdout은 MCP 프로토콜 전용)
  console.error("card-news-mcp running on stdio");
}

async function runHttp() {
  const { StreamableHTTPServerTransport } = await import(
    "@modelcontextprotocol/sdk/server/streamableHttp.js"
  );
  const { createServer } = await import("http");
  const { randomUUID } = await import("crypto");

  const PORT = parseInt(process.env.PORT ?? "3000", 10);
  const SECRET = process.env.CARD_RENDERER_SECRET;

  const httpServer = createServer(async (req, res) => {
    if (SECRET && req.headers["authorization"] !== `Bearer ${SECRET}`) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }
    if (req.url?.startsWith("/mcp")) {
      const server = createMcpServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
      });
      await server.connect(transport);
      await transport.handleRequest(req, res);
      return;
    }
    res.writeHead(404);
    res.end();
  });

  httpServer.listen(PORT, () => {
    console.error(`card-news-mcp running on http://localhost:${PORT}/mcp`);
  });
}

async function main() {
  if (useHttp) await runHttp();
  else await runStdio();
}

for (const sig of ["SIGTERM", "SIGINT"]) {
  process.on(sig, async () => {
    await closeBrowser();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
