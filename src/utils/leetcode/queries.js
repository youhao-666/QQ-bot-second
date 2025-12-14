exports.recentAcSubmissionsUS = `
query recentAcSubmissions($username: String!, $limit: Int!) {
  recentAcSubmissionList(username: $username, limit: $limit) {
    id
    title
    titleSlug
    timestamp
  }
}
`;

exports.questionDataUS = `
query questionData($titleSlug: String!) {
  question(titleSlug: $titleSlug) {
    questionFrontendId
  }
}
`;

exports.questionOfTodayUS = `
query questionOfToday {
  activeDailyCodingChallengeQuestion {
    date
    question {
      questionFrontendId
      title
      titleSlug
    }
  }
}
`;

exports.dailyCodingQuestionRecordsUS = `
query dailyCodingQuestionRecords($year: Int!, $month: Int!) {
  dailyCodingChallengeV2(year: $year, month: $month) {
    challenges {
      date
      question {
        questionFrontendId
        title
        titleSlug
      }
    }
  }
}
`;

exports.recentSubmissionsCN = `
query recentAcSubmissions($username: String!) {
  recentACSubmissions(userSlug: $username) {
    submissionId
    submitTime
    question {
      translatedTitle
      titleSlug
      questionFrontendId
    }
  }
}
`;

exports.questionOfTodayCN = `
query questionOfToday {
  todayRecord {
    date
    question {
      difficulty
      questionFrontendId
      translatedTitle
      titleSlug
      topicTags {
        translatedName
      }
    }
  }   
}
`;

exports.dailyQuestionRecordsCN = `
query dailyQuestionRecords($year: Int!, $month: Int!) {
  dailyQuestionRecords(year: $year, month: $month) {
    date
    question {
      difficulty
      questionFrontendId
      titleSlug
      translatedTitle
    }
  }
}
`;

