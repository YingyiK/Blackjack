import random

# 定义一副牌
def create_deck():
    # 使用真实的扑克牌值
    ranks = ['A'] + list(range(2, 11)) + ['J', 'Q', 'K']
    deck = ranks * 4  # 每个点数4张牌
    random.shuffle(deck)
    return deck

# 计算手牌的总值
def calculate_hand_value(hand):
    value = 0
    aces = 0
    
    for card in hand:
        if card == 'A':
            aces += 1
        elif card in ['K', 'Q', 'J']:
            value += 10
        else:
            value += card

    # 处理A的情况
    for _ in range(aces):
        if value + 11 <= 21:
            value += 11
        else:
            value += 1
            
    return value

# 模拟一场游戏
def simulate_game(player_hand, deck):
    # 检查自然21点（Blackjack）
    if calculate_hand_value(player_hand) == 21:
        dealer_hand = [deck.pop(), deck.pop()]
        if calculate_hand_value(dealer_hand) == 21:
            return 'tie'  # 双方都是Blackjack
        return 'win'  # 玩家Blackjack
    

    if calculate_hand_value(player_hand) > 21:
        return 'loss'  # 玩家爆牌
    
    # 庄家抽牌
    dealer_hand = [deck.pop(), deck.pop()]
    while calculate_hand_value(dealer_hand) < 17:
        dealer_hand.append(deck.pop())
        if calculate_hand_value(dealer_hand) > 21:
            return 'win'  # 庄家爆牌
    
    # 比较手牌值
    player_value = calculate_hand_value(player_hand)
    dealer_value = calculate_hand_value(dealer_hand)
    if player_value > dealer_value:
        return 'win'
    elif player_value == dealer_value:
        return 'tie'
    else:
        return 'loss'

def should_hit(player_value, dealer_up_card):
    """Basic strategy for 12-16 hands"""
    if player_value <= 11:
        return True
    elif player_value == 12:
        return 4 <= dealer_up_card <= 6
    elif 13 <= player_value <= 16:
        return dealer_up_card >= 7
    else:
        return False

# 运行蒙特卡洛模拟
def monte_carlo_simulation(num_simulations=100000):
    wins = 0
    total_games = 0

    for _ in range(num_simulations):
        deck = create_deck()
        player_hand = [deck.pop(), deck.pop()]

        # 确保玩家初始手牌在12-16之间
        player_value = calculate_hand_value(player_hand)
        if  4<= player_value <= 11:
            result = simulate_game(player_hand, deck)
            if result == 'win':
                wins += 1
            total_games += 1

    return wins / total_games if total_games > 0 else 0

# 运行模拟并输出结果
winning_probability = monte_carlo_simulation()
print(f"Winning probability when the player has a hand value between 4 and 11: {winning_probability:.2%}")
