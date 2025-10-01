// serverlessFunction/index.ts
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_KEY = process.env.API_KEY;
const API_URL = process.env.API_URL;
const TMA_URL = process.env.TMA_URL;

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
  text: string,
  replyMarkup?: any
): Promise<any> {
  try {
    const body: any = {
      chat_id: chatId,
      text: text,
    };
    if (replyMarkup) {
      body.reply_markup = replyMarkup;
    }

    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();
    if (!data.ok) {
      throw new Error(`Telegram API error: ${data.description}`);
    }

    return data;
  } catch (error) {
    console.error("Ошибка отправки сообщения в Telegram:", error);
    throw error;
  }
}

// Function to send a photo with a button
async function sendTelegramPhotoWithButton(
  chatId: string | number,
  photoUrl: string,
  caption: string,
  buttonUrl: string
): Promise<any> {
  const response = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        photo: photoUrl,
        caption: caption,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🚀 Открыть кампанию",
                web_app: { url: buttonUrl },
              },
            ],
          ],
        },
      }),
    }
  );

  const data = await response.json();
  if (!data.ok) {
    // This will be caught by the orchestrator
    throw new Error(`Ошибка Telegram API (sendPhoto with button): ${data.description}`);
  }
  return data;
}

/**
 * Sends a campaign join confirmation message with multiple fallbacks.
 * 1. Tries to send a photo with a button.
 * 2. If that fails, tries to send a text message with a button.
 * 3. If that fails, sends a plain text message.
 */
async function sendCampaignJoinConfirmation(
  chatId: string | number,
  campaignTitle: string, // CHANGED: Now accepts title instead of a pre-made message
  coverUrl: string | undefined,
  tmaUrl: string
) {
  // The bot now creates the message. It's always clean and in Russian.
  const successMessage = `Поздравляем! Вы присоединились к кампании «${campaignTitle}»!`;

  // Fallback 1: Try to send Photo with Button
  if (coverUrl) {
    try {
      // Use the clean message as the caption
      await sendTelegramPhotoWithButton(chatId, coverUrl, successMessage, tmaUrl);
      console.log("Успешно: отправлено фото с кнопкой.");
      return; // Success
    } catch (error) {
      console.warn(`Не удалось отправить фото с кнопкой. Ошибка: ${(error as Error).message}. Переход к следующему варианту.`);
    }
  }

  // Fallback 2: Try to send Text with Button
  try {
    const replyMarkup = {
      inline_keyboard: [
        [
          {
            text: "🚀 Открыть кампанию",
            web_app: { url: tmaUrl },
          },
        ],
      ],
    };
    // Use the clean message as the text
    await sendTelegramMessage(chatId, successMessage, replyMarkup);
    console.log("Успешно: отправлено сообщение с кнопкой.");
    return; // Success
  } catch (error) {
    console.warn(`Не удалось отправить сообщение с кнопкой. Ошибка: ${(error as Error).message}. Переход к текстовому сообщению.`);
  }

  // Fallback 3: Send Plain Text Message
  try {
    // ONLY in this final fallback do we add the URL to the text.
    const fallbackMessage = `${successMessage}\n\nНачать путешествие:\n${tmaUrl}`;
    await sendTelegramMessage(chatId, fallbackMessage);
    console.log("Успешно: отправлено простое текстовое сообщение.");
  } catch (error) {
    console.error("КРИТИЧЕСКАЯ ОШИБКА: Не удалось отправить даже текстовое подтверждение.", error);
  }
}


// MODIFIED: This function now expects the new API response and returns a structured object
async function registerUserForCampaign(
  tgUser: any,
  activationCode: string
): Promise<{ success: boolean; message: string; data?: any }> { // Return type is now an object
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
      return {
        success: false,
        message: data.message || `Не удалось присоединиться. Статус: ${response.status}.`,
      };
    }

    // On success, return the full payload from the API
    return {
      success: true,
      message: data.message,
      data: data.data, // This contains the URLs
    };
  } catch (error) {
    console.error("Ошибка регистрации пользователя в кампании:", error);
    return {
      success: false,
      message: "Произошла ошибка при попытке присоединиться к кампании. Пожалуйста, попробуйте позже.",
    };
  }
}

// NEW: Function to call the backend and complete a QR mission
async function completeQrMissionByCode(
  tgUser: any,
  completionCode: string
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${API_URL}/api/bot/complete-qr-mission`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY!,
      },
      body: JSON.stringify({
        tg_user: {
          id: tgUser.id,
          username: tgUser.username,
          first_name: tgUser.first_name,
          last_name: tgUser.last_name,
        },
        completion_code: completionCode,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message:
          data.message ||
          `Не удалось выполнить миссию. Статус: ${response.status}.`,
      };
    }

    return {
      success: true,
      message: data.message,
    };
  } catch (error) {
    console.error("Ошибка выполнения QR-миссии:", error);
    return {
      success: false,
      message:
        "Произошла ошибка при обработке QR-кода. Пожалуйста, попробуйте позже.",
    };
  }
}

// MODIFIED: Handle Telegram bot commands, now with deep link logic
async function handleBotUpdate(update: any): Promise<void> {
  const message = update.message;
  if (!message?.text) return;

  const chatId = message.chat.id;
  const text = message.text.trim();
  const user = message.from;

  // Handle /start command with or without a payload
  if (text.startsWith("/start")) {
    const parts = text.split(" ");
    if (parts.length > 1 && parts[1].startsWith("join_")) {
      // This is a deep link for a campaign!
      const payload = parts[1];
      const activationCode = payload.substring("join_".length); // Extracts the code
      
      console.log(`Попытка регистрации в кампании для пользователя ${user.id} с кодом: ${activationCode}`);

      // Call the registration logic
      const result = await registerUserForCampaign(user, activationCode);

      try {
        // Check for the data the bot needs to build the message
        if (result.success && result.data?.title && result.data?.campaign_tma_url) {
          // SUCCESS: We have the data, so we can try sending rich messages
          await sendCampaignJoinConfirmation(
            chatId,
            result.data.title, // PASS THE TITLE
            result.data.campaign_cover_url,
            result.data.campaign_tma_url
          );
        } else {
          // FAILURE or missing data: Send a simple text message with the error/message
          // This is the ultimate fallback.
          await sendTelegramMessage(chatId, result.message);
        }
        console.log(
          `Бот ответил ${
            message.from.username || message.from.first_name
          }: ${text}`
        );
      } catch (error) {
        console.error("Не удалось отправить ответ бота для присоединения к кампании:", error);
      }
      return; // We've handled the response, so we exit.
    } else if (parts.length > 1 && parts[1].startsWith("qr_")) {
      // This is a deep link for a QR mission!
      const payload = parts[1];
      const completionCode = payload.substring("qr_".length); // Extracts the code

      console.log(
        `Попытка выполнения QR-миссии для пользователя ${user.id} с кодом: ${completionCode}`
      );

      // Call the completion logic
      const result = await completeQrMissionByCode(user, completionCode);

      try {
        // Always send a text message back with the result
        await sendTelegramMessage(chatId, result.message);
        console.log(
          `Бот ответил ${
            message.from.username || message.from.first_name
          }: ${text}`
        );
      } catch (error) {
        console.error(
          "Не удалось отправить ответ бота для выполнения QR-миссии:",
          error
        );
      }
      return; // We've handled the response, so we exit.
    }
  }

  // Handle plain /start command
  if (text === "/start") {
    const welcomeMessage = `Привет, ${
      user.first_name || "пользователь"
    }! 👋\n\nДобро пожаловать! Откройте приложение, чтобы начать.`;
    const replyMarkup = {
      inline_keyboard: [
        [
          {
            text: "🚀 Открыть приложение",
            web_app: { url: TMA_URL! },
          },
        ],
      ],
    };

    try {
      await sendTelegramMessage(chatId, welcomeMessage, replyMarkup);
      console.log(
        `Бот ответил ${
          message.from.username || message.from.first_name
        }: ${text}`
      );
    } catch (error) {
      console.error("Не удалось отправить ответ бота для /start:", error);
    }
    return; // We've handled the response, so we exit.
  }

  // For all other commands, we prepare a text response and send it at the end.
  let responseText = "Неизвестная команда. Введите /help для списка команд.";

  if (text === "/help") {
    responseText =
      "Доступные команды:\n/start - Запустить бота\n/help - Показать это сообщение\n/ping - Проверить соединение с сервером";
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
        responseText = `✅ Соединение с сервером в порядке.\nОтвет сервера: "${data.message}"`;
      } else {
        const errorData = await apiResponse.text();
        responseText = `❌ Не удалось подключиться к серверу. Статус: ${apiResponse.status}\nДетали: ${errorData}`;
      }
    } catch (error) {
      console.error("Ошибка при выполнении команды /ping:", error);
      responseText = `❌ Произошла ошибка при попытке проверить соединение с сервером.`;
    }
  }

  try {
    await sendTelegramMessage(chatId, responseText);
    console.log(
      `Бот ответил ${
        message.from.username || message.from.first_name
      }: ${text}`
    );
  } catch (error) {
    console.error("Не удалось отправить ответ бота:", error);
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
              message: "Не авторизован: неверный API ключ",
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
              message: "Отсутствуют обязательные поля: chat_id и message",
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
            message: "Сообщение успешно отправлено",
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
        JSON.stringify({ success: false, message: "Не найдено" }),
        {
          headers: { "Content-Type": "application/json" },
          status: 404,
        }
      );
    } catch (error) {
      console.error("Ошибка сервера:", error);
      return new Response(
        JSON.stringify({ success: false, message: "Внутренняя ошибка сервера" }),
        {
          headers: { "Content-Type": "application/json" },
          status: 500,
        }
      );
    }
  },
};
