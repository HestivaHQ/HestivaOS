-- Reserved non-human actor used only when HestivaOS executes canonical operational
-- conversion after an externally supplied customer Quote decision.
--
-- This row deliberately has no corresponding Supabase Auth identity. The UUIDs are
-- stable reserved identifiers, not environment-generated identities. Keeping the
-- user INACTIVE makes the existing SupabaseAuthGuard reject it even if a matching
-- external auth identity were ever created accidentally.
DO $$
DECLARE
  existing_record RECORD;
BEGIN
  SELECT id, auth_user_id, email, display_name, role, status
  INTO existing_record
  FROM "users"
  WHERE id = '00000000-0000-4000-8000-000000000101'::uuid;

  IF FOUND THEN
    IF existing_record.auth_user_id <> '00000000-0000-4000-8000-000000000102'::uuid
      OR existing_record.email <> 'customer-self-service@system.invalid'
      OR existing_record.display_name IS DISTINCT FROM 'HestivaOS Customer Self-Service'
      OR existing_record.role <> 'TECHNICIAN'::"UserRole"
      OR existing_record.status <> 'INACTIVE'::"UserStatus" THEN
      RAISE EXCEPTION 'Reserved CUSTOMER_SELF_SERVICE user identity conflicts with existing data.';
    END IF;
  ELSE
    INSERT INTO "users" (
      "id",
      "auth_user_id",
      "email",
      "first_name",
      "last_name",
      "display_name",
      "role",
      "status",
      "created_at",
      "updated_at"
    ) VALUES (
      '00000000-0000-4000-8000-000000000101'::uuid,
      '00000000-0000-4000-8000-000000000102'::uuid,
      'customer-self-service@system.invalid',
      'Customer',
      'Self Service',
      'HestivaOS Customer Self-Service',
      'TECHNICIAN'::"UserRole",
      'INACTIVE'::"UserStatus",
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    );
  END IF;
END $$;
