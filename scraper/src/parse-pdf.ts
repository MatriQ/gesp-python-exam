import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { extractQuestionsFromText, type ExtractionResult } from './llm-extractor.js';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(__dirname, '..');
export const PDFS_DIR = path.join(ROOT_DIR, 'pdfs');
export const OUTPUT_DIR = path.join(ROOT_DIR, 'output');

export interface ParseOptions {
  input?: string;
  session?: string;
  level?: number;
  all?: boolean;
}

function parseArgs(): ParseOptions {
  const args = process.argv.slice(2);
  const opts: ParseOptions = {};

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--input':
        opts.input = args[++i];
        break;
      case '--session':
        opts.session = args[++i];
        break;
      case '--level':
        opts.level = parseInt(args[++i]!, 10);
        break;
      case '--all':
        opts.all = true;
        break;
    }
  }

  return opts;
}

export async function parsePdf(filePath: string): Promise<string> {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return data.text;
}

export function writeOutput(result: ExtractionResult): string {
  const sessionDir = path.join(OUTPUT_DIR, result.session);
  fs.mkdirSync(sessionDir, { recursive: true });

  const outputPath = path.join(sessionDir, `level-${result.level}.json`);
  const output = {
    session: result.session,
    level: result.level,
    totalQuestions: result.questions.length,
    parseErrors: result.parseErrors,
    questions: result.questions,
    extractedAt: new Date().toISOString(),
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
  return outputPath;
}

export async function processSinglePdf(pdfPath: string, session: string, level: number): Promise<void> {
  if (!fs.existsSync(pdfPath)) {
    console.error(`PDF not found: ${pdfPath}`);
    process.exit(1);
  }

  console.log(`Parsing: ${pdfPath}`);
  const text = await parsePdf(pdfPath);
  console.log(`Extracted ${text.length} characters from PDF`);

  const result = await extractQuestionsFromText(text, session, level);
  const outputPath = writeOutput(result);

  console.log(`Extracted ${result.questions.length} questions`);
  console.log(`Parse errors: ${result.parseErrors.length}`);
  if (result.parseErrors.length > 0) {
    result.parseErrors.forEach((err) => console.error(`  - ${err}`));
  }

  const lowConfidence = result.questions.filter((q) => q.confidence === 'low').length;
  if (lowConfidence > 0) {
    console.warn(`⚠ ${lowConfidence} questions with low confidence`);
  }

  console.log(`Output: ${outputPath}`);
}

export async function processAllPdfs(): Promise<void> {
  if (!fs.existsSync(PDFS_DIR)) {
    console.error(`PDFs directory not found: ${PDFS_DIR}`);
    process.exit(1);
  }

  const manifestPath = path.join(PDFS_DIR, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    await processFromManifest(manifestPath);
    return;
  }

  await processFromDirectoryStructure();
}

async function processFromManifest(manifestPath: string): Promise<void> {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as Array<{
    session: string;
    level: number;
    filename: string;
    downloaded: boolean;
  }>;

  const entries = manifest.filter((e) => e.downloaded);
  console.log(`Found ${entries.length} downloaded PDFs in manifest`);

  for (const entry of entries) {
    const pdfPath = path.join(PDFS_DIR, entry.session, entry.filename);
    try {
      await processSinglePdf(pdfPath, entry.session, entry.level);
    } catch (err) {
      console.error(`Failed to process ${entry.session}/level-${entry.level}: ${err}`);
    }
  }
}

async function processFromDirectoryStructure(): Promise<void> {
  const sessionDirs = fs.readdirSync(PDFS_DIR).filter((name) => {
    const fullPath = path.join(PDFS_DIR, name);
    return fs.statSync(fullPath).isDirectory() && /^\d{4}-\d{2}$/.test(name);
  });

  console.log(`Found ${sessionDirs.length} session directories`);

  for (const session of sessionDirs) {
    const sessionPath = path.join(PDFS_DIR, session);
    const pdfFiles = fs.readdirSync(sessionPath).filter((f) => f.endsWith('.pdf'));

    for (const pdfFile of pdfFiles) {
      const levelMatch = pdfFile.match(/level-(\d+)/);
      if (!levelMatch) continue;

      const level = parseInt(levelMatch[1]!, 10);
      const pdfPath = path.join(sessionPath, pdfFile);

      try {
        await processSinglePdf(pdfPath, session, level);
      } catch (err) {
        console.error(`Failed to process ${session}/${pdfFile}: ${err}`);
      }
    }
  }
}

export function hasPdfsAvailable(): boolean {
  if (!fs.existsSync(PDFS_DIR)) return false;
  const manifestPath = path.join(PDFS_DIR, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as Array<{ downloaded: boolean }>;
      return manifest.some((e) => e.downloaded);
    } catch {
      return false;
    }
  }
  const sessionDirs = fs.readdirSync(PDFS_DIR).filter((name) => {
    const fullPath = path.join(PDFS_DIR, name);
    return fs.statSync(fullPath).isDirectory() && /^\d{4}-\d{2}$/.test(name);
  });
  return sessionDirs.some((session) => {
    const sessionPath = path.join(PDFS_DIR, session);
    const pdfFiles = fs.readdirSync(sessionPath).filter((f) => f.endsWith('.pdf'));
    return pdfFiles.length > 0;
  });
}

async function main(): Promise<void> {
  const opts = parseArgs();

  if (opts.all) {
    await processAllPdfs();
    return;
  }

  if (!opts.input || !opts.session || !opts.level) {
    console.error('Usage:');
    console.error('  tsx src/parse-pdf.ts --input <pdf-path> --session <session> --level <level>');
    console.error('  tsx src/parse-pdf.ts --all');
    process.exit(1);
  }

  await processSinglePdf(opts.input, opts.session, opts.level);
}

const isDirectRun = process.argv[1]?.endsWith('parse-pdf.ts') || process.argv[1]?.endsWith('parse-pdf.js');
if (isDirectRun) {
  main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
