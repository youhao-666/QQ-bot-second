const https = require("https");
const http = require("http");
const WebSocket = require("ws");
const config = require("../../config");

class BotClient {
  constructor() {
    this.accessToken = null;
    this.wsConnection = null;
    this.heartbeatInterval = null;
    this.tokenRefreshInterval = null; // 新增：令牌刷新定时器
    this.tokenExpiresAt = 0; // 新增：令牌过期时间戳
  }

  // 获取 AccessToken
  async getAccessToken() {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        appId: config.bot.appId,
        clientSecret: config.bot.clientSecret,
      });

      const options = {
        hostname: "bots.qq.com",
        port: 443,
        path: "/app/getAppAccessToken",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
        },
      };

      const req = https.request(options, (res) => {
        let responseData = "";

        res.on("data", (chunk) => {
          responseData += chunk;
        });

        res.on("end", () => {
          try {
            const result = JSON.parse(responseData);
            if (result.access_token) {
              console.log("✅ AccessToken 获取成功");
              this.accessToken = result.access_token;

              // 🔥 新增：记录令牌过期时间并启动自动刷新
              const expiresIn = result.expires_in || 600; // 默认600秒(10分钟)
              this.tokenExpiresAt = Date.now() + expiresIn * 1000;
              console.log(`令牌有效期: ${expiresIn}秒`);

              // 启动定时刷新
              this.startTokenRefresh(expiresIn);

              resolve(result.access_token);
            } else if (result.code) {
              const errorMsg = `获取AccessToken失败: ${result.code} - ${result.message}`;
              console.error(errorMsg);
              reject(new Error(errorMsg));
            } else {
              reject(new Error("未知响应格式"));
            }
          } catch (error) {
            reject(new Error(`解析响应失败: ${error.message}`));
          }
        });
      });

      req.on("error", (error) => {
        console.error("请求AccessToken失败:", error.message);
        reject(new Error(`请求失败: ${error.message}`));
      });

      req.write(postData);
      req.end();
    });
  }

  // 🔥 新增：启动令牌刷新定时器
  startTokenRefresh(expiresIn) {
    // 清除现有定时器
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
    }

    // 提前30秒刷新（最少提前10秒）
    const refreshDelay = Math.max(expiresIn - 30, 10) * 1000;

    console.log(`计划在 ${refreshDelay / 1000} 秒后自动刷新令牌`);

    this.tokenRefreshInterval = setInterval(async () => {
      console.log("🔄 自动刷新 AccessToken...");
      try {
        await this.getAccessToken();
      } catch (error) {
        console.error("自动刷新令牌失败:", error.message);
        // 失败后等待一段时间重试
        setTimeout(() => {
          console.log("🔄 尝试重新获取令牌...");
          this.getAccessToken().catch((err) => {
            console.error("重试获取令牌失败:", err.message);
          });
        }, 10000);
      }
    }, refreshDelay);
  }

  // 🔥 新增：检查令牌是否有效
  isTokenValid() {
    if (!this.accessToken || !this.tokenExpiresAt) {
      return false;
    }
    // 如果剩余时间少于60秒，视为即将过期
    return Date.now() < this.tokenExpiresAt - 60000;
  }

  // API 调用（通过代理）
  callAPI(apiPath, method = "GET", data = null, customToken = null) {
    return new Promise((resolve, reject) => {
      // 🔥 新增：在API调用前检查令牌有效性
      if (!this.isTokenValid()) {
        console.log("⚠️ 令牌已过期或即将过期，正在刷新...");
        this.getAccessToken()
          .then(() => {
            // 递归调用自身，使用新令牌
            this.callAPI(apiPath, method, data, customToken)
              .then(resolve)
              .catch(reject);
          })
          .catch((error) => {
            reject(new Error(`令牌刷新失败: ${error.message}`));
          });
        return;
      }

      const token = customToken || this.accessToken;
      if (!token) {
        reject(new Error("未找到有效的 AccessToken"));
        return;
      }

      const requestData = data ? JSON.stringify(data) : "";
      const options = {
        hostname: config.proxy.hostname,
        port: config.proxy.port,
        path: apiPath,
        method: method,
        headers: {
          Authorization: `QQBot ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      };

      if (data) {
        options.headers["Content-Length"] = Buffer.byteLength(requestData);
      }

      const req = http.request(options, (res) => {
        let responseData = "";

        res.on("data", (chunk) => {
          responseData += chunk;
        });

        res.on("end", () => {
          console.log("🔍 服务器原始响应:", responseData.substring(0, 200));
          try {
            const result = JSON.parse(responseData);
            resolve(result);
          } catch (error) {
            console.error("❌ 解析响应失败");
            resolve(responseData);
          }
        });
      });

      req.on("error", (error) => {
        console.error("API调用失败:", error.message);
        reject(new Error(`API调用失败: ${error.message}`));
      });

      req.on("timeout", () => {
        console.error("API请求超时");
        req.destroy();
        reject(new Error("请求超时"));
      });

      if (data) {
        req.write(requestData);
      }

      req.end();
    });
  }

  // 🔥 新增：发送群消息方法
  async sendGroupMessage(groupOpenId, content, options = {}) {
    try {
      const apiPath = `/v2/groups/${groupOpenId}/messages`;

      // 构建请求数据
      const requestData = {
        content: content,
        msg_type: options.msg_type || 0, // 0=文本, 2=Markdown
      };

      // 🔥 添加Markdown支持
      if (options.msg_type === 2 && options.markdown) {
        requestData.markdown = options.markdown;
        console.log(`📤 发送Markdown消息到 ${groupOpenId}`);
      } else {
        console.log(
          `📤 发送文本消息到 ${groupOpenId}: ${content.substring(0, 50)}...`
        );
      }

      // 添加可选参数
      if (options.msg_id !== undefined) requestData.msg_id = options.msg_id;
      if (options.event_id !== undefined)
        requestData.event_id = options.event_id;

      console.log(`请求数据:`, JSON.stringify(requestData, null, 2));

      const result = await this.callAPI(apiPath, "POST", requestData);

      if (result.code) {
        console.error(`❌ 发送失败 ${result.code}: ${result.message}`);
        throw new Error(`${result.code}: ${result.message}`);
      }

      console.log(`✅ 消息发送成功，消息ID: ${result.id}`);
      return result;
    } catch (error) {
      console.error(`❌ 发送消息失败: ${error.message}`);
      throw error;
    }
  }

  // 🔥 新增：发送私聊消息方法
  async sendPrivateMessage(userOpenId, content, options = {}) {
    try {
      const apiPath = `/v2/users/${userOpenId}/messages`;

      const requestData = {
        content: content,
        msg_type: options.msg_type || 0,
      };

      if (options.msg_id !== undefined) requestData.msg_id = options.msg_id;
      if (options.event_id !== undefined)
        requestData.event_id = options.event_id;

      console.log(`📤 发送私聊消息到用户 ${userOpenId}`);

      const result = await this.callAPI(apiPath, "POST", requestData);
      return result;
    } catch (error) {
      console.error(`发送私聊消息失败: ${error.message}`);
      throw error;
    }
  }

  // 建立 WebSocket 连接
  async connectWebSocket() {
    try {
      // 1. 获取网关地址
      const gateway = await this.callAPI("/gateway");
      if (gateway.code) {
        console.error(`获取网关失败: ${gateway.message}`);
        return false;
      }

      // 2. 使用官方 WebSocket 地址，直接连接
      const wsUrl = `${gateway.url}?v=9&encoding=json`;

      console.log(`原始地址: ${gateway.url}`);
      console.log(`使用官方 WebSocket 连接: ${wsUrl}`);
      console.log("正在连接 WebSocket...");

      this.wsConnection = new WebSocket(wsUrl);

      this.wsConnection.on("open", () => {
        console.log("✅ WebSocket 连接已建立");
        this.sendIdentify();
      });

      this.wsConnection.on("message", (data) => {
        this.handleWebSocketMessage(data);
      });

      this.wsConnection.on("error", (error) => {
        console.error("WebSocket错误:", error.message);
      });

      this.wsConnection.on("close", (code, reason) => {
        console.log(`WebSocket连接已关闭: ${code} - ${reason}`);
        this.cleanup();

        // 5秒后重新连接
        setTimeout(() => {
          console.log("尝试重新连接WebSocket...");
          this.connectWebSocket();
        }, 5000);
      });

      return true;
    } catch (error) {
      console.error("连接WebSocket失败:", error.message);
      return false;
    }
  }

  // 发送认证消息
  sendIdentify() {
    const identify = {
      op: 2,
      d: {
        token: `QQBot ${this.accessToken}`,
        intents: config.websocket.intents,
        shard: config.websocket.shard,
        properties: config.websocket.properties,
      },
    };

    this.wsConnection.send(JSON.stringify(identify));
  }

  // 处理 WebSocket 消息
  handleWebSocketMessage(data) {
    try {
      const message = JSON.parse(data.toString());

      switch (message.op) {
        case 10: // Hello - 心跳
          this.startHeartbeat(message.d.heartbeat_interval);
          break;

        case 0: // Dispatch - 事件
          this.handleDispatchEvent(message);
          break;

        case 11: // Heartbeat ACK
          // 心跳确认
          break;
      }
    } catch (error) {
      console.error("解析消息失败:", error);
    }
  }

  // 开始心跳
  startHeartbeat(interval) {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (
        this.wsConnection &&
        this.wsConnection.readyState === WebSocket.OPEN
      ) {
        this.wsConnection.send(JSON.stringify({ op: 1, d: null }));
      }
    }, interval);
  }

  // 处理事件分发 - 注意：这个方法会被外部覆盖
  handleDispatchEvent(message) {
    const eventType = message.t;
    const eventData = message.d;

    switch (eventType) {
      case "READY":
        console.log(`机器人已就绪: ${eventData.user.username}`);
        break;
      // 其他事件类型将由外部业务逻辑处理
    }
  }

  // 清理资源
  cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // 🔥 新增：清理令牌刷新定时器
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
      this.tokenRefreshInterval = null;
    }

    if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
  }

  // 启动机器人
  async start() {
    console.log("🚀 启动QQ机器人...");

    try {
      // 1. 获取 AccessToken
      await this.getAccessToken();

      // 2. 建立 WebSocket 连接
      const wsConnected = await this.connectWebSocket();

      if (!wsConnected) {
        console.error("WebSocket连接失败，程序退出");
        return;
      }

      console.log("🤖 机器人启动成功，等待消息...");
    } catch (error) {
      console.error("程序执行失败:", error.message);
      this.cleanup();
    }
  }
}

module.exports = BotClient;
