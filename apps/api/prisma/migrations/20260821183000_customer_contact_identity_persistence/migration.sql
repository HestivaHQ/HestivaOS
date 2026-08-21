CREATE TYPE "CustomerAccountType" AS ENUM ('INDIVIDUAL', 'ORGANISATION');
CREATE TYPE "CustomerContactStatus" AS ENUM ('ACTIVE', 'RETIRED');
CREATE TYPE "MessagingIdentityTrustState" AS ENUM ('UNVERIFIED', 'TRUSTED', 'BLOCKED');

ALTER TABLE "customers"
    ADD COLUMN "account_type" "CustomerAccountType";

CREATE TABLE "contacts" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customer_contacts" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "relationship" TEXT,
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

CREATE INDEX "contacts_email_idx" ON "contacts"("email");
CREATE INDEX "contacts_phone_idx" ON "contacts"("phone");

CREATE UNIQUE INDEX "customer_contacts_customer_id_contact_id_key"
    ON "customer_contacts"("customer_id", "contact_id");
CREATE INDEX "customer_contacts_customer_id_status_idx"
    ON "customer_contacts"("customer_id", "status");
CREATE INDEX "customer_contacts_contact_id_status_idx"
    ON "customer_contacts"("contact_id", "status");

CREATE UNIQUE INDEX "customer_messaging_identities_channel_provider_provider_identity_id_key"
    ON "customer_messaging_identities"("channel", "provider", "provider_identity_id");
CREATE INDEX "customer_messaging_identities_contact_id_channel_idx"
    ON "customer_messaging_identities"("contact_id", "channel");
CREATE INDEX "customer_messaging_identities_trust_state_retired_at_idx"
    ON "customer_messaging_identities"("trust_state", "retired_at");

ALTER TABLE "customer_contacts"
    ADD CONSTRAINT "customer_contacts_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_contacts"
    ADD CONSTRAINT "customer_contacts_contact_id_fkey"
    FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_messaging_identities"
    ADD CONSTRAINT "customer_messaging_identities_contact_id_fkey"
    FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Preserve every existing Customer contact detail without attempting to merge
-- people across Customer accounts. A later reviewed workflow may explicitly
-- connect one Contact to multiple Customer accounts when that relationship is
-- known (for example an estate agent or property manager).
INSERT INTO "contacts" (
    "id", "name", "email", "phone", "created_at", "updated_at"
)
SELECT
    (
        substr(md5(c."id"::text || ':legacy-contact-person'), 1, 8) || '-' ||
        substr(md5(c."id"::text || ':legacy-contact-person'), 9, 4) || '-' ||
        substr(md5(c."id"::text || ':legacy-contact-person'), 13, 4) || '-' ||
        substr(md5(c."id"::text || ':legacy-contact-person'), 17, 4) || '-' ||
        substr(md5(c."id"::text || ':legacy-contact-person'), 21, 12)
    )::uuid,
    COALESCE(NULLIF(BTRIM(c."contact_name"), ''), c."name"),
    NULLIF(BTRIM(c."email"), ''),
    NULLIF(BTRIM(c."phone"), ''),
    c."created_at",
    c."updated_at"
FROM "customers" c
WHERE
    NULLIF(BTRIM(c."contact_name"), '') IS NOT NULL
    OR NULLIF(BTRIM(c."email"), '') IS NOT NULL
    OR NULLIF(BTRIM(c."phone"), '') IS NOT NULL;

INSERT INTO "customer_contacts" (
    "id", "customer_id", "contact_id", "relationship", "is_primary",
    "status", "created_at", "updated_at"
)
SELECT
    (
        substr(md5(c."id"::text || ':legacy-customer-contact-link'), 1, 8) || '-' ||
        substr(md5(c."id"::text || ':legacy-customer-contact-link'), 9, 4) || '-' ||
        substr(md5(c."id"::text || ':legacy-customer-contact-link'), 13, 4) || '-' ||
        substr(md5(c."id"::text || ':legacy-customer-contact-link'), 17, 4) || '-' ||
        substr(md5(c."id"::text || ':legacy-customer-contact-link'), 21, 12)
    )::uuid,
    c."id",
    (
        substr(md5(c."id"::text || ':legacy-contact-person'), 1, 8) || '-' ||
        substr(md5(c."id"::text || ':legacy-contact-person'), 9, 4) || '-' ||
        substr(md5(c."id"::text || ':legacy-contact-person'), 13, 4) || '-' ||
        substr(md5(c."id"::text || ':legacy-contact-person'), 17, 4) || '-' ||
        substr(md5(c."id"::text || ':legacy-contact-person'), 21, 12)
    )::uuid,
    'LEGACY_PRIMARY_CONTACT',
    true,
    'ACTIVE'::"CustomerContactStatus",
    c."created_at",
    c."updated_at"
FROM "customers" c
WHERE
    NULLIF(BTRIM(c."contact_name"), '') IS NOT NULL
    OR NULLIF(BTRIM(c."email"), '') IS NOT NULL
    OR NULLIF(BTRIM(c."phone"), '') IS NOT NULL;
