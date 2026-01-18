// file name: src/core/message-handler.js
const BotClient = require("./bot-client");
const fs = require("fs");
const path = require("path");
const http = require("http");
const os = require("os");

// 🔥 导入DeepSeek客户端
const deepSeek = require("../api/deepseek");

class MessageHandler {
  constructor(botClient) {
    this.client = botClient;
    this.messageHandlers = new Map();

    // 🔥 添加对话历史存储
    this.conversationHistory = new Map(); // key: group_openid, value: 对话历史数组

    // 创建临时目录
    this.tempDir = path.join(__dirname, "../../temp");
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }

    // 本地图片服务器
    this.imageServers = new Map();

    // 加载LeetCode图片服务
    try {
      const LeetCodeImageService = require("../utils/leetcode/leetcode-image-service");
      this.leetcodeImageService = new LeetCodeImageService();
      console.log("✅ LeetCode图片服务加载成功");
    } catch (error) {
      console.error("❌ 加载LeetCode图片服务失败:", error.message);
      this.leetcodeImageService = null;
    }

    // 🔥 初始化DeepSeek客户端
    this.initDeepSeekClient();

    // 注册默认处理器
    this.registerDefaultHandlers();

    // 启动图片服务器在固定端口
    this.startFixedImageServer();
  }

  // 🔥 初始化DeepSeek客户端
  initDeepSeekClient() {
    try {
      // 可以在这里设置API Key，或者从环境变量读取
      const config = require("../../config");
      if (config.deepseek && config.deepseek.apiKey) {
        deepSeek.setApiKey(config.deepseek.apiKey);
      }

      console.log("🔍 初始化DeepSeek客户端...");

      // 可选：检查API是否可用
      // deepSeek.checkAvailability().then(available => {
      //   if (available) {
      //     console.log("✅ DeepSeek客户端初始化成功");
      //   } else {
      //     console.warn("⚠️  DeepSeek API可能不可用，请检查配置");
      //   }
      // });
    } catch (error) {
      console.error("❌ 初始化DeepSeek客户端失败:", error.message);
    }
  }

  // 🔥 获取或初始化对话历史
  getConversationHistory(groupId) {
    if (!this.conversationHistory.has(groupId)) {
      // 初始化空的对话历史，最多保存最近10轮对话
      this.conversationHistory.set(groupId, []);
    }
    return this.conversationHistory.get(groupId);
  }

  // 🔥 添加消息到对话历史
  addToConversationHistory(groupId, role, content) {
    const history = this.getConversationHistory(groupId);
    history.push({ role, content });

    // 保持历史记录不超过10轮对话（20条消息）
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }
  }

  // 🔥 清理对话历史
  clearConversationHistory(groupId) {
    if (this.conversationHistory.has(groupId)) {
      this.conversationHistory.set(groupId, []);
    }
  }

  // 🔥 新增：启动固定端口图片服务器
  async startFixedImageServer() {
    return new Promise((resolve, reject) => {
      const PORT = 3000; // 固定端口

      this.fixedImageServer = http.createServer((req, res) => {
        console.log(`📥 收到图片请求: ${req.url}`);

        const filename = path.basename(req.url);
        const filePath = path.join(this.tempDir, filename);

        console.log(`📂 查找文件: ${filePath}`);

        if (fs.existsSync(filePath)) {
          const fileBuffer = fs.readFileSync(filePath);
          res.writeHead(200, {
            "Content-Type": "image/png",
            "Content-Length": fileBuffer.length,
            "Cache-Control": "no-cache",
            "Access-Control-Allow-Origin": "*",
          });
          res.end(fileBuffer);
          console.log(`✅ 提供图片: ${filename} (${fileBuffer.length} bytes)`);
        } else {
          res.writeHead(404);
          res.end("Not Found");
          console.log(`❌ 图片不存在: ${filename}, 路径: ${filePath}`);
        }
      });

      this.fixedImageServer.listen(PORT, "0.0.0.0", () => {
        console.log(`🌐 图片服务器已启动在端口 ${PORT}`);
        resolve();
      });

      this.fixedImageServer.on("error", (err) => {
        console.error("❌ 启动图片服务器失败:", err.message);
        reject(err);
      });
    });
  }

  /**
   * 注册默认的事件处理器
   */
  registerDefaultHandlers() {
    // 注册群@消息处理器
    this.registerHandler("GROUP_AT_MESSAGE_CREATE", async (data) => {
      return await this.handleGroupAtMessage(data);
    });

    // 注册普通群消息处理器
    this.registerHandler("GROUP_MSG_RECEIVE", async (data) => {
      return await this.handleGroupMessage(data);
    });

    // 注册机器人就绪处理器
    this.registerHandler("READY", (data) => {
      this.handleReady(data);
    });
  }

  // 注册自定义处理器
  registerHandler(eventType, handler) {
    this.messageHandlers.set(eventType, handler);
    console.log(`✅ 注册事件处理器: ${eventType}`);
  }

  // 主事件处理方法
  async handleEvent(eventType, eventData) {
    console.log(`📨 收到事件: ${eventType}`);

    const handler = this.messageHandlers.get(eventType);
    if (handler) {
      try {
        await handler(eventData);
      } catch (error) {
        console.error(`处理事件 ${eventType} 失败:`, error);
      }
    } else {
      console.log(`ℹ️  未注册的事件类型: ${eventType}`);
    }
  }

  // 机器人就绪事件
  handleReady(eventData) {
    console.log(
      `🎉 机器人已就绪: ${eventData.user.username} (ID: ${eventData.user.id})`,
    );
    console.log(`🌐 会话ID: ${eventData.session_id}`);
  }

  // 处理群@消息
  async handleGroupAtMessage(eventData) {
    console.log("收到群@消息");

    try {
      const { group_openid, content, id, author } = eventData;
      const userName = author?.username || "未知用户";

      console.log(`👤 ${userName}: ${content}`);

      // 移除@机器人的标记
      const pureContent = content.replace(/<@!\d+>/g, "").trim();

      // 🔥 检查是否为命令
      if (this.isCommand(pureContent)) {
        return await this.handleCommand(
          pureContent,
          group_openid,
          id,
          userName,
        );
      }

      // 🔥 检查是否需要AI回复（非命令的@消息）
      if (pureContent) {
        // 使用DeepSeek生成回复
        const aiReply = await this.generateAIReply(
          pureContent,
          group_openid,
          userName,
        );

        if (aiReply) {
          const result = await this.client.sendGroupMessage(
            group_openid,
            aiReply,
            {
              msg_id: id,
              msg_type: 0,
            },
          );
          console.log(`✅ AI回复发送成功: ${result.id}`);
          return result;
        }
      }

      // 如果AI回复失败或无内容，使用默认回复
      let reply = this.generateReply(pureContent, userName);

      // 发送回复
      if (reply) {
        const result = await this.client.sendGroupMessage(group_openid, reply, {
          msg_id: id,
          msg_type: 0,
        });
        console.log(`✅ 回复发送成功: ${result.id}`);
        return result;
      }
    } catch (error) {
      console.error(`处理群@消息失败: ${error.message}`);
      throw error;
    }
  }

  // 🔥 生成AI回复
  async generateAIReply(content, groupId, userName) {
    try {
      console.log(`🤖 使用DeepSeek生成回复...`);

      // 构建用户消息（可以包含用户名信息）
      const userMessage = `${userName}说：${content}`;

      // 获取对话历史
      const history = this.getConversationHistory(groupId);

      // 调用DeepSeek API
      const aiResponse = await deepSeek.chat(userMessage, history);

      // 保存到对话历史
      this.addToConversationHistory(groupId, "user", userMessage);
      this.addToConversationHistory(groupId, "assistant", aiResponse);

      console.log(`✅ DeepSeek回复生成成功`);
      return aiResponse;
    } catch (error) {
      console.error(`❌ DeepSeek回复生成失败:`, error.message);
      // 返回null，让上层使用默认回复
      return null;
    }
  }

  // 🔥 检查是否为命令
  isCommand(content) {
    return content.startsWith("/");
  }

  // 🔥 处理命令
  async handleCommand(command, groupId, msgId, userName) {
    console.log(`🔧 处理命令: ${command}`);

    const args = command.split(" ");
    const cmd = args[0].toLowerCase();

    switch (cmd) {
      case "/算法打卡":
      case "/leetcode":
      case "/打卡":
        return await this.handleLeetCodeReport(groupId, msgId, userName);

      case "/清空历史":
        this.clearConversationHistory(groupId);
        return await this.client.sendGroupMessage(
          groupId,
          `🧹 已清空我们的对话历史，重新开始聊天吧～`,
          {
            msg_id: msgId,
            msg_type: 0,
          },
        );

      default:
        return await this.client.sendGroupMessage(
          groupId,
          `❓ 未知命令: ${cmd}\n输入 /帮助 查看可用命令`,
          {
            msg_id: msgId,
            msg_type: 0,
          },
        );
    }
  }

  // 🔥 处理LeetCode打卡报告（发送图片版本）
  async handleLeetCodeReport(groupId, msgId, userName) {
    try {
      console.log(`👤 ${userName} 请求LeetCode打卡图片报告`);

      // 检查图片服务是否可用
      if (!this.leetcodeImageService) {
        throw new Error("LeetCode图片服务未加载");
      }

      // 生成图片Buffer
      console.log("🔄 开始生成LeetCode图片...");
      const imageBuffer = await this.leetcodeImageService.generateImageReport();

      if (!imageBuffer) {
        throw new Error("图片生成失败，返回空数据");
      }

      console.log(`✅ 图片生成成功，大小: ${imageBuffer.length} bytes`);

      // 保存图片到临时文件
      const imagePath = await this.saveImageBuffer(imageBuffer);

      // 获取图片的网络URL（用于上传）
      const imageUrl = await this.createImageUrl(imagePath);
      console.log(`🌐 最终图片URL: ${imageUrl}`);

      // 调用官方API上传并发送图片
      const result = await this.uploadAndSendImageDirectly(
        groupId,
        imageUrl,
        msgId,
      );

      console.log(`✅ 图片发送成功，消息ID: ${result.id || "未知"}`);
      return result;
    } catch (error) {
      console.error("❌ 处理LeetCode命令失败:", error);

      // 发送错误消息
      const errorMsg = `❌ 生成图片报告失败: ${error.message}`;
      return await this.client.sendGroupMessage(groupId, errorMsg, {
        msg_id: msgId,
        msg_type: 0,
      });
    }
  }

  // 🔥 保存图片Buffer到临时文件
  async saveImageBuffer(imageBuffer) {
    const timestamp = Date.now();
    const filename = `leetcode_report_${timestamp}.png`;
    const imagePath = path.join(this.tempDir, filename);

    await fs.promises.writeFile(imagePath, imageBuffer);
    console.log(`💾 图片已保存: ${imagePath}`);

    return imagePath;
  }

  // 🔥 创建图片网络URL（用于上传到QQ平台）
  async createImageUrl(imagePath) {
    const filename = path.basename(imagePath);

    // 服务器上使用公网IP
    const config = require("../../config");
    const serverIP = config.proxy.hostname;
    //const serverIP = "https://7f6306fba075.ngrok-free.app";
    const port = config.server?.imageServerPort || 3000;

    const imageUrl = `http://${serverIP}:${port}/${filename}`;
    //const imageUrl = `${serverIP}/${filename}`;

    console.log(`🌐 服务器图片URL: ${imageUrl}`);

    // 确保图片在temp目录
    const tempFilePath = path.join(this.tempDir, filename);
    if (!fs.existsSync(tempFilePath)) {
      const imageBuffer = fs.readFileSync(imagePath);
      await fs.promises.writeFile(tempFilePath, imageBuffer);
    }

    return imageUrl;
  }

  // 🔥 根据官方文档上传图片到QQ平台并直接发送
  async uploadAndSendImageDirectly(groupId, imageUrl, msgId) {
    try {
      console.log("📤 上传图片到QQ平台...");

      // 🔥 第一步：上传文件但不发送
      const uploadRequestData = {
        file_type: 1,
        url: imageUrl,
        srv_send_msg: false, // 🔥 设置为false，只上传不发送
      };

      console.log("📋 上传请求:", JSON.stringify(uploadRequestData, null, 2));

      const uploadApiPath = `/v2/groups/${groupId}/files`;
      const uploadResult = await this.client.callAPI(
        uploadApiPath,
        "POST",
        uploadRequestData,
      );

      if (uploadResult.code) {
        console.error("❌ 上传失败详情:", uploadResult);
        throw new Error(
          `上传失败 ${uploadResult.code}: ${uploadResult.message}`,
        );
      }

      console.log("✅ 图片上传成功:", uploadResult);

      // 🔥 第二步：使用返回的file_info发送消息
      const fileInfo = uploadResult.file_info;
      if (!fileInfo) {
        throw new Error("上传成功但未返回file_info");
      }

      console.log(`📁 文件信息: ${fileInfo}`);
      console.log(`⏰ 有效期: ${uploadResult.ttl}秒`);

      // 🔥 第三步：发送带图片的消息（回复原消息）
      const messageData = {
        content: "", // 可以是空或添加一些文字
        msg_type: 7, // 7表示富媒体消息
        media: {
          file_info: fileInfo,
        },
        msg_id: msgId, // 🔥 重要：回复原消息
      };

      console.log("📤 发送图片消息...");
      const sendApiPath = `/v2/groups/${groupId}/messages`;
      const sendResult = await this.client.callAPI(
        sendApiPath,
        "POST",
        messageData,
      );

      if (sendResult.code) {
        throw new Error(`发送失败 ${sendResult.code}: ${sendResult.message}`);
      }

      console.log("✅ 图片消息发送成功:", sendResult);
      return sendResult;
    } catch (error) {
      console.error("❌ 上传图片失败:", error);
      throw error;
    }
  }

  // 🔥 修改默认回复生成逻辑
  generateReply(content, userName) {
    if (!content) {
      return `你好，${userName}！有什么可以帮助你的吗？`;
    }

    const lowerContent = content.toLowerCase();

    if (
      lowerContent.includes("你好") ||
      lowerContent.includes("hello") ||
      lowerContent.includes("hi")
    ) {
      return `你好呀，${userName}！我是机器人助手～`;
    } else if (lowerContent.includes("时间") || lowerContent.includes("几点")) {
      const now = new Date().toLocaleString("zh-CN");
      return `现在是北京时间：${now}`;
    } else if (lowerContent.includes("帮助") || lowerContent.includes("help")) {
      return `🤖 可用命令：
@机器人 /算法打卡 - 生成LeetCode打卡统计图片
@机器人 /帮助 - 查看可用命令
@机器人 /清空历史 - 清空对话历史`;
    } else if (lowerContent.includes("打卡")) {
      return `要查看LeetCode打卡统计吗？直接@我并输入 /算法打卡 即可生成图片报告！`;
    } else {
      // 🔥 对于非命令消息，引导用户@机器人或使用AI
      return `收到你的消息：${content}\n要和我聊天吗？请@我并直接说话哦～`;
    }
  }

  // 处理普通群消息
  async handleGroupMessage(eventData) {
    console.log("收到普通群消息");
    const { group_openid, content, id } = eventData;

    console.log(`群 ${group_openid}: ${content}`);
  }

  // 🔥 修改清理资源方法
  cleanup() {
    console.log("🧹 开始清理资源...");

    // 关闭固定图片服务器
    if (this.fixedImageServer) {
      try {
        this.fixedImageServer.close();
        console.log("🛑 关闭固定图片服务器");
      } catch (error) {
        console.error("关闭固定服务器失败:", error);
      }
    }

    // 关闭所有临时图片服务器
    for (const [url, serverInfo] of this.imageServers.entries()) {
      try {
        serverInfo.server.close();
      } catch (error) {
        // 忽略关闭错误
      }
    }
    this.imageServers.clear();

    // 🔥 清理对话历史
    this.conversationHistory.clear();
    console.log("🧹 清理对话历史完成");

    // 🔥 清理临时目录中的旧文件
    this.cleanupTempFiles();
  }

  // 🔥 新增：清理临时文件
  cleanupTempFiles() {
    try {
      const files = fs.readdirSync(this.tempDir);
      const now = Date.now();
      const MAX_AGE = 24 * 60 * 60 * 1000; // 24小时

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = fs.statSync(filePath);

        // 删除超过24小时的临时文件
        if (now - stats.mtimeMs > MAX_AGE) {
          fs.unlinkSync(filePath);
          console.log(`🗑️  删除旧文件: ${file}`);
        }
      }
      console.log(`🧹 临时文件清理完成`);
    } catch (error) {
      console.error(`❌ 清理临时文件失败:`, error.message);
    }
  }
}

module.exports = MessageHandler;
