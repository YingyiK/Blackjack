class BlackjackCalculator {
    constructor() {
        // Markov Chain properties
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
        const calculateBtn = document.getElementById('calculate-button');
        const clearBtn = document.getElementById('clear-button');

        calculateBtn.addEventListener('click', () => this.calculate());
        clearBtn.addEventListener('click', () => this.clearForm());
    }

    clearForm() {
        document.getElementById('player-cards').value = '';
        document.getElementById('dealer-upcard').value = '';
        document.getElementById('player1-cards').value = '';
        document.getElementById('player2-cards').value = '';
        document.getElementById('nash-probability').innerHTML = '';
        document.getElementById('nash-calculation').innerHTML = '';
        document.getElementById('markov-probability').innerHTML = '';
        document.getElementById('markov-calculation').innerHTML = '';
    }

    calculate() {
        try {
            const playerCards = this.parseCards(document.getElementById('player-cards').value);
            const dealerUpCard = this.parseCards(document.getElementById('dealer-upcard').value)[0];
            const player1Cards = this.parseCards(document.getElementById('player1-cards').value);
            const player2Cards = this.parseCards(document.getElementById('player2-cards').value);

            const playerTotal = this.calculateHandValue(playerCards);
            
            // Calculate both Nash and Markov results
            const nashResult = this.nashEquilibriumHint(playerCards, dealerUpCard, [player1Cards, player2Cards]);
            const markovResult = this.markovStrategyHint(playerTotal);

            this.displayResults(nashResult, markovResult);
        } catch (error) {
            alert('Invalid input: ' + error.message);
        }
    }

    parseCards(input) {
        if (!input.trim()) return [];
        return input.split(',').map(card => {
            const value = card.trim().toUpperCase();
            if (!this.isValidCard(value)) {
                throw new Error(`Invalid card value: ${value}`);
            }
            return { value, suit: '♠' };
        });
    }

    isValidCard(value) {
        return ['2','3','4','5','6','7','8','9','10','J','Q','K','A'].includes(value);
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

        while (value > 21 && aces > 0) {
            value -= 10;
            aces--;
        }

        return value;
    }

    // Nash Equilibrium Methods
    nashEquilibriumHint(playerCards, dealerUpCard, otherPlayersCards) {
        const playerTotal = this.calculateHandValue(playerCards);
        
        if (playerTotal > 21) {
            return {
                hit: 0,
                stand: 0,
                message: "You've busted! No move can help now."
            };
        }
    
        // Get all visible cards
        const visibleCards = [
            ...playerCards,
            dealerUpCard,
            ...otherPlayersCards.flat()
        ].filter(card => card); // Filter out any undefined cards
        
        // Calculate probabilities
        const hitProb = this.calculateHitProbabilityNash(playerTotal, visibleCards);
        const standProb = this.calculateStandProbabilityNash(playerTotal, dealerUpCard, visibleCards);
        
        return {
            hit: hitProb,
            stand: standProb,
            calculations: {
                playerTotal,
                dealerUpCard: dealerUpCard ? dealerUpCard.value : 'None',
                visibleCards: visibleCards.map(card => card.value).join(', '),
                remainingCards: this.getRemainingCards(visibleCards)
            }
        };
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
        if (!dealerUpCard) return 0;
        
        const dealerInitialValue = this.getCardValue(dealerUpCard);
        const remainingCards = this.getRemainingCards(visibleCards);
        let totalScenarios = 0;
        let favorableScenarios = 0;
    
        for (const [cardValue, count] of remainingCards) {
            if (count <= 0) continue;
            
            let dealerTotal = dealerInitialValue + this.getCardValue({ value: cardValue });
            
            if (dealerTotal > 21) {
                favorableScenarios += count;
            } else if (dealerTotal < 17) {
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

    // Markov Chain Methods
    markovStrategyHint(playerTotal) {
        const currentState = this.determineMarkovState(playerTotal);
        
        if (currentState === 'bust') {
            return {
                currentState,
                hitExpectedValue: 0,
                standProbability: 0,
                message: "You've busted! No move can help now."
            };
        }

        let hitExpectedValue = 0;
        const transitionCalcs = {};
        
        for (let nextState in this.transitionMatrix[currentState]) {
            const transitionProb = this.transitionMatrix[currentState][nextState];
            const winProb = this.winProbabilities[nextState];
            hitExpectedValue += transitionProb * winProb;
            
            transitionCalcs[nextState] = {
                transitionProb,
                winProb,
                expectedValue: transitionProb * winProb
            };
        }

        const standProbability = this.winProbabilities[currentState];

        return {
            currentState,
            playerTotal,
            hitExpectedValue,
            standProbability,
            transitionCalcs,
            recommendation: hitExpectedValue > standProbability ? 'HIT' : 'STAND'
        };
    }

    determineMarkovState(handValue) {
        if (handValue <= 11) return 'low';
        if (handValue <= 16) return 'medium';
        if (handValue <= 21) return 'high';
        return 'bust';
    }

    // Utility Methods
    getRemainingCards(visibleCards) {
        const cardCounts = new Map([
            ['2', 4], ['3', 4], ['4', 4], ['5', 4], ['6', 4],
            ['7', 4], ['8', 4], ['9', 4], ['10', 4],
            ['J', 4], ['Q', 4], ['K', 4], ['A', 4]
        ]);
        
        for (const card of visibleCards) {
            if (card && cardCounts.has(card.value)) {
                cardCounts.set(card.value, cardCounts.get(card.value) - 1);
            }
        }
        
        return cardCounts;
    }

    getCardValue(card) {
        if (!card) return 0;
        if (['J', 'Q', 'K'].includes(card.value)) return 10;
        if (card.value === 'A') return 11;
        return parseInt(card.value);
    }

    displayResults(nashResult, markovResult) {
        // Display Nash Results
        const nashProb = document.getElementById('nash-probability');
        const nashCalc = document.getElementById('nash-calculation');
        
        const hitImprovePercentage = (nashResult.hit * 100).toFixed(1);
        const hitBustPercentage = (100 - nashResult.hit * 100).toFixed(1);
        const standWinPercentage = (nashResult.stand * 100).toFixed(1);
    
        nashProb.innerHTML = `
            <p>Hit for Improvement: ${hitImprovePercentage}%</p>
            <p>Hit and Bust: ${hitBustPercentage}%</p>
            <p>Stand and Win: ${standWinPercentage}%</p>
            <p>Recommended Action: <strong>${nashResult.hit > nashResult.stand ? 'HIT' : 'STAND'}</strong></p>
        `;

        nashCalc.innerHTML = `Nash Calculation Details:
Player Total: ${nashResult.calculations.playerTotal}
Dealer Up Card: ${nashResult.calculations.dealerUpCard}
Visible Cards: ${nashResult.calculations.visibleCards}
Remaining Cards:
${Array.from(nashResult.calculations.remainingCards).map(([card, count]) => `${card}: ${count}`).join('\n')}`;

        // Display Markov Results
        const markovProb = document.getElementById('markov-probability');
        const markovCalc = document.getElementById('markov-calculation');

        if (markovResult.message) {
            markovProb.innerHTML = `<p>${markovResult.message}</p>`;
            markovCalc.innerHTML = '';
            return;
        }

        const markovHitAndWinPercentage = (markovResult.hitExpectedValue * 100).toFixed(1); // Updated variable name
        const markovStandAndWinPercentage = (markovResult.standProbability * 100).toFixed(1); // Updated variable name

        markovProb.innerHTML = `
            <p>Current State: ${markovResult.currentState.toUpperCase()}</p>
            <p>Hit and Win: ${markovHitAndWinPercentage}%</p> <!-- Updated label -->
            <p>Stand and Win: ${markovStandAndWinPercentage}%</p> <!-- Updated label -->
            <p>Recommended Action: <strong>${markovResult.recommendation}</strong></p>
        `;
        let markovDetails = 'Markov Transition Details:\n\n';
        for (const [state, calc] of Object.entries(markovResult.transitionCalcs)) {
            markovDetails += `${state.toUpperCase()}:\n`;
            markovDetails += `  Transition Probability: ${(calc.transitionProb * 100).toFixed(1)}%\n`;
            markovDetails += `  Win Probability: ${(calc.winProb * 100).toFixed(1)}%\n`;
            markovDetails += `  Expected Value: ${(calc.expectedValue * 100).toFixed(1)}%\n\n`;
        }

        markovCalc.innerHTML = markovDetails;
    }
}

// Initialize calculator when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new BlackjackCalculator();
});