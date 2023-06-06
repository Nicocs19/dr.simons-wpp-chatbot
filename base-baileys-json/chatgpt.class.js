const { CoreClass } = require("@bot-whatsapp/bot");
const keyPoints = require("./src/keyPoints.json");
const emojiUnicode = require("emoji-unicode");

class chatGPTClass extends CoreClass {
  queue = [];
  optionGPT = { model: "gpt-3.5-turbo" };
  openai = undefined;
  keyPoints = keyPoints;

  constructor(_database, _provider, _optionsGPT = {}) {
    super(null, _database, _provider);
    this.init().then();
  }

  // Iniciando...
  init = async () => {
    const { ChatGPTAPI } = await import("chatgpt");
    this.openai = new ChatGPTAPI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  };

  handleMsg = async (ctx) => {
    const { from, body } = ctx;

    // Construir el prompt dinámicamente
    const prompt = this.buildPrompt(body);

    const completion = await this.openai.sendMessage(prompt, {
      conversationId: !this.queue.length
        ? undefined
        : this.queue[this.queue.length - 1].conversationId,
      parentMessageId: !this.queue.length
        ? undefined
        : this.queue[this.queue.length - 1].id,
    });

    this.queue.push(completion);

    // No incluir los keyPoints en la respuesta final
    const parseMessage = {
      ...completion,
      answer: this.addEmojis(completion.text),
    };

    // Si la respuesta incluye un enlace, extraerlo y agregarlo a los keyPoints
    if (parseMessage.answer.includes("http")) {
      const link = parseMessage.answer.match(/(http[s]?:\/\/[^\s]+)/g);
      this.keyPoints += `\n\nEnlace para consulta en línea: ${link}`;
    }

    // Enviar la respusta al usuario
    this.sendFlowSimple([parseMessage], from);
  };

  buildPrompt = (userMessage) => {
    const greeting =
      "¡Hola! Como asistente AI al servicio del Dr.Cristian Simons, tu misión es manejar consultas sobre programación de citas, pagos, procedimientos quirúrgicos y dudas en general en el contexto de la consulta médica en línea.";

    const formattedKeyPoints = Array.isArray(this.keyPoints)
      ? this.keyPoints.join("\n")
      : "";

    const prompt = `
      ${greeting}
      ${formattedKeyPoints}
      ${userMessage}
    `;

    return prompt.trim();
  };

  addEmojis = (text) => {
    const emojiRegex = /:[\w-]+:/g;
    const emojis = text.match(emojiRegex);
    if (emojis) {
      emojis.forEach((emoji) => {
        const unicode = emojiUnicode.getUnicode(emoji);
        text = text.replace(emoji, unicode);
      });
    }
    return text;
  };

  updateKeyPoints = (newPoint) => {
    this.keyPoints.push(newPoint);
  };
}

module.exports = chatGPTClass;
