-- CreateTable
CREATE TABLE "shortend_urls"
(
    "id" BIGINT NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "shortend_urls_pkey" PRIMARY KEY ("id")
);

-- Create Sequence
CREATE SEQUENCE "next_shortend_urls_id_seq";