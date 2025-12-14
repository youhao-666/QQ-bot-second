// file name: src/index.js
const BotClient = require("./core/bot-client");
const MessageHandler = require("./core/message-handler");

class QQBot {
  constructor() {
    console.log("🤖 初始化QQ机器人...");
    
    // 1. 创建客户端实例
    this.client = new BotClient();
    
    // 2. 创建消息处理器
    this.handler = new MessageHandler(this.client);
    
    // 3. 连接状态
    this.isConnected = false;
    this.connectionAttempts = 0;
    
    // 4. 定时器
    this.healthCheckInterval = null;
    this.reconnectTimeout = null;
  }

  // 启动机器人
  async start() {
    console.log("🚀 启动QQ机器人...");
    
    try {
      // 1. 启动客户端连接
      await this.client.start();
      this.isConnected = true;
      this.connectionAttempts = 0;
      
      // 2. 设置消息分发处理器
      this.client.handleDispatchEvent = (message) => {
        this.handleDispatch(message);
      };
      
      // 3. 设置WebSocket连接状态监听（直接通过属性访问）
      this.setupConnectionMonitoring();
      
      // 4. 连接后初始化
      this.onConnected();
      
      console.log("✅ 机器人启动流程完成");
      
      // 5. 启动健康检查
      this.startHealthCheck();
      
    } catch (error) {
      console.error("❌ 启动失败:", error.message);
      this.isConnected = false;
      
      // 尝试重新连接
      this.scheduleReconnect();
      throw error;
    }
  }

  // 设置连接监控
  setupConnectionMonitoring() {
    // 保存原始的WebSocket close处理方法
    const originalOnClose = this.client.wsConnection?.onclose;
    
    if (this.client.wsConnection) {
      this.client.wsConnection.onclose = (event) => {
        console.log(`❌ WebSocket连接断开: ${event.code} - ${event.reason || '无原因'}`);
        this.isConnected = false;
        this.onDisconnected();
        
        // 调用原始的处理方法（如果有）
        if (originalOnClose) {
          originalOnClose.call(this.client.wsConnection, event);
        }
      };
      
      this.client.wsConnection.onerror = (error) => {
        console.error("❌ WebSocket错误:", error.message);
        this.isConnected = false;
      };
      
      this.client.wsConnection.onopen = () => {
        console.log("✅ WebSocket连接已建立");
        this.isConnected = true;
        this.connectionAttempts = 0;
      };
    }
  }

  // 处理分发事件
  handleDispatch(message) {
    const eventType = message.t;
    const eventData = message.d;
    
    // 记录接收到的原始事件
  //  this.logEvent(eventType, eventData);
    
    // 交给消息处理器处理
    if (this.handler) {
      this.handler.handleEvent(eventType, eventData);
    }
  }


  // 连接成功回调
  onConnected() {
    console.log("🎉 机器人已成功连接到QQ平台");
    
    // 连接后执行的任务
    this.performPostConnectionTasks();
  }

  // 连接断开回调
  onDisconnected() {
    console.log("⚠️  机器人连接已断开");
    
    // 清理健康检查
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    // 尝试重新连接
    this.scheduleReconnect();
  }

  // 安排重新连接
  scheduleReconnect() {
    // 清除现有的重连定时器
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    this.connectionAttempts++;
    
    // 计算重连延迟（指数退避）
    const delay = Math.min(1000 * Math.pow(2, this.connectionAttempts), 30000);
    
    console.log(`🔄 ${this.connectionAttempts}秒后尝试重新连接 (第${this.connectionAttempts}次)...`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnect();
    }, delay);
  }

  // 重新连接
  async reconnect() {
    console.log("🔄 尝试重新连接...");
    
    try {
      // 清理现有连接
      this.cleanupConnection();
      
      // 重新启动
      await this.start();
      console.log("✅ 重新连接成功");
      
    } catch (error) {
      console.error("❌ 重新连接失败:", error.message);
      this.scheduleReconnect();
    }
  }

  // 清理连接资源
  cleanupConnection() {
    // 清理客户端连接
    if (this.client && this.client.cleanup) {
      this.client.cleanup();
    }
    
    // 清理定时器
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    this.isConnected = false;
  }

  // 连接后执行的任务
  async performPostConnectionTasks() {
    try {
      console.log("🔧 执行连接后初始化...");
      
    } catch (error) {
      console.log("ℹ️  连接后初始化部分失败:", error.message);
    }
  }

  // 记录群信息
  // async logGroupInfo() {
  //   try {
  //     const groups = await this.handler.getGroupList();
  //     const groupCount = groups.groups?.length || 0;
      
  //     if (groupCount > 0) {
  //       console.log(`📊 机器人所在群聊数量: ${groupCount}`);
        
  //       // 显示前3个群聊
  //       groups.groups.slice(0, 3).forEach((group, index) => {
  //         console.log(`  ${index + 1}. ${group.group_name || group.group_openid}`);
  //       });
        
  //       if (groupCount > 3) {
  //         console.log(`  ... 还有 ${groupCount - 3} 个群聊`);
  //       }
  //     } else {
  //       console.log("📭 机器人未加入任何群聊");
  //     }
  //   } catch (error) {
  //     // 可能是权限问题，不记录错误
  //     console.log("ℹ️  无法获取群列表（可能需要权限）");
  //   }
  // }

  // 启动健康检查
  startHealthCheck() {
    console.log("🏥 启动健康检查...");
    
    // 每5分钟检查一次连接状态
    this.healthCheckInterval = setInterval(() => {
      this.checkConnectionHealth();
    }, 5 * 60 * 1000);
  }

  // 检查连接健康状态
  checkConnectionHealth() {
    const now = new Date();
    console.log(`🩺 [${now.toLocaleTimeString()}] 连接健康检查...`);
    
    // 检查WebSocket连接状态
    if (this.client.wsConnection) {
      const state = this.client.wsConnection.readyState;
      const states = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];
      console.log(`  WebSocket状态: ${states[state]}`);
      
      // 只有OPEN状态才是正常连接
      if (state !== 1 && this.isConnected) {
        console.log(`  ⚠️  连接异常，尝试重新连接...`);
        this.isConnected = false;
        this.scheduleReconnect();
      }
    }
    
    // 检查Token有效期
    if (this.client.tokenExpiresAt) {
      const remaining = this.client.tokenExpiresAt - Date.now();
      const remainingSeconds = Math.round(remaining / 1000);
      console.log(`  Token剩余有效期: ${remainingSeconds}秒`);
      
      // 如果Token即将过期（少于60秒），触发刷新
      if (remainingSeconds < 60 && remainingSeconds > 0) {
        console.log(`  ⚠️  Token即将过期，正在刷新...`);
        this.client.getAccessToken().catch(err => {
          console.error(`  ❌ Token刷新失败: ${err.message}`);
        });
      }
    }
  }


  // 清理资源
  cleanup() {
    console.log("🧹 清理机器人资源...");
    
    // 清理连接
    this.cleanupConnection();
    
    // 清理处理器
    if (this.handler) {
      // 如果有需要清理的资源
      console.log("🧹 消息处理器已清理");
    }
    
    console.log("✅ 资源清理完成");
  }
}

// 主程序入口
async function main() {
  console.log("🤖 QQ机器人启动程序");
  
  const bot = new QQBot();
  
  // 全局保存实例以便调试
  global.botInstance = bot;
  
  // 注册退出处理
  setupProcessHandlers(bot);
  
  try {
    // 启动机器人
    await bot.start();
    
    console.log("✅ 机器人启动成功！");
    console.log("📝 事件监听已开启，等待消息...");
    
  } catch (error) {
    console.error("\n❌ 机器人启动失败:");
    console.error(error);
    
    // 即使启动失败，也尝试重新连接
    console.log("🔄 将尝试自动重新连接...");
  }
}

// 设置进程处理器
function setupProcessHandlers(bot) {
  // Ctrl+C 退出
  process.on("SIGINT", () => {
    console.log("\n\n🛑 收到退出信号 (Ctrl+C)");
    gracefulShutdown(bot);
  });
  
  // 进程终止信号
  process.on("SIGTERM", () => {
    console.log("\n\n🛑 收到终止信号");
    gracefulShutdown(bot);
  });
  
  // 未捕获的异常
  process.on("uncaughtException", (error) => {
    console.error("\n⚠️  未捕获的异常:", error);
    gracefulShutdown(bot);
  });
  
  // 未处理的Promise拒绝
  process.on("unhandledRejection", (reason, promise) => {
    console.error("\n⚠️  未处理的Promise拒绝:", reason);
    // 不立即退出，记录日志即可
  });
}

// 优雅关闭
function gracefulShutdown(bot) {
  console.log("🔄 正在关闭机器人...");
  
  // 清理资源
  bot.cleanup();
  
  console.log("👋 机器人已停止");
  
  // 延迟退出以确保日志输出完成
  setTimeout(() => {
    process.exit(0);
  }, 1000);
}

// 程序入口
if (require.main === module) {
  main().catch(error => {
    console.error("致命错误:", error);
    process.exit(1);
  });
}

// 导出供其他模块使用
module.exports = {
  QQBot,
  
  // 快捷创建函数
  createBot: () => new QQBot(),
  
  // 工具函数
  utils: {
    formatMessage: (content) => {
      return content.trim();
    },
    
    extractMention: (content) => {
      const match = content.match(/<@!(\d+)>/);
      return match ? match[1] : null;
    },
    
    isCommand: (content, prefix = '/') => {
      return content.trim().startsWith(prefix);
    }
  }
};