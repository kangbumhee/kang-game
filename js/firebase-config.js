const firebaseConfig = {
  apiKey: "AIzaSyA72nSF66ej5ctCCe87827t99HDMgLn_Rg",
  authDomain: "workshop-party.firebaseapp.com",
  databaseURL: "https://workshop-party-default-rtdb.firebaseio.com",
  projectId: "workshop-party",
  storageBucket: "workshop-party.firebasestorage.app",
  messagingSenderId: "498976300015",
  appId: "1:498976300015:web:7af8611ab66d52f8fd341a",
  measurementId: "G-Q1F78R7Q1Y"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const Utils = {
  generateRoomCode() {
    return String(Math.floor(Math.random() * 900) + 100); // 100~999
  },
  getPlayerId() {
    let id = sessionStorage.getItem('playerId');
    if (!id) {
      id = 'P' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
      sessionStorage.setItem('playerId', id);
    }
    return id;
  },
  getRoomCode() { return sessionStorage.getItem('roomCode') || ''; },
  setRoomCode(c) { sessionStorage.setItem('roomCode', c); },
  getPlayerName() { return sessionStorage.getItem('playerName') || '익명'; },
  setPlayerName(n) { sessionStorage.setItem('playerName', n); },
  colors: ['#e74c3c','#3498db','#2ecc71','#f39c12','#9b59b6','#1abc9c','#e67e22','#f5576c','#667eea','#00b894','#d63031','#0984e3'],
  getColor(i) { return this.colors[i % this.colors.length]; },
  serverTimestamp() { return firebase.database.ServerValue.TIMESTAMP; }
};
