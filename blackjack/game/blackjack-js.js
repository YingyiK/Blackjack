class Deck {
    constructor() {
        this.reset();
    }

    reset() {
        this.cards = [];
        const suits = ['♥', '♦', '♣', '♠'];
        const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        
        for (let suit of suits) {
            for (let value of values) {
                this.cards.push({ value, suit });
            }
        }
        this.shuffle();
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    deal() {
        if (this.cards.length === 0) {
            this.reset();
        }
        return this.cards.pop();
    }
}

class Blackjack {
    constructor() {
        this.deck = new Deck();
        this.playerHand = [];
        this.dealerHand = [];
        this.otherPlayers = Array(2).fill().map(() => []);
        this.gameOver = true;
        this.markovStates = {
            'low': { value: [2, 11] },
            'medium': { value: [12, 16] },
            'high': { value: [17, 21] },
            'bust': { value: [22, 30] }
        };
    
        this.transitionMatrix = {
            'low': {
                'low': 0.1086,
                'medium': 0.4198,
                'high': 0.4716,
                'bust': 0.0
            },
            'medium': {
                'low': 0.0,
                'medium': 0.1567,
                'high': 0.4000,
                'bust': 0.4433
            },
            'high': {
                'low': 0.0,
                'medium': 0.0,
                'high': 0.1542,
                'bust': 0.8458
            }
        };
    
        this.winProbabilities = {
            'low': 0.2810,
            'medium': 0.2742,
            'high': 0.5848,
            'bust': 0
        };

        this.initializeUI();
    }

    initializeUI() {
        const startGameBtn = document.getElementById('start-game');
        const hitBtn = document.getElementById('hit-button');
        const standBtn = document.getElementById('stand-button');
        const basicHintBtn = document.getElementById('basic-hint');
        const markovHintBtn = document.getElementById('markov-hint');
        const nashHintBtn = document.getElementById('nash-hint');

        // Ensure all buttons are initially disabled
        hitBtn.disabled = true;
        standBtn.disabled = true;
        basicHintBtn.disabled = true;
        nashHintBtn.disabled = true;
        markovHintBtn.disabled = true;
        startGameBtn.disabled = false;

        // Clear previous game state
        document.getElementById('player-cards').innerHTML = '';
        document.getElementById('dealer-cards').innerHTML = '';
        document.getElementById('player-score').textContent = 'Score: 0';
        document.getElementById('dealer-score').textContent = 'Score: 0';
        document.getElementById('game-status').textContent = 'Ready to start a new game';
        document.getElementById('hint-result').textContent = '';
        document.getElementById('markov-hint-result').textContent = '';
        document.getElementById('nash-hint-result').textContent = '';
    }

    calculateHandValue(hand) {
        let value = 0;
        let aces = 0;

        for (let card of hand) {
            if (['J', 'Q', 'K'].includes(card.value)) {
                value += 10;
            } else if (card.value === 'A') {
                aces++;
                value += 11;
            } else {
                value += parseInt(card.value);
            }
        }

        // Adjust for aces
        while (value > 21 && aces > 0) {
            value -= 10;
            aces--;
        }

        return value;
    }

    basicStrategyHint() {
        const playerTotal = this.calculateHandValue(this.playerHand);
        
        if (playerTotal <= 11) {
            return "Always hit with low totals.";
        } else if (playerTotal > 21) {
            return "You've busted! No move can help now.";
        } else if (playerTotal >= 17) {
            return "Consider standing to avoid busting.";
        } else {
            return "You're in a strategic zone. Consider your risk tolerance.";
        }
    }

    nashEquilibriumHint() {
        const playerTotal = this.calculateHandValue(this.playerHand);
        const dealerUpCard = this.dealerHand[0];
        
        if (playerTotal > 21) {
            return "You've busted! No move can help now.";
        }
    
        // Get all visible cards
        const visibleCards = [
            ...this.playerHand,
            this.dealerHand[0],
            ...this.otherPlayers.flat()
        ];
        
        // Calculate probabilities based on Nash equilibrium
        const standProbability = this.calculateStandProbabilityNash(playerTotal, dealerUpCard, visibleCards);
        const hitProbability = this.calculateHitProbabilityNash(playerTotal, visibleCards);
        
        const hitProb = (hitProbability * 100).toFixed(1);
        const standProb = (standProbability * 100).toFixed(1);
    
        if (hitProbability > standProbability) {
            return `Nash Hint: Hit recommended. Win probability: Hit ${hitProb}% vs Stand ${standProb}%`;
        } else {
            return `Nash Hint: Stand recommended. Win probability: Stand ${standProb}% vs Hit ${hitProb}%`;
        }
    }
    
    calculateHitProbabilityNash(playerTotal, visibleCards) {
        const remainingCards = this.getRemainingCards(visibleCards);
        let totalCards = 0;
        let bustingCards = 0;
        let improvingCards = 0;
    
        for (const [cardValue, count] of remainingCards) {
            totalCards += count;
            let cardNumericValue = this.getCardValue({ value: cardValue });
            
            // Special handling for Aces
            if (cardValue === 'A') {
                // If adding 11 would bust, Ace is worth 1
                cardNumericValue = (playerTotal + 11 > 21) ? 1 : 11;
            }
            
            if (playerTotal + cardNumericValue > 21) {
                bustingCards += count;
            } else {
                improvingCards += count;
            }
        }
    
        return totalCards > 0 ? improvingCards / totalCards : 0;
    }
    
    calculateStandProbabilityNash(playerTotal, dealerUpCard, visibleCards) {
        const dealerInitialValue = this.getCardValue(dealerUpCard);
        const remainingCards = this.getRemainingCards(visibleCards);
        let totalScenarios = 0;
        let favorableScenarios = 0;
    
        // Calculate dealer bust probability
        for (const [cardValue, count] of remainingCards) {
            if (count <= 0) continue;
            
            let dealerTotal = dealerInitialValue + this.getCardValue({ value: cardValue });
            
            if (dealerTotal > 21) {
                favorableScenarios += count;
            } else if (dealerTotal < 17) {
                // Dealer must hit - calculate subsequent probabilities
                const bustProb = this.calculateDealerBustProbability(dealerTotal, new Map(remainingCards));
                favorableScenarios += count * bustProb;
            } else if (dealerTotal < playerTotal) {
                favorableScenarios += count;
            }
            
            totalScenarios += count;
        }
    
        return totalScenarios > 0 ? favorableScenarios / totalScenarios : 0;
    }
    
    calculateDealerBustProbability(currentTotal, remainingCards) {
        let totalCards = 0;
        let bustingCards = 0;
    
        for (const [cardValue, count] of remainingCards) {
            if (count <= 0) continue;
            
            let newTotal = currentTotal + this.getCardValue({ value: cardValue });
            if (newTotal > 21) {
                bustingCards += count;
            }
            totalCards += count;
        }
    
        return totalCards > 0 ? bustingCards / totalCards : 0;
    }

    markovStrategyHint() {
        const playerTotal = this.calculateHandValue(this.playerHand);
        
        // Determine current state
        const currentState = this.determineMarkovState(playerTotal);
        
        if (currentState === 'bust') {
            return "You've busted! No move can help now.";
        }

        // Calculate expected value for hitting
        let hitExpectedValue = 0;
        for (let nextState in this.transitionMatrix[currentState]) {
            const transitionProb = this.transitionMatrix[currentState][nextState];
            const winProb = this.winProbabilities[nextState];
            hitExpectedValue += transitionProb * winProb;
        }

        // For standing, we use the current state's win probability
        const standProbability = this.winProbabilities[currentState];

        const hitPercentage = (hitExpectedValue * 100).toFixed(1);
        const standPercentage = (standProbability * 100).toFixed(1);

        if (hitExpectedValue > standProbability) {
            return `Markov Hint: Hit recommended. Win probability: Hit ${hitPercentage}% vs Stand ${standPercentage}%`;
        } else {
            return `Markov Hint: Stand recommended. Win probability: Stand ${standPercentage}% vs Hit ${hitPercentage}%`;
        }
    }

    determineMarkovState(handValue) {
        if (handValue <= 11) return 'low';
        if (handValue <= 16) return 'medium';
        if (handValue <= 21) return 'high';
        return 'bust';
    }


    simulateDealerHands(currentTotal, remainingCards, playerTotal, results) {
        if (currentTotal >= 17) {
            results.totalScenarios++;
            if (currentTotal > 21 || playerTotal > currentTotal) {
                results.favorableOutcomes++;
            }
            return;
        }
        
        for (const [cardValue, count] of remainingCards) {
            if (count > 0) {
                // Create new remaining cards map with this card removed
                const newRemaining = new Map(remainingCards);
                newRemaining.set(cardValue, count - 1);
                
                // Calculate new total
                let newTotal = currentTotal;
                if (['J', 'Q', 'K'].includes(cardValue)) {
                    newTotal += 10;
                } else if (cardValue === 'A') {
                    newTotal += (newTotal + 11 <= 21) ? 11 : 1;
                } else {
                    newTotal += parseInt(cardValue);
                }
                
                // Multiply the outcomes by the number of this card remaining
                for (let i = 0; i < count; i++) {
                    this.simulateDealerHands(newTotal, newRemaining, playerTotal, results);
                }
            }
        }
    }

    getRemainingCards(visibleCards) {
        // Initialize a map of all possible cards in a deck
        const cardCounts = new Map([
            ['2', 4], ['3', 4], ['4', 4], ['5', 4], ['6', 4],
            ['7', 4], ['8', 4], ['9', 4], ['10', 4],
            ['J', 4], ['Q', 4], ['K', 4], ['A', 4]
        ]);
        
        // Subtract all visible cards including other players' cards
        for (const card of visibleCards) {
            const value = card.value;
            if (cardCounts.has(value)) {
                cardCounts.set(value, cardCounts.get(value) - 1);
            }
        }
        
        return cardCounts;
    }

    getCardValue(card) {
        if (['J', 'Q', 'K'].includes(card.value)) return 10;
        if (card.value === 'A') return 11;
        return parseInt(card.value);
    }

    startGame() {
        // Reset deck and hands
        this.deck = new Deck();
        this.playerHand = [this.deck.deal(), this.deck.deal()];
        this.dealerHand = [this.deck.deal(), this.deck.deal()];
        this.otherPlayers = this.otherPlayers.map(() => [this.deck.deal(), this.deck.deal()]);
        this.gameOver = false;

        // Enable game control buttons
        document.getElementById('hit-button').disabled = false;
        document.getElementById('stand-button').disabled = false;
        document.getElementById('basic-hint').disabled = false;
        document.getElementById('markov-hint').disabled = false;
        document.getElementById('nash-hint').disabled = false;

        // Disable start game button
        document.getElementById('start-game').disabled = true;

        // Clear previous hint
        document.getElementById('hint-result').textContent = '';
        document.getElementById('markov-hint-result').textContent = '';
        document.getElementById('nash-hint-result').textContent = '';

        // Update UI
        this.updateUI();
    }

    hit() {
        this.playerHand.push(this.deck.deal());
        const playerTotal = this.calculateHandValue(this.playerHand);
        
        if (playerTotal > 21) {
            this.gameOver = true;
            this.updateUI('Bust! You lost.');
            // Dealer will still play their hand after player busts
            this.stand(); // Call stand to let dealer play
        } else {
            this.updateUI();
        }
    }

    stand() {
        // First, let other players complete their hands
        this.otherPlayers = this.otherPlayers.map(hand => {
            // Keep hitting while total is less than 17
            while (this.calculateHandValue(hand) < 17) {
                hand.push(this.deck.deal());
            }
            return hand;
        });
    
        // Then dealer plays their hand (existing dealer logic)
        while (this.calculateHandValue(this.dealerHand) < 17) {
            this.dealerHand.push(this.deck.deal());
        }
    
        const playerTotal = this.calculateHandValue(this.playerHand);
        const dealerTotal = this.calculateHandValue(this.dealerHand);
    
        // Check for busts and determine the outcome
        if (playerTotal > 21 && dealerTotal >21) { // Check if player busted
            this.updateUI('Both busted! It\'s a tie!'); // Update message for bust
        } else if (dealerTotal > 21) {
            this.updateUI('You win! Dealer busted.');
        } else if (playerTotal > 21) {
            this.updateUI('You lose! You busted.');
        } else if (dealerTotal > playerTotal) {
            this.updateUI('Dealer wins!');
        } else if (playerTotal > dealerTotal) {
            this.updateUI('You win!');
        } else {
            this.updateUI('It\'s a tie!');
        }
        
        this.endGame();
    }

    revealDealerCards() {
        const dealerCardsEl = document.getElementById('dealer-cards'); // Get the element where dealer's cards will be displayed
        const dealerScoreEl = document.getElementById('dealer-score'); // Get the element where dealer's score will be displayed
        
        // Clear any previous content from the dealer's cards container
        dealerCardsEl.innerHTML = '';
        
        // Loop through each card in the dealer's hand and create a new div for each card
        this.dealerHand.forEach(card => {
            const cardEl = document.createElement('div'); // Create a new div element for the card
            cardEl.classList.add('card'); // Add a 'card' class for styling
            cardEl.textContent = `${card.value}${card.suit}`; // Set the text content to display the card's value and suit
            dealerCardsEl.appendChild(cardEl); // Append the card element to the dealer cards container
        });
    
        // Display the dealer's score. If the game is over, show the calculated score, otherwise show a placeholder '?'
        dealerScoreEl.textContent = this.gameOver 
            ? `Score: ${this.calculateHandValue(this.dealerHand)}`  // Show score if game is over
            : 'Score: ?'; // Show '?' if game is still ongoing
    }
    

    endGame() {
        this.gameOver = true;


        document.getElementById('hit-button').disabled = true;
        document.getElementById('stand-button').disabled = true;
        document.getElementById('basic-hint').disabled = true;
        document.getElementById('markov-hint').disabled = true;
        document.getElementById('nash-hint').disabled = true;
        document.getElementById('start-game').disabled = false;
        

        this.revealDealerCards();
    }

    updateUI(message = '') {
        const playerCardsEl = document.getElementById('player-cards');
        const dealerCardsEl = document.getElementById('dealer-cards');
        const playerScoreEl = document.getElementById('player-score');
        const dealerScoreEl = document.getElementById('dealer-score');
        const gameStatusEl = document.getElementById('game-status');

        // Clear previous cards
        playerCardsEl.innerHTML = '';
        dealerCardsEl.innerHTML = '';

        // Render player cards
        this.playerHand.forEach(card => {
            const cardEl = document.createElement('div');
            cardEl.classList.add('card');
            cardEl.textContent = `${card.value}${card.suit}`;
            playerCardsEl.appendChild(cardEl);
        });

        
        // Render dealer cards (reveal all if game over)
        this.dealerHand.forEach(card => {
            const cardEl = document.createElement('div');
            cardEl.classList.add('card');
            cardEl.textContent = this.gameOver 
                ? `${card.value}${card.suit}` // if game is over, show full hand
                : (card === this.dealerHand[0] ? `${card.value}${card.suit}` : '?'); // if game not over, show only first card
            dealerCardsEl.appendChild(cardEl);
        });
        
        // Update scores
        playerScoreEl.textContent = `Score: ${this.calculateHandValue(this.playerHand)}`;
        dealerScoreEl.textContent = this.gameOver ? `Score: ${this.calculateHandValue(this.dealerHand)}` : 'Score: ?';

        // Update game status
        gameStatusEl.textContent = message;

        // Add UI update for other players
        this.otherPlayers.forEach((hand, index) => {
            const playerCardsEl = document.getElementById(`player${index + 1}-cards`);
            const playerScoreEl = document.getElementById(`player${index + 1}-score`);
            
            if (playerCardsEl && playerScoreEl) {
                playerCardsEl.innerHTML = '';
                hand.forEach(card => {
                    const cardEl = document.createElement('div');
                    cardEl.classList.add('card');
                    cardEl.textContent = `${card.value}${card.suit}`;
                    playerCardsEl.appendChild(cardEl);
                });
                playerScoreEl.textContent = `Score: ${this.calculateHandValue(hand)}`;
            }
        });
    }
}

// Game initialization
document.addEventListener('DOMContentLoaded', () => {
    const game = new Blackjack();
    
    document.getElementById('start-game').addEventListener('click', () => {
        game.startGame();
    });

    document.getElementById('hit-button').addEventListener('click', () => {
        game.hit();
    });

    document.getElementById('stand-button').addEventListener('click', () => {
        game.stand();
    });

    document.getElementById('basic-hint').addEventListener('click', () => {
        document.getElementById('hint-result').textContent = game.basicStrategyHint();
    });

    document.getElementById('markov-hint').addEventListener('click', () => {
        document.getElementById('markov-hint-result').textContent = game.markovStrategyHint();
    });

    document.getElementById('nash-hint').addEventListener('click', () => {
        document.getElementById('nash-hint-result').textContent = game.nashEquilibriumHint();
    });
});
