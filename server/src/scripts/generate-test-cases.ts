import Anthropic from '@anthropic-ai/sdk';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const client = new Anthropic();

const SYSTEM_PROMPT = `You are a test case generator for programming problems. Given a programming problem description, generate test cases in JSON format.

Return ONLY a JSON array of test cases, each with:
- "input": the input string (use \\n for newlines)
- "expected": the expected output string (use \\n for newlines)
- "isSample": boolean, true only for the example from the problem statement

Rules:
- Generate 5-10 test cases
- Include the sample from the problem (mark isSample: true)
- Include edge cases: empty input, boundary values, maximum values
- Include typical cases
- Keep input sizes reasonable (max 1000 characters)
- Output must match EXACTLY (character-for-character, including whitespace)

Return ONLY the JSON array, no other text.`;

async function generateTestCases(question: {
  id: string;
  questionText: string;
  inputFormat?: string | null;
  outputFormat?: string | null;
  constraints?: string | null;
  sampleInput?: string | null;
  sampleOutput?: string | null;
}) {
  const userPrompt = `Problem:
${question.questionText}

${question.inputFormat ? `Input Format: ${question.inputFormat}` : ''}
${question.outputFormat ? `Output Format: ${question.outputFormat}` : ''}
${question.constraints ? `Constraints: ${question.constraints}` : ''}
${question.sampleInput ? `Sample Input: ${question.sampleInput}` : ''}
${question.sampleOutput ? `Sample Output: ${question.sampleOutput}` : ''}

Generate test cases.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  // Extract JSON from response (may be wrapped in ```json ... ```)
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('No JSON array found in response');

  const testCases = JSON.parse(jsonMatch[0]);
  return testCases.map((tc: any) => ({
    input: String(tc.input || ''),
    expected: String(tc.expected || ''),
    isSample: Boolean(tc.isSample || false),
  }));
}

async function main() {
  const questions = await prisma.question.findMany({
    where: { type: 'programming' },
    select: {
      id: true,
      questionText: true,
      inputFormat: true,
      outputFormat: true,
      constraints: true,
      sampleInput: true,
      sampleOutput: true,
    },
  });

  console.log(`Found ${questions.length} programming questions`);

  let success = 0;
  let failed = 0;

  for (const q of questions) {
    try {
      console.log(`Generating test cases for ${q.id}...`);
      const testCases = await generateTestCases(q);

      await prisma.question.update({
        where: { id: q.id },
        data: { testCases },
      });

      console.log(`  Generated ${testCases.length} test cases`);
      success++;
    } catch (err: any) {
      console.error(`  Failed: ${err.message}`);
      failed++;
    }

    // Rate limiting: wait 1 second between API calls
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\nDone. Success: ${success}, Failed: ${failed}`);
  await prisma.$disconnect();
}

main().catch(console.error);
