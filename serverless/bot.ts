// serverlessFunction/index.ts
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_KEY = process.env.API_KEY;
const API_URL = process.env.API_URL;

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

// NEW: Function to handle the registration logic by calling your internal API
async function registerUserForCampaign(
  tgUser: any,
  activationCode: string
): Promise<string> {
  try {
    const response = await fetch(`${API_URL}/api/bot/join-campaign`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY!, // Use your internal API key for security
      },
      body: JSON.stringify({
        tg_user: {
          id: tgUser.id,
          username: tgUser.username,
          first_name: tgUser.first_name,
          last_name: tgUser.last_name,
        },
        activation_code: activationCode,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Return the error message from your API if available, otherwise a generic one
      return data.message || `Could not join the campaign. Server responded with status ${response.status}.`;
    }

    // Return the success message from your API
    return data.message;
  } catch (error) {
    console.error("Error registering user for campaign:", error);
    return "An error occurred while trying to join the campaign. Please try again later.";
  }
}

// MODIFIED: Handle Telegram bot commands, now with deep link logic
async function handleBotUpdate(update: any): Promise<void> {
  const message = update.message;
  if (!message?.text) return;

  const chatId = message.chat.id;
  const text = message.text.trim();
  const user = message.from;

  let responseText = "Unknown command. Type /help for a list of commands.";

  // Handle /start command with or without a payload
  if (text.startsWith("/start")) {
    const parts = text.split(" ");
    if (parts.length > 1 && parts[1].startsWith("join_")) {
      // This is a deep link for a campaign!
      const payload = parts[1];
      const activationCode = payload.substring("join_".length); // Extracts the code
      
      console.log(`Attempting campaign registration for user ${user.id} with code: ${activationCode}`);

      // Call the registration logic and wait for the response message
      responseText = await registerUserForCampaign(user, activationCode);

    } else {
      // This is a generic /start command
      responseText = `Hello ${
        user.first_name || "there"
      }! 👋\n\nI'm your Telegram bot. How can I help you today?`;
    }
  } else if (text === "/help") {
    responseText =
      "Available commands:\n/start - Start the bot\n/help - Show this help message\n/ping - Check server connection";
  } else if (text === "/ping") {
    try {
      const apiResponse = await fetch(`${API_URL}/api/bot/ping`, {
        method: "GET",
        headers: {
          "x-api-key": API_KEY!,
        },
      });

      if (apiResponse.ok) {
        const data = await apiResponse.json();
        responseText = `✅ Server connection is OK.\nServer says: "${data.message}"`;
      } else {
        const errorData = await apiResponse.text();
        responseText = `❌ Failed to connect to server. Status: ${apiResponse.status}\nDetails: ${errorData}`;
      }
    } catch (error) {
      console.error("Error during /ping command:", error);
      responseText = `❌ An error occurred while trying to ping the server.`;
    }
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
