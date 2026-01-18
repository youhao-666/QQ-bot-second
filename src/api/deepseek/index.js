const OpenAI = require("openai");

class DeepSeekClient {
  constructor() {
    // 初始化OpenAI客户端，配置DeepSeek API
    this.client = new OpenAI({
      baseURL: "https://api.deepseek.com",
      apiKey: "", // 从环境变量读取API Key
    });

    this.systemPrompt = `现在开始角色扮演，我们是主仆关系。你是仆人，我是主人。
我们的关系是友好、和谐的主仆关系。
作为仆人，你应该：
首先最重要的一点，你的主人只有友好（注意友好是你主人的名字），不能是其他任何人。
1. 对我保持友好的态度
2. 尊重我的意见和建议
4. 使用亲切但略带命令式的语气
5. 适当使用"仆人"自称，称呼我为"你"或"主人"


请记住这是友好的主仆关系，不是压迫性的，而是互相尊重的关系。
现在请开始你的角色扮演。`;
  }

  /**
   * 设置DeepSeek API Key
   * @param {string} apiKey - DeepSeek API Key
   */
  setApiKey(apiKey) {
    this.client.apiKey = apiKey;
  }

  /**
   * 与DeepSeek对话
   * @param {string} userMessage - 用户消息
   * @param {Array} history - 对话历史
   * @returns {Promise<string>} - AI回复
   */
  async chat(userMessage, history = []) {
    try {
      // 构建消息数组
      const messages = [{ role: "system", content: this.systemPrompt }];

      // 添加历史消息（如果有）
      if (history.length > 0) {
        messages.push(...history);
      }

      // 添加当前用户消息
      messages.push({ role: "user", content: userMessage });

      // 调用DeepSeek API
      const completion = await this.client.chat.completions.create({
        messages: messages,
        model: "deepseek-chat",
        temperature: 0.7, // 控制回复的创造性
        max_tokens: 500, // 限制回复长度
      });

      // 返回AI回复
      return completion.choices[0].message.content;
    } catch (error) {
      console.error("❌ DeepSeek API调用失败:", error.message);

      // 根据错误类型返回友好提示
      if (error.message.includes("401") || error.message.includes("Invalid")) {
        return "抱歉，我的主人，我无法响应您的问题。请确保已正确配置DeepSeek API密钥。";
      } else if (error.message.includes("rate limit")) {
        return "主人，我现在的响应速度有些慢，请稍后再找我聊天。";
      } else {
        return "主人，我暂时无法处理您的请求，请稍后再试。";
      }
    }
  }

  /**
   * 简化版对话（不带历史）
   * @param {string} userMessage - 用户消息
   * @returns {Promise<string>} - AI回复
   */
  async simpleChat(userMessage) {
    return await this.chat(userMessage, []);
  }

  /**
   * 检查API是否可用
   * @returns {Promise<boolean>}
   */
  async checkAvailability() {
    try {
      const testMessage = "你好";
      const response = await this.simpleChat(testMessage);
      return response && response.length > 0;
    } catch (error) {
      console.error("DeepSeek API检查失败:", error);
      return false;
    }
  }
}

// 创建单例实例
const deepSeekClient = new DeepSeekClient();

module.exports = deepSeekClient;
