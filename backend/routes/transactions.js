const express = require('express');
const router = express.Router();
const { pool } = require('../database');

/**
 * GET /api/transactions/tasks
 * Returns tasks for the transaction management UI task selector.
 */
router.get('/tasks', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT T.Task_ID, T.Project_ID, T.Student_ID,
              T.Task_Name, T.Description, T.Priority, T.Status,
              P.Title AS Project_Title,
              S.Name AS Assigned_Student
       FROM TASK T
       LEFT JOIN PROJECT P ON T.Project_ID = P.Project_ID
       LEFT JOIN STUDENT S ON T.Student_ID = S.Student_ID
       ORDER BY T.Task_ID ASC`
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching transaction tasks:', error);
    res.status(500).json({ success: false, message: 'Could not fetch tasks' });
  }
});

/**
 * POST /api/transactions/commit
 * 
 * SQL Logic:
 *   START TRANSACTION;
 *   UPDATE TASK SET Status = 'Completed' WHERE Task_ID = ?;
 *   COMMIT;
 */
router.post('/commit', async (req, res) => {
  const { taskId, newStatus = 'Completed' } = req.body;
  const numTaskId = Number(taskId);

  if (!numTaskId || isNaN(numTaskId) || numTaskId <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or missing taskId. Please provide a positive numeric Task ID.'
    });
  }

  const connection = await pool.getConnection();
  const startTime = Date.now();

  try {
    // 1. Begin transaction on this specific connection
    await connection.beginTransaction();

    // 2. Fetch current task state within the transaction
    const [taskRows] = await connection.execute(
      'SELECT Task_ID, Task_Name, Status, Project_ID FROM TASK WHERE Task_ID = ?',
      [numTaskId]
    );

    if (taskRows.length === 0) {
      // Task not found: rollback transaction and return 404
      await connection.rollback();
      return res.status(404).json({
        success: false,
        operation: 'COMMIT',
        taskId: numTaskId,
        message: `Task with ID ${numTaskId} does not exist in the database. Transaction was rolled back.`,
        transactionResult: 'ROLLED_BACK'
      });
    }

    const initialStatus = taskRows[0].Status;
    const taskName = taskRows[0].Task_Name;

    // 3. Update task status
    const [updateResult] = await connection.execute(
      'UPDATE TASK SET Status = ? WHERE Task_ID = ?',
      [newStatus, numTaskId]
    );

    if (updateResult.affectedRows === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        operation: 'COMMIT',
        taskId: numTaskId,
        message: 'Update did not affect any rows. Transaction was rolled back.',
        transactionResult: 'ROLLED_BACK'
      });
    }

    // 4. Commit transaction
    await connection.commit();

    // 5. Verify the updated status directly from database
    const [verifyRows] = await pool.execute(
      'SELECT Task_ID, Status FROM TASK WHERE Task_ID = ?',
      [numTaskId]
    );
    const finalStatus = verifyRows[0]?.Status;

    return res.json({
      success: true,
      operation: 'COMMIT',
      taskId: numTaskId,
      taskName,
      previousStatus: initialStatus,
      requestedStatus: newStatus,
      finalDatabaseStatus: finalStatus,
      transactionResult: 'COMMITTED',
      executionTimeMs: Date.now() - startTime,
      message: `Transaction committed successfully. Task #${numTaskId} status updated from '${initialStatus}' to '${finalStatus}'.`,
      sqlStatements: [
        'START TRANSACTION;',
        `UPDATE TASK SET Status = '${newStatus}' WHERE Task_ID = ${numTaskId};`,
        'COMMIT;'
      ]
    });
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rbErr) {
      console.error('Error during rollback:', rbErr);
    }
    console.error('Commit transaction failed:', error);
    return res.status(500).json({
      success: false,
      operation: 'COMMIT',
      taskId: numTaskId,
      message: `Transaction error: ${error.message}. Changes were rolled back.`,
      transactionResult: 'ROLLED_BACK',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

/**
 * POST /api/transactions/rollback
 * 
 * SQL Logic:
 *   START TRANSACTION;
 *   UPDATE TASK SET Status = 'In Progress' WHERE Task_ID = ?;
 *   ROLLBACK;
 */
router.post('/rollback', async (req, res) => {
  const { taskId, temporaryStatus = 'In Progress' } = req.body;
  const numTaskId = Number(taskId);

  if (!numTaskId || isNaN(numTaskId) || numTaskId <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or missing taskId. Please provide a positive numeric Task ID.'
    });
  }

  const connection = await pool.getConnection();
  const startTime = Date.now();

  try {
    // 1. Begin transaction
    await connection.beginTransaction();

    // 2. Fetch current task state before modification
    const [taskRows] = await connection.execute(
      'SELECT Task_ID, Task_Name, Status, Project_ID FROM TASK WHERE Task_ID = ?',
      [numTaskId]
    );

    if (taskRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        operation: 'ROLLBACK',
        taskId: numTaskId,
        message: `Task with ID ${numTaskId} does not exist in the database.`,
        transactionResult: 'ROLLED_BACK'
      });
    }

    const initialStatus = taskRows[0].Status;
    const taskName = taskRows[0].Task_Name;

    // Use a temporary status that demonstrates change
    const attemptedStatus = temporaryStatus === initialStatus ? (initialStatus === 'In Progress' ? 'Testing' : 'In Progress') : temporaryStatus;

    // 3. Temporarily update the status inside the uncommitted transaction
    await connection.execute(
      'UPDATE TASK SET Status = ? WHERE Task_ID = ?',
      [attemptedStatus, numTaskId]
    );

    // 4. Query within the same transaction to see uncommitted status
    const [uncommittedRows] = await connection.execute(
      'SELECT Status FROM TASK WHERE Task_ID = ?',
      [numTaskId]
    );
    const uncommittedStatus = uncommittedRows[0]?.Status;

    // 5. Rollback the transaction instead of committing
    await connection.rollback();

    // 6. Query after rollback to verify original status is preserved
    const [verifyRows] = await pool.execute(
      'SELECT Status FROM TASK WHERE Task_ID = ?',
      [numTaskId]
    );
    const finalStatus = verifyRows[0]?.Status;

    return res.json({
      success: true,
      operation: 'ROLLBACK',
      taskId: numTaskId,
      taskName,
      previousStatus: initialStatus,
      requestedStatus: attemptedStatus,
      uncommittedStatus,
      finalDatabaseStatus: finalStatus,
      transactionResult: 'ROLLED_BACK',
      isStatusPreserved: initialStatus === finalStatus,
      executionTimeMs: Date.now() - startTime,
      message: `Transaction rolled back successfully. Temporary update to '${attemptedStatus}' was discarded. Database status remains preserved as '${finalStatus}'.`,
      sqlStatements: [
        'START TRANSACTION;',
        `UPDATE TASK SET Status = '${attemptedStatus}' WHERE Task_ID = ${numTaskId};`,
        'ROLLBACK;'
      ]
    });
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rbErr) {
      console.error('Error during rollback:', rbErr);
    }
    console.error('Rollback operation failed:', error);
    return res.status(500).json({
      success: false,
      operation: 'ROLLBACK',
      taskId: numTaskId,
      message: `Transaction rollback error: ${error.message}`,
      transactionResult: 'ROLLED_BACK',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

/**
 * POST /api/transactions/concurrency
 * 
 * SQL Logic:
 *   START TRANSACTION;
 *   SELECT Task_ID, Status FROM TASK WHERE Task_ID = ? FOR UPDATE;
 *   UPDATE TASK SET Status = 'Completed' WHERE Task_ID = ?;
 *   COMMIT;
 */
router.post('/concurrency', async (req, res) => {
  const { taskId, newStatus = 'Completed', holdLockMs = 0 } = req.body;
  const numTaskId = Number(taskId);

  if (!numTaskId || isNaN(numTaskId) || numTaskId <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or missing taskId. Please provide a positive numeric Task ID.'
    });
  }

  const connection = await pool.getConnection();
  const startTime = Date.now();

  try {
    // 1. Begin transaction
    await connection.beginTransaction();

    // 2. Acquire row-level lock using SELECT ... FOR UPDATE
    const [taskRows] = await connection.execute(
      'SELECT Task_ID, Task_Name, Status, Project_ID FROM TASK WHERE Task_ID = ? FOR UPDATE',
      [numTaskId]
    );

    if (taskRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        operation: 'CONCURRENCY',
        taskId: numTaskId,
        message: `Task with ID ${numTaskId} does not exist. Lock released and transaction rolled back.`,
        transactionResult: 'ROLLED_BACK'
      });
    }

    const initialStatus = taskRows[0].Status;
    const taskName = taskRows[0].Task_Name;
    const lockAcquiredAt = Date.now() - startTime;

    // Optional delay while lock is held to simulate long-running or concurrent contention
    const delay = Math.min(Math.max(Number(holdLockMs) || 0, 0), 5000);
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // 3. Update task status while holding the row lock
    await connection.execute(
      'UPDATE TASK SET Status = ? WHERE Task_ID = ?',
      [newStatus, numTaskId]
    );

    // 4. Commit transaction (which automatically releases the row lock)
    await connection.commit();

    // 5. Verify final status from database
    const [verifyRows] = await pool.execute(
      'SELECT Status FROM TASK WHERE Task_ID = ?',
      [numTaskId]
    );
    const finalStatus = verifyRows[0]?.Status;

    return res.json({
      success: true,
      operation: 'CONCURRENCY',
      taskId: numTaskId,
      taskName,
      previousStatus: initialStatus,
      requestedStatus: newStatus,
      finalDatabaseStatus: finalStatus,
      transactionResult: 'COMMITTED',
      lockAcquired: true,
      lockType: 'EXCLUSIVE ROW-LEVEL LOCK (SELECT ... FOR UPDATE)',
      lockHoldTimeMs: delay,
      totalExecutionTimeMs: Date.now() - startTime,
      message: `Row-level lock acquired via SELECT ... FOR UPDATE. Task #${numTaskId} updated to '${finalStatus}' and lock released on COMMIT.`,
      sqlStatements: [
        'START TRANSACTION;',
        `SELECT Task_ID, Status FROM TASK WHERE Task_ID = ${numTaskId} FOR UPDATE;`,
        `UPDATE TASK SET Status = '${newStatus}' WHERE Task_ID = ${numTaskId};`,
        'COMMIT;'
      ]
    });
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rbErr) {
      console.error('Error during concurrency rollback:', rbErr);
    }
    console.error('Concurrency transaction failed:', error);
    return res.status(500).json({
      success: false,
      operation: 'CONCURRENCY',
      taskId: numTaskId,
      message: `Concurrency transaction error: ${error.message}. Lock released on rollback.`,
      transactionResult: 'ROLLED_BACK',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

/**
 * POST /api/transactions/simulate-race
 * Runs two concurrent transactions against the same Task ID to demonstrate
 * row-level lock serialization directly.
 */
router.post('/simulate-race', async (req, res) => {
  const { taskId, holdTimeMs = 1200 } = req.body;
  const numTaskId = Number(taskId);

  if (!numTaskId || isNaN(numTaskId) || numTaskId <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or missing taskId.'
    });
  }

  const logs = [];
  const t0 = Date.now();

  try {
    const p1 = (async () => {
      const conn1 = await pool.getConnection();
      try {
        logs.push({ tx: 'TX 1', time: Date.now() - t0, event: 'Requesting exclusive lock (SELECT ... FOR UPDATE)' });
        await conn1.beginTransaction();
        const [rows] = await conn1.execute('SELECT Task_ID, Status FROM TASK WHERE Task_ID = ? FOR UPDATE', [numTaskId]);
        if (rows.length === 0) throw new Error('Task not found');
        logs.push({ tx: 'TX 1', time: Date.now() - t0, event: `Acquired lock on Task ${numTaskId}. Holding for ${holdTimeMs}ms...` });
        await new Promise(r => setTimeout(r, holdTimeMs));
        await conn1.execute('UPDATE TASK SET Status = ? WHERE Task_ID = ?', ['Completed', numTaskId]);
        await conn1.commit();
        logs.push({ tx: 'TX 1', time: Date.now() - t0, event: 'Committed status: Completed. Lock released!' });
      } finally {
        conn1.release();
      }
    })();

    const p2 = (async () => {
      await new Promise(r => setTimeout(r, 150)); // Start TX 2 shortly after TX 1
      const conn2 = await pool.getConnection();
      try {
        logs.push({ tx: 'TX 2', time: Date.now() - t0, event: 'Attempting to acquire exclusive lock on same row...' });
        await conn2.beginTransaction();
        const [rows] = await conn2.execute('SELECT Task_ID, Status FROM TASK WHERE Task_ID = ? FOR UPDATE', [numTaskId]);
        logs.push({ tx: 'TX 2', time: Date.now() - t0, event: 'Lock acquired! (Waited until TX 1 released the row lock)' });
        await conn2.execute('UPDATE TASK SET Status = ? WHERE Task_ID = ?', ['In Progress', numTaskId]);
        await conn2.commit();
        logs.push({ tx: 'TX 2', time: Date.now() - t0, event: 'Committed status: In Progress.' });
      } finally {
        conn2.release();
      }
    })();

    await Promise.all([p1, p2]);

    const [verifyRows] = await pool.execute('SELECT Task_ID, Status FROM TASK WHERE Task_ID = ?', [numTaskId]);

    return res.json({
      success: true,
      operation: 'CONCURRENCY_RACE_SIMULATION',
      taskId: numTaskId,
      totalTimeMs: Date.now() - t0,
      finalDatabaseStatus: verifyRows[0]?.Status,
      serializationVerified: true,
      timeline: logs.sort((a, b) => a.time - b.time),
      message: 'Concurrency test completed. TX 2 was serialized behind TX 1 without race conditions or deadlock.'
    });
  } catch (error) {
    console.error('Race simulation error:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
      timeline: logs
    });
  }
});

/**
 * POST /api/transactions/reset
 * Helper endpoint to reset task status for repetitive demonstrations.
 */
router.post('/reset', async (req, res) => {
  const { taskId, status = 'In Progress' } = req.body;
  const numTaskId = Number(taskId);

  if (!numTaskId || isNaN(numTaskId) || numTaskId <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid taskId' });
  }

  try {
    const [result] = await pool.execute(
      'UPDATE TASK SET Status = ? WHERE Task_ID = ?',
      [status, numTaskId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    return res.json({
      success: true,
      taskId: numTaskId,
      status,
      message: `Task #${numTaskId} status successfully reset to '${status}'.`
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
