document.addEventListener('DOMContentLoaded', () => {
    const info = document.getElementById('info');
    const createGameBtn = document.getElementById('create-game');
    const joinGameBtn = document.getElementById('join-game');
    const joinCodeInput = document.getElementById('join-code');
    const inviteCodeDisplay = document.getElementById('invite-code');
    const codeValueDisplay = document.querySelector('.code-value');
    const copyCodeBtn = document.getElementById('copy-code');
    const connectionPanel = document.getElementById('connection-panel');
    const gameContainer = document.getElementById('game-container');
    const gameStatus = document.getElementById('game-status');
    const result = document.getElementById('result');
    const rock = document.getElementById('rock');
    const paper = document.getElementById('paper');
    const scissors = document.getElementById('scissors');
    
    let socket;
    let playerChoice = null;
    let gameInProgress = false;
    let isHost = false;
    let gameRoomId = '';
    let connectionAttempts = 0;
    let maxConnectionAttempts = 3;
    let pingInterval;
    let reconnectTimeout;
    
    info.textContent = 'Create a new game or join an existing one';
    
    createGameBtn.addEventListener('click', createGame);
    joinGameBtn.addEventListener('click', joinGame);
    copyCodeBtn.addEventListener('click', copyInviteCode);
    
    rock.addEventListener('click', () => makeChoice('rock'));
    paper.addEventListener('click', () => makeChoice('paper'));
    scissors.addEventListener('click', () => makeChoice('scissor'));
    
    function createGame() {
        const uniqueId = Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
        
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('game', uniqueId);
        window.history.pushState({}, '', currentUrl.toString());
        
        const shareUrl = currentUrl.toString();
        gameRoomId = uniqueId;
        isHost = true;
        
        connectionAttempts = 0;
        
        connectToWebSocket(uniqueId);
        
        if (!document.getElementById('share-url')) {
            const shareUrlContainer = document.createElement('div');
            shareUrlContainer.className = 'share-url-container';
            shareUrlContainer.innerHTML = `
                <p>Or share this link:</p>
                <div id="share-url" class="share-url">${shareUrl}</div>
                <button id="copy-url" class="small-btn">Copy Link</button>
            `;
            inviteCodeDisplay.appendChild(shareUrlContainer);
            
            document.getElementById('copy-url').addEventListener('click', copyShareUrl);
        } else {
            document.getElementById('share-url').textContent = shareUrl;
        }
    }
    
    function copyShareUrl() {
        const shareUrl = document.getElementById('share-url').textContent;
        navigator.clipboard.writeText(shareUrl)
            .then(() => {
                document.getElementById('copy-url').textContent = 'Copied!';
                setTimeout(() => {
                    document.getElementById('copy-url').textContent = 'Copy Link';
                }, 2000);
            })
            .catch(err => {
                alert('Failed to copy. Please copy the link manually.');
            });
    }
    
    function joinGame() {
        const inviteCode = joinCodeInput.value.trim();
        if (!inviteCode) {
            alert('Please enter an invite code');
            return;
        }
        gameRoomId = inviteCode;
        isHost = false;
        
        connectionAttempts = 0;
        
        connectToWebSocket(inviteCode);
    }
    
    function connectToWebSocket(inviteCode) {
        clearInterval(pingInterval);
        clearTimeout(reconnectTimeout);
        
        if (socket) {
            socket.onclose = null; 
            socket.close();
        }
        
        connectionAttempts++;
        info.textContent = `Connecting to server... (Attempt ${connectionAttempts}/${maxConnectionAttempts})`;
        
        const wsUrl = `wss://rps-server-demo.glitch.me/${inviteCode}`;
        
        try {
            socket = new WebSocket(wsUrl);
            
            const connectionTimeout = setTimeout(() => {
                if (socket.readyState !== WebSocket.OPEN) {
                    socket.close();
                    handleConnectionFailure();
                }
            }, 10000); 
            
            socket.onopen = () => {
                clearTimeout(connectionTimeout);
                
                info.textContent = isHost ? 'Waiting for opponent to join...' : 'Connected to game!';
                
                if (isHost) {
                    codeValueDisplay.textContent = inviteCode;
                    inviteCodeDisplay.style.display = 'block';
                } else {
                    socket.send(JSON.stringify({ 
                        type: 'playerJoined',
                        roomId: inviteCode
                    }));
                    info.textContent = 'Connected! Waiting for game to start...';
                }
                
                connectionAttempts = 0;
                
                pingInterval = setInterval(() => {
                    if (socket && socket.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify({ 
                            type: 'ping',
                            roomId: inviteCode 
                        }));
                    }
                }, 5000); 
                
                connectionPanel.style.display = 'none';
                gameContainer.style.display = 'block';
            };
            
            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    if (data.type === 'ping') {
                        socket.send(JSON.stringify({ 
                            type: 'pong',
                            roomId: inviteCode 
                        }));
                        return;
                    }
                    
                    if (data.type === 'pong') {
                        return; 
                    }
                    
                    if (data.type === 'playerJoined') {
                        info.textContent = 'Opponent joined! Game starting...';
                        gameStatus.textContent = 'Make your choice!';
                        gameInProgress = true;
                        
                        if (isHost) {
                            socket.send(JSON.stringify({ 
                                type: 'gameStarted',
                                roomId: inviteCode
                            }));
                        }
                    }
                    else if (data.type === 'gameStarted') {
                        info.textContent = 'Game starting!';
                        gameStatus.textContent = 'Make your choice!';
                        gameInProgress = true;
                    }
                    else if (data.type === 'move') {
                        handleOpponentMove(data.choice);
                    }
                    else if (data.type === 'result') {
                        displayResult(data.message);
                        resetGame();
                    }
                    else if (data.type === 'error') {
                        info.textContent = data.message;
                    }
                } catch (error) {
                    console.error('Error parsing message:', error);
                }
            };
            
            socket.onerror = (error) => {
                clearTimeout(connectionTimeout);
                console.error('WebSocket error:', error);
                handleConnectionFailure();
            };
            
            socket.onclose = (event) => {
                clearTimeout(connectionTimeout);
                clearInterval(pingInterval);
                
                console.log(`WebSocket closed. Code: ${event.code}, Reason: ${event.reason}`);
                
                if (event.wasClean) {
                    info.textContent = 'Connection closed.';
                } else {
                    handleConnectionFailure();
                }
            };
            
        } catch (error) {
            console.error('Failed to create WebSocket:', error);
            handleConnectionFailure();
        }
    }
    
    function handleConnectionFailure() {
        gameInProgress = false;
        
        if (connectionAttempts < maxConnectionAttempts) {
            info.textContent = `Connection failed. Retrying in 3 seconds... (Attempt ${connectionAttempts}/${maxConnectionAttempts})`;
            
            reconnectTimeout = setTimeout(() => {
                connectToWebSocket(gameRoomId);
            }, 3000);
        } else {
            info.textContent = 'Failed to connect after multiple attempts. Server may be offline.';
            addReconnectButton();
        }
    }
    
    function addReconnectButton() {
        if (!document.getElementById('reconnect-btn')) {
            const reconnectBtn = document.createElement('button');
            reconnectBtn.id = 'reconnect-btn';
            reconnectBtn.className = 'action-btn';
            reconnectBtn.textContent = 'Try Again';
            reconnectBtn.addEventListener('click', () => {
                reconnectBtn.remove();
                connectionAttempts = 0; 
                connectToWebSocket(gameRoomId);
            });
            
            const manualUrlButton = document.createElement('button');
            manualUrlButton.id = 'manual-url-btn';
            manualUrlButton.className = 'action-btn secondary-btn';
            manualUrlButton.textContent = 'Change Server';
            manualUrlButton.addEventListener('click', () => {
                const newUrl = prompt('Enter WebSocket server URL:', 'wss://rps-server-demo.glitch.me');
                if (newUrl) {
                    connectionAttempts = 0;
                    reconnectBtn.remove();
                    manualUrlButton.remove();
                    connectToWebSocket(gameRoomId);
                }
            });
            
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'button-container';
            buttonContainer.appendChild(reconnectBtn);
            buttonContainer.appendChild(manualUrlButton);
            
            info.parentNode.insertBefore(buttonContainer, info.nextSibling);
            
            if (!document.getElementById('reconnect-styles')) {
                const style = document.createElement('style');
                style.id = 'reconnect-styles';
                style.textContent = `
                    .button-container {
                        display: flex;
                        gap: 10px;
                        justify-content: center;
                        margin: 15px 0;
                    }
                    .secondary-btn {
                        background-color: #6c757d;
                    }
                    .secondary-btn:hover {
                        background-color: #5a6268;
                    }
                `;
                document.head.appendChild(style);
            }
        }
    }
    
    function makeChoice(choice) {
        if (!gameInProgress) {
            info.textContent = 'Waiting for opponent before you can play';
            return;
        }
        
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            info.textContent = 'Connection lost. Trying to reconnect...';
            connectToWebSocket(gameRoomId);
            return;
        }
        
        playerChoice = choice;
        gameStatus.textContent = `You chose ${choice}. Waiting for opponent...`;
        
        toggleButtons(false);
        
        socket.send(JSON.stringify({ 
            type: 'move', 
            choice,
            roomId: gameRoomId
        }));
    }
    
    function handleOpponentMove(opponentChoice) {
        if (!playerChoice) {
            gameStatus.textContent = 'Opponent has chosen. Make your choice!';
            return;
        }
        
        const gameResult = determineWinner(playerChoice, opponentChoice);
        
        displayResult(`You chose ${playerChoice}, opponent chose ${opponentChoice}. ${gameResult}`);
        
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ 
                type: 'result', 
                player: playerChoice, 
                opponent: opponentChoice,
                message: gameResult,
                roomId: gameRoomId
            }));
        }
        
        resetGame();
    }
    
    function determineWinner(choice1, choice2) {
        if (choice1 === choice2) {
            return 'It\'s a tie!';
        } else if (
            (choice1 === 'rock' && choice2 === 'scissor') ||
            (choice1 === 'scissor' && choice2 === 'paper') ||
            (choice1 === 'paper' && choice2 === 'rock')
        ) {
            return 'You win!';
        } else {
            return 'You lose!';
        }
    }
    
    function displayResult(message) {
        result.textContent = message;
        result.style.display = 'block';
    }
    
    function resetGame() {
        setTimeout(() => {
            playerChoice = null;
            gameStatus.textContent = 'Make your choice for next round!';
            toggleButtons(true);
        }, 2000);
    }
    
    function toggleButtons(enabled) {
        rock.disabled = !enabled;
        paper.disabled = !enabled;
        scissors.disabled = !enabled;
        
        const buttons = document.querySelectorAll('.choice-btn');
        buttons.forEach(button => {
            if (enabled) {
                button.classList.remove('disabled');
            } else {
                button.classList.add('disabled');
            }
        });
    }
    
    function copyInviteCode() {
        const code = codeValueDisplay.textContent;
        navigator.clipboard.writeText(code)
            .then(() => {
                copyCodeBtn.textContent = 'Copied!';
                setTimeout(() => {
                    copyCodeBtn.textContent = 'Copy';
                }, 2000);
            })
            .catch(err => {
                alert('Failed to copy. Please copy the code manually.');
            });
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    const gameId = urlParams.get('game');
    
    if (gameId) {
        joinCodeInput.value = gameId;
        setTimeout(() => {
            joinGame();
        }, 500);
    }
    
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && gameRoomId && 
            (!socket || socket.readyState !== WebSocket.OPEN)) {
            info.textContent = 'Reconnecting after tab became active...';
            connectToWebSocket(gameRoomId);
        }
    });
    
    window.addEventListener('beforeunload', () => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: 'playerLeft',
                roomId: gameRoomId
            }));
        }
    });
});