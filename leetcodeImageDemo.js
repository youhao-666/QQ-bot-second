// file name: leetcodeImageDemo.js
const fs = require('fs').promises;
const path = require('path');

async function runDemo() {
  console.log('🚀 LeetCode图片生成Demo开始运行...\n');
  
  try {
    // 1. 加载服务
    console.log('📦 加载图片服务...');
    const LeetCodeImageService = require('./src/utils/leetcode/leetcode-image-service.js');
    
    // 2. 创建实例
    console.log('🔄 初始化服务...');
    const leetcodeService = new LeetCodeImageService();
    
    // 3. 创建输出目录
    const outputDir = path.join(process.cwd(), 'leetcode_images');
    console.log(`📁 输出目录: ${outputDir}`);
    
    try {
      await fs.access(outputDir);
      console.log('✅ 目录已存在');
    } catch {
      await fs.mkdir(outputDir, { recursive: true });
      console.log('✅ 目录创建成功');
    }
    
    // 4. 生成图片
    console.log('\n🎨 生成LeetCode统计图片...');
    const imageBuffer = await leetcodeService.generateImageReport();
    
    if (!imageBuffer) {
      throw new Error('生成图片失败，返回null');
    }
    
    // 5. 保存图片
    const timestamp = Date.now();
    const fileName = `leetcode_report_${timestamp}.png`;
    const outputPath = path.join(outputDir, fileName);
    
    await fs.writeFile(outputPath, imageBuffer);
    
    console.log('\n✅ 图片生成成功！');
    console.log(`📍 文件位置: ${outputPath}`);
    console.log(`📊 文件大小: ${(imageBuffer.length / 1024).toFixed(1)} KB`);
    
    return {
      success: true,
      filePath: outputPath,
      fileSize: `${(imageBuffer.length / 1024).toFixed(1)} KB`,
      timestamp: new Date().toLocaleString('zh-CN')
    };
    
  } catch (error) {
    console.error('\n❌ Demo执行失败:', error.message);
    
    // 如果是文件不存在错误，提供详细提示
    if (error.message.includes('Cannot find module') || error.code === 'MODULE_NOT_FOUND') {
      console.log('\n💡 问题排查:');
      console.log('1. 检查文件路径: src/utils/leetcode/leetcode-image-service.js');
      console.log('2. 确保该文件存在');
      console.log('3. 检查main.js是否存在: src/utils/leetcode/main.js');
    }
    
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toLocaleString('zh-CN')
    };
  }
}

// 运行Demo
runDemo().then(result => {
  if (result.success) {
    console.log(`\n✨ 操作完成于: ${result.timestamp}`);
    console.log(`📁 查看图片: ${result.filePath}`);
  } else {
    console.log(`\n😞 操作失败: ${result.error}`);
    process.exit(1);
  }
}).catch(error => {
  console.error('💥 未捕获的异常:', error);
  process.exit(1);
});