# 使用 Node.js 官方镜像作为基础镜像
FROM node:18-bullseye-slim

# 设置工作目录
WORKDIR /app

# 安装 canvas 的系统依赖
RUN apk add --update --no-cache \
    make \
    g++ \
    jpeg-dev \
    cairo-dev \
    giflib-dev \
    pango-dev \
    libtool \
    autoconf \
    automake

# 复制 package.json 和 package-lock.json (如果存在)
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码和配置文件
COPY . .

# 设置环境变量
ENV NODE_ENV=production

# 运行应用
CMD ["npm", "start"]