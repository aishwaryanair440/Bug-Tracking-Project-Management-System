-- ==============================================================================
-- TRIGGER: trg_prevent_bug_completed_project
-- Enforces business rule: Cannot report a bug for a project whose status is 'Completed'.
-- ==============================================================================

USE `bug_tracking_system`;

-- Drop old trigger names if present
DROP TRIGGER IF EXISTS trg_prevent_bug_on_completed_project;
DROP TRIGGER IF EXISTS trg_prevent_bug_completed_project;

DELIMITER //

CREATE TRIGGER trg_prevent_bug_completed_project
BEFORE INSERT ON BUG_REPORT
FOR EACH ROW
BEGIN
    DECLARE pstatus VARCHAR(30);

    SELECT Status
    INTO pstatus
    FROM PROJECT
    WHERE Project_ID = NEW.Project_ID;

    IF pstatus = 'Completed' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot report a bug for a completed project';
    END IF;
END //

DELIMITER ;
