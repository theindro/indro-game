import React, { useMemo, useState, useEffect } from "react";
import { Modal, InputNumber, Tooltip, message, Input, Divider } from "antd";
import { ItemDatabase } from "../game/items";
import { useGameStore } from "../stores/gameStore";
import ItemCard from "./Items/ItemCard.jsx";

const rarityClass = {
    Common: "",
    Magic: "item-glow",
    Rare: "item-glow",
    Epic: "item-electric",
    Legendary: "item-legendary",
};

const ItemBrowser = () => {
    const addItem = useGameStore((s) => s.addItem);

    const [open, setOpen] = useState(false);
    const [qty, setQty] = useState(1);
    const [search, setSearch] = useState("");
    const [messageApi, contextHolder] = message.useMessage();

    const items = useMemo(() => Object.values(ItemDatabase), []);

    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key === "x") {
                e.preventDefault();
                setOpen((prev) => !prev);
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    const handleGiveItem = (item) => {
        let quantity = item.type === 'crafting' ? qty : 1;

        const success = addItem(item.id, quantity);
        messageApi.success(`+${quantity} ${item.name}`)
    };

    // 🔥 filter first
    const filtered = items.filter((i) =>
        i.name.toLowerCase().includes(search.toLowerCase())
    );

    // 🔥 group by type
    const grouped = filtered.reduce((acc, item) => {
        const type = item.type || "unknown";
        if (!acc[type]) acc[type] = [];
        acc[type].push(item);
        return acc;
    }, {});

    return (
        <>
            {contextHolder}

            <Modal
                title="Item Database (Debug)"
                open={open}
                onCancel={() => setOpen(false)}
                footer={null}
                width={900}
            >
                {/* Controls */}
                <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                    <Input
                        placeholder="Search items..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />

                    <InputNumber
                        min={1}
                        max={999}
                        value={qty}
                        onChange={(v) => setQty(v || 1)}
                    />
                </div>

                {/* Groups */}
                <div style={{ maxHeight: 500, overflowY: "auto", paddingRight: 6 }}>
                    {Object.entries(grouped).map(([type, list]) => (
                        <div key={type} style={{ marginBottom: 18 }}>
                            <Divider orientation="left" style={{ color: "#aaa" }}>
                                {type.toUpperCase()}
                            </Divider>

                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(15, 1fr)",
                                    gap: 10,
                                }}
                            >
                                {list.map((item) => (
                                    <ItemCard onClick={handleGiveItem} item={item}/>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </Modal>
        </>
    );
};

export default ItemBrowser;