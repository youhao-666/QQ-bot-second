// file name: src/utils/leetcode/leetcode-service.js
const path = require('path');
const fs = require('fs').promises;

class LeetCodeService {
  constructor() {
    this.isRunning = false;
    this.dataDir = path.join(__dirname, 'data');
    this.userFile = path.join(this.dataDir, 'user');
    this.statusFile = path.join(this.dataDir, 'user_status.json');
    
    // 🔥 导入你原有的LeetCode项目
    try {
      // 确保路径正确
      const originalMain = require('./main');
      this.leetcodeReport = originalMain;
    } catch (error) {
      this.leetcodeReport = null;
    }
  }
  
  /**
   * 获取文本格式报告 - 直接使用原有项目
   */
  async getTextReport() {
    if (this.isRunning) {
      return '⏳ 正在生成报告，请稍等...';
    }
    
    this.isRunning = true;
    
    try {
      console.log('开始生成LeetCode打卡报告...');
      
      if (!this.leetcodeReport) {
        throw new Error('LeetCode项目未加载');
      }
      
      // 🔥 直接调用原有项目的 generateReport 函数
      const result = await this.leetcodeReport.generateReport();
      
      if (!result.success) {
        throw new Error(result.error || '生成报告失败');
      }
      
      const { todayQuestion, unfinishedUsers, unfinishedCount, finishedCount, top3, totalUsers } = result.data;
      
      // 格式化文本报告
      const textReport = this.formatTextReport(todayQuestion, {
        unfinishedUsers,
        unfinishedCount,
        finishedCount,
        top3,
        totalUsers
      });
      
      console.log('✅ 报告生成完成');
      return textReport;
      
    } catch (error) {
      console.error('❌ 生成打卡报告失败:', error);
      
      let errorMessage = `📊 LeetCode 算法打卡统计\n`;
      errorMessage += `统计时间: ${new Date().toLocaleString('zh-CN')}\n`;
      errorMessage += '='.repeat(40) + '\n\n';
      errorMessage += `❌ 生成报告失败: ${error.message}\n\n`;
      errorMessage += `可能原因:\n`;
      errorMessage += `1. 原有项目API调用失败\n`;
      errorMessage += `2. 用户文件格式错误\n`;
      errorMessage += `3. 网络连接问题\n`;
      errorMessage += '='.repeat(40);
      
      return errorMessage;
    } finally {
      this.isRunning = false;
    }
  }
  
  /**
   * 格式化文本报告
   */
  formatTextReport(todayQuestion, reportData) {
    const { unfinishedUsers, unfinishedCount, finishedCount, top3, totalUsers } = reportData;
    const progress = totalUsers > 0 ? (finishedCount / totalUsers * 100).toFixed(1) : 0;
    
    let text = `📊 LeetCode 算法打卡统计\n`;
    text += `统计时间: ${new Date().toLocaleString('zh-CN')}\n`;
    text += '='.repeat(40) + '\n\n';
    
    // 今日题目
    text += `📝 今日一题\n`;
    text += `题目: ${todayQuestion.id}. ${todayQuestion.title}\n`;
    
    let difficultyEmoji = '🟡';
    if (todayQuestion.difficulty === '简单' || todayQuestion.difficulty === 'Easy') difficultyEmoji = '🟢';
    if (todayQuestion.difficulty === '困难' || todayQuestion.difficulty === 'Hard') difficultyEmoji = '🔴';
    
    text += `难度: ${difficultyEmoji} ${todayQuestion.difficulty}\n`;
    
    if (todayQuestion.topicTags && todayQuestion.topicTags.length > 0) {
      text += `标签: ${todayQuestion.topicTags.join('、')}\n`;
    }
    text += `\n`;
    
    
    // Top3
    if (top3 && top3.length > 0) {
      text += `🏆 昨日刷题Top3\n`;
      const medals = ['🥇', '🥈', '🥉'];
      top3.forEach((user, index) => {
        const medal = medals[index] || '🏅';
        text += `${medal} ${user.用户名} - 刷题数: ${user.刷题数}\n`;
      });
      text += `\n`;
    } else {
      text += `🏆 昨日刷题Top3\n`;
      text += `暂无数据\n\n`;
    }
    
    // 未打卡名单
    if (unfinishedUsers && unfinishedUsers.length > 0) {
      text += `📋 未打卡名单 (共${unfinishedCount}人)\n`;
      
      unfinishedUsers.forEach(user => {
        const days = user.连续未打卡天数;
 
        text += ` ${user.用户名} - ${days}天未打卡\n`;
      });
      text += `\n`;
    } else {
      text += `📋 未打卡名单\n`;
      text += `🎉 全员打卡完成！\n\n`;
    }
    
    
    return text;
  }
}

module.exports = LeetCodeService;