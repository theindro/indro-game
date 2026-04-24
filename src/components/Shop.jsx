// components/Shop.jsx
import { useState, useEffect } from 'react';
import { useGameStore } from '../stores/gameStore';

const SHOP_ITEMS = {
    weapons: [
        { id: 'wood_sword', name: 'Wooden Sword', icon: '🗡️', damage: 5, price: 100, equipSlot: 'weapon', description: 'A basic wooden sword' },
        { id: 'iron_sword', name: 'Iron Sword', icon: '⚔️', damage: 12, price: 300, equipSlot: 'weapon', description: 'Sharp iron blade' },
        { id: 'steel_axe', name: 'Steel Axe', icon: '🪓', damage: 15, attackSpeed: -2, price: 400, equipSlot: 'weapon', description: 'Slow but powerful' },
    ],
    armor: [
        { id: 'leather_armor', name: 'Leather Armor', icon: '🥋', armor: 5, price: 150, equipSlot: 'armor', description: 'Light protection' },
        { id: 'iron_armor', name: 'Iron Armor', icon: '🛡️', armor: 12, price: 400, equipSlot: 'armor', description: 'Heavy steel plating' },
    ],
    consumables: [
        { id: 'health_potion', name: 'Health Potion', icon: '🧪', type: 'consumable', healing: 50, price: 50, description: 'Restores 50 HP' },
        { id: 'mana_potion', name: 'Mana Potion', icon: '💙', type: 'consumable', mana: 30, price: 40, description: 'Restores 30 MP' },
    ],
};

export default function Shop() {
    const [selectedCategory, setSelectedCategory] = useState('weapons');
    const { shop, buyItem, closeShop, inventory } = useGameStore();

    if (!shop.isOpen) return null;

    const handleBuy = (item) => {
        if (buyItem(item)) {
            // Play sound effect
            const audio = new Audio('/sounds/coin.ogg');
            audio.volume = 0.3;
            audio.play();
        }
    };

    return (
        <div className="shop-overlay" onClick={closeShop}>
            <div className="shop-panel" onClick={(e) => e.stopPropagation()}>
                <div className="shop-header">
                    <h2>🛒 Merchant's Shop</h2>
                    <button onClick={closeShop}>✕</button>
                </div>

                <div className="shop-categories">
                    <button
                        className={selectedCategory === 'weapons' ? 'active' : ''}
                        onClick={() => setSelectedCategory('weapons')}
                    >
                        ⚔️ Weapons
                    </button>
                    <button
                        className={selectedCategory === 'armor' ? 'active' : ''}
                        onClick={() => setSelectedCategory('armor')}
                    >
                        🛡️ Armor
                    </button>
                    <button
                        className={selectedCategory === 'consumables' ? 'active' : ''}
                        onClick={() => setSelectedCategory('consumables')}
                    >
                        🧪 Consumables
                    </button>
                </div>

                <div className="shop-items">
                    {SHOP_ITEMS[selectedCategory].map((item) => (
                        <div key={item.id} className="shop-item">
                            <div className="shop-item-icon">{item.icon}</div>
                            <div className="shop-item-info">
                                <h3>{item.name}</h3>
                                <p>{item.description}</p>
                                {item.damage && <small>⚔️ +{item.damage} damage</small>}
                                {item.armor && <small>🛡️ +{item.armor} armor</small>}
                                {item.healing && <small>❤️ +{item.healing} HP</small>}
                            </div>
                            <div className="shop-item-price">
                                <span>💰 {item.price}</span>
                                <button
                                    onClick={() => handleBuy(item)}
                                    disabled={inventory.gold < item.price}
                                >
                                    Buy
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="shop-footer">
                    <div className="player-gold">
                        Your Gold: 💰 {inventory.gold}
                    </div>
                    <button className="close-shop-btn" onClick={closeShop}>
                        Leave
                    </button>
                </div>
            </div>
        </div>
    );
}