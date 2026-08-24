CREATE TABLE "quote_customer_access_grants" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "quote_id" UUID NOT NULL,
  "revision_number" INTEGER NOT NULL,
  "token_fingerprint" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "revoked_at" TIMESTAMP(3),
  "revoked_by_user_id" UUID,
  "superseded_at" TIMESTAMP(3),
  "superseded_by_grant_id" UUID,
  "created_by_user_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "quote_customer_access_grants_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "quote_customer_access_grants_quote_fkey"
    FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "quote_customer_access_grants_revision_fkey"
    FOREIGN KEY ("quote_id", "revision_number") REFERENCES "quote_revisions"("quote_id", "revision_number") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "quote_customer_access_grants_creator_fkey"
    FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "quote_customer_access_grants_revoker_fkey"
    FOREIGN KEY ("revoked_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "quote_customer_access_grants_superseded_by_fkey"
    FOREIGN KEY ("superseded_by_grant_id") REFERENCES "quote_customer_access_grants"("id") ON DELETE RESTRICT ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT "quote_customer_access_grants_terminal_shape_check" CHECK (
    NOT ("revoked_at" IS NOT NULL AND "superseded_at" IS NOT NULL)
    AND (("revoked_at" IS NULL) = ("revoked_by_user_id" IS NULL))
    AND (("superseded_at" IS NULL) = ("superseded_by_grant_id" IS NULL))
  )
);

CREATE UNIQUE INDEX "quote_customer_access_grants_token_fingerprint_key"
  ON "quote_customer_access_grants"("token_fingerprint");

CREATE UNIQUE INDEX "quote_customer_access_grants_one_actionable_quote_key"
  ON "quote_customer_access_grants"("quote_id")
  WHERE "revoked_at" IS NULL AND "superseded_at" IS NULL;

CREATE INDEX "quote_customer_access_grants_quote_revision_idx"
  ON "quote_customer_access_grants"("quote_id", "revision_number", "created_at");

CREATE INDEX "quote_customer_access_grants_expiry_idx"
  ON "quote_customer_access_grants"("expires_at");
