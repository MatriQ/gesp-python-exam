import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { processAllPdfs, hasPdfsAvailable, PDFS_DIR, OUTPUT_DIR } from './parse-pdf.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

interface PipelineStats {
  downloaded: number;
  parsed: number;
  imported: number;
  errors: string[];
}

function runDownloadPdfs(): boolean {
  const scriptPath = path.join(ROOT_DIR, 'download_pdfs.py');
  if (!fs.existsSync(scriptPath)) {
    console.error(`Download script not found: ${scriptPath}`);
    return false;
  }

  try {
    execFileSync('python3', [scriptPath], {
      cwd: ROOT_DIR,
      stdio: 'inherit',
      timeout: 300_000,
    });
    return true;
  } catch (err) {
    console.error('Download step failed:', err instanceof Error ? err.message : String(err));
    return false;
  }
}

async function runParse(): Promise<boolean> {
  try {
    await processAllPdfs();
    return true;
  } catch (err) {
    console.error('Parse step failed:', err instanceof Error ? err.message : String(err));
    return false;
  }
}

async function runImport(): Promise<boolean> {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    if (!fs.existsSync(OUTPUT_DIR)) {
      console.error(`Output directory not found: ${OUTPUT_DIR}`);
      await prisma.$disconnect();
      return false;
    }

    const sessionDirs = fs
      .readdirSync(OUTPUT_DIR)
      .filter((name) => fs.statSync(path.join(OUTPUT_DIR, name)).isDirectory());

    let totalImported = 0;
    let totalSkipped = 0;

    for (const session of sessionDirs) {
      const sessionPath = path.join(OUTPUT_DIR, session);
      const jsonFiles = fs.readdirSync(sessionPath).filter((f) => f.endsWith('.json'));

      for (const jsonFile of jsonFiles) {
        const filePath = path.join(sessionPath, jsonFile);
        const raw = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(raw);

        for (const q of data.questions) {
          if (!q.questionText || !q.type || q.questionIndex === undefined) {
            totalSkipped++;
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
                answer: q.referenceSolution ?? q.answer ?? undefined,
                explanation: q.explanation ?? undefined,
                topics: q.topics ?? [],
                difficulty: q.difficulty ?? 'medium',
                codeBlocks: q.codeBlocks ?? undefined,
                inputFormat: q.inputFormat ?? undefined,
                outputFormat: q.outputFormat ?? undefined,
                constraints: q.constraints ?? undefined,
                sampleInput: q.sampleInput ?? (q.sampleInputs?.[0] ?? undefined),
                sampleOutput: q.sampleOutput ?? (q.sampleOutputs?.[0] ?? undefined),
                testCases: q.testCases ?? undefined,
              },
              create: {
                session: data.session,
                level: data.level,
                questionIndex: q.questionIndex,
                type: q.type,
                questionText: q.questionText,
                options: q.options ?? undefined,
                answer: q.referenceSolution ?? q.answer ?? undefined,
                explanation: q.explanation ?? undefined,
                topics: q.topics ?? [],
                difficulty: q.difficulty ?? 'medium',
                codeBlocks: q.codeBlocks ?? undefined,
                inputFormat: q.inputFormat ?? undefined,
                outputFormat: q.outputFormat ?? undefined,
                constraints: q.constraints ?? undefined,
                sampleInput: q.sampleInput ?? (q.sampleInputs?.[0] ?? undefined),
                sampleOutput: q.sampleOutput ?? (q.sampleOutputs?.[0] ?? undefined),
                testCases: q.testCases ?? undefined,
              },
            });
            totalImported++;
          } catch {
            totalSkipped++;
          }
        }

        console.log(`  Imported: ${path.join(session, jsonFile)}`);
      }
    }

    console.log(`Import complete: ${totalImported} imported, ${totalSkipped} skipped`);
    await prisma.$disconnect();
    return true;
  } catch (err) {
    console.error('Import step failed:', err instanceof Error ? err.message : String(err));
    return false;
  }
}

async function main(): Promise<void> {
  const stats: PipelineStats = {
    downloaded: 0,
    parsed: 0,
    imported: 0,
    errors: [],
  };

  const args = process.argv.slice(2);
  const skipDownload = args.includes('--skip-download');
  const skipParse = args.includes('--skip-parse');
  const skipImport = args.includes('--skip-import');

  console.log('=== GESP PDF Pipeline ===');
  console.log(`PDF directory: ${PDFS_DIR}`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log();

  // Step 1: Download
  if (skipDownload) {
    console.log('[1/3] Skipping download (--skip-download)');
  } else {
    console.log('[1/3] Downloading PDFs...');
    const ok = runDownloadPdfs();
    if (ok) {
      stats.downloaded++;
      console.log('[1/3] ✓ Download complete');
    } else {
      stats.errors.push('download failed');
      console.warn('[1/3] ⚠ Download failed (continuing if PDFs exist)');
    }
  }
  console.log();

  // Check if we have PDFs to work with
  if (!hasPdfsAvailable()) {
    console.error('No PDFs available. Cannot proceed with pipeline.');
    console.error('Either run download step or place PDFs in scraper/pdfs/ directory.');
    process.exit(1);
  }

  // Step 2: Parse
  if (skipParse) {
    console.log('[2/3] Skipping parse (--skip-parse)');
  } else {
    console.log('[2/3] Parsing PDFs and extracting questions...');
    const ok = await runParse();
    if (ok) {
      stats.parsed++;
      console.log('[2/3] ✓ Parse complete');
    } else {
      stats.errors.push('parse failed');
      console.error('[2/3] ✗ Parse failed');
      process.exit(1);
    }
  }
  console.log();

  // Step 3: Import
  if (skipImport) {
    console.log('[3/3] Skipping import (--skip-import)');
  } else {
    console.log('[3/3] Importing questions to database...');
    const ok = await runImport();
    if (ok) {
      stats.imported++;
      console.log('[3/3] ✓ Import complete');
    } else {
      stats.errors.push('import failed');
      console.error('[3/3] ✗ Import failed');
      process.exit(1);
    }
  }

  console.log();
  console.log('=== Pipeline Summary ===');
  console.log(`Steps completed: ${stats.downloaded + stats.parsed + stats.imported}/3`);
  if (stats.errors.length > 0) {
    console.log(`Errors: ${stats.errors.join(', ')}`);
  }
  console.log('Pipeline finished successfully.');
}

main().catch((err) => {
  console.error('Pipeline fatal error:', err);
  process.exit(1);
});
