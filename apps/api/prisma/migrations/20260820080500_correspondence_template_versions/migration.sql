CREATE TYPE "CorrespondenceTemplateVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'RETIRED');

CREATE TABLE "correspondence_templates" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "correspondence_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "correspondence_template_versions" (
    "id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "CorrespondenceTemplateVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "published_at" TIMESTAMP(3),
    "retired_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "correspondence_template_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "correspondence_templates_key_key" ON "correspondence_templates"("key");
CREATE INDEX "correspondence_templates_name_idx" ON "correspondence_templates"("name");
CREATE UNIQUE INDEX "correspondence_template_versions_template_id_version_key" ON "correspondence_template_versions"("template_id", "version");
CREATE INDEX "correspondence_template_versions_template_id_status_idx" ON "correspondence_template_versions"("template_id", "status");
CREATE UNIQUE INDEX "correspondence_template_versions_one_draft_per_template" ON "correspondence_template_versions"("template_id") WHERE "status" = 'DRAFT';
CREATE UNIQUE INDEX "correspondence_template_versions_one_published_per_template" ON "correspondence_template_versions"("template_id") WHERE "status" = 'PUBLISHED';

ALTER TABLE "correspondence_template_versions"
ADD CONSTRAINT "correspondence_template_versions_template_id_fkey"
FOREIGN KEY ("template_id") REFERENCES "correspondence_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
