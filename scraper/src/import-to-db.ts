import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'output');

const prisma = new PrismaClient();

interface ParsedQuestion {
  questionIndex: number;
  type: string;
  questionText: string;
  options?: any;
  answer?: string;
  explanation?: string;
  topics: string[];
  difficulty?: string;
  images?: any;
  codeBlocks?: any;
  inputFormat?: string;
  outputFormat?: string;
  constraints?: string;
  sampleInput?: string;
  sampleOutput?: string;
  templateCode?: string;
  testCases?: any;
  confidence?: string;
}

interface ParsedFile {
  session: string;
  level: number;
  totalQuestions: number;
  questions: ParsedQuestion[];
}

async function importFile(
  filePath: string,
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw) as ParsedFile;
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const q of data.questions) {
    if (!q.questionText || !q.type || q.questionIndex === undefined) {
      skipped++;
      errors.push(`Skipped question ${q.questionIndex}: missing required fields`);
      continue;
    }

    try {
      await prisma.question.upsert({
        where: {
          session_level_questionIndex: {
            session: data.session,
            level: data.level,
            questionIndex: q.questionIndex,
          },
        },
        update: {
          type: q.type,
          questionText: q.questionText,
          options: q.options ?? undefined,
          answer: q.answer ?? undefined,
          explanation: q.explanation ?? undefined,
          topics: q.topics ?? [],
          difficulty: q.difficulty ?? 'medium',
          images: q.images ?? undefined,
          codeBlocks: q.codeBlocks ?? undefined,
          inputFormat: q.inputFormat ?? undefined,
          outputFormat: q.outputFormat ?? undefined,
          constraints: q.constraints ?? undefined,
          sampleInput: q.sampleInput ?? undefined,
          sampleOutput: q.sampleOutput ?? undefined,
          templateCode: q.templateCode ?? undefined,
          testCases: q.testCases ?? undefined,
        },
        create: {
          session: data.session,
          level: data.level,
          questionIndex: q.questionIndex,
          type: q.type,
          questionText: q.questionText,
          options: q.options ?? undefined,
          answer: q.answer ?? undefined,
          explanation: q.explanation ?? undefined,
          topics: q.topics ?? [],
          difficulty: q.difficulty ?? 'medium',
          images: q.images ?? undefined,
          codeBlocks: q.codeBlocks ?? undefined,
          inputFormat: q.inputFormat ?? undefined,
          outputFormat: q.outputFormat ?? undefined,
          constraints: q.constraints ?? undefined,
          sampleInput: q.sampleInput ?? undefined,
          sampleOutput: q.sampleOutput ?? undefined,
          templateCode: q.templateCode ?? undefined,
          testCases: q.testCases ?? undefined,
        },
      });
      imported++;
    } catch (err: any) {
      skipped++;
      errors.push(`Question ${q.questionIndex}: ${err.message}`);
    }
  }

  return { imported, skipped, errors };
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    console.error(`Output directory not found: ${OUTPUT_DIR}`);
    console.error('Run the PDF parser first: tsx src/parse-pdf.ts --all');
    process.exit(1);
  }

  const stats = {
    totalFiles: 0,
    totalImported: 0,
    totalSkipped: 0,
    allErrors: [] as string[],
    byLevel: {} as Record<number, number>,
  };

  const sessionDirs = fs
    .readdirSync(OUTPUT_DIR)
    .filter((name) => fs.statSync(path.join(OUTPUT_DIR, name)).isDirectory());

  for (const session of sessionDirs) {
    const sessionPath = path.join(OUTPUT_DIR, session);
    const jsonFiles = fs.readdirSync(sessionPath).filter((f) => f.endsWith('.json'));

    for (const jsonFile of jsonFiles) {
      const filePath = path.join(sessionPath, jsonFile);
      stats.totalFiles++;

      console.log(`Importing: ${session}/${jsonFile}`);
      const result = await importFile(filePath);

      stats.totalImported += result.imported;
      stats.totalSkipped += result.skipped;
      stats.allErrors.push(...result.errors);

      const levelMatch = jsonFile.match(/level-(\d+)/);
      if (levelMatch) {
        const level = parseInt(levelMatch[1]!);
        stats.byLevel[level] = (stats.byLevel[level] || 0) + result.imported;
      }

      console.log(`  Imported: ${result.imported}, Skipped: ${result.skipped}`);
    }
  }

  console.log('\n=== Import Summary ===');
  console.log(`Files processed: ${stats.totalFiles}`);
  console.log(`Total imported: ${stats.totalImported}`);
  console.log(`Total skipped: ${stats.totalSkipped}`);

  if (Object.keys(stats.byLevel).length > 0) {
    console.log('\nBy Level:');
    for (const [level, count] of Object.entries(stats.byLevel).sort(
      (a, b) => Number(a[0]) - Number(b[0]),
    )) {
      console.log(`  Level ${level}: ${count} questions`);
    }
  }

  if (stats.allErrors.length > 0) {
    console.log(`\nErrors (${stats.allErrors.length}):`);
    stats.allErrors.slice(0, 20).forEach((err) => console.log(`  - ${err}`));
    if (stats.allErrors.length > 20) {
      console.log(`  ... and ${stats.allErrors.length - 20} more`);
    }
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('Fatal error:', err);
  await prisma.$disconnect();
  process.exit(1);
});
