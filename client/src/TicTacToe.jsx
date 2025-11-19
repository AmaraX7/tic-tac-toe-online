import React, { useState, useEffect, useRef, useReducer } from 'react';
import { X, Circle, RotateCcw, Users, Copy, Check, Wifi, WifiOff, MessageCircle, Send, Trophy, Eye, Clock } from 'lucide-react';

// CAMBIAR POR TU URL DE SERVIDOR
const SOCKET_URL = 'https://tic-tac-toe-online-qkch.onrender.com';

// Constantes para eventos del socket
const SOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CREATE_GAME: 'create-game',
  JOIN_GAME: 'join-game',
  MAKE_MOVE: 'make-move',
  RESET_GAME: 'reset-game',
  SEND_MESSAGE: 'send-message',
  GAME_CREATED: 'game-created',
  GAME_JOINED: 'game-joined',
  GAME_START: 'game-start',
  GAME_UPDATE: 'game-update',
  PLAYER_DISCONNECTED: 'player-disconnected',
  NEW_MESSAGE: 'new-message',
  ERROR: 'error'
};

// Reducer para el estado del juego
const gameReducer = (state, action) => {
  switch (action.type) {
    case 'SET_BOARD':
      return { ...state, board: action.payload };
    case 'SET_TURN':
      return { ...state, isXNext: action.payload };
    case 'SET_WINNER':
      return { ...state, winner: action.payload, winningLine: action.winningLine || [] };
    case 'SET_GAME_INFO':
      return { ...state, gameId: action.gameId, playerSymbol: action.playerSymbol };
    case 'SET_IN_GAME':
      return { ...state, isInGame: action.payload };
    case 'SET_WAITING':
      return { ...state, waitingForPlayer: action.payload };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'INCREMENT_SCORE':
      const key = action.payload === 'X' ? 'scoreX' : 'scoreO';
      return { ...state, [key]: state[key] + 1 };
    case 'RESET_GAME':
      return {
        ...state,
        board: Array(9).fill(null),
        isXNext: true,
        winner: null,
        winningLine: []
      };
    case 'LEAVE_GAME':
      return {
        ...initialGameState,
        scoreX: state.scoreX,
        scoreO: state.scoreO,
        messages: []
      };
    default:
      return state;
  }
};

const initialGameState = {
  board: Array(9).fill(null),
  isXNext: true,
  winner: null,
  winningLine: [],
  gameId: '',
  playerSymbol: null,
  isInGame: false,
  waitingForPlayer: false,
  messages: [],
  scoreX: 0,
  scoreO: 0
};

// Custom Hook para Socket
const useSocket = (url) => {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Importar socket.io-client dinámicamente
    import('https://cdn.socket.io/4.5.4/socket.io.esm.min.js').then((module) => {
      const io = module.io;
      socketRef.current = io(url);
      
      socketRef.current.on('connect', () => {
        console.log('Conectado al servidor');
        setConnected(true);
      });

      socketRef.current.on('disconnect', () => {
        console.log('Desconectado del servidor');
        setConnected(false);
      });
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [url]);

  return { socket: socketRef.current, connected };
};

// Componente de Casilla del Tablero
const Square = ({ value, onClick, isWinning, canClick, index }) => {
  const baseStyle = {
    aspectRatio: '1',
    background: isWinning 
      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
      : 'linear-gradient(135deg, #334155 0%, #1e293b 100%)',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    cursor: canClick ? 'pointer' : 'default',
    transform: value ? 'scale(1)' : 'scale(0.95)',
    animation: isWinning ? 'pulse 1s infinite' : 'none'
  };

  const hoverStyle = canClick ? {
    transform: 'scale(1.05)',
    background: 'linear-gradient(135deg, #475569 0%, #334155 100%)'
  } : {};

  return (
    <button
      onClick={onClick}
      style={baseStyle}
      onMouseEnter={(e) => canClick && Object.assign(e.target.style, hoverStyle)}
      onMouseLeave={(e) => canClick && Object.assign(e.target.style, baseStyle)}
    >
      {value === 'X' && <X style={{ width: '3rem', height: '3rem', color: '#22d3ee', strokeWidth: 3 }} />}
      {value === 'O' && <Circle style={{ width: '3rem', height: '3rem', color: '#f472b6', strokeWidth: 3 }} />}
    </button>
  );
};

// Componente de Chat
const ChatBox = ({ messages, onSendMessage, playerSymbol }) => {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div style={{
      background: 'rgba(30, 41, 59, 0.5)',
      backdropFilter: 'blur(10px)',
      borderRadius: '16px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <MessageCircle style={{ width: '20px', height: '20px', color: '#94a3b8' }} />
        <span style={{ color: '#cbd5e1', fontWeight: '600' }}>Chat</span>
      </div>
      
      <div style={{
        height: '120px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {messages.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', margin: 'auto' }}>
            No hay mensajes aún
          </p>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} style={{
              background: msg.sender === playerSymbol ? '#1e40af' : '#475569',
              padding: '8px 12px',
              borderRadius: '8px',
              alignSelf: msg.sender === playerSymbol ? 'flex-end' : 'flex-start',
              maxWidth: '80%'
            }}>
              <p style={{ color: 'white', fontSize: '14px', margin: 0 }}>{msg.text}</p>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Escribe un mensaje..."
          style={{
            flex: 1,
            background: '#334155',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 12px',
            outline: 'none'
          }}
        />
        <button
          onClick={handleSend}
          style={{
            background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Send style={{ width: '16px', height: '16px' }} />
        </button>
      </div>
    </div>
  );
};

// Componente de Estadísticas
const Stats = ({ scoreX, scoreO, playerSymbol }) => {
  return (
    <div style={{
      background: 'rgba(30, 41, 59, 0.5)',
      backdropFilter: 'blur(10px)',
      borderRadius: '16px',
      padding: '16px',
      display: 'flex',
      justifyContent: 'space-around'
    }}>
      <div style={{ textAlign: 'center' }}>
        <Trophy style={{ 
          width: '24px', 
          height: '24px', 
          color: playerSymbol === 'X' ? '#22d3ee' : '#64748b',
          margin: '0 auto 8px'
        }} />
        <p style={{ color: '#22d3ee', fontSize: '24px', fontWeight: 'bold', margin: 0 }}>{scoreX}</p>
        <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>Jugador X</p>
      </div>
      <div style={{ width: '1px', background: '#334155' }}></div>
      <div style={{ textAlign: 'center' }}>
        <Trophy style={{ 
          width: '24px', 
          height: '24px', 
          color: playerSymbol === 'O' ? '#f472b6' : '#64748b',
          margin: '0 auto 8px'
        }} />
        <p style={{ color: '#f472b6', fontSize: '24px', fontWeight: 'bold', margin: 0 }}>{scoreO}</p>
        <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>Jugador O</p>
      </div>
    </div>
  );
};

// Componente Principal
export default function TicTacToeImproved() {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const [inputGameId, setInputGameId] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const { socket, connected } = useSocket(SOCKET_URL);

  // Configurar listeners del socket
  useEffect(() => {
    if (!socket) return;

    socket.on(SOCKET_EVENTS.GAME_CREATED, ({ gameId, playerSymbol }) => {
      dispatch({ type: 'SET_GAME_INFO', gameId, playerSymbol });
      dispatch({ type: 'SET_IN_GAME', payload: true });
      dispatch({ type: 'SET_WAITING', payload: true });
      setError('');
    });

    socket.on(SOCKET_EVENTS.GAME_JOINED, ({ gameId, playerSymbol }) => {
      dispatch({ type: 'SET_GAME_INFO', gameId, playerSymbol });
      dispatch({ type: 'SET_IN_GAME', payload: true });
      setError('');
    });

    socket.on(SOCKET_EVENTS.GAME_START, (gameState) => {
      dispatch({ type: 'SET_BOARD', payload: gameState.board });
      dispatch({ type: 'SET_TURN', payload: gameState.isXNext });
      dispatch({ type: 'SET_WAITING', payload: false });
      setError('');
    });

    socket.on(SOCKET_EVENTS.GAME_UPDATE, (gameState) => {
      dispatch({ type: 'SET_BOARD', payload: gameState.board });
      dispatch({ type: 'SET_TURN', payload: gameState.isXNext });
      if (gameState.winner) {
        dispatch({ 
          type: 'SET_WINNER', 
          payload: gameState.winner, 
          winningLine: gameState.winningLine || [] 
        });
        if (gameState.winner !== 'draw') {
          dispatch({ type: 'INCREMENT_SCORE', payload: gameState.winner });
        }
      }
      setError('');
    });

    socket.on(SOCKET_EVENTS.PLAYER_DISCONNECTED, () => {
      setError('El otro jugador se desconectó');
      setTimeout(() => {
        dispatch({ type: 'LEAVE_GAME' });
      }, 3000);
    });

    socket.on(SOCKET_EVENTS.ERROR, (message) => {
      showError(message);
    });

    return () => {
      socket.off(SOCKET_EVENTS.GAME_CREATED);
      socket.off(SOCKET_EVENTS.GAME_JOINED);
      socket.off(SOCKET_EVENTS.GAME_START);
      socket.off(SOCKET_EVENTS.GAME_UPDATE);
      socket.off(SOCKET_EVENTS.PLAYER_DISCONNECTED);
      socket.off(SOCKET_EVENTS.ERROR);
    };
  }, [socket]);

  const showError = (msg) => {
    setError(msg);
    setTimeout(() => setError(''), 3000);
  };

  const createGame = () => {
    if (!socket || !connected) {
      showError('No hay conexión con el servidor');
      return;
    }
    socket.emit(SOCKET_EVENTS.CREATE_GAME);
  };

  const joinGame = () => {
    if (!inputGameId.trim()) {
      showError('Ingresa un código de partida');
      return;
    }
    if (!socket || !connected) {
      showError('No hay conexión con el servidor');
      return;
    }
    socket.emit(SOCKET_EVENTS.JOIN_GAME, inputGameId.trim().toUpperCase());
  };

  const handleClick = (index) => {
    if (state.board[index] || state.winner || state.waitingForPlayer) return;
    
    const isMyTurn = (state.isXNext && state.playerSymbol === 'X') || 
                     (!state.isXNext && state.playerSymbol === 'O');
    
    if (!isMyTurn) {
      showError('No es tu turno');
      return;
    }

    if (!socket) {
      showError('No hay conexión');
      return;
    }

    socket.emit(SOCKET_EVENTS.MAKE_MOVE, { gameId: state.gameId, index });
  };

  const resetGame = () => {
    if (!socket) return;
    socket.emit(SOCKET_EVENTS.RESET_GAME, state.gameId);
  };

  const leaveGame = () => {
    dispatch({ type: 'LEAVE_GAME' });
    setInputGameId('');
  };

  const copyGameId = () => {
    navigator.clipboard.writeText(state.gameId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sendMessage = (text) => {
    if (!socket) return;
    
    dispatch({ 
      type: 'ADD_MESSAGE', 
      payload: { text, sender: state.playerSymbol, timestamp: Date.now() }
    });
    
    // Aquí podrías emitir al servidor si implementas chat en el backend
    // socket.emit(SOCKET_EVENTS.SEND_MESSAGE, { gameId: state.gameId, text });
  };

  // Pantalla de Lobby
  if (!state.isInGame) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #581c87 50%, #0f172a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}>
        <div style={{ maxWidth: '400px', width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{
              fontSize: '3rem',
              fontWeight: 'bold',
              background: 'linear-gradient(to right, #22d3ee, #f472b6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '8px'
            }}>
              Tic Tac Toe
            </h1>
            <p style={{ color: '#cbd5e1', marginBottom: '16px' }}>Online con WebSocket</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {connected ? (
                <>
                  <Wifi style={{ width: '16px', height: '16px', color: '#10b981' }} />
                  <span style={{ color: '#10b981', fontSize: '14px' }}>Conectado</span>
                </>
              ) : (
                <>
                  <WifiOff style={{ width: '16px', height: '16px', color: '#ef4444' }} />
                  <span style={{ color: '#ef4444', fontSize: '14px' }}>Desconectado</span>
                </>
              )}
            </div>
          </div>

          <div style={{
            background: 'rgba(30, 41, 59, 0.5)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <button
              onClick={createGame}
              style={{
                width: '100%',
                background: 'linear-gradient(to right, #06b6d4, #3b82f6)',
                color: 'white',
                fontWeight: '600',
                padding: '16px 24px',
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'transform 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
            >
              <Users style={{ width: '20px', height: '20px' }} />
              Crear Nueva Partida
            </button>

            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '100%', borderTop: '1px solid #475569' }}></div>
              </div>
              <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                <span style={{ padding: '0 16px', background: '#1e293b', color: '#64748b' }}>O</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input
                type="text"
                placeholder="Código de partida"
                value={inputGameId}
                onChange={(e) => setInputGameId(e.target.value.toUpperCase())}
                style={{
                  width: '100%',
                  background: '#334155',
                  color: 'white',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: 'none',
                  outline: 'none',
                  textTransform: 'uppercase',
                  boxSizing: 'border-box'
                }}
              />
              <button
                onClick={joinGame}
                style={{
                  width: '100%',
                  background: 'linear-gradient(to right, #ec4899, #a855f7)',
                  color: 'white',
                  fontWeight: '600',
                  padding: '16px 24px',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'transform 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
              >
                Unirse a Partida
              </button>
            </div>

            {error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid #ef4444',
                color: '#fca5a5',
                padding: '12px 16px',
                borderRadius: '12px',
                textAlign: 'center',
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}
          </div>

          <div style={{
            background: 'rgba(30, 41, 59, 0.3)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            padding: '16px',
            color: '#cbd5e1',
            fontSize: '14px'
          }}>
            <p style={{ fontWeight: '600', marginBottom: '8px' }}>🚀 Características:</p>
            <ul style={{ paddingLeft: '20px', margin: 0 }}>
              <li>Tiempo real con WebSocket</li>
              <li>Chat entre jugadores</li>
              <li>Sistema de puntuación</li>
              <li>Reconexión automática</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Pantalla de Juego
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #581c87 50%, #0f172a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div style={{ maxWidth: '500px', width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{
            fontSize: '3rem',
            fontWeight: 'bold',
            background: 'linear-gradient(to right, #22d3ee, #f472b6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '8px'
          }}>
            Tic Tac Toe
          </h1>
          <p style={{ color: '#cbd5e1', fontSize: '18px', margin: '8px 0' }}>
            Eres: <span style={{ 
              fontWeight: 'bold', 
              color: state.playerSymbol === 'X' ? '#22d3ee' : '#f472b6' 
            }}>
              {state.playerSymbol}
            </span>
          </p>
          <p style={{ color: '#94a3b8' }}>
            Turno de: <span style={{ 
              fontWeight: 'bold',
              color: state.isXNext ? '#22d3ee' : '#f472b6'
            }}>
              {state.isXNext ? 'X' : 'O'}
            </span>
          </p>
        </div>

        <div style={{
          background: 'rgba(30, 41, 59, 0.5)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <p style={{ color: '#cbd5e1', fontSize: '14px', flex: 1, margin: 0 }}>
              Código: <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '18px' }}>
                {state.gameId}
              </span>
            </p>
            <button
              onClick={copyGameId}
              style={{
                background: '#334155',
                padding: '8px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {copied ? 
                <Check style={{ width: '16px', height: '16px', color: '#10b981' }} /> : 
                <Copy style={{ width: '16px', height: '16px', color: '#cbd5e1' }} />
              }
            </button>
          </div>
          {state.waitingForPlayer && (
            <p style={{ color: '#fbbf24', fontSize: '14px', margin: 0 }}>
              <Clock style={{ width: '14px', height: '14px', display: 'inline', marginRight: '4px' }} />
              Esperando al jugador O...
            </p>
          )}
        </div>

        <Stats scoreX={state.scoreX} scoreO={state.scoreO} playerSymbol={state.playerSymbol} />

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid #ef4444',
            color: '#fca5a5',
            padding: '12px 16px',
            borderRadius: '12px',
            textAlign: 'center',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
          padding: '24px',
          background: 'rgba(30, 41, 59, 0.3)',
          backdropFilter: 'blur(10px)',
          borderRadius: '24px'
        }}>
          {state.board.map((value, index) => {
            const isMyTurn = (state.isXNext && state.playerSymbol === 'X') || 
                            (!state.isXNext && state.playerSymbol === 'O');
            const canClick = !value && !state.winner && !state.waitingForPlayer && isMyTurn;
            
            return (
              <Square
                key={index}
                value={value}
                onClick={() => handleClick(index)}
                isWinning={state.winningLine.includes(index)}
                canClick={canClick}
                index={index}
              />
            );
          })}
        </div>

        {state.winner && (
          <div style={{
            background: 'linear-gradient(to right, #10b981, #06b6d4)',
            padding: '16px',
            borderRadius: '16px',
            textAlign: 'center'
          }}>
            <p style={{ color: 'white', fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
              {state.winner === 'draw' ? '¡Empate!' : `¡Jugador ${state.winner} gana!`}
            </p>
          </div>
        )}

        <ChatBox 
          messages={state.messages} 
          onSendMessage={sendMessage}
          playerSymbol={state.playerSymbol}
        />

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={resetGame}
            style={{
              flex: 1,
              background: 'linear-gradient(to right, #06b6d4, #3b82f6)',
              color: 'white',
              fontWeight: '600',
              padding: '12px 24px',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
          >
            <RotateCcw style={{ width: '20px', height: '20px' }} />
            Nueva Partida
          </button>
          <button
            onClick={leaveGame}
            style={{
              background: '#ef4444',
              color: 'white',
              fontWeight: '600',
              padding: '12px 24px',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
          >
            Salir
          </button>
        </div>
      </div>
    </div>
  );
}