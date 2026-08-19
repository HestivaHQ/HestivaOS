CREATE TABLE "user_access_changes" (
    "id" UUID NOT NULL,
    "target_user_id" UUID NOT NULL,
    "target_email" TEXT NOT NULL,
    "target_display_name" TEXT,
    "actor_user_id" UUID NOT NULL,
    "actor_email" TEXT NOT NULL,
    "actor_display_name" TEXT,
    "old_role" "UserRole" NOT NULL,
    "new_role" "UserRole" NOT NULL,
    "old_status" "UserStatus" NOT NULL,
    "new_status" "UserStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_access_changes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "user_access_changes_target_user_id_created_at_idx"
    ON "user_access_changes"("target_user_id", "created_at");

CREATE INDEX "user_access_changes_actor_user_id_created_at_idx"
    ON "user_access_changes"("actor_user_id", "created_at");
