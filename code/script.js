const rock = document.getElementById('rock');
const paper = document.getElementById('paper');
const scissors = document.getElementById('scissors');
const buttons = document.getElementById('buttons');
const h2 = document.getElementById('h2');
let player;
let computerOptions = ['rock', 'paper', 'scissor'];

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
    buttons.classList.add('none');
    const computersChoice = computerOptions[Math.floor(Math.random() * computerOptions.length)];
    console.log(`Player: ${player}`);
    console.log(`Computer: ${computersChoice}`);

    if (player === computersChoice) {
        h2.innerHTML = 'Its a Tie!';
        console.log('Tie');
    } else if (
        (player === 'rock' && computersChoice === 'scissor') ||
        (player === 'scissor' && computersChoice === 'paper') ||
        (player === 'paper' && computersChoice === 'rock')
    ) {
        h2.innerHTML = 'You Win!';
        console.log('Win');
    } else {
        h2.innerHTML = 'You Lose!';
        console.log('Lose');
    }
}
