const socket = io();

const timerElement = document.getElementById("timer");
const team1Element = document.getElementById("Team1");
const team2Element = document.getElementById("Team2");
const ball = document.querySelector('.ball');
const field = document.querySelector('.field');
const player1 = document.querySelector(".player1");
const player2 = document.querySelector(".player2");

const goalMessage = document.createElement("div");
goalMessage.className = "goal-message";
goalMessage.style.position = "absolute";
goalMessage.style.top = "50%";
goalMessage.style.left = "50%";
goalMessage.style.transform = "translate(-50%, -50%)";
goalMessage.style.fontSize = "48px";
goalMessage.style.color = "#fff";
goalMessage.style.background = "rgba(0, 0, 0, 0.7)";
goalMessage.style.padding = "20px";
goalMessage.style.borderRadius = "12px";
goalMessage.style.display = "none";
field.appendChild(goalMessage);

const goalBar = document.createElement("div");
goalBar.className = "goal-bar";
goalBar.style.position = "absolute";
goalBar.style.top = "0";
goalBar.style.left = "0";
goalBar.style.width = "100%";
goalBar.style.height = "100%";
goalBar.style.background = "rgba(255, 255, 0, 0.2)";
goalBar.style.border = "5px solid yellow";
goalBar.style.display = "none";
field.appendChild(goalBar);

// Game state
let team1Score = 0;
let team2Score = 0;
let timeInSeconds = 0;
let timerInterval = null;
let playerNumber = null;

// Ball state
let x = 0, y = 0, dx = 0, dy = 0;
let p1X = 0, p1Y = 0, p2X = 0, p2Y = 0;
let lastTimestamp = 0;
const moveSpeed = 200;

function startTimer() {
    timerInterval = setInterval(() => {
        timeInSeconds++;
        const minutes = String(Math.floor(timeInSeconds / 60)).padStart(2, '0');
        const seconds = String(timeInSeconds % 60).padStart(2, '0');
        timerElement.textContent = `${minutes}:${seconds}`;
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
}

function resetTimer() {
    clearInterval(timerInterval);
    timeInSeconds = 0;
    timerElement.textContent = "00:00";
}

function updateScore(team, points) {
    if (team === 1) {
        team1Score += points;
        team1Element.textContent = team1Score;
    } else if (team === 2) {
        team2Score += points;
        team2Element.textContent = team2Score;
    }
}

function resetPositions() {
      const fieldRect = field.getBoundingClientRect();

    x = fieldRect.width / 2 - 7 ;
    y = fieldRect.height / 2 - 5;

    p1X = 100;
    p1Y = fieldRect.height / 2 ;
    p2X = fieldRect.width - 110;
    p2Y = fieldRect.height / 2 ;

    player1.style.left =`${p1X}px`;
    player1.style.top = `${p1Y}px`;
    player1.style.transform = 'translate(-50%, -50%)';

    player2.style.left = `${p2X}px`;
    player2.style.top = `${p2Y}px`;
    player2.style.transform = 'translate(-50%, -50%)';

    ball.style.left = `${x}px`;
    ball.style.top = `${y}px`;
    ball.style.transform = 'translate(-50%, -50%)';

    dx = 0;
    dy = 0;
}

function checkCollision(player) {
    const playerRect = player.getBoundingClientRect();
    const ballRect = ball.getBoundingClientRect();
    return !(
        playerRect.right < ballRect.left ||
        playerRect.left > ballRect.right ||
        playerRect.bottom < ballRect.top ||
        playerRect.top > ballRect.bottom
    );
}

function moveBall() {
    const friction = 0.98;
    const fieldRect = field.getBoundingClientRect();
    const ballRect = ball.getBoundingClientRect();

    if (x + ballRect.width / 2 >= (fieldRect.width-15)) dx = -Math.abs(dx);
    if (x - ballRect.width / 2 <= 0) dx = Math.abs(dx);
    if (y + ballRect.height  >= fieldRect.height) dy = -Math.abs(dy);
    if (y - ballRect.height / 2 <= 0) dy = Math.abs(dy);

    [player1, player2].forEach(player => {
        if (checkCollision(player)) {
            const pRect = player.getBoundingClientRect();
            const bRect = ball.getBoundingClientRect();

            let diffX = (bRect.left + bRect.width / 2) - (pRect.left + pRect.width / 2);
            let diffY = (bRect.top + bRect.height / 2) - (pRect.top + pRect.height / 2);

            const distance = Math.sqrt(diffX * diffX + diffY * diffY) || 1;
            const minDist = (pRect.width + bRect.width) / 2;
            const overlap = minDist - distance;

            if (overlap > 0) {
                diffX /= distance;
                diffY /= distance;

                x += diffX * overlap;
                y += diffY * overlap;

                dx += diffX * 0.1;
                dy += diffY * 0.1;
            }
        }
    });

    dx *= friction;
    dy *= friction;

    x += dx;
    y += dy;

    ball.style.left = `${x}px`;
    ball.style.top = `${y}px`;

    checkGoal();

    if (playerNumber === 1) {
        socket.emit("ballState", { x, y, dx, dy });
    }

    requestAnimationFrame(moveBall);
}

const keysPressed = {};
window.addEventListener("keydown", e => {
    keysPressed[e.key.toLowerCase()] = true;
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(e.key.toLowerCase())) {
        e.preventDefault();
    }
    if (e.key === " ") kickBall(playerNumber);
});

window.addEventListener("keyup", e => {
    keysPressed[e.key.toLowerCase()] = false;
});

function movePlayers(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;
    let delta = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
    lastTimestamp = timestamp;

    const fieldRect = field.getBoundingClientRect();

    if (playerNumber === 1) {
        if (keysPressed["arrowup"]) p1Y = Math.max(player1.offsetHeight/2, p1Y - moveSpeed * delta);
        if (keysPressed["arrowdown"]) p1Y = Math.min(fieldRect.height - player1.offsetHeight+10, p1Y + moveSpeed * delta);
        if (keysPressed["arrowleft"]) p1X = Math.max(0, p1X - moveSpeed * delta);
        if (keysPressed["arrowright"]) p1X = Math.min(fieldRect.width - player1.offsetWidth-12, p1X + moveSpeed * delta);
    } else if (playerNumber === 2) {
        if (keysPressed["arrowup"]) p2Y = Math.max(player2.offsetHeight/2, p2Y - moveSpeed * delta);
        if (keysPressed["arrowdown"]) p2Y = Math.min(fieldRect.height - player2.offsetHeight+10, p2Y + moveSpeed * delta);
        if (keysPressed["arrowleft"]) p2X = Math.max(0, p2X - moveSpeed * delta);
        if (keysPressed["arrowright"]) p2X = Math.min(fieldRect.width - player2.offsetWidth-12, p2X + moveSpeed * delta);
    }
        resolvePlayerCollision();

    player1.style.left = `${p1X}px`;
    player1.style.top = `${p1Y}px`;
    player2.style.left = `${p2X}px`;
    player2.style.top = `${p2Y}px`;

    socket.emit("playerMove", {
        player: playerNumber,
        x: playerNumber === 1 ? p1X : p2X,
        y: playerNumber === 1 ? p1Y : p2Y
    });

    requestAnimationFrame(movePlayers);
}

function kickBall(playerNum) {
    const pRect = playerNum === 1 ? player1.getBoundingClientRect() : player2.getBoundingClientRect();
    const ballRect = ball.getBoundingClientRect();

    const pCenterX = pRect.left + pRect.width / 2;
    const pCenterY = pRect.top + pRect.height / 2;
    const bCenterX = ballRect.left + ballRect.width / 2;
    const bCenterY = ballRect.top + ballRect.height / 2;

    const diffX = bCenterX - pCenterX;
    const diffY = bCenterY - pCenterY;
    const dist = Math.sqrt(diffX * diffX + diffY * diffY);

    if (dist < 50) {
        dx += (diffX / dist) * 7;
        dy += (diffY / dist) * 7;

        if (playerNumber === 1) {
            socket.emit("ballKick", { dx, dy });
        }
    }
}

function showGoalMessage(text) {
    goalMessage.textContent = text;
    goalMessage.style.display = "block";
    goalBar.style.display = "block";

    setTimeout(() => {
        goalMessage.style.display = "none";
        goalBar.style.display = "none";
        resetPositions();
    }, 3000);
}

function checkGoal() {
    const fieldRect = field.getBoundingClientRect();
    const ballRadius = ball.offsetWidth / 2;

    const goalTop = fieldRect.height * 0.3;
    const goalBottom = fieldRect.height * 0.7;

    if (x - ballRadius <= 0 && y >= goalTop && y <= goalBottom) {
        socket.emit("goalScored", 2);
    } else if (x + ballRadius >= fieldRect.width - 25 && y >= goalTop && y <= goalBottom) {
        socket.emit("goalScored", 1);
    }
}

function resolvePlayerCollision(){

    const rect1 = player1.getBoundingClientRect();
    const rect2 = player2.getBoundingClientRect();

    if (
        rect1.right < rect2.left ||
        rect1.left > rect2.right ||
        rect1.bottom < rect2.top ||
        rect1.top > rect2.bottom
    ) {
        return; // No collision
    }

    // Find overlap
    const dx = (rect1.left + rect1.width / 2) - (rect2.left + rect2.width / 2);
    const dy = (rect1.top + rect1.height / 2) - (rect2.top + rect2.height / 2);
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    const overlap = (rect1.width / 2 + rect2.width / 2) - dist;
    if (overlap > 0) {
        const offsetX = (dx / dist) * overlap / 2;
        const offsetY = (dy / dist) * overlap / 2;

        // Update player positions (half the overlap each)
        p1X += offsetX;
        p1Y += offsetY;
        p2X -= offsetX;
        p2Y -= offsetY;

        // Clamp to field bounds
        const fieldRect = field.getBoundingClientRect();
        p1X = Math.max(0, Math.min(p1X, fieldRect.width - player1.offsetWidth));
        p1Y = Math.max(0, Math.min(p1Y, fieldRect.height - player1.offsetHeight));
        p2X = Math.max(0, Math.min(p2X, fieldRect.width - player2.offsetWidth));
        p2Y = Math.max(0, Math.min(p2Y, fieldRect.height - player2.offsetHeight));
    }
}

socket.on("connect", () => {
    console.log("Connected to server");
});

socket.on("assignPlayer", (number) => {
    playerNumber = number;
    console.log("You are Player " + playerNumber);
    resetPositions();
});

socket.on("startGame", () => {
    console.log("Game started!");
    resetTimer();
    startTimer();
    moveBall();
    movePlayers();
});

socket.on("playerMove", (data) => {
    if (data.player === 1 && playerNumber !== 1) {
        p1X = data.x;
        p1Y = data.y;
        player1.style.left = `${p1X}px`;
        player1.style.top = `${p1Y}px`;
    } else if (data.player === 2 && playerNumber !== 2) {
        p2X = data.x;
        p2Y = data.y;
        player2.style.left = `${p2X}px`;
        player2.style.top = `${p2Y}px`;
    }
});

socket.on("ballState", (data) => {
    if (playerNumber !== 1) {
        x = data.x;
        y = data.y;
        dx = data.dx;
        dy = data.dy;

        ball.style.left = `${x}px`;
        ball.style.top = `${y}px`;
    }
});

socket.on("goalUpdate", (team) => {
    updateScore(team, 1);
    showGoalMessage(`Goal! Team ${team} scores!`);
});

socket.on("resetGame", () => {
    resetPositions();
});


socket.on("playerDisconnected", () => {
    stopTimer();
    goalMessage.textContent = "Waiting for another player to connect...";
    goalMessage.style.display = "block";
    team1Score = 0;
    team2Score = 0;
    team1Element.textContent = team1Score;
    team2Element.textContent = team2Score;
});