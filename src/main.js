import { Game } from './game.js';
import { UI } from './ui.js';

const canvas = document.querySelector('#game-canvas');
const ui = new UI();
const game = new Game(canvas, ui);
game.start();

// Exposed only for lightweight debugging from browser devtools during development.
window.__riskmulate = game;
