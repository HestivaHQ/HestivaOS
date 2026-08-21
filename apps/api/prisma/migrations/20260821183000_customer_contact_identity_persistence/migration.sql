CREATE TYPE "CustomerAccountType" AS ENUM ('INDIVIDUAL', 'ORGANISATION');
CREATE TYPE "CustomerContactStatus" AS ENUM ('ACTIVE', 'RETIRED');
CREATE TYPE "MessagingIdentityTrustState" AS ENUM ('UNVERIFIED', 'TRUSTED', 'BLOCKED');

ALTER TABLE "customers"
    ADD COLUMN "account_type" "CustomerAccountType";

CREATE TABLE "customer_contacts" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "status" "CustomerContactStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_contacts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customer_messaging_identities" (
    "id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "channel" "MessagingChannel" NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_identity_id" TEXT NOT NULL,
    "phone_number" TEXT,
    "display_name" TEXT,
    "trust_state" "MessagingIdentityTrustState" NOT NULL DEFAULT 'UNVERIFIED',
    "trusted_at" TIMESTAMP(3),
    "retired_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_messaging_identities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "customer_contacts_customer_id_status_idx"
    ON "customer_contacts"("customer_id", "status");

CREATE INDEX "customer_contacts_email_idx"
    ON "customer_contacts"("email");

CREATE INDEX "customer_contacts_phone_idx"
    ON "customer_contacts"("phone");

CREATE UNIQUE INDEX "customer_messaging_identities_channel_provider_provider_identity_id_key"
    ON "customer_messaging_identities"("channel", "provider", "provider_identity_id");

CREATE INDEX "customer_messaging_identities_contact_id_channel_idx"
    ON "customer_messaging_identities"("contact_id", "channel");

CREATE INDEX "customer_messaging_identities_trust_state_retired_at_idx"
    ON "customer_messaging_identities"("trust_state", "retired_at");

ALTER TABLE "customer_contacts"
    ADD CONSTRAINT "customer_contacts_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "customer_messaging_identities"
    ADD CONSTRAINT "customer_messaging_identities_contact_id_fkey"
    FOREIGN KEY ("contact_id") REFERENCES "customer_contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Preserve the existing single-contact Customer fields by copying them into
-- the new contact layer. The historical fields remain untouched for backwards
-- compatibility while application reads/writes are migrated in later slices.
INSERT INTO "customer_contacts" (
    "id",
    "customer_id",
    "name",
    "relationship",
    "email",
    "phone",
    "is_primary",
    "status",
    "created_at",
    "updated_at"
)
SELECT
    (
        substr(md5(c."id"::text || ':legacy-primary-contact'), 1, 8) || '-' ||
        substr(md5(c."id"::text || ':legacy-primary-contact'), 9, 4) || '-' ||
        substr(md5(c."id"::text || ':legacy-primary-contact'), 13, 4) || '-' ||
        substr(md5(c."id"::text || ':legacy-primary-contact'), 17, 4) || '-' ||
        substr(md5(c."id"::text || ':legacy-primary-contact'), 21, 12)
    )::uuid,
    c."id",
    COALESCE(NULLIF(BTRIM(c."contact_name"), ''), c."name"),
    'LEGACY_PRIMARY_CONTACT',
    NULLIF(BTRIM(c."email"), ''),
    NULLIF(BTRIM(c."phone"), ''),
    true,
    'ACTIVE'::"CustomerContactStatus",
    c."created_at",
    c."updated_at"
FROM "customers" c
WHERE
    NULLIF(BTRIM(c."contact_name"), '') IS NOT NULL
    OR NULLIF(BTRIM(c."email"), '') IS NOT NULL
    OR NULLIF(BTRIM(c."phone"), '') IS NOT NULL;
