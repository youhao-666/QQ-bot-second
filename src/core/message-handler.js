// file name: src/core/message-handler.js
const BotClient = require("./bot-client");

class MessageHandler {
  constructor(botClient) {
    this.client = botClient;
    this.messageHandlers = new Map();
    
    // 🔥 注意：需要确保 leetcode-service.js 文件存在并且导出正确的类
    try {
      const LeetCodeService = require("../utils/leetcode/leetcode-service");
      this.leetcodeService = new LeetCodeService();
      console.log("✅ LeetCode服务已加载");
    } catch (error) {
      console.error("❌ 加载LeetCode服务失败:", error.message);
      this.leetcodeService = null;
    }
    
    // 注册默认处理器
    this.registerDefaultHandlers();
  }


  // 注册默认消息处理器
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

    // 服务器模式正常处理
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
    console.log(`🎉 机器人已就绪: ${eventData.user.username} (ID: ${eventData.user.id})`);
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
      const pureContent = content.replace(/<@!\d+>/g, '').trim();
      
      // 🔥 检查是否为命令
      if (this.isCommand(pureContent)) {
        return await this.handleCommand(pureContent, group_openid, id, userName);
      }
      
      // 判断消息内容并生成回复
      let reply = this.generateReply(pureContent, userName);
      
      // 发送回复
      if (reply) {
        const result = await this.client.sendGroupMessage(group_openid, reply, {
          msg_id: id,
          msg_type: 0
        });
        console.log(`✅ 回复发送成功: ${result.id}`);
        return result;
      }
      
    } catch (error) {
      console.error(`处理群@消息失败: ${error.message}`);
      throw error;
    }
  }

  // 🔥 检查是否为命令
  isCommand(content) {
    return content.startsWith('/');
  }

  // 🔥 处理命令
  async handleCommand(command, groupId, msgId, userName) {
    console.log(`🔧 处理命令: ${command}`);
    
    const args = command.split(' ');
    const cmd = args[0].toLowerCase();
    
    switch (cmd) {
      case '/算法打卡':
      case '/leetcode':
      case '/打卡':
        return await this.handleLeetCodeReport(groupId, msgId, userName);
        
      case '/帮助':
      case '/help':
        return await this.sendHelp(groupId, msgId);
        
      case '/时间':
      case '/time':
        return await this.sendTime(groupId, msgId);
        
      case '/状态':
      case '/status':
        return await this.sendBotStatus(groupId, msgId);
        
      default:
        return await this.client.sendGroupMessage(groupId, 
          `❓ 未知命令: ${cmd}\n输入 /帮助 查看可用命令`, {
          msg_id: msgId,
          msg_type: 0
        });
    }
  }

  // 🔥 处理LeetCode打卡报告（直接文本格式）
  async handleLeetCodeReport(groupId, msgId, userName) {
    try {
   
      // 检查LeetCode服务是否可用
      if (!this.leetcodeService) {
        throw new Error('LeetCode服务未加载');
      }
      
      // 🔥 直接调用 getTextReport 方法
      const textReport = await this.leetcodeService.getTextReport();
      
      console.log('发送文本格式报告...');
      return await this.client.sendGroupMessage(groupId, textReport, {
        msg_id: msgId,
        msg_type: 0  // 文本格式
      });
      
    } catch (error) {
      console.error('处理LeetCode命令失败:', error);
      
      const errorMsg = `❌ 生成报告失败: ${error.message}`;
      return await this.client.sendGroupMessage(groupId, errorMsg, {
        msg_id: msgId,
        msg_type: 0
      });
    }
  }

  // 🔥 发送帮助信息
  async sendHelp(groupId, msgId) {
    const helpText = `🤖 机器人帮助菜单\n\n` +
      `📝 可用命令:\n` +
      `• /算法打卡 或 /leetcode - 查看LeetCode打卡统计\n` +
      `• /帮助 或 /help - 显示此帮助信息\n` +
      `• /时间 或 /time - 查看当前时间\n` +
      `• /状态 或 /status - 查看机器人状态\n\n` +
      `💬 对话功能:\n` +
      `• @机器人 + 任意消息 - 与机器人对话`;
    
    return await this.client.sendGroupMessage(groupId, helpText, {
      msg_id: msgId,
      msg_type: 0
    });
  }

  // 🔥 发送时间
  async sendTime(groupId, msgId) {
    const now = new Date();
    const timeStr = now.toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'long'
    });
    
    const timeText = `🕐 当前时间：${timeStr}`;
    
    return await this.client.sendGroupMessage(groupId, timeText, {
      msg_id: msgId,
      msg_type: 0
    });
  }

  // 🔥 发送机器人状态
  async sendBotStatus(groupId, msgId) {
    const wsStatus = this.client.wsConnection?.readyState;
    let wsText = '❓ 未知';
    if (wsStatus === 0) wsText = '🔄 连接中';
    if (wsStatus === 1) wsText = '✅ 已连接';
    if (wsStatus === 2) wsText = '🔄 关闭中';
    if (wsStatus === 3) wsText = '❌ 已断开';
    
    const statusText = `🤖 机器人状态\n\n` +
      `• 运行状态: ✅ 在线\n` +
      `• 启动时间: ${new Date().toLocaleString('zh-CN')}\n` +
      `• WebSocket: ${wsText}\n` +
      `• 命令数量: ${this.messageHandlers.size}\n` +
      `• LeetCode服务: ${this.leetcodeService ? '✅ 已加载' : '❌ 未加载'}`;
    
    return await this.client.sendGroupMessage(groupId, statusText, {
      msg_id: msgId,
      msg_type: 0
    });
  }

  // 🔥 生成回复内容
  generateReply(content, userName) {
    if (!content) {
      return `你好，${userName}！有什么可以帮助你的吗？`;
    }
    
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('你好') || lowerContent.includes('hello') || lowerContent.includes('hi')) {
      return `你好呀，${userName}！我是机器人助手～`;
    } else if (lowerContent.includes('时间') || lowerContent.includes('几点')) {
      const now = new Date().toLocaleString('zh-CN');
      return `现在是北京时间：${now}`;
    } else if (lowerContent.includes('打卡')) {
      return `要查看LeetCode打卡统计吗？直接输入 /算法打卡 即可！`;
    } else {
      return `收到你的消息：${content}\n我是机器人助手，你可以问我时间、说"帮助"或输入 /算法打卡 获取更多功能～`;
    }
  }

  // 处理普通群消息
  async handleGroupMessage(eventData) {
    console.log("收到普通群消息");
    const { group_openid, content, id } = eventData;
    
    console.log(`群 ${group_openid}: ${content}`);
  }

}

module.exports = MessageHandler;