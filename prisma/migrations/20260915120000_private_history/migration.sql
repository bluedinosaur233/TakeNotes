CREATE TABLE "AdminSession" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "credentialVersion" TEXT NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "AdminSession_expiresAt_idx" ON "AdminSession"("expiresAt");
CREATE TABLE "QaHistory" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "question" TEXT NOT NULL,
  "answer" TEXT NOT NULL DEFAULT '',
  "sources" TEXT NOT NULL DEFAULT '[]',
  "keywords" TEXT NOT NULL DEFAULT '[]',
  "status" TEXT NOT NULL DEFAULT 'generating',
  "error" TEXT NOT NULL DEFAULT '',
  "truncated" BOOLEAN NOT NULL DEFAULT false,
  "model" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE INDEX "QaHistory_createdAt_idx" ON "QaHistory"("createdAt");
CREATE TABLE "RequestBudget" (
  "key" TEXT NOT NULL PRIMARY KEY,
  "count" INTEGER NOT NULL DEFAULT 0
);
