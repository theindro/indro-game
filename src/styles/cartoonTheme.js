/**
 * Soft Anime RPG Theme
 * Base surface color:
 *   #EBD1C7
 *
 * Direction:
 *  - Cozy fantasy RPG
 *  - Anime inventory UI
 *  - Light parchment cards
 *  - Strong readable text
 *  - Terracotta fantasy accents
 *  - Soft elevated shadows
 */

export const cartoonTheme = {
    token: {
        // =====================================================
        // PRIMARY
        // =====================================================

        colorPrimary: "#B96545",
        colorPrimaryHover: "#CC7857",
        colorPrimaryActive: "#9D5135",

        colorPrimaryBg: "rgba(185,101,69,0.12)",
        colorPrimaryBorder: "rgba(185,101,69,0.40)",

        // =====================================================
        // SEMANTIC
        // =====================================================

        colorSuccess: "#5E9B5E",
        colorWarning: "#C99745",
        colorError: "#B85B5B",
        colorInfo: "#5E79C9",

        colorSuccessBg: "rgba(94,155,94,0.12)",
        colorWarningBg: "rgba(201,151,69,0.12)",
        colorErrorBg: "rgba(184,91,91,0.12)",
        colorInfoBg: "rgba(94,121,201,0.12)",

        // =====================================================
        // BACKGROUNDS
        // =====================================================

        colorBgBase: "#EBD1C7",
        colorBgContainer: "#EBD1C7",
        colorBgElevated: "#EBD1C7",
        colorBgLayout: "#EBD1C7",
        colorBgSpotlight: "#EBD1C7",

        colorBgMask: "rgba(40,20,20,0.35)",

        // =====================================================
        // TEXT
        // =====================================================

        // Main readable dark cocoa text
        colorText: "#4A342E",

        // Secondary
        colorTextSecondary: "rgba(74,52,46,0.72)",

        // Tertiary
        colorTextTertiary: "rgba(74,52,46,0.48)",

        // Disabled
        colorTextDisabled: "rgba(74,52,46,0.28)",

        // Titles
        colorTextHeading: "#2F1F1B",

        // Text on primary buttons
        colorTextLightSolid: "#FFFFFF",

        // =====================================================
        // BORDERS
        // =====================================================

        colorBorder: "rgba(120,85,75,0.22)",

        colorBorderSecondary: "rgba(120,85,75,0.12)",

        colorSplit: "rgba(120,85,75,0.10)",

        // =====================================================
        // FILLS
        // =====================================================

        colorFill: "rgba(90,60,50,0.05)",

        colorFillSecondary: "rgba(90,60,50,0.035)",

        colorFillTertiary: "rgba(90,60,50,0.02)",

        // =====================================================
        // CONTROLS
        // =====================================================

        controlItemBgActive: "rgba(185,101,69,0.16)",

        controlItemBgHover: "rgba(90,60,50,0.05)",

        controlOutline: "rgba(185,101,69,0.20)",

        controlOutlineWidth: 2,

        controlHeight: 38,
        controlHeightSM: 30,
        controlHeightLG: 46,

        // =====================================================
        // GEOMETRY
        // =====================================================

        borderRadius: 14,
        borderRadiusSM: 10,
        borderRadiusLG: 20,
        borderRadiusXS: 6,

        // =====================================================
        // TYPOGRAPHY
        // =====================================================

        fontFamily:
            "'Nunito Sans', 'Segoe UI', system-ui, sans-serif",

        fontFamilyCode:
            "'Fira Code', monospace",

        fontSize: 14,
        fontSizeSM: 12,
        fontSizeLG: 16,

        fontSizeHeading1: 28,
        fontSizeHeading2: 22,
        fontSizeHeading3: 18,

        fontWeightStrong: 700,

        lineHeight: 1.55,

        // =====================================================
        // MOTION
        // =====================================================

        motionDurationFast: "0.14s",
        motionDurationMid: "0.22s",
        motionDurationSlow: "0.32s",

        // =====================================================
        // SHADOWS
        // =====================================================

        boxShadow:
            "0 8px 24px rgba(70,40,30,0.14)",

        boxShadowSecondary:
            "0 4px 14px rgba(70,40,30,0.10)",

        wireframe: false,
    },

    components: {
        // =====================================================
        // BUTTON
        // =====================================================

        Button: {
            defaultBg: "#EBD1C7",

            defaultBorderColor:
                "rgba(120,85,75,0.20)",

            defaultColor: "#4A342E",

            defaultHoverBg:
                "#E4C4B7",

            defaultHoverBorderColor:
                "rgba(185,101,69,0.45)",

            defaultHoverColor:
                "#2F1F1B",

            defaultActiveBg:
                "#DDB9AB",

            primaryColor: "#FFFFFF",

            borderRadius: 14,

            paddingInline: 18,

            contentFontSize: 14,
        },

        // =====================================================
        // CARD
        // =====================================================

        Card: {
            colorBgContainer: "#EBD1C7",

            colorBorderSecondary:
                "rgba(120,85,75,0.14)",

            colorTextHeading:
                "#2F1F1B",

            borderRadius: 20,
        },

        // =====================================================
        // MODAL
        // =====================================================

        Modal: {
            contentBg: "#EBD1C7",

            headerBg: "#EBD1C7",

            footerBg: "#EBD1C7",

            titleColor: "#2F1F1B",

            titleFontSize: 18,

            borderRadius: 20,
        },

        // =====================================================
        // DRAWER
        // =====================================================

        Drawer: {
            colorBgElevated: "#EBD1C7",
        },

        // =====================================================
        // TOOLTIP
        // =====================================================

        Tooltip: {
            colorBgSpotlight: "#EBD1C7",

            colorTextLightSolid: "#4A342E",

            borderRadius: 10,
        },

        // =====================================================
        // TAG
        // =====================================================

        Tag: {
            defaultBg:
                "rgba(185,101,69,0.10)",

            defaultColor:
                "#6A4438",

            colorBorder:
                "rgba(185,101,69,0.20)",

            borderRadius: 999,

            paddingInline: 10,
        },

        // =====================================================
        // MENU
        // =====================================================

        Menu: {
            colorItemBg: "transparent",

            colorItemText:
                "rgba(74,52,46,0.75)",

            colorItemTextHover:
                "#2F1F1B",

            colorItemTextSelected:
                "#2F1F1B",

            colorItemBgSelected:
                "rgba(185,101,69,0.12)",

            colorItemBgHover:
                "rgba(90,60,50,0.04)",

            colorActiveBarColor:
                "#B96545",

            colorSubItemBg:
                "#EBD1C7",

            borderRadius: 12,
        },

        // =====================================================
        // INPUT
        // =====================================================

        Input: {
            colorBgContainer: "#EBD1C7",

            colorBorder:
                "rgba(120,85,75,0.20)",

            hoverBorderColor:
                "rgba(185,101,69,0.40)",

            activeBorderColor:
                "#B96545",

            activeShadow:
                "0 0 0 3px rgba(185,101,69,0.14)",

            colorText:
                "#4A342E",

            colorTextPlaceholder:
                "rgba(74,52,46,0.40)",
        },

        // =====================================================
        // SELECT
        // =====================================================

        Select: {
            colorBgContainer: "#EBD1C7",

            colorBgElevated: "#EBD1C7",

            colorBorder:
                "rgba(120,85,75,0.20)",

            optionSelectedBg:
                "rgba(185,101,69,0.14)",

            optionActiveBg:
                "rgba(90,60,50,0.04)",

            colorText:
                "#4A342E",
        },

        // =====================================================
        // TABLE
        // =====================================================

        Table: {
            colorBgContainer: "#EBD1C7",

            headerBg:
                "rgba(90,60,50,0.04)",

            headerColor:
                "#2F1F1B",

            rowHoverBg:
                "rgba(90,60,50,0.03)",

            borderColor:
                "rgba(120,85,75,0.10)",

            colorText:
                "#4A342E",
        },

        // =====================================================
        // TABS
        // =====================================================

        Tabs: {
            inkBarColor: "#B96545",

            itemColor:
                "rgba(74,52,46,0.65)",

            itemHoverColor:
                "#2F1F1B",

            itemSelectedColor:
                "#2F1F1B",

            cardBg:
                "#EBD1C7",
        },

        // =====================================================
        // DIVIDER
        // =====================================================

        Divider: {
            colorSplit:
                "rgba(120,85,75,0.10)",
        },

        // =====================================================
        // POPOVER
        // =====================================================

        Popover: {
            colorBgElevated: "#EBD1C7",

            colorBorder:
                "rgba(120,85,75,0.12)",
        },

        // =====================================================
        // NOTIFICATION
        // =====================================================

        Notification: {
            colorBgElevated: "#EBD1C7",

            colorText:
                "#4A342E",

            borderRadius: 18,
        },

        // =====================================================
        // PROGRESS
        // =====================================================

        Progress: {
            colorSuccess: "#5E9B5E",

            colorInfo: "#8B6AD9",

            remainingColor:
                "rgba(0,0,0,0.08)",

            lineBorderRadius: 999,
        },

        // =====================================================
        // SLIDER
        // =====================================================

        Slider: {
            railBg:
                "rgba(0,0,0,0.08)",

            trackBg:
                "#B96545",

            trackHoverBg:
                "#CC7857",

            handleColor:
                "#B96545",

            handleActiveColor:
                "#9D5135",
        },

        // =====================================================
        // BADGE
        // =====================================================

        Badge: {
            colorError:
                "#B85B5B",

            colorBorderBg:
                "#EBD1C7",

            fontSize: 10,
        },
    },
};