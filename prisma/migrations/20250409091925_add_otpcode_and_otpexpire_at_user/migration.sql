-- AlterTable
ALTER TABLE "user" ADD COLUMN     "otpCode" VARCHAR(6),
ADD COLUMN     "otpExpiry" TIMESTAMP(6);
