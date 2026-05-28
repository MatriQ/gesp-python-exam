import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mirror of shared/src/constants.ts STAGE_CONFIG
const STAGE_CONFIG: Record<number, {
  stageCount: number;
  questionsPerStage: number;
  bossQuestions: number;
  bossTimeLimit: number;
}> = {
  1: { stageCount: 3, questionsPerStage: 5, bossQuestions: 8, bossTimeLimit: 180 },
  2: { stageCount: 3, questionsPerStage: 5, bossQuestions: 8, bossTimeLimit: 180 },
  3: { stageCount: 4, questionsPerStage: 5, bossQuestions: 10, bossTimeLimit: 240 },
  4: { stageCount: 4, questionsPerStage: 5, bossQuestions: 10, bossTimeLimit: 240 },
  5: { stageCount: 5, questionsPerStage: 5, bossQuestions: 10, bossTimeLimit: 300 },
  6: { stageCount: 5, questionsPerStage: 5, bossQuestions: 10, bossTimeLimit: 300 },
  7: { stageCount: 5, questionsPerStage: 5, bossQuestions: 12, bossTimeLimit: 300 },
  8: { stageCount: 5, questionsPerStage: 5, bossQuestions: 12, bossTimeLimit: 300 },
};

async function main() {
  console.log('Seeding stages...');

  const deleted = await prisma.stage.deleteMany({});
  console.log(`Cleared ${deleted.count} existing stages`);

  let totalCreated = 0;

  for (const [levelStr, config] of Object.entries(STAGE_CONFIG)) {
    const level = Number(levelStr);

    for (let i = 0; i < config.stageCount; i++) {
      await prisma.stage.create({
        data: {
          level,
          stageIndex: i,
          title: `第 ${i + 1} 关`,
          description: `Level ${level} - 关卡 ${i + 1}`,
          type: 'normal',
          questionCount: config.questionsPerStage,
          requiredScore: 0.6,
        },
      });
      totalCreated++;
    }

    await prisma.stage.create({
      data: {
        level,
        stageIndex: config.stageCount,
        title: '👹 Boss 挑战',
        description: `Level ${level} - Boss 关卡！在限定时间内回答 ${config.bossQuestions} 道题`,
        type: 'boss',
        questionCount: config.bossQuestions,
        timeLimit: config.bossTimeLimit,
        requiredScore: 0.7,
      },
    });
    totalCreated++;

    console.log(`Level ${level}: ${config.stageCount} normal + 1 boss stages created`);
  }

  // Seed story chapters
  const STORY_TITLES: Record<number, string[]> = {
    1: ['Python 森林探险', '机器人学说话', '神秘的代码门'],
    2: ['迷宫寻宝记', '变量精灵的秘密', '数组成长大作战'],
    3: ['条件城堡历险', '循环河渡船记', '函数魔法学院'],
    4: ['字典迷宫', '字符串编织者', '算法竞技场'],
    5: ['面向对象王国', '继承家族之旅', '多态幻境'],
    6: ['递归之塔', '排序大挑战', '搜索迷踪'],
    7: ['图论大陆', '动态规划迷宫', '贪心策略战'],
    8: ['终极Boss战', 'Python 圣殿', '编程大师之路'],
  };

  const SCENES_TEMPLATE = [
    { narrative: '🤖 小机器人来到了一片神秘的代码森林...', questionType: 'mc' },
    { narrative: '🐉 一条 Python 巨龙挡住了去路！', questionType: 'tf' },
    { narrative: '🏰 小机器人发现了一座古老的编程城堡...', questionType: 'mc' },
    { narrative: '🗝️ 在城堡深处，小机器人找到了一把钥匙...', questionType: 'tf' },
    { narrative: '🏆 最后的挑战！终极编程难题！', questionType: 'mc' },
  ];

  let storyCreated = 0;
  for (const [levelStr, titles] of Object.entries(STORY_TITLES)) {
    const level = parseInt(levelStr);
    for (let i = 0; i < titles.length; i++) {
      await prisma.storyChapter.upsert({
        where: { level_chapterIndex: { level, chapterIndex: i + 1 } },
        update: {},
        create: {
          level,
          chapterIndex: i + 1,
          title: titles[i],
          scenes: SCENES_TEMPLATE,
        },
      });
      storyCreated++;
    }
  }
  console.log(`Story chapters seeded: ${storyCreated}`);

  console.log(`\nDone! Created ${totalCreated} stages total.`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
