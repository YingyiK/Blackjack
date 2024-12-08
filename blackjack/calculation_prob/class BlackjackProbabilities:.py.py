class BlackjackProbabilities:
    def __init__(self):
        self.deck = {
            2: 4, 3: 4, 4: 4, 5: 4, 6: 4, 7: 4, 8: 4, 9: 4, 10: 16,
            'A': 4
        }
        self.total_cards = sum(self.deck.values())
        self.ranges = {
            '2-11': (2, 11),
            '12-16': (12, 16),
            '17-21': (17, 21),
            'bust': (22, float('inf'))
        }

    def get_sum_with_aces(self, card1, card2):
        """Calculate sum handling aces optimally"""
        if card1 == 'A' and card2 == 'A':
            return 2  # Two aces initially counted as 2 for categorization
        elif card1 == 'A':
            if other_sum := (11 + card2) <= 21:
                return 11 + card2
            return 1 + card2
        elif card2 == 'A':
            if other_sum := (11 + card1) <= 21:
                return 11 + card1
            return 1 + card1
        else:
            return card1 + card2

    def calculate_initial_hand_combinations(self):
        """Calculate all possible initial two-card combinations"""
        combinations = {range_name: [] for range_name in self.ranges}
        
        for card1 in self.deck.keys():
            for card2 in self.deck.keys():
                # Calculate count of this combination
                if card1 == card2:
                    count = self.deck[card1] * (self.deck[card2] - 1) / 2
                else:
                    count = self.deck[card1] * self.deck[card2]
                
                # Get the sum and categorize
                current_sum = self.get_sum_with_aces(card1, card2)
                
                # Categorize into appropriate range
                for range_name, (min_val, max_val) in self.ranges.items():
                    if min_val <= current_sum <= max_val:
                        combinations[range_name].append([card1, card2, count])
                        break
        
        return combinations

    def calculate_initial_probabilities(self):
        """Calculate probabilities for initial hands in each range"""
        combinations = self.calculate_initial_hand_combinations()
        total_possible_hands = (self.total_cards * (self.total_cards - 1)) / 2
        
        probabilities = {}
        for range_name, combos in combinations.items():
            total_combinations = sum(combo[2] for combo in combos)
            probabilities[range_name] = total_combinations / total_possible_hands
        
        return probabilities

    def calculate_third_card_probabilities(self, current_sum):
        """Calculate probabilities for the third card outcomes"""
        remaining_cards = self.total_cards - 2
        probabilities = {range_name: 0 for range_name in self.ranges}
        
        for card, count in self.deck.items():
            if card == 'A':
                new_sum = current_sum + 11 if current_sum + 11 <= 21 else current_sum + 1
            else:
                new_sum = current_sum + card
            
            prob = count / remaining_cards
            
            for range_name, (min_val, max_val) in self.ranges.items():
                if min_val <= new_sum <= max_val:
                    probabilities[range_name] += prob
                    break
        
        return probabilities

    def calculate_generalized_probabilities(self):
        """Calculate generalized probabilities for all ranges"""
        initial_probs = self.calculate_initial_probabilities()
        
        # Initialize aggregated conditional probabilities
        aggregated_conditionals = {
            initial_range: {final_range: 0 for final_range in self.ranges}
            for initial_range in self.ranges
        }
        
        # Calculate weighted conditional probabilities
        combinations = self.calculate_initial_hand_combinations()
        for initial_range, combos in combinations.items():
            if not combos:
                continue
                
            total_range_count = sum(combo[2] for combo in combos)
            
            for card1, card2, count in combos:
                current_sum = self.get_sum_with_aces(card1, card2)
                third_card_probs = self.calculate_third_card_probabilities(current_sum)
                
                weight = count / total_range_count
                for final_range, prob in third_card_probs.items():
                    aggregated_conditionals[initial_range][final_range] += prob * weight

        # Calculate final probabilities
        final_probabilities = {
            initial_range: {
                final_range: initial_probs[initial_range] * cond_prob
                for final_range, cond_prob in conditionals.items()
            }
            for initial_range, conditionals in aggregated_conditionals.items()
        }

        return {
            'initial_probabilities': initial_probs,
            'conditional_probabilities': aggregated_conditionals,
            'final_probabilities': final_probabilities
        }

    def calculate_summary_probabilities(self):
        """Calculate summary probabilities for the three main initial ranges"""
        results = self.calculate_generalized_probabilities()
        
        summary = {
            'initial_ranges': {
                '2-11': results['initial_probabilities']['2-11'],
                '12-16': results['initial_probabilities']['12-16'],
                '17-21': results['initial_probabilities']['17-21']
            },
            'final_outcomes': {
                '2-11': 0,
                '12-16': 0,
                '17-21': 0,
                'bust': 0
            }
        }
        
        # Sum up all final probabilities
        for initial_range, finals in results['final_probabilities'].items():
            for final_range, prob in finals.items():
                summary['final_outcomes'][final_range] += prob
        
        return summary

def print_generalized_results(results):
    """Print the generalized probability results"""
    print("\nGeneralized Blackjack Probabilities Analysis")
    print("===========================================")
    
    print("\nInitial Hand Probabilities:")
    for range_name, prob in results['initial_probabilities'].items():
        print(f"Initial {range_name}: {prob:.4f}")
    
    print("\nConditional Probabilities (Given Initial Range):")
    for initial_range, conditionals in results['conditional_probabilities'].items():
        print(f"\nStarting with {initial_range}:")
        for final_range, prob in conditionals.items():
            print(f"  → {final_range}: {prob:.4f}")
    
    print("\nFinal Probabilities (Initial AND Final Range):")
    for initial_range, finals in results['final_probabilities'].items():
        print(f"\nStarting with {initial_range}:")
        for final_range, prob in finals.items():
            print(f"  → {final_range}: {prob:.4f}")

def print_summary_results(summary):
    """Print the summarized probability results"""
    print("\nSummary of Blackjack Probabilities")
    print("================================")
    
    print("\nProbability of Initial Hands:")
    print("----------------------------")
    total_initial = 0
    for range_name, prob in summary['initial_ranges'].items():
        print(f"Initial {range_name}: {prob:.4f}")
        total_initial += prob
    print(f"Total Initial Probability: {total_initial:.4f}")
    
    print("\nProbability of Final Outcomes (After Drawing Third Card):")
    print("----------------------------------------------------")
    total_final = 0
    for range_name, prob in summary['final_outcomes'].items():
        print(f"Final {range_name}: {prob:.4f}")
        total_final += prob
    print(f"Total Final Probability: {total_final:.4f}")

if __name__ == "__main__":
    calculator = BlackjackProbabilities()
    
    # Get detailed results
    detailed_results = calculator.calculate_generalized_probabilities()
    print_generalized_results(detailed_results)
    
    # Get and print summary
    print("\n" + "="*50 + "\n")
    summary = calculator.calculate_summary_probabilities()
    print_summary_results(summary)