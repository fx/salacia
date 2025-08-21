'use strict';

/**
 * Migration: Align api_requests columns with model fields
 * - Adds response_time_ms, response_size_bytes if missing
 * - Backfills from legacy columns response_time, response_size if present
 * - Drops legacy columns to avoid confusion
 */
module.exports = {
  async up(queryInterface) {
    // Add new columns if not exist
    await queryInterface.sequelize.query(`
      ALTER TABLE public.api_requests
      ADD COLUMN IF NOT EXISTS response_time_ms INTEGER,
      ADD COLUMN IF NOT EXISTS response_size_bytes INTEGER;
    `);

    // Backfill from legacy columns if they exist
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'api_requests'
            AND column_name = 'response_time'
        ) THEN
          EXECUTE 'UPDATE public.api_requests SET response_time_ms = response_time WHERE response_time_ms IS NULL';
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'api_requests'
            AND column_name = 'response_size'
        ) THEN
          EXECUTE 'UPDATE public.api_requests SET response_size_bytes = response_size WHERE response_size_bytes IS NULL';
        END IF;
      END $$;
    `);

    // Drop legacy columns if present
    await queryInterface.sequelize.query(`
      ALTER TABLE public.api_requests
      DROP COLUMN IF EXISTS response_time,
      DROP COLUMN IF EXISTS response_size;
    `);
  },

  async down(queryInterface) {
    // Recreate legacy columns if not exist
    await queryInterface.sequelize.query(`
      ALTER TABLE public.api_requests
      ADD COLUMN IF NOT EXISTS response_time INTEGER,
      ADD COLUMN IF NOT EXISTS response_size INTEGER;
    `);

    // Backfill legacy columns from new ones if present
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'api_requests'
            AND column_name = 'response_time_ms'
        ) THEN
          EXECUTE 'UPDATE public.api_requests SET response_time = response_time_ms WHERE response_time IS NULL';
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'api_requests'
            AND column_name = 'response_size_bytes'
        ) THEN
          EXECUTE 'UPDATE public.api_requests SET response_size = response_size_bytes WHERE response_size IS NULL';
        END IF;
      END $$;
    `);

    // Drop new columns to revert
    await queryInterface.sequelize.query(`
      ALTER TABLE public.api_requests
      DROP COLUMN IF EXISTS response_time_ms,
      DROP COLUMN IF EXISTS response_size_bytes;
    `);
  },
};
