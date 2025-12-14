// file name: src/utils/leetcode/main.js
const api = require("./api");
const user = require("./user");
const util = require("./util");

class LeetCodeReport {
  constructor() {
    this.model = {
      users: user.getUsers(),
      userStatus: user.readUserStatus(),
      yesterdaySubmissionCountMap: new Map(),
      todayQues: null,
      yesterdayQues: null,
      unfinishedUsers: 0,
      finishedUsers: 0,
    };
  }

  async fetchUserSubmissions() {
    const promises = [];
    
    for (const user of this.model.users) {
      let submissionsPromise;
      if (user.where == "US") {
        submissionsPromise = api.getRecentSubmissionUS(user.name);
      } else {
        submissionsPromise = api.getRecentSubmissionCN(user.name);
      }
      
      promises.push(
        submissionsPromise.then((submissions) => {
          let yesterdayQuesDone = false;
          const yesterdayAcSubmissions = new Set();

          for (const submission of submissions) {
            if (
              submission.submitTime < this.model.todayQues.time &&
              submission.submitTime >= this.model.yesterdayQues.time
            ) {
              if (submission.id == this.model.yesterdayQues.id) {
                yesterdayQuesDone = true;
              }
              yesterdayAcSubmissions.add(submission.id);
            }
          }

          let finished = (user.count > 200) ? 
            (this.model.yesterdayQues.difficulty === 'Hard' ? 
              yesterdayAcSubmissions.size > 0 : yesterdayQuesDone)
            : yesterdayAcSubmissions.size > 0;

          if (finished) {
            this.model.userStatus.data[user.id] = 0;
            this.model.finishedUsers++;
          } else {
            this.model.userStatus.data[user.id] =
              (this.model.userStatus.data[user.id] || 0) + 1;
          }
          this.model.yesterdaySubmissionCountMap.set(
            user.id,
            yesterdayAcSubmissions.size
          );
        })
      );
    }
    
    await Promise.all(promises);
  }

  getTop3() {
    const submissions = [];
    for (const [name, count] of this.model.yesterdaySubmissionCountMap) {
      if (count !== 0) {
        submissions.push([name, count]);
      }
    }
    submissions.sort((a, b) => b[1] - a[1]);
    
    let top3Count = [];
    for (const [_, count] of submissions) {
      if (top3Count.length == 3) break;
      top3Count.push(count);
    }

    util.shuffleArray(submissions);

    let top3Users = [];
    for (let i = 0; i < 3; i++) {
      for (const [name, count] of submissions) {
        if (top3Users.find(v => v.用户名 == name)) {
          continue;
        }

        if (count == top3Count[i]) {
          top3Users.push({
            用户名: name,
            刷题数: count,
          });
          break;
        }
      }
    }

    return top3Users;
  }

  getUnfinishedUsers() {
    const unfinishedUsers = [];
    for (const user of this.model.users) {
      if (this.model.userStatus.data[user.id] > 0) {
        unfinishedUsers.push({
          用户名: user.id,
          连续未打卡天数: this.model.userStatus.data[user.id],
        });
        this.model.unfinishedUsers++;
      }
    }
    unfinishedUsers.sort((a, b) => {
      const ret = a.连续未打卡天数 - b.连续未打卡天数;
      if (ret == 0) {
        return a.用户名.localeCompare(b.用户名);
      }
      return ret;
    });
    return unfinishedUsers;
  }

  async generateReport() {
    try {
      // 重置计数器
      this.model.unfinishedUsers = 0;
      this.model.finishedUsers = 0;
      this.model.yesterdaySubmissionCountMap.clear();
      
      // 获取题目信息
      const [todayQues, yesterdayQues] = await api.getQuestionOfTodayAndYesterdayCN();
      this.model.todayQues = todayQues;
      this.model.yesterdayQues = yesterdayQues;
      
      // 获取用户提交记录
      await this.fetchUserSubmissions();
      
      // 等待所有数据加载完成
      await new Promise((resolve) => {
        util.runWhen(
          () => resolve(),
          () => this.model.yesterdaySubmissionCountMap.size == this.model.users.length
        );
      });
      
      // 保存数据
      if (
        this.model.userStatus.updateTime == null ||
        this.model.todayQues.time >= this.model.userStatus.updateTime
      ) {
        this.model.userStatus.updateTime = this.model.todayQues.time + 24 * 60 * 60;
        user.writeUserStatus(this.model.userStatus);
      }
      
      // 生成报告数据
      const todayQuestion = {
        id: todayQues.id,
        title: todayQues.title,
        difficulty: todayQues.difficulty,
        topicTags: todayQues.topicTags || []
      };
      
      const unfinishedUsers = this.getUnfinishedUsers();
      const top3 = this.getTop3();
      
      return {
        success: true,
        data: {
          todayQuestion,
          unfinishedUsers,
          unfinishedCount: this.model.unfinishedUsers,
          finishedCount: this.model.finishedUsers,
          top3,
          totalUsers: this.model.users.length
        }
      };
      
    } catch (error) {
      console.error("生成报告失败:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// 保持原有导出
async function main() {
  const report = new LeetCodeReport();
  return await report.generateReport();
}

module.exports = {
  LeetCodeReport,
  generateReport: main,
  
  // 原有导出
  getTop3: () => new LeetCodeReport().getTop3(),
  getUnfinishedUsers: () => new LeetCodeReport().getUnfinishedUsers()
};