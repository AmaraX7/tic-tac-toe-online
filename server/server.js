// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Almacenamiento de juegos activos
const games = new Map();

// Generar ID único para juegos
function generateGameId() {
  return Math.random().toString(36).substr(2, 9).toUpperCase();
}

io.on('connection', (socket) => {
  console.log('Usuario conectado:', socket.id);

  // Crear nueva partida
  socket.on('create-game', () => {
    const gameId = generateGameId();
    const gameState = {
      id: gameId,
      board: Array(9).fill(null),
      players: { X: socket.id, O: null },
      isXNext: true,
      winner: null,
      winningLine: []
    };
    
    games.set(gameId, gameState);
    socket.join(gameId);
    socket.emit('game-created', { gameId, playerSymbol: 'X' });
    console.log('Juego creado:', gameId);
  });

  // Unirse a una partida
  socket.on('join-game', (gameId) => {
    const game = games.get(gameId);
    
    if (!game) {
      socket.emit('error', 'Partida no encontrada');
      return;
    }
    
    if (game.players.O) {
      socket.emit('error', 'La partida ya está llena');
      return;
    }
    
    game.players.O = socket.id;
    socket.join(gameId);
    socket.emit('game-joined', { gameId, playerSymbol: 'O' });
    
    // Notificar a ambos jugadores que el juego puede comenzar
    io.to(gameId).emit('game-start', game);
    console.log('Jugador O se unió a:', gameId);
  });

  // Realizar movimiento
  socket.on('make-move', ({ gameId, index }) => {
    const game = games.get(gameId);
    
    if (!game) {
      socket.emit('error', 'Partida no encontrada');
      return;
    }
    
    // Verificar que es el turno del jugador
    const playerSymbol = game.players.X === socket.id ? 'X' : 'O';
    const isPlayerTurn = (game.isXNext && playerSymbol === 'X') || 
                         (!game.isXNext && playerSymbol === 'O');
    
    if (!isPlayerTurn) {
      socket.emit('error', 'No es tu turno');
      return;
    }
    
    if (game.board[index] || game.winner) {
      socket.emit('error', 'Movimiento inválido');
      return;
    }
    
    // Realizar el movimiento
    game.board[index] = playerSymbol;
    game.isXNext = !game.isXNext;
    
    // Verificar ganador
    const result = calculateWinner(game.board);
    if (result) {
      game.winner = result.winner;
      game.winningLine = result.line;
    } else if (game.board.every(cell => cell !== null)) {
      game.winner = 'draw';
    }
    
    // Actualizar a todos los jugadores
    io.to(gameId).emit('game-update', game);
  });

  // Reiniciar juego
  socket.on('reset-game', (gameId) => {
    const game = games.get(gameId);
    
    if (!game) return;
    
    game.board = Array(9).fill(null);
    game.isXNext = true;
    game.winner = null;
    game.winningLine = [];
    
    io.to(gameId).emit('game-update', game);
  });

  // Desconexión
  socket.on('disconnect', () => {
    console.log('Usuario desconectado:', socket.id);
    
    // Encontrar y cerrar juegos del usuario desconectado
    games.forEach((game, gameId) => {
      if (game.players.X === socket.id || game.players.O === socket.id) {
        io.to(gameId).emit('player-disconnected');
        games.delete(gameId);
        console.log('Juego eliminado:', gameId);
      }
    });
  });
});

// Función para calcular ganador
function calculateWinner(squares) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // filas
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columnas
    [0, 4, 8], [2, 4, 6] // diagonales
  ];

  for (let line of lines) {
    const [a, b, c] = line;
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return { winner: squares[a], line };
    }
  }
  return null;
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});