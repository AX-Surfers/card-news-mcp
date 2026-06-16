import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { RenderCardNewsInputSchema, renderCardNews } from "./tools/render-card-news.js";

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "card-news-mcp",
    version: "1.0.0",
  });

  server.tool(
    "render_card_news",
    "Render Instagram-style square (720x720) card news images from text + background images. " +
      "Returns PNG cards (as file path / URL / base64 depending on storage backend). " +
      "Supports thumbnail, body, and closing card types with themeable branding.",
    RenderCardNewsInputSchema.shape,
    async (input) => {
      const parsed = RenderCardNewsInputSchema.parse(input);
      const result = await renderCardNews(parsed);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  return server;
}
