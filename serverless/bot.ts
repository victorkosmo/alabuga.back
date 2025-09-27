// index.ts
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_KEY = process.env.API_KEY;

if (!BOT_TOKEN || !API_KEY) {
  console.error(
    "Error: Missing TELEGRAM_BOT_TOKEN or API_KEY in environment variables."
  );
  process.exit(1);
}

// API Key middleware
function checkApiKey(request: Request): boolean {
  const apiKey = request.headers.get("x-api-key");
  return apiKey === API_KEY;
}

// Send message to Telegram user
async function sendTelegramMessage(
  chatId: string | number,
  text: string
): Promise<any> {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
        }),
      }
    );

    const data = await response.json();
    if (!data.ok) {
      throw new Error(`Telegram API error: ${data.description}`);
    }

    return data;
  } catch (error) {
    console.error("Error sending Telegram message:", error);
    throw error;
  }
}

// Handle Telegram bot commands
async function handleBotUpdate(update: any): Promise<void> {
  const message = update.message;
  if (!message?.text) return;

  const chatId = message.chat.id;
  const text = message.text.trim();

  let responseText = "Unknown command";

  if (text === "/start") {
    responseText = `Hello ${
      message.from.first_name || "there"
    }! 👋\n\nI'm your Telegram bot. How can I help you today?`;
  } else if (text === "/help") {
    responseText =
      "Available commands:\n/start - Start the bot\n/help - Show this help message";
  }

  try {
    await sendTelegramMessage(chatId, responseText);
    console.log(
      `Bot responded to ${
        message.from.username || message.from.first_name
      }: ${text}`
    );
  } catch (error) {
    console.error("Failed to send bot response:", error);
  }
}

// Main serverless function
export default {
  port: process.env.PORT || 3000,

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    try {
      // Webhook endpoint for Telegram bot updates
      if (url.pathname === "/webhook" && method === "POST") {
        const update = await request.json();
        await handleBotUpdate(update);

        return new Response("OK", { status: 200 });
      }

      // Send message endpoint (requires API key)
      if (url.pathname === "/send-message" && method === "POST") {
        // Check API key
        if (!checkApiKey(request)) {
          return new Response(
            JSON.stringify({
              success: false,
              message: "Unauthorized: Invalid API key",
            }),
            {
              headers: { "Content-Type": "application/json" },
              status: 401,
            }
          );
        }

        const body = (await request.json()) as {
          chat_id?: string | number;
          message?: string;
        };
        const { chat_id, message } = body;

        if (!chat_id || !message) {
          return new Response(
            JSON.stringify({
              success: false,
              message: "Missing required fields: chat_id and message",
            }),
            {
              headers: { "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        await sendTelegramMessage(chat_id, message);

        return new Response(
          JSON.stringify({
            success: true,
            message: "Message sent successfully",
          }),
          {
            headers: { "Content-Type": "application/json" },
            status: 200,
          }
        );
      }

      // Health check endpoint
      if (url.pathname === "/health" && method === "GET") {
        return new Response(
          JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }),
          {
            headers: { "Content-Type": "application/json" },
            status: 200,
          }
        );
      }

      // 404 for other routes
      return new Response(
        JSON.stringify({ success: false, message: "Not Found" }),
        {
          headers: { "Content-Type": "application/json" },
          status: 404,
        }
      );
    } catch (error) {
      console.error("Server error:", error);
      return new Response(
        JSON.stringify({ success: false, message: "Internal Server Error" }),
        {
          headers: { "Content-Type": "application/json" },
          status: 500,
        }
      );
    }
  },
};
