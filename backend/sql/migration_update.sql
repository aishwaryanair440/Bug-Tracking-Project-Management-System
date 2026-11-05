-- ==============================================================================
-- DATABASE MIGRATION SCRIPT: Bug Tracking & Project Management System
--
-- This script applies the three required schema modifications to an existing
-- bug_tracking_system database safely without data loss:
--   1. Bug Reports & Comments Connection (Bug_ID FK, Faculty/Student Author support)
--   2. Faculty Bug Report Creation support (Reported_By_Role, Faculty_ID/Student_ID NULLable)
--   3. One Project Must Have Exactly One Team (uq_team_project UNIQUE constraint)
-- ==============================================================================

USE `bug_tracking_system`;

-- Disable foreign key checks during migration
SET @OLD_FOREIGN_KEY_CHECKS = @@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------------------------
-- 1. TEAM TABLE: Enforce One Project -> Exactly One Team (Case A)
-- ------------------------------------------------------------------------------
-- Ensure no duplicate Project_ID entries exist before applying unique constraint.
-- If duplicates exist, keep the lowest Team_ID for each Project_ID.
-- (In seed data each project already has exactly one team).

-- Drop unique constraint if it already exists (idempotent)
SET @exist_uq := (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'team' 
      AND CONSTRAINT_NAME = 'uq_team_project'
);

SET @sql_drop_uq = IF(@exist_uq > 0, 'ALTER TABLE `team` DROP INDEX `uq_team_project`', 'SELECT 1');
PREPARE stmt_drop_uq FROM @sql_drop_uq;
EXECUTE stmt_drop_uq;
DEALLOCATE PREPARE stmt_drop_uq;

-- Add the UNIQUE constraint on team(Project_ID)
ALTER TABLE `team`
ADD CONSTRAINT `uq_team_project` UNIQUE (`Project_ID`);


-- ------------------------------------------------------------------------------
-- 2. BUG_REPORT TABLE: Project_ID and Multi-Role Reporting Support
-- ------------------------------------------------------------------------------
-- Add Project_ID column if not present
SET @col_exists_proj := (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'bug_report' 
      AND COLUMN_NAME = 'Project_ID'
);

SET @sql_add_proj = IF(@col_exists_proj = 0, 
    'ALTER TABLE `bug_report` ADD COLUMN `Project_ID` INT NULL AFTER `Bug_ID`', 
    'SELECT 1'
);
PREPARE stmt_add_proj FROM @sql_add_proj;
EXECUTE stmt_add_proj;
DEALLOCATE PREPARE stmt_add_proj;

-- Populate Project_ID from existing linked task where available
UPDATE `bug_report` b
JOIN `task` t ON b.Task_ID = t.Task_ID
SET b.Project_ID = t.Project_ID
WHERE b.Project_ID IS NULL;

-- Fallback for any bug report without task: associate with project 1
UPDATE `bug_report`
SET `Project_ID` = 1
WHERE `Project_ID` IS NULL;

-- Enforce Project_ID NOT NULL and add foreign key
ALTER TABLE `bug_report`
MODIFY COLUMN `Project_ID` INT NOT NULL;

-- Check and add fk_bug_project constraint
SET @exist_fk_proj := (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'bug_report' 
      AND CONSTRAINT_NAME = 'fk_bug_project'
);

SET @sql_add_fk_proj = IF(@exist_fk_proj = 0, 
    'ALTER TABLE `bug_report` ADD CONSTRAINT `fk_bug_project` FOREIGN KEY (`Project_ID`) REFERENCES `project` (`Project_ID`) ON DELETE CASCADE', 
    'SELECT 1'
);
PREPARE stmt_add_fk_proj FROM @sql_add_fk_proj;
EXECUTE stmt_add_fk_proj;
DEALLOCATE PREPARE stmt_add_fk_proj;

-- Remove Description column if present
SET @col_exists_desc := (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'bug_report' 
      AND COLUMN_NAME = 'Description'
);

SET @sql_drop_desc = IF(@col_exists_desc > 0, 
    'ALTER TABLE `bug_report` DROP COLUMN `Description`', 
    'SELECT 1'
);
PREPARE stmt_drop_desc FROM @sql_drop_desc;
EXECUTE stmt_drop_desc;
DEALLOCATE PREPARE stmt_drop_desc;

-- Add Reported_By_Role column if not present
SET @col_exists_role := (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'bug_report' 
      AND COLUMN_NAME = 'Reported_By_Role'
);

SET @sql_add_role = IF(@col_exists_role = 0, 
    "ALTER TABLE `bug_report` ADD COLUMN `Reported_By_Role` VARCHAR(20) NOT NULL DEFAULT 'Student' AFTER `Student_ID`", 
    'SELECT 1'
);
PREPARE stmt_add_role FROM @sql_add_role;
EXECUTE stmt_add_role;
DEALLOCATE PREPARE stmt_add_role;

-- Allow Task_ID, Student_ID, and Faculty_ID to be NULL to allow both Faculty & Student reporting
ALTER TABLE `bug_report`
MODIFY COLUMN `Task_ID` INT NULL,
MODIFY COLUMN `Student_ID` INT NULL,
MODIFY COLUMN `Faculty_ID` INT NULL;


-- ------------------------------------------------------------------------------
-- 3. COMMENTS TABLE: Retain only Bug_ID and Student_ID as foreign keys
-- ------------------------------------------------------------------------------
-- Drop fk_comments_faculty constraint if present
SET @exist_fk_comment_faculty := (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'comments' 
      AND CONSTRAINT_NAME = 'fk_comments_faculty'
);
SET @sql_drop_fk_cf = IF(@exist_fk_comment_faculty > 0, 
    'ALTER TABLE `comments` DROP FOREIGN KEY `fk_comments_faculty`', 
    'SELECT 1'
);
PREPARE stmt_drop_fk_cf FROM @sql_drop_fk_cf;
EXECUTE stmt_drop_fk_cf;
DEALLOCATE PREPARE stmt_drop_fk_cf;

-- Drop comments_ibfk_3 if present (foreign key to faculty)
SET @exist_fk_comment_faculty2 := (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'comments' 
      AND CONSTRAINT_NAME = 'comments_ibfk_3'
);
SET @sql_drop_fk_cf2 = IF(@exist_fk_comment_faculty2 > 0, 
    'ALTER TABLE `comments` DROP FOREIGN KEY `comments_ibfk_3`', 
    'SELECT 1'
);
PREPARE stmt_drop_fk_cf2 FROM @sql_drop_fk_cf2;
EXECUTE stmt_drop_fk_cf2;
DEALLOCATE PREPARE stmt_drop_fk_cf2;

-- Drop Faculty_ID column if present
SET @col_exists_fac_comment := (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'comments' 
      AND COLUMN_NAME = 'Faculty_ID'
);
SET @sql_drop_fac_comment = IF(@col_exists_fac_comment > 0, 
    'ALTER TABLE `comments` DROP COLUMN `Faculty_ID`', 
    'SELECT 1'
);
PREPARE stmt_drop_fac_comment FROM @sql_drop_fac_comment;
EXECUTE stmt_drop_fac_comment;
DEALLOCATE PREPARE stmt_drop_fac_comment;

-- Drop Author_Role column if present
SET @col_exists_author_role := (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'comments' 
      AND COLUMN_NAME = 'Author_Role'
);
SET @sql_drop_author_role = IF(@col_exists_author_role > 0, 
    'ALTER TABLE `comments` DROP COLUMN `Author_Role`', 
    'SELECT 1'
);
PREPARE stmt_drop_author_role FROM @sql_drop_author_role;
EXECUTE stmt_drop_author_role;
DEALLOCATE PREPARE stmt_drop_author_role;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = @OLD_FOREIGN_KEY_CHECKS;

-- Verification queries
SELECT 'Migration completed successfully!' AS Status;
