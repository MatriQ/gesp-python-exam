-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "session" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "questionIndex" INTEGER NOT NULL,
    "questionText" TEXT NOT NULL,
    "options" JSONB,
    "answer" TEXT,
    "explanation" TEXT,
    "topics" TEXT[],
    "difficulty" TEXT DEFAULT 'medium',
    "images" JSONB,
    "codeBlocks" JSONB,
    "inputFormat" TEXT,
    "outputFormat" TEXT,
    "constraints" TEXT,
    "sampleInput" TEXT,
    "sampleOutput" TEXT,
    "templateCode" TEXT,
    "testCases" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAnswer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "userAnswer" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "timeSpentMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockExam" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "timeLimit" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in_progress',

    CONSTRAINT "MockExam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockExamAnswer" (
    "id" TEXT NOT NULL,
    "mockExamId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "userAnswer" TEXT,
    "isCorrect" BOOLEAN,

    CONSTRAINT "MockExamAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeSubmission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'python',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "stdout" TEXT,
    "stderr" TEXT,
    "executionTimeMs" INTEGER,
    "memoryUsedKb" INTEGER,
    "testResults" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodeSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Question_level_type_session_idx" ON "Question"("level", "type", "session");

-- CreateIndex
CREATE UNIQUE INDEX "Question_session_level_questionIndex_key" ON "Question"("session", "level", "questionIndex");

-- CreateIndex
CREATE INDEX "UserAnswer_userId_questionId_idx" ON "UserAnswer"("userId", "questionId");

-- CreateIndex
CREATE INDEX "UserAnswer_userId_isCorrect_idx" ON "UserAnswer"("userId", "isCorrect");

-- AddForeignKey
ALTER TABLE "UserAnswer" ADD CONSTRAINT "UserAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAnswer" ADD CONSTRAINT "UserAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockExam" ADD CONSTRAINT "MockExam_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockExamAnswer" ADD CONSTRAINT "MockExamAnswer_mockExamId_fkey" FOREIGN KEY ("mockExamId") REFERENCES "MockExam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockExamAnswer" ADD CONSTRAINT "MockExamAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeSubmission" ADD CONSTRAINT "CodeSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeSubmission" ADD CONSTRAINT "CodeSubmission_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
