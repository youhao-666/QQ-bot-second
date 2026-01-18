// file name: src/utils/leetcode/leetcode-image-service.js
const { createCanvas, registerFont } = require('canvas');
const path = require('path');
const fs = require('fs').promises;
const { existsSync } = require('fs');

class LeetCodeImageService {
    constructor() {
        this.isRunning = false;
        this.dataDir = path.join(__dirname, 'data');
        this.userFile = path.join(this.dataDir, 'user');
        this.statusFile = path.join(this.dataDir, 'user_status.json');

        // 加载原有项目
        this.leetcodeReport = null;
        this.loadReport();
    }

    /**
     * 加载报告模块
     */
    loadReport() {
        try {
            const originalMain = require('./main');
            this.leetcodeReport = originalMain;
            console.log('✅ LeetCode报告模块加载成功');
        } catch (error) {
            console.warn('⚠️  LeetCode报告模块加载失败:', error.message);
            this.leetcodeReport = null;
        }
    }

   

    /**
     * 生成图片报告
     */
    async generateImageReport() {
        if (this.isRunning) {
            return null;
        }

        this.isRunning = true;

        try {
            console.log('🔄 开始生成LeetCode打卡图片报告...');

            // 检查报告模块
            if (!this.leetcodeReport) {
                throw new Error('LeetCode报告模块未加载，请检查main.js文件');
            }

            // 获取真实数据
            console.log('📊 获取LeetCode数据...');
            const result = await this.leetcodeReport.generateReport();

            if (!result.success) {
                throw new Error(result.error || '生成报告失败');
            }

            if (!result.data) {
                throw new Error('报告数据为空');
            }

            const { todayQuestion, unfinishedUsers, unfinishedCount, finishedCount, top3, totalUsers } = result.data;

            // 验证必要数据
            if (!todayQuestion) {
                throw new Error('缺少今日题目数据');
            }

            // 生成图片
            console.log('🎨 生成图片...');
            const imageBuffer = await this.createLeetCodeImage(
                todayQuestion,
                unfinishedUsers || [],
                unfinishedCount || 0,
                finishedCount || 0,
                top3 || [],
                totalUsers || 0
            );

            console.log('✅ 图片报告生成完成');
            return imageBuffer;

        } catch (error) {
            console.error('❌ 生成图片报告失败:', error.message);
            // 生成错误图片
            return this.createErrorImage(error.message);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * 创建LeetCode统计图片
     */
    async createLeetCodeImage(todayQuestion, unfinishedUsers, unfinishedCount, finishedCount, top3, totalUsers) {
        const width = 800;
        const height = 1000;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');


        this.drawBackground(ctx, width, height);


        this.drawTitle(ctx, width);


        let y = this.drawTodayQuestion(ctx, todayQuestion, 120);


        y = this.drawTop3(ctx, top3, y + 30);


        y = this.drawUnfinishedList(ctx, unfinishedUsers, unfinishedCount, y + 30);


        // 返回图片Buffer
        return canvas.toBuffer('image/png');
    }

    /**
     * 绘制背景
     */
    drawBackground(ctx, width, height) {
        // 渐变背景
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#16213e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // 网格效果
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;

        // 水平线
        for (let i = 0; i < height; i += 30) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(width, i);
            ctx.stroke();
        }
    }

    /**
     * 绘制标题
     */
    drawTitle(ctx, width) {
        ctx.font = `bold 40px ${this.fontFamily}`;
        ctx.fillStyle = '#00adb5';
        ctx.textAlign = 'center';
        ctx.fillText('LeetCode 算法打卡统计', width / 2, 70);

        ctx.font = `18px ${this.fontFamily}`;
        ctx.fillStyle = '#eeeeee';
        ctx.fillText(`统计时间: ${new Date().toLocaleString('zh-CN')}`, width / 2, 100);

        // 装饰线
        ctx.strokeStyle = '#00adb5';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(width / 2 - 150, 110);
        ctx.lineTo(width / 2 + 150, 110);
        ctx.stroke();
    }

    /**
     * 绘制今日题目
     */
    drawTodayQuestion(ctx, todayQuestion, startY) {
        ctx.font = `bold 26px ${this.fontFamily}`;
        ctx.fillStyle = '#ffd369';
        ctx.textAlign = 'left';
        ctx.fillText('📝 今日一题', 40, startY);

        // 题目卡片背景
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        this.roundedRect(ctx, 40, startY + 20, 720, 120, 10);
        ctx.fill();

        // 题目信息
        ctx.font = `22px ${this.fontFamily}`;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`题目: ${todayQuestion.id || '未知'}. ${todayQuestion.title || '未知题目'}`, 60, startY + 55);

        // 难度显示
        let difficultyColor = '#4cd137'; // 简单-绿色
        const difficulty = todayQuestion.difficulty || '未知';
        if (difficulty === '中等' || difficulty === 'Medium') {
            difficultyColor = '#fbc531';
        } else if (difficulty === '困难' || difficulty === 'Hard') {
            difficultyColor = '#e84118';
        } else if (difficulty === '未知') {
            difficultyColor = '#8395a7';
        }

        ctx.fillStyle = difficultyColor;
        ctx.fillText(`难度: ${difficulty}`, 60, startY + 90);

        // 标签
        if (todayQuestion.topicTags && todayQuestion.topicTags.length > 0) {
            ctx.fillStyle = '#00adb5';
            ctx.fillText(`标签: ${todayQuestion.topicTags.join('、')}`, 60, startY + 125);
        }

        return startY + 150;
    }

    /**
     * 绘制圆角矩形辅助方法
     */
    roundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    /**
     * 绘制Top3
     */
    drawTop3(ctx, top3, startY) {
        if (!top3 || top3.length === 0) {
            ctx.font = `bold 26px ${this.fontFamily}`;
            ctx.fillStyle = '#ffd369';
            ctx.textAlign = 'left';
            ctx.fillText('🏆 昨日刷题Top3', 40, startY);

            ctx.font = `20px ${this.fontFamily}`;
            ctx.fillStyle = '#ffffff';
            ctx.fillText('暂无数据', 60, startY + 50);
            return startY + 80;
        }

        ctx.font = `bold 26px ${this.fontFamily}`;
        ctx.fillStyle = '#ffd369';
        ctx.textAlign = 'left';
        ctx.fillText('🏆 昨日刷题Top3', 40, startY);

        const medals = ['🥇', '🥈', '🥉'];
        const colors = ['#ff9f43', '#8395a7', '#ee5253'];

        top3.forEach((user, index) => {
            const y = startY + 50 + (index * 70);

            // 奖牌背景
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            this.roundedRect(ctx, 40, y - 30, 720, 60, 10);
            ctx.fill();

            // 奖牌
            ctx.font = '30px sans-serif';
            ctx.fillText(medals[index] || '🏅', 60, y);

            // 用户名
            ctx.font = `22px ${this.fontFamily}`;
            ctx.fillStyle = colors[index] || colors[0];
            const username = user.用户名 || user.name || `用户${index + 1}`;
            ctx.fillText(username, 100, y);

            // 刷题数
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'right';
            const solved = user.刷题数 || user.solved || 0;
            ctx.fillText(`刷题数: ${solved}`, 730, y);
            ctx.textAlign = 'left';

            // 进度条背景
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fillRect(100, y + 15, 600, 8);

            // 进度条填充
            const maxProblems = Math.max(...top3.map(u => u.刷题数 || u.solved || 0), 10);
            const barWidth = maxProblems > 0 ? (solved / maxProblems) * 600 : 0;
            ctx.fillStyle = colors[index] || colors[0];
            ctx.fillRect(100, y + 15, barWidth, 8);
        });

        return startY + 50 + (top3.length * 70);
    }


  /**
   * 绘制未打卡名单
   */drawUnfinishedList(ctx, unfinishedUsers, unfinishedCount, startY) {
        ctx.font = `bold 26px ${this.fontFamily}`;
        ctx.fillStyle = unfinishedCount > 0 ? '#ff7675' : '#00b894';
        ctx.textAlign = 'left';
        ctx.fillText(
            `📋 未打卡名单 (共${unfinishedCount || 0}人)`,
            40,
            startY
        );

        if (!unfinishedCount || unfinishedCount === 0 || !unfinishedUsers || unfinishedUsers.length === 0) {
            ctx.font = `24px ${this.fontFamily}`;
            ctx.fillStyle = '#00b894';
            ctx.fillText('🎉 全员打卡完成！', 40, startY + 50);
            return startY + 80;
        }

        // 分两列显示，每列显示一半的用户
        const halfCount = Math.ceil(unfinishedUsers.length / 2);
        const colWidth = 360;
        const xLeft = 40;
        const xRight = xLeft + colWidth + 20;

        // 绘制两列用户
        unfinishedUsers.forEach((user, index) => {
           // console.log(user.用户,user.连续未打卡天数)
            const col = index < halfCount ? 0 : 1;  // 0:左列，1:右列
            const row = col === 0 ? index : index - halfCount;

            const x = col === 0 ? xLeft : xRight;
            const y = startY + 50 + (row * 35);

            const missedDays = user.连续未打卡天数 || user.missedDays || 0;

            // 用户条目背景
            if (missedDays >= 3) {
                ctx.fillStyle = 'rgba(255, 118, 117, 0.2)';
            } else {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            }
            ctx.fillRect(x, y - 25, colWidth - 20, 30);

            // 用户名
            ctx.font = `20px ${this.fontFamily}`;
            ctx.fillStyle = missedDays >= 3 ? '#ff7675' : '#ffffff';
            const username = user.用户名 || user.name || `用户${index + 1}`;
            ctx.fillText(username, x + 10, y);

            // 未打卡天数
            ctx.textAlign = 'right';
            ctx.fillStyle = missedDays >= 3 ? '#ff7675' : '#dcdde1';
            ctx.fillText(`${missedDays}天未打卡`, x + colWidth - 30, y);
            ctx.textAlign = 'left';
        });

        // 计算需要的高度
        const leftColumnRows = Math.min(halfCount, unfinishedUsers.length);
        const rightColumnRows = Math.max(0, unfinishedUsers.length - halfCount);
        const maxRows = Math.max(leftColumnRows, rightColumnRows);

        return startY + 50 + (maxRows * 35);
    }


    /**
     * 生成错误图片
     */
    createErrorImage(errorMessage) {
        const width = 600;
        const height = 300;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // 错误背景
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#2d3436');
        gradient.addColorStop(1, '#636e72');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // 标题
        ctx.font = `bold 28px ${this.fontFamily}`;
        ctx.fillStyle = '#ff7675';
        ctx.textAlign = 'center';
        ctx.fillText('❌ 报告生成失败', width / 2, 60);

        // 错误信息
        ctx.font = `18px ${this.fontFamily}`;
        ctx.fillStyle = '#ffffff';

        // 分割错误信息
        const maxChars = 40;
        const words = errorMessage.split(' ');
        const lines = [];
        let currentLine = '';

        for (const word of words) {
            if ((currentLine + word).length > maxChars) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = currentLine ? `${currentLine} ${word}` : word;
            }
        }
        if (currentLine) lines.push(currentLine);

        // 绘制多行文本
        lines.forEach((line, index) => {
            ctx.fillText(line, width / 2, 120 + (index * 30));
        });

        // 底部提示
        ctx.font = `16px ${this.fontFamily}`;
        ctx.fillStyle = '#dcdde1';
        ctx.fillText('请检查数据源或配置文件', width / 2, height - 40);
        ctx.fillText(new Date().toLocaleString('zh-CN'), width / 2, height - 15);

        return canvas.toBuffer('image/png');
    }
}

module.exports = LeetCodeImageService;