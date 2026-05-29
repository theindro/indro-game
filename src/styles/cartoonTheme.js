// styles/cartoonTheme.js
import { theme } from 'antd';

/**
 * Ant Design ConfigProvider — Anime RPG exact screenshot theme
 *
 * From the image:
 *  - Warm tan/beige slot containers
 *  - Orange-framed action buttons
 *  - Dark translucent panel backgrounds
 *  - Green HP bar, purple XP bar
 *  - Amber-gold accent borders
 *
 * Usage:
 *   import { ConfigProvider } from "antd";
 *   import { rpgTheme } from "./rpgTheme.js";
 *   <ConfigProvider theme={rpgTheme}><App /></ConfigProvider>
 */

export const cartoonTheme = {
    token: {
        // Primary — amber gold (matches orange slot frames)
        colorPrimary:           "#c8882a",
        colorPrimaryHover:      "#d89a3a",
        colorPrimaryActive:     "#a86c18",
        colorPrimaryBg:         "rgba(200,136,42,0.12)",
        colorPrimaryBorder:     "rgba(200,136,42,0.45)",

        // Semantic
        colorSuccess:           "#3ab030",   // HP green
        colorSuccessBg:         "rgba(58,176,48,0.12)",
        colorWarning:           "#c8882a",
        colorError:             "#c0432a",
        colorInfo:              "#4060e0",   // active slot blue

        // Backgrounds — dark wood/parchment
        colorBgBase:            "#14100a",
        colorBgContainer:       "rgba(38,30,18,0.88)",
        colorBgElevated:        "rgba(48,38,22,0.96)",
        colorBgLayout:          "rgba(20,15,8,0.80)",
        colorBgSpotlight:       "rgba(18,13,6,0.97)",
        colorBgMask:            "rgba(0,0,0,0.65)",

        // Text
        colorText:              "#e8d5a3",
        colorTextSecondary:     "rgba(200,170,110,0.75)",
        colorTextTertiary:      "rgba(180,150,90,0.50)",
        colorTextDisabled:      "rgba(140,110,65,0.38)",
        colorTextHeading:       "#f0ddb0",
        colorTextLightSolid:    "#f5e8c0",

        // Borders — amber tones
        colorBorder:            "rgba(180,140,70,0.55)",
        colorBorderSecondary:   "rgba(160,120,55,0.32)",
        colorSplit:             "rgba(160,125,65,0.22)",

        // Fill
        colorFill:              "rgba(180,140,70,0.10)",
        colorFillSecondary:     "rgba(180,140,70,0.06)",
        colorFillTertiary:      "rgba(180,140,70,0.04)",

        // Control fills (slot interiors)
        controlItemBgActive:    "rgba(200,136,42,0.22)",
        controlItemBgHover:     "rgba(180,140,70,0.12)",
        controlOutline:         "rgba(200,136,42,0.28)",
        controlOutlineWidth:    2,
        controlHeight:          36,
        controlHeightSM:        28,
        controlHeightLG:        44,

        // Geometry
        borderRadius:           7,
        borderRadiusSM:         5,
        borderRadiusLG:         10,
        borderRadiusXS:         3,

        // Typography
        fontFamily:             "'Segoe UI',system-ui,-apple-system,sans-serif",
        fontFamilyCode:         "'Fira Code','Cascadia Code',monospace",
        fontSize:               13,
        fontSizeSM:             11,
        fontSizeLG:             15,
        fontSizeHeading1:       24,
        fontSizeHeading2:       19,
        fontSizeHeading3:       16,
        fontWeightStrong:       700,
        lineHeight:             1.55,

        // Motion
        motionDurationFast:     "0.13s",
        motionDurationMid:      "0.20s",
        motionDurationSlow:     "0.32s",

        // Shadow
        boxShadow:              "0 4px 20px rgba(0,0,0,0.55)",
        boxShadowSecondary:     "0 2px 10px rgba(0,0,0,0.40)",

        wireframe:              false,
    },

    components: {
        Button: {
            defaultBg:               "rgba(38,30,18,0.88)",
            defaultBorderColor:      "rgba(130,100,55,0.60)",
            defaultColor:            "#e8d5a3",
            defaultHoverBg:          "rgba(60,45,22,0.85)",
            defaultHoverBorderColor: "rgba(200,160,70,0.70)",
            defaultHoverColor:       "#f0ddb0",
            defaultActiveBg:         "rgba(90,65,20,0.90)",
            primaryColor:            "#14100a",
            borderRadius:             7,
            paddingInline:            14,
            contentFontSize:          13,
        },

        Tooltip: {
            colorBgSpotlight:   "rgba(18,13,6,0.97)",
            colorTextLightSolid:"#e8d5a3",
            borderRadius:        7,
        },

        Modal: {
            contentBg:          "rgba(38,30,18,0.97)",
            headerBg:           "rgba(28,20,10,0.99)",
            footerBg:           "rgba(28,20,10,0.99)",
            titleColor:         "#f0ddb0",
            titleFontSize:       15,
            borderRadius:        10,
        },

        Drawer: {
            colorBgElevated:    "rgba(38,30,18,0.97)",
        },

        Card: {
            colorBgContainer:   "rgba(38,30,18,0.90)",
            colorBorderSecondary:"rgba(160,120,55,0.35)",
            colorTextHeading:   "#f0ddb0",
            borderRadius:        10,
        },

        Progress: {
            // HP = green (colorSuccess), XP = use colorInfo (blue-purple)
            colorSuccess:       "#3ab030",
            colorInfo:          "#9060d0",
            remainingColor:     "rgba(0,0,0,0.45)",
            lineBorderRadius:    6,
        },

        Badge: {
            colorError:         "rgba(192,67,42,0.90)",
            colorBorderBg:      "transparent",
            fontSize:            9,
        },

        Tag: {
            defaultBg:          "rgba(160,120,50,0.18)",
            defaultColor:       "rgba(220,190,120,0.85)",
            colorBorder:        "rgba(180,140,60,0.35)",
            borderRadius:        5,
            paddingInline:       7,
        },

        Divider: {
            colorSplit:         "rgba(160,125,65,0.22)",
        },

        Menu: {
            colorItemBg:               "transparent",
            colorItemText:             "#e8d5a3",
            colorItemTextHover:        "#f0ddb0",
            colorItemTextSelected:     "#f5e8c0",
            colorItemBgSelected:       "rgba(200,136,42,0.25)",
            colorItemBgHover:          "rgba(180,140,70,0.12)",
            colorActiveBarColor:       "#c8882a",
            colorSubItemBg:            "rgba(18,13,6,0.70)",
            borderRadius:               7,
        },

        Select: {
            colorBgContainer:     "rgba(38,30,18,0.88)",
            colorBgElevated:      "rgba(48,38,22,0.97)",
            colorBorder:          "rgba(130,100,55,0.60)",
            optionSelectedBg:     "rgba(200,136,42,0.22)",
            optionActiveBg:       "rgba(180,140,70,0.12)",
            colorText:            "#e8d5a3",
        },

        Input: {
            colorBgContainer:   "rgba(38,30,18,0.88)",
            colorBorder:        "rgba(130,100,55,0.60)",
            hoverBorderColor:   "rgba(200,160,70,0.70)",
            activeBorderColor:  "#c8882a",
            activeShadow:       "0 0 0 2px rgba(200,136,42,0.28)",
            colorText:          "#e8d5a3",
            colorTextPlaceholder:"rgba(160,130,75,0.50)",
        },

        Table: {
            colorBgContainer:   "rgba(32,24,12,0.92)",
            headerBg:           "rgba(22,16,8,0.97)",
            headerColor:        "#f0ddb0",
            rowHoverBg:         "rgba(180,140,70,0.08)",
            borderColor:        "rgba(140,105,50,0.25)",
            colorText:          "#e8d5a3",
        },

        Tabs: {
            inkBarColor:        "#c8882a",
            itemColor:          "rgba(200,170,110,0.65)",
            itemHoverColor:     "#e8d5a3",
            itemSelectedColor:  "#f0ddb0",
            cardBg:             "rgba(28,20,10,0.80)",
        },

        Popover: {
            colorBgElevated:    "rgba(22,16,8,0.97)",
            colorBorder:        "rgba(160,120,55,0.40)",
        },

        Notification: {
            colorBgElevated:    "rgba(38,30,18,0.97)",
            colorText:          "#e8d5a3",
            borderRadius:        10,
        },

        Slider: {
            railBg:             "rgba(0,0,0,0.45)",
            trackBg:            "#c8882a",
            trackHoverBg:       "#d89a3a",
            handleColor:        "#c8882a",
            handleActiveColor:  "#f0ddb0",
        },
    },
};