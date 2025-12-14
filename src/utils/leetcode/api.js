const queries = require("./queries");

async function getRecentAcSubmissionsUS(username, limit) {
  const submissions = (
    await postUS(queries.recentAcSubmissionsUS, {
      username: username,
      limit: limit || 30,
    })
  ).recentAcSubmissionList;

  const ret = [];
  for (const submission of submissions) {
    const question = await getQuestionDataUS(submission.titleSlug);
    ret.push({
      id: question.questionFrontendId,
      title: submission.title,
      submitTime: submission.timestamp,
    });
  }

  return ret;
}

async function getQuestionDataUS(slug) {
  return (
    await postUS(queries.questionDataUS, {
      titleSlug: slug,
    })
  ).question;
}

async function getQuestionOfTodayAndYesterdayUS() {
  const questionOfToday = await getQuestionOfTodayUS();
  const todayStartTimestamp = questionOfToday.time;
  const hour24 = 24 * 60 * 60;
  const yesterdayStartTimestamp = todayStartTimestamp - hour24;

  const yesterday = new Date(yesterdayStartTimestamp * 1000);
  const dailyCodingQuestions = await getDailyCodingQuestingRecordUS(
    yesterday.getFullYear(),
    yesterday.getMonth() + 1
  );
  const questionofYesterday = dailyCodingQuestions[yesterday.getDate() - 1];

  return [questionOfToday, questionofYesterday];
}

async function getQuestionOfTodayUS() {
  const question = (await postUS(queries.questionOfTodayUS))
    .activeDailyCodingChallengeQuestion;
  return {
    id: question.question.questionFrontendId,
    title: question.question.title,
    time: Date.parse(question.date) / 1000,
  };
}

async function getDailyCodingQuestingRecordUS(year, month) {
  const questions = (
    await postUS(queries.dailyCodingQuestionRecordsUS, {
      year: year,
      month: month,
    })
  ).dailyCodingChallengeV2.challenges;
  return questions.map((e) => {
    return {
      id: e.question.questionFrontendId,
      title: e.question.title,
      time: Date.parse(e.date) / 1000,
    };
  });
}

async function getRecentACSubmissionsCN(username) {
  const submissions = (
    await postCNAc(queries.recentSubmissionsCN, {
      username: username,
    })
  ).recentACSubmissions;

  const ret = [];
  for (const submission of submissions) {
    ret.push({
      id: submission.question.questionFrontendId,
      title: submission.question.translatedTitle,
      submitTime: submission.submitTime,
    });
  }

  return ret;
}

async function getQuestionOfTodayAndYesterdayCN() {
  const questionOfToday = await getQuestionOfTodayCN();
  const todayStartTimestamp = questionOfToday.time;
  const hour24 = 24 * 60 * 60;
  const yesterdayStartTimestamp = todayStartTimestamp - hour24;

  const yesterday = new Date(yesterdayStartTimestamp * 1000);
  const dailyCodingQuestions = await getDailyCodingQuestingRecordCN(
    yesterday.getFullYear(),
    yesterday.getMonth() + 1
  );

  const today = new Date(todayStartTimestamp * 1000);
 
  var questionofYesterday = null;

  if(today.getDate() == 1) {
    questionofYesterday = dailyCodingQuestions[0];
  }else {
    questionofYesterday = dailyCodingQuestions[1];
  }

  return [questionOfToday, questionofYesterday];
}

async function getQuestionOfTodayCN() {
  const question = (await postCN(queries.questionOfTodayCN))
    .todayRecord[0];
  return {
    id: question.question.questionFrontendId,
    title: question.question.translatedTitle,
    time: Date.parse(question.date) / 1000,
    difficulty: question.question.difficulty,
    topicTags: question.question.topicTags.map((tag) => tag.translatedName),
  };
}

async function getDailyCodingQuestingRecordCN(year, month) {
  const questions = (
    await postCN(queries.dailyQuestionRecordsCN, {
      year: year,
      month: month,
    })
  ).dailyQuestionRecords;
  return questions.map((e) => {
    return {
      id: e.question.questionFrontendId,
      title: e.question.translatedTitle,
      time: Date.parse(e.date) / 1000,
      difficulty: e.question.difficulty,
    };
  });
}

function postCNAc(query, variables) {
  return post("leetcode.cn", "/graphql/noj-go/", query, variables);
}

function postCN(query, variables) {
  return post("leetcode.cn", "/graphql/", query, variables);
}

function postUS(query, variables) {
  return post("leetcode.com", "/graphql/", query, variables);
}

function post(hostname, path, query, variables) {
  const https = require("https");

  const body = JSON.stringify({
    query,
    variables,
  });
  const options = {
    hostname: hostname,
    path: path,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": body.length,
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      if (res.statusCode != 200) {
        return reject(
          new Error(
            `HTTP status code ${res.statusCode}, status message ${res.statusMessage}, ${query}`
          )
        );
      }

      const data = [];
      res.on("data", (chunk) => {
        data.push(chunk);
      });
      res.on("end", () => {
        //console.log(JSON.parse(Buffer.concat(data).toString()).data)
        resolve(JSON.parse(Buffer.concat(data).toString()).data);
      });
    });
    req.on("error", (e) => {
      reject(e);
    });
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request time out"));
    });
    req.write(body);
    req.end();
  });
}

exports.getRecentSubmissionUS = getRecentAcSubmissionsUS;
exports.getRecentSubmissionCN = getRecentACSubmissionsCN;
exports.getQuestionOfTodayAndYesterdayUS = getQuestionOfTodayAndYesterdayUS;
exports.getQuestionOfTodayAndYesterdayCN = getQuestionOfTodayAndYesterdayCN;
