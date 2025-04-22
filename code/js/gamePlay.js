const rock = document.getElementById('rock');
const paper = document.getElementById('paper');
const scissors = document.getElementById('scissors');
const buttons = document.getElementById('buttons');
const h2 = document.getElementById('h2');
const info = document.getElementById('info');
const modeSelector = document.getElementById('mode-selector') || createModeSelector();
let player;
let computerOptions = ['rock', 'paper', 'scissor'];
let gameMode = 'vsComputer';
let socket;

function createModeSelector() {
    const selector = document.createElement('div');
    selector.id = 'mode-selector';
    selector.innerHTML = `
        <button id="vs-computer">Play vs Computer</button>
        <button id="vs-player">Play vs Player</button>
    `;
    document.body.insertBefore(selector, buttons);
    
    document.getElementById('vs-computer').addEventListener('click', () => setGameMode('vsComputer'));
    document.getElementById('vs-player').addEventListener('click', () => setGameMode('vsPlayer'));
    
    return selector;
}

function setGameMode(mode) {
    gameMode = mode;
    h2.innerHTML = mode === 'vsComputer' ? 'Play against Computer' : 'Play against another Player';
    
    if (mode === 'vsPlayer' && !socket) {
        initializeWebSocket();
    }
}

function initializeWebSocket() {
    const randomInviteCode = Math.random().toString(36).substring(2, 10);
    socket = new WebSocket(`ws://127.0.0.1:8382/${randomInviteCode}`);
    console.log(`Invite link: ws://127.0.0.1:8382/${randomInviteCode}`);
    
    socket.onopen = () => {
        console.log('Connected to WebSocket server');
        info.innerHTML = `Share this invite code with your friend: ${randomInviteCode}`;
    };
    
    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'result') {
            h2.innerHTML = data.message;
            console.log(data.message);
        } else if (data.type === 'move') {
            handleOpponentMove(data.choice);
        }
    };
    
    socket.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
    
    socket.onclose = () => {
        console.log('WebSocket connection closed');
        socket = null;
    };
}

rock.addEventListener("click", () => {
    player = 'rock';
    playGame();
});

paper.addEventListener("click", () => {
    player = 'paper';
    playGame();
});

scissors.addEventListener("click", () => {
    player = 'scissor';
    playGame();
});

function playGame() {
    if (gameMode === 'vsComputer') {
        playAgainstComputer();
    } else {
        playAgainstPlayer();
    }
}

function playAgainstComputer() {
    const computersChoice = computerOptions[Math.floor(Math.random() * computerOptions.length)];
    console.log(`Player: ${player}`);
    console.log(`Computer: ${computersChoice}`);
    
    const result = determineWinner(player, computersChoice);
    h2.innerHTML = result;
    console.log(result);
}

function playAgainstPlayer() {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        h2.innerHTML = 'Not connected to server. Try again.';
        return;
    }
    
    socket.send(JSON.stringify({ type: 'move', choice: player }));
    h2.innerHTML = 'Waiting for opponent...';
}

function handleOpponentMove(opponentChoice) {
    console.log(`Player: ${player}`);
    console.log(`Opponent: ${opponentChoice}`);
    
    const result = determineWinner(player, opponentChoice);
    socket.send(JSON.stringify({ type: 'result', player, opponentChoice, result }));
    h2.innerHTML = result;
    console.log(result);
}

function determineWinner(choice1, choice2) {
    if (choice1 === choice2) {
        return 'Its a Tie!';
    } else if (
        (choice1 === 'rock' && choice2 === 'scissor') ||
        (choice1 === 'scissor' && choice2 === 'paper') ||
        (choice1 === 'paper' && choice2 === 'rock')
    ) {
        return 'You Win!';
    } else {
        return 'You Lose!';
    }
}
