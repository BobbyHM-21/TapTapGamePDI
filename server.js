const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const db = new sqlite3.Database(':memory:'); // In-memory DB for testing

// Initialize SQLite database
db.serialize(() => {
    db.run("CREATE TABLE taps (id INTEGER PRIMARY KEY, score INTEGER, tapPower INTEGER, level INTEGER)");
});

// Store game state in memory
let gameState = { score: 0, tapPower: 1, tapLimit: 300, level: 1, upgradeCost: 100 };

app.use(express.static(__dirname + '/public'));

io.on('connection', (socket) => {
    console.log('a user connected');

    // Send current game state to new connection
    socket.emit('tap', gameState);

    socket.on('tap', (data) => {
        // Update game state with the new score
        gameState.score = data.score;
        gameState.tapPower = data.tapPower;
        gameState.level = data.level;
        gameState.tapLimit = data.tapLimit;
        gameState.upgradeCost = data.upgradeCost;

        io.emit('tap', gameState); // Emit the updated state to all clients
    });

    socket.on('upgrade', (data) => {
        gameState.level = data.level;
        gameState.tapLimit = data.tapLimit;
        gameState.upgradeCost = data.upgradeCost;
        io.emit('tap', gameState); // Emit the new level and limit to all clients
    });

    // Save the game state to the database when the page is closed
    socket.on('save', (data) => {
        db.run("INSERT INTO taps (score, tapPower, level) VALUES (?, ?, ?)", 
            [data.score, gameState.tapPower, data.level], (err) => {
            if (err) {
                return console.error(err.message);
            }
            console.log('Game state has been saved');
        });
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});
