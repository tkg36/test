const { Server } = require("socket.io")
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

let pollActive = false;
let pollStartTime = false;
let pollDuration = false;
let io;
let db;

async function setupSocket(server) {
  io = new Server(server, { connectionStateRecovery: {} });

  db = await open({
    filename: 'app.db',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        client_offset TEXT UNIQUE,
        content TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT,
      day TEXT,
      rover TEXT,
      camera TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  io.on('connection', async (socket) => {
    if (!socket.recovered) {
      try {
        const timeCutoff = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
        const recentMessages = await db.all(
          'SELECT * FROM messages WHERE timestamp >= ? AND id > ? ORDER BY timestamp ASC',
          [timeCutoff.toISOString(), socket.handshake.auth.serverOffset || 0]
        );

        recentMessages.forEach(row => {
          socket.emit('chat message', row.username, row.content, row.id);
        });

      } catch (e) {
        console.error(e);
      }
    }

    if (pollActive) {
      const elapsed = Date.now() - pollStartTime;
      const remaining = Math.max(0, pollDuration - elapsed);

      if (remaining > 0) {
        socket.emit("pollOpen");
      } else {
        socket.emit("pollClosed");
      }
    }

    socket.on('chat message', async (username, msg, client_offset, timeStamp, callback) => {
      let result;
      try {
        result = await db.run('INSERT INTO messages (username, content, client_offset, timestamp) VALUES (?, ?, ?, ?)', username, msg, client_offset, timeStamp);
      } catch (e) {
        if (e.errno === 19) {
          callback({ success: false, error: err.message });
        } else {
          console.error(e);
          callback({ success: false, error: 'An error occurred' });
        }
        return;
      }
      io.emit('chat message', username, msg, result.lastID);
      callback({ success: true });
    });

    socket.on('userVote', async (voteData, callback) => {
      try {
        console.log("Received voteData:", voteData);

        const { userId, dayValue, roverValue, cameraValue } = voteData;

        if (!userId || !dayValue || !roverValue || !cameraValue) {
          console.warn("Incomplete vote received, ignoring:", voteData);
          return;
        }

        const userVoteRecord = await db.get(
          `SELECT * FROM votes WHERE userId = ?`,
          [userId]
        );
        console.log("Existing vote record for user:", userVoteRecord);

        if (userVoteRecord) {
          console.log(`User ${userId} attempted to vote again`);
          return callback({ success: false, error: 'User has already voted' });
        }

        console.log(`Inserting vote for user ${userId}:`, { dayValue, roverValue, cameraValue });
        await db.run(
          `INSERT INTO votes (userId, day, rover, camera) VALUES (?, ?, ?, ?)`,
          [userId, dayValue, roverValue, cameraValue]
        );

        console.log(`Vote successfully recorded for user ${userId}`);
        return callback({ success: true });

      } catch (err) {
        console.error("Error processing vote:", err);
        return callback({ success: false, error: 'Database error' });
      }
    });


      socket.on('disconnect', () => {});
    });

  return io;
}

async function startVotingSession(allocatedTime) {
  pollActive = true;
  pollStartTime = Date.now();
  pollDuration = allocatedTime;

  let result = null;

  await db.run(`DELETE FROM votes`);
  io.emit("pollOpen");

  await new Promise(resolve => setTimeout(resolve, allocatedTime));

  pollActive = false;
  result = await getPollWinner('votes', 'rover');
  console.log("Result: ", result);
  io.emit("pollClosed")

  return result;
}

async function getPollWinner(tableName, columnName) {
  const cols = await db.all(`PRAGMA table_info(${tableName});`);
  const colNames = cols.map(c => c.name);

  if (!colNames.includes(columnName)) {
    throw new Error(`Column ${columnName} does not exist in ${tableName}`);
  }

  const row = await db.get(
    `SELECT ${columnName} as value, COUNT(*) as count
     FROM ${tableName}
     GROUP BY ${columnName}
     ORDER BY count DESC
     LIMIT 1`
  );

  return row;
}

async function startVotingCycle() {
  while (true) {
    console.log("Starting new voting session...");
    await startVotingSession(1 * 60 * 1000);
    console.log("Voting session ended. Waiting 10 minutes...");
    await new Promise(resolve => setTimeout(resolve, 10 * 60 * 1000));
  }
}

async function startSocketConnection(server) {
  await setupSocket(server);
  startVotingCycle();
}

module.exports = { startSocketConnection };