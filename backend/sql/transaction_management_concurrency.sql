-- ==============================================================================
-- DATABASE SCRIPT: Transaction Management & Concurrency Control
-- Target Database: bug_tracking_system (MySQL InnoDB Engine)
-- ==============================================================================
-- This script demonstrates ACID transactions (COMMIT and ROLLBACK) and
-- Concurrency Control using row-level locking (SELECT ... FOR UPDATE)
-- entirely from the database and backend level.
-- ==============================================================================

USE `bug_tracking_system`;

-- ------------------------------------------------------------------------------
-- 1. TRANSACTION COMMIT DEMONSTRATION
-- ------------------------------------------------------------------------------
-- Begins a transaction, updates the status of a specific task row, and
-- commits changes permanently to the database.
-- ------------------------------------------------------------------------------

START TRANSACTION;

-- Check initial state
SELECT Task_ID, Task_Name, Status, Priority 
FROM TASK 
WHERE Task_ID = 1;

-- Perform updates atomically
UPDATE TASK 
SET Status = 'Completed' 
WHERE Task_ID = 1;

-- Commit the transaction to persist changes permanently
COMMIT;

-- Verify committed change
SELECT Task_ID, Task_Name, Status 
FROM TASK 
WHERE Task_ID = 1;


-- ------------------------------------------------------------------------------
-- 2. TRANSACTION ROLLBACK DEMONSTRATION (Atomic failure & restoration)
-- ------------------------------------------------------------------------------
-- Begins a transaction, makes changes, but rolls back to restore original state.
-- Demonstrates Atomicity & Isolation properties.
-- ------------------------------------------------------------------------------

START TRANSACTION;

-- Read current status
SELECT Task_ID, Task_Name, Status 
FROM TASK 
WHERE Task_ID = 1;

-- Attempt an update inside transaction
UPDATE TASK 
SET Status = 'Pending Review' 
WHERE Task_ID = 1;

-- Inspect uncommitted state within this transaction session
SELECT Task_ID, Task_Name, Status AS Uncommitted_Status 
FROM TASK 
WHERE Task_ID = 1;

-- Rollback the transaction to discard uncommitted updates
ROLLBACK;

-- Verify that the original status is intact
SELECT Task_ID, Task_Name, Status AS Post_Rollback_Status 
FROM TASK 
WHERE Task_ID = 1;


-- ------------------------------------------------------------------------------
-- 3. CONCURRENCY CONTROL USING ROW-LEVEL LOCKING (SELECT ... FOR UPDATE)
-- ------------------------------------------------------------------------------
-- Demonstrates pessimistic concurrency control on InnoDB tables.
-- Session 1 acquires an exclusive row lock (X-lock) with FOR UPDATE, preventing
-- concurrent sessions from updating or locking the same row until Session 1 completes.
-- ------------------------------------------------------------------------------

-- [SESSION 1]
START TRANSACTION;

-- Acquire exclusive row lock on Task 1
SELECT Task_ID, Task_Name, Status 
FROM TASK 
WHERE Task_ID = 1 
FOR UPDATE;

-- Update locked row
UPDATE TASK 
SET Status = 'In Progress' 
WHERE Task_ID = 1;

-- Hold lock as needed for business logic, then finalize:
COMMIT;


-- ------------------------------------------------------------------------------
-- 4. STORED PROCEDURE: sp_update_task_transactional
-- ------------------------------------------------------------------------------
-- Encapsulates transaction management and error handling within MySQL.
-- Uses SQLEXCEPTION handler to auto-rollback if any error occurs.
-- ------------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS `sp_update_task_transactional`;

DELIMITER //

CREATE PROCEDURE `sp_update_task_transactional`(
    IN p_task_id INT,
    IN p_new_status VARCHAR(30),
    OUT p_result VARCHAR(100)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        -- Rollback on any SQL error
        ROLLBACK;
        SET p_result = 'TRANSACTION_FAILED_ROLLED_BACK';
    END;

    START TRANSACTION;

    -- Pessimistic locking for concurrency control
    SELECT Task_ID INTO @tid 
    FROM TASK 
    WHERE Task_ID = p_task_id 
    FOR UPDATE;

    IF @tid IS NULL THEN
        ROLLBACK;
        SET p_result = 'TASK_NOT_FOUND';
    ELSE
        UPDATE TASK 
        SET Status = p_new_status 
        WHERE Task_ID = p_task_id;

        COMMIT;
        SET p_result = 'TRANSACTION_SUCCESS_COMMITTED';
    END IF;
END //

DELIMITER ;
