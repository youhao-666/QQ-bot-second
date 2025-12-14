// file name: src/utils/leetcode/user.js
const path = require("path");
const fs = require("fs");

// 获取data目录路径
const DATA_DIR = path.join(__dirname, "data");

function read(name) {
  const fileName = path.join(DATA_DIR, name);
  
  if (fs.existsSync(fileName)) {
    const content = fs.readFileSync(fileName).toString().replace("\t", " ");
    return content;
  }
  
  console.warn(`文件不存在: ${fileName}`);
  return "";
}

function write(name, content) {
  const fileName = path.join(DATA_DIR, name);
  fs.writeFileSync(fileName, content);
  console.log(`已写入文件: ${fileName}`);
}

function getUsers() {
  const users = [];
  const userContent = read("user").trim();
  
  if (!userContent) {
    console.error("用户列表文件为空或不存在");
    return users;
  }

  for (const user of userContent.split("\n")) {
    if (user.trim() === "") continue;

    const name_where_count = user.trim().split(" ");
    if (name_where_count.length < 3) {
      console.warn(`格式错误的用户行: ${user}`);
      continue;
    }

    const name = name_where_count[0];
    const where = name_where_count[1]?.substring(1, 3) || "CN";
    const count = parseInt(name_where_count[2]) || 0;
    const id = `${name} (${where})`;

    users.push({ id, name, where, count });
  }

  console.log(`读取到 ${users.length} 个用户`);
  return users;
}

const USER_STATUS = "user_status.json";

function readUserStatus() {
  const content = read(USER_STATUS).trim();
  if (content === "") {
    console.log("用户状态文件为空，创建默认状态");
    return {
      updateTime: null,
      data: {},
    };
  }
  
  try {
    return JSON.parse(content);
  } catch (error) {
    console.error("解析用户状态JSON失败:", error);
    return {
      updateTime: null,
      data: {},
    };
  }
}

function writeUserStatus(data) {
  write(USER_STATUS, JSON.stringify(data, null, 2));
}

exports.getUsers = getUsers;
exports.readUserStatus = readUserStatus;
exports.writeUserStatus = writeUserStatus;