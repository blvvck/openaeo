-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."alert_channels" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "config" JSONB NOT NULL,
    "enabled" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."alert_history" (
    "id" SERIAL NOT NULL,
    "rule_id" INTEGER,
    "status" VARCHAR(20) DEFAULT 'pending',
    "message" TEXT NOT NULL,
    "data" JSONB,
    "channels_sent" JSONB,
    "triggered_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(6),
    "error" TEXT,

    CONSTRAINT "alert_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."alert_rules" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "threshold" REAL NOT NULL,
    "time_window_hours" INTEGER DEFAULT 24,
    "enabled" BOOLEAN DEFAULT true,
    "description" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."analytics" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "total_prompts" INTEGER DEFAULT 0,
    "brand_mention_rate" REAL DEFAULT 0,
    "top_competitor" TEXT,
    "total_sources" INTEGER DEFAULT 0,
    "total_domains" INTEGER DEFAULT 0,

    CONSTRAINT "analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."api_rate_limit_settings" (
    "id" SERIAL NOT NULL,
    "platform" VARCHAR(30) NOT NULL,
    "max_concurrent" INTEGER DEFAULT 3,
    "requests_per_minute" INTEGER DEFAULT 60,
    "retry_after_ms" INTEGER DEFAULT 1000,
    "daily_budget" INTEGER DEFAULT 0,
    "respect_platform_limits" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_rate_limit_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."bot_visits" (
    "id" SERIAL NOT NULL,
    "bot_type" VARCHAR(50) NOT NULL,
    "user_agent" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "visited_at" TIMESTAMP(6) NOT NULL,
    "status_code" INTEGER,
    "response_time_ms" INTEGER,
    "content_type" VARCHAR(100),
    "content_length_bytes" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bot_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."brand_aliases" (
    "id" SERIAL NOT NULL,
    "brand_id" VARCHAR(100) NOT NULL,
    "alias" VARCHAR(200) NOT NULL,
    "normalized_alias" VARCHAR(200) NOT NULL,
    "alias_type" VARCHAR(20) NOT NULL,
    "match_partial" BOOLEAN DEFAULT false,
    "is_primary" BOOLEAN DEFAULT false,
    "confidence" REAL DEFAULT 1,
    "deleted_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brand_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."brand_config" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "domain" VARCHAR(255),
    "aliases" JSONB DEFAULT '[]',
    "competitor_list" JSONB DEFAULT '[]',
    "industry" VARCHAR(100),
    "metadata" JSONB DEFAULT '{}',
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brand_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."competitors" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "mention_count" INTEGER DEFAULT 0,
    "last_mentioned" TIMESTAMP(6),
    "domain" VARCHAR(255),
    "initial_score" INTEGER,
    "platforms_found" JSONB,
    "discovered_prompts" JSONB,

    CONSTRAINT "competitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."experiment_results" (
    "id" SERIAL NOT NULL,
    "experiment_id" INTEGER NOT NULL,
    "variant_id" INTEGER NOT NULL,
    "sample_size" INTEGER DEFAULT 0,
    "avg_visibility" REAL,
    "std_visibility" REAL,
    "avg_mentions" REAL,
    "avg_position" REAL,
    "success_rate" REAL,
    "chi_squared" REAL,
    "p_value" REAL,
    "ci_lower" REAL,
    "ci_upper" REAL,
    "calculated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "experiment_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."experiment_variants" (
    "id" SERIAL NOT NULL,
    "experiment_id" INTEGER NOT NULL,
    "variant_id" INTEGER NOT NULL,
    "traffic_allocation" INTEGER DEFAULT 50,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "experiment_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."experiments" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "status" VARCHAR(20) DEFAULT 'draft',
    "started_at" TIMESTAMP(6),
    "ended_at" TIMESTAMP(6),
    "min_sample_size" INTEGER DEFAULT 30,
    "confidence_level" REAL DEFAULT 0.95,
    "winner_variant_id" INTEGER,
    "significance_achieved" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "experiments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."export_backup_config" (
    "id" SERIAL NOT NULL,
    "auto_export_frequency" VARCHAR(20) DEFAULT 'never',
    "export_format" VARCHAR(10) DEFAULT 'json',
    "destination_type" VARCHAR(20) DEFAULT 'local',
    "destination_config" JSONB DEFAULT '{}',
    "retention_days" INTEGER DEFAULT 90,
    "include_raw_responses" BOOLEAN DEFAULT false,
    "last_export_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "export_backup_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."intelligence_searches" (
    "id" SERIAL NOT NULL,
    "domain" TEXT NOT NULL,
    "brand_name" TEXT,
    "brand_logo" TEXT,
    "user_id" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intelligence_searches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."logos" (
    "domain" VARCHAR(255) NOT NULL,
    "logo_url" TEXT NOT NULL,
    "source" VARCHAR(30) NOT NULL,
    "fetched_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content_type" VARCHAR(50),

    CONSTRAINT "logos_pkey" PRIMARY KEY ("domain")
);

-- CreateTable
CREATE TABLE "public"."notification_preferences" (
    "id" SERIAL NOT NULL,
    "user_id" VARCHAR(64) DEFAULT 'default',
    "email_frequency" VARCHAR(20) DEFAULT 'daily',
    "email_addresses" JSONB DEFAULT '[]',
    "visibility_drop_threshold" REAL DEFAULT 10,
    "competitor_surge_threshold" REAL DEFAULT 20,
    "sentiment_shift_threshold" REAL DEFAULT 15,
    "receive_summary_reports" BOOLEAN DEFAULT true,
    "quiet_hours" JSONB,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."personas" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "country" VARCHAR(2),
    "description" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "personas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."platform_settings" (
    "id" SERIAL NOT NULL,
    "platform" VARCHAR(30) NOT NULL,
    "enabled" BOOLEAN DEFAULT true,
    "priority" INTEGER DEFAULT 10,
    "api_key_encrypted" TEXT,
    "budget_limit_usd" REAL,
    "config" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."platforms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "icon_url" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "rate_limit_rpm" INTEGER NOT NULL,
    "rate_limit_concurrent" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platforms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."priority_queue_settings" (
    "id" SERIAL NOT NULL,
    "max_queue_size" INTEGER DEFAULT 100,
    "default_priority" INTEGER DEFAULT 5,
    "auto_process_priority" BOOLEAN DEFAULT true,
    "ordering_strategy" VARCHAR(20) DEFAULT 'priority',
    "priority_rules" JSONB DEFAULT '[]',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "priority_queue_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."prompt_performance_metrics" (
    "id" SERIAL NOT NULL,
    "prompt_id" INTEGER NOT NULL,
    "execution_count" INTEGER DEFAULT 0,
    "brand_mention_count" INTEGER DEFAULT 0,
    "avg_visibility_score" REAL,
    "avg_position" REAL,
    "avg_sentiment" REAL,
    "success_rate" REAL,
    "avg_response_time_ms" INTEGER,
    "last_calculated_at" TIMESTAMP(6),
    "last_executed_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompt_performance_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."prompt_priority_queue" (
    "id" SERIAL NOT NULL,
    "prompt_id" INTEGER NOT NULL,
    "priority_level" VARCHAR(20) DEFAULT 'normal',
    "priority_score" INTEGER DEFAULT 100,
    "reason" TEXT,
    "set_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(6),
    "is_active" BOOLEAN DEFAULT true,

    CONSTRAINT "prompt_priority_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."prompt_schedule_links" (
    "id" SERIAL NOT NULL,
    "prompt_id" INTEGER,
    "template_id" INTEGER,
    "schedule_id" INTEGER NOT NULL,
    "priority" INTEGER DEFAULT 100,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompt_schedule_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."prompt_tags" (
    "prompt_id" INTEGER NOT NULL,
    "tag_id" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "public"."prompt_template_versions" (
    "id" SERIAL NOT NULL,
    "template_id" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "template" TEXT NOT NULL,
    "change_notes" TEXT,
    "changed_by" VARCHAR(100),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompt_template_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."prompt_templates" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "template" TEXT NOT NULL,
    "category" VARCHAR(50),
    "description" TEXT,
    "version" INTEGER DEFAULT 1,
    "is_active" BOOLEAN DEFAULT true,
    "archived_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompt_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."prompt_variants" (
    "id" SERIAL NOT NULL,
    "base_prompt_id" INTEGER NOT NULL,
    "variant_label" VARCHAR(10) NOT NULL,
    "text" TEXT NOT NULL,
    "is_control" BOOLEAN DEFAULT false,
    "is_winner" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompt_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."prompts" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "topic_id" INTEGER,
    "topic_ids" INTEGER[],
    "archived_at" TIMESTAMP(6),
    "journey_stages" TEXT[],
    "persona_id" INTEGER,
    "is_priority" BOOLEAN DEFAULT false,
    "last_refreshed_at" TIMESTAMP(6),
    "refresh_count" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quality_aggregates" (
    "id" SERIAL NOT NULL,
    "period_type" VARCHAR(10) NOT NULL,
    "period_start" TIMESTAMP(6) NOT NULL,
    "period_end" TIMESTAMP(6) NOT NULL,
    "response_count" INTEGER NOT NULL,
    "avg_overall_score" REAL,
    "avg_accuracy_score" REAL,
    "avg_relevance_score" REAL,
    "avg_recency_score" REAL,
    "avg_completeness_score" REAL,
    "level_counts" JSONB,
    "issue_counts" JSONB,
    "inclusion_rate" REAL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quality_aggregates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quality_anomalies" (
    "id" SERIAL NOT NULL,
    "anomaly_type" VARCHAR(30) NOT NULL,
    "severity" VARCHAR(10) NOT NULL,
    "metric" VARCHAR(50) NOT NULL,
    "expected_value" REAL,
    "actual_value" REAL,
    "deviation" REAL,
    "description" TEXT NOT NULL,
    "detected_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "period_start" TIMESTAMP(6),
    "period_end" TIMESTAMP(6),
    "acknowledged" BOOLEAN DEFAULT false,
    "acknowledged_at" TIMESTAMP(6),
    "notes" TEXT,
    "context" JSONB,

    CONSTRAINT "quality_anomalies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."refresh_history" (
    "id" SERIAL NOT NULL,
    "prompt_id" INTEGER,
    "scheduled_for" TIMESTAMP(6),
    "status" VARCHAR(20) NOT NULL,
    "started_at" TIMESTAMP(6),
    "completed_at" TIMESTAMP(6),
    "error" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."refresh_scheduling_settings" (
    "id" SERIAL NOT NULL,
    "default_interval_hours" INTEGER DEFAULT 168,
    "priority_interval_hours" INTEGER DEFAULT 24,
    "blackout_periods" JSONB DEFAULT '[]',
    "batch_size" INTEGER DEFAULT 50,
    "concurrency_limit" INTEGER DEFAULT 5,
    "auto_refresh_enabled" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_scheduling_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."request_queue" (
    "id" SERIAL NOT NULL,
    "prompt_id" INTEGER,
    "platform" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) DEFAULT 'pending',
    "priority" VARCHAR(10) DEFAULT 'normal',
    "retry_count" INTEGER DEFAULT 0,
    "scheduled_for" TIMESTAMP(6),
    "started_at" TIMESTAMP(6),
    "completed_at" TIMESTAMP(6),
    "error_message" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."response_quality_scores" (
    "id" SERIAL NOT NULL,
    "response_id" INTEGER NOT NULL,
    "overall_score" INTEGER NOT NULL,
    "quality_level" VARCHAR(20) NOT NULL,
    "accuracy_score" INTEGER NOT NULL,
    "relevance_score" INTEGER NOT NULL,
    "recency_score" INTEGER NOT NULL,
    "completeness_score" INTEGER NOT NULL,
    "issues" JSONB,
    "include_in_metrics" BOOLEAN DEFAULT true,
    "exclusion_reason" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "response_quality_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."responses" (
    "id" SERIAL NOT NULL,
    "prompt_id" INTEGER NOT NULL,
    "platform" VARCHAR(30) DEFAULT 'unknown',
    "text" TEXT NOT NULL,
    "brand_mentioned" BOOLEAN DEFAULT false,
    "competitors_mentioned" TEXT[],
    "sources" TEXT[],
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scan_schedules" (
    "id" SERIAL NOT NULL,
    "frequency" VARCHAR(20) NOT NULL,
    "platforms" JSONB NOT NULL,
    "next_run" TIMESTAMP(6),
    "last_run" TIMESTAMP(6),
    "enabled" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scan_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scrape_attempts" (
    "id" SERIAL NOT NULL,
    "prompt_id" INTEGER,
    "platform" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "cost" REAL DEFAULT 0,
    "response_time_ms" INTEGER,
    "error_type" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scrape_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."settings_audit_log" (
    "id" SERIAL NOT NULL,
    "table_name" VARCHAR(50) NOT NULL,
    "record_id" INTEGER,
    "action" VARCHAR(10) NOT NULL,
    "user_id" VARCHAR(64) DEFAULT 'system',
    "previous_values" JSONB,
    "new_values" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "changed_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settings_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."shared_reports" (
    "id" SERIAL NOT NULL,
    "public_id" VARCHAR(64) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "date_range_start" TIMESTAMP(6),
    "date_range_end" TIMESTAMP(6),
    "sections" JSONB NOT NULL,
    "expires_at" TIMESTAMP(6),
    "view_count" INTEGER DEFAULT 0,
    "revoked" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shared_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."site_audits" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "checks" JSONB NOT NULL,
    "recommendations" JSONB NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sources" (
    "id" SERIAL NOT NULL,
    "domain" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "citation_count" INTEGER DEFAULT 0,
    "last_cited" TIMESTAMP(6),

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tags" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "color" VARCHAR(7),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."template_categories" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "parent_id" INTEGER,
    "sort_order" INTEGER DEFAULT 0,
    "color" VARCHAR(7),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "template_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."template_tags" (
    "template_id" INTEGER NOT NULL,
    "tag_id" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "public"."template_variables" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "default_value" TEXT,
    "is_required" BOOLEAN DEFAULT false,
    "variable_type" VARCHAR(20) DEFAULT 'text',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "template_variables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."topics" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."usage_events" (
    "id" SERIAL NOT NULL,
    "platform" VARCHAR(30) NOT NULL,
    "model" VARCHAR(100),
    "prompt_id" INTEGER,
    "success" BOOLEAN NOT NULL,
    "response_time_ms" INTEGER,
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "estimated_cost_usd" REAL,
    "error_type" VARCHAR(50),
    "error_message" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."usage_metrics" (
    "id" SERIAL NOT NULL,
    "platform" VARCHAR(30) NOT NULL,
    "date" TIMESTAMP(6) NOT NULL,
    "api_calls" INTEGER DEFAULT 0,
    "successful_calls" INTEGER DEFAULT 0,
    "failed_calls" INTEGER DEFAULT 0,
    "input_tokens" INTEGER DEFAULT 0,
    "output_tokens" INTEGER DEFAULT 0,
    "estimated_cost_usd" REAL DEFAULT 0,
    "avg_response_time_ms" INTEGER,
    "min_response_time_ms" INTEGER,
    "max_response_time_ms" INTEGER,
    "error_breakdown" JSONB,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."usage_reports" (
    "id" SERIAL NOT NULL,
    "report_type" VARCHAR(20) NOT NULL,
    "period_start" TIMESTAMP(6) NOT NULL,
    "period_end" TIMESTAMP(6) NOT NULL,
    "total_calls" INTEGER DEFAULT 0,
    "total_successful" INTEGER DEFAULT 0,
    "total_failed" INTEGER DEFAULT 0,
    "total_cost_usd" REAL DEFAULT 0,
    "total_input_tokens" INTEGER DEFAULT 0,
    "total_output_tokens" INTEGER DEFAULT 0,
    "avg_response_time_ms" INTEGER,
    "platform_breakdown" JSONB,
    "top_errors" JSONB,
    "cost_by_platform" JSONB,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_preferences" (
    "id" SERIAL NOT NULL,
    "user_id" VARCHAR(64) DEFAULT 'default',
    "theme" VARCHAR(20) DEFAULT 'system',
    "default_date_range" VARCHAR(10) DEFAULT '7d',
    "default_platform" VARCHAR(30),
    "display_options" JSONB DEFAULT '{}',
    "timezone" VARCHAR(50) DEFAULT 'UTC',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "display_name" VARCHAR(100),
    "avatar_url" TEXT,
    "deleted_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."variant_performance" (
    "id" SERIAL NOT NULL,
    "variant_id" INTEGER NOT NULL,
    "avg_visibility" REAL,
    "avg_position" REAL,
    "avg_mentions" REAL,
    "sample_size" INTEGER DEFAULT 0,
    "last_calculated" TIMESTAMP(6),

    CONSTRAINT "variant_performance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."workspace_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "role" VARCHAR(20) NOT NULL DEFAULT 'member',
    "invited_by" VARCHAR(255),
    "joined_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."workspaces" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(50) NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "owner_id" VARCHAR(255) NOT NULL,
    "plan" VARCHAR(20) DEFAULT 'free',
    "deleted_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_alert_history_rule_triggered" ON "public"."alert_history"("rule_id" ASC, "triggered_at" ASC);

-- CreateIndex
CREATE INDEX "idx_alert_history_status" ON "public"."alert_history"("status" ASC);

-- CreateIndex
CREATE INDEX "idx_alert_rules_type_enabled" ON "public"."alert_rules"("type" ASC, "enabled" ASC);

-- CreateIndex
CREATE INDEX "idx_rate_limit_platform" ON "public"."api_rate_limit_settings"("platform" ASC);

-- CreateIndex
CREATE INDEX "idx_bot_visits_bot_type" ON "public"."bot_visits"("bot_type" ASC);

-- CreateIndex
CREATE INDEX "idx_bot_visits_visited_at" ON "public"."bot_visits"("visited_at" ASC);

-- CreateIndex
CREATE INDEX "idx_brand_aliases_active" ON "public"."brand_aliases"("deleted_at" ASC);

-- CreateIndex
CREATE INDEX "idx_brand_aliases_brand_id" ON "public"."brand_aliases"("brand_id" ASC);

-- CreateIndex
CREATE INDEX "idx_brand_aliases_normalized" ON "public"."brand_aliases"("normalized_alias" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "competitors_name_unique" ON "public"."competitors"("name" ASC);

-- CreateIndex
CREATE INDEX "idx_experiment_results_experiment" ON "public"."experiment_results"("experiment_id" ASC);

-- CreateIndex
CREATE INDEX "idx_experiment_results_unique" ON "public"."experiment_results"("experiment_id" ASC, "variant_id" ASC);

-- CreateIndex
CREATE INDEX "idx_experiment_variants_experiment" ON "public"."experiment_variants"("experiment_id" ASC);

-- CreateIndex
CREATE INDEX "idx_experiment_variants_variant" ON "public"."experiment_variants"("variant_id" ASC);

-- CreateIndex
CREATE INDEX "idx_experiments_status" ON "public"."experiments"("status" ASC);

-- CreateIndex
CREATE INDEX "idx_intelligence_searches_created_at" ON "public"."intelligence_searches"("created_at" ASC);

-- CreateIndex
CREATE INDEX "idx_intelligence_searches_user_id" ON "public"."intelligence_searches"("user_id" ASC);

-- CreateIndex
CREATE INDEX "idx_platform_settings_platform" ON "public"."platform_settings"("platform" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "platform_settings_platform_unique" ON "public"."platform_settings"("platform" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "idx_platforms_slug" ON "public"."platforms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "platforms_slug_unique" ON "public"."platforms"("slug" ASC);

-- CreateIndex
CREATE INDEX "idx_prompt_performance_prompt" ON "public"."prompt_performance_metrics"("prompt_id" ASC);

-- CreateIndex
CREATE INDEX "idx_prompt_performance_visibility" ON "public"."prompt_performance_metrics"("avg_visibility_score" ASC);

-- CreateIndex
CREATE INDEX "idx_priority_queue_active" ON "public"."prompt_priority_queue"("is_active" ASC, "priority_score" ASC);

-- CreateIndex
CREATE INDEX "idx_priority_queue_prompt" ON "public"."prompt_priority_queue"("prompt_id" ASC);

-- CreateIndex
CREATE INDEX "idx_prompt_schedule_links_prompt" ON "public"."prompt_schedule_links"("prompt_id" ASC);

-- CreateIndex
CREATE INDEX "idx_prompt_schedule_links_schedule" ON "public"."prompt_schedule_links"("schedule_id" ASC);

-- CreateIndex
CREATE INDEX "idx_prompt_tags_pk" ON "public"."prompt_tags"("prompt_id" ASC, "tag_id" ASC);

-- CreateIndex
CREATE INDEX "idx_prompt_tags_tag" ON "public"."prompt_tags"("tag_id" ASC);

-- CreateIndex
CREATE INDEX "idx_template_versions_template" ON "public"."prompt_template_versions"("template_id" ASC, "version" ASC);

-- CreateIndex
CREATE INDEX "idx_prompt_templates_active" ON "public"."prompt_templates"("is_active" ASC);

-- CreateIndex
CREATE INDEX "idx_prompt_templates_category" ON "public"."prompt_templates"("category" ASC);

-- CreateIndex
CREATE INDEX "idx_variants_base_prompt" ON "public"."prompt_variants"("base_prompt_id" ASC);

-- CreateIndex
CREATE INDEX "idx_prompts_persona" ON "public"."prompts"("persona_id" ASC);

-- CreateIndex
CREATE INDEX "idx_prompts_priority" ON "public"."prompts"("is_priority" ASC);

-- CreateIndex
CREATE INDEX "idx_quality_aggregates_period" ON "public"."quality_aggregates"("period_type" ASC, "period_start" ASC);

-- CreateIndex
CREATE INDEX "idx_quality_anomalies_detected" ON "public"."quality_anomalies"("detected_at" ASC);

-- CreateIndex
CREATE INDEX "idx_quality_anomalies_severity" ON "public"."quality_anomalies"("severity" ASC);

-- CreateIndex
CREATE INDEX "idx_quality_anomalies_unack" ON "public"."quality_anomalies"("acknowledged" ASC);

-- CreateIndex
CREATE INDEX "idx_refresh_history_prompt" ON "public"."refresh_history"("prompt_id" ASC);

-- CreateIndex
CREATE INDEX "idx_refresh_history_status" ON "public"."refresh_history"("status" ASC);

-- CreateIndex
CREATE INDEX "idx_queue_completed_at" ON "public"."request_queue"("completed_at" ASC);

-- CreateIndex
CREATE INDEX "idx_queue_pending" ON "public"."request_queue"("status" ASC);

-- CreateIndex
CREATE INDEX "idx_queue_status_platform" ON "public"."request_queue"("status" ASC, "platform" ASC);

-- CreateIndex
CREATE INDEX "idx_quality_scores_created_at" ON "public"."response_quality_scores"("created_at" ASC);

-- CreateIndex
CREATE INDEX "idx_quality_scores_include" ON "public"."response_quality_scores"("include_in_metrics" ASC);

-- CreateIndex
CREATE INDEX "idx_quality_scores_level" ON "public"."response_quality_scores"("quality_level" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "response_quality_scores_response_id_unique" ON "public"."response_quality_scores"("response_id" ASC);

-- CreateIndex
CREATE INDEX "idx_responses_platform" ON "public"."responses"("platform" ASC);

-- CreateIndex
CREATE INDEX "idx_audit_changed_at" ON "public"."settings_audit_log"("changed_at" ASC);

-- CreateIndex
CREATE INDEX "idx_audit_table_action" ON "public"."settings_audit_log"("table_name" ASC, "action" ASC);

-- CreateIndex
CREATE INDEX "idx_shared_reports_public_id" ON "public"."shared_reports"("public_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "shared_reports_public_id_unique" ON "public"."shared_reports"("public_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "template_categories_name_unique" ON "public"."template_categories"("name" ASC);

-- CreateIndex
CREATE INDEX "idx_template_tags_pk" ON "public"."template_tags"("template_id" ASC, "tag_id" ASC);

-- CreateIndex
CREATE INDEX "idx_template_tags_tag" ON "public"."template_tags"("tag_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "template_variables_name_unique" ON "public"."template_variables"("name" ASC);

-- CreateIndex
CREATE INDEX "idx_usage_events_created_at" ON "public"."usage_events"("created_at" ASC);

-- CreateIndex
CREATE INDEX "idx_usage_events_platform" ON "public"."usage_events"("platform" ASC);

-- CreateIndex
CREATE INDEX "idx_usage_events_prompt" ON "public"."usage_events"("prompt_id" ASC);

-- CreateIndex
CREATE INDEX "idx_usage_metrics_date" ON "public"."usage_metrics"("date" ASC);

-- CreateIndex
CREATE INDEX "idx_usage_metrics_platform_date" ON "public"."usage_metrics"("platform" ASC, "date" ASC);

-- CreateIndex
CREATE INDEX "idx_usage_reports_type_start" ON "public"."usage_reports"("report_type" ASC, "period_start" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "idx_users_email" ON "public"."users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_unique" ON "public"."users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "variant_performance_variant_id_unique" ON "public"."variant_performance"("variant_id" ASC);

-- CreateIndex
CREATE INDEX "idx_workspace_members_user" ON "public"."workspace_members"("user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "idx_workspace_members_workspace_user" ON "public"."workspace_members"("workspace_id" ASC, "user_id" ASC);

-- CreateIndex
CREATE INDEX "idx_workspaces_owner" ON "public"."workspaces"("owner_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "idx_workspaces_slug" ON "public"."workspaces"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_slug_unique" ON "public"."workspaces"("slug" ASC);

-- AddForeignKey
ALTER TABLE "public"."alert_history" ADD CONSTRAINT "alert_history_rule_id_alert_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."alert_rules"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."experiment_results" ADD CONSTRAINT "experiment_results_experiment_id_experiments_id_fk" FOREIGN KEY ("experiment_id") REFERENCES "public"."experiments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."experiment_results" ADD CONSTRAINT "experiment_results_variant_id_prompt_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."prompt_variants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."experiment_variants" ADD CONSTRAINT "experiment_variants_experiment_id_experiments_id_fk" FOREIGN KEY ("experiment_id") REFERENCES "public"."experiments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."experiment_variants" ADD CONSTRAINT "experiment_variants_variant_id_prompt_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."prompt_variants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."prompt_performance_metrics" ADD CONSTRAINT "prompt_performance_metrics_prompt_id_prompts_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."prompts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."prompt_priority_queue" ADD CONSTRAINT "prompt_priority_queue_prompt_id_prompts_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."prompts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."prompt_schedule_links" ADD CONSTRAINT "prompt_schedule_links_prompt_id_prompts_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."prompts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."prompt_schedule_links" ADD CONSTRAINT "prompt_schedule_links_schedule_id_scan_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."scan_schedules"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."prompt_schedule_links" ADD CONSTRAINT "prompt_schedule_links_template_id_prompt_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."prompt_templates"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."prompt_tags" ADD CONSTRAINT "prompt_tags_prompt_id_prompts_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."prompts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."prompt_tags" ADD CONSTRAINT "prompt_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."prompt_template_versions" ADD CONSTRAINT "prompt_template_versions_template_id_prompt_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."prompt_templates"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."prompt_variants" ADD CONSTRAINT "prompt_variants_base_prompt_id_prompts_id_fk" FOREIGN KEY ("base_prompt_id") REFERENCES "public"."prompts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."prompts" ADD CONSTRAINT "prompts_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."prompts" ADD CONSTRAINT "prompts_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."refresh_history" ADD CONSTRAINT "refresh_history_prompt_id_prompts_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."prompts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."request_queue" ADD CONSTRAINT "request_queue_prompt_id_prompts_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."prompts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."response_quality_scores" ADD CONSTRAINT "response_quality_scores_response_id_responses_id_fk" FOREIGN KEY ("response_id") REFERENCES "public"."responses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."responses" ADD CONSTRAINT "responses_prompt_id_prompts_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."prompts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."template_tags" ADD CONSTRAINT "template_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."template_tags" ADD CONSTRAINT "template_tags_template_id_prompt_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."prompt_templates"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."usage_events" ADD CONSTRAINT "usage_events_prompt_id_prompts_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."prompts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."variant_performance" ADD CONSTRAINT "variant_performance_variant_id_prompt_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."prompt_variants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."workspace_members" ADD CONSTRAINT "workspace_members_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."workspace_members" ADD CONSTRAINT "workspace_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."workspaces" ADD CONSTRAINT "workspaces_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

