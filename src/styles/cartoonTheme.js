// styles/cartoonTheme.js
import { theme } from 'antd';

export const cartoonTheme = {
    algorithm: theme.darkAlgorithm,

    token: {
        colorPrimary: '#9212da',
        colorSuccess: '#3b9e75',
        colorWarning: '#e8a825',
        colorError: '#e06b6b',
        colorInfo: '#7f77dd',

        colorBgBase: '#0a0c10',
        colorBgContainer: '#0d0f14',
        colorBgElevated: '#13161c',
        colorBgSpotlight: '#13161c',

        colorTextBase: '#ffffff',
        colorText: 'rgba(255,255,255,0.85)',
        colorTextSecondary: 'rgba(255,255,255,0.4)',
        colorTextTertiary: 'rgba(255,255,255,0.2)',

        colorBorder: 'rgba(255,255,255,0.08)',
        colorBorderSecondary: 'rgba(255,255,255,0.05)',
        colorSplit: 'rgba(255,255,255,0.06)',

        borderRadius: 10,
        borderRadiusLG: 14,
        borderRadiusSM: 6,

        fontSize: 13,
        fontFamily: 'Nunito, system-ui, sans-serif',

        boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
        boxShadowSecondary: '0 4px 16px rgba(0,0,0,0.3)',

        motionDurationMid: '0.15s',
        motionDurationSlow: '0.2s',
    },

    components: {
        Button: {
            borderRadius: 8,
            controlHeight: 34,
            fontSize: 12,
            fontWeight: 600,
            colorBgContainer: 'rgba(255,255,255,0.05)',
            colorBorder: 'rgba(255,255,255,0.08)',
            colorText: 'rgba(255,255,255,0.7)',
            colorPrimary: '#7a0fc2',           // base for primary variant
            colorPrimaryHover: '#9b18e8',
            colorPrimaryActive: '#5a0a99',
            boxShadow: 'none',
            boxShadowPrimary: 'none',
        },

        Card: {
            borderRadius: 12,
            colorBgContainer: 'rgba(255,255,255,0.03)',
            colorBorderSecondary: 'rgba(255,255,255,0.06)',
            boxShadow: 'none',
            paddingLG: 12,
        },

        Drawer: {
            colorBgElevated: '#0d0f14',
            colorBorder: 'rgba(255,255,255,0.06)',
            borderRadius: 0,
        },

        Modal: {
            borderRadius: 14,
            colorBgElevated: 'rgba(10, 12, 16, 0.82)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
            backdropFilter: 'blur(20px)',
        },

        Input: {
            borderRadius: 8,
            colorBgContainer: 'rgba(255,255,255,0.04)',
            colorBorder: 'rgba(255,255,255,0.08)',
            colorText: 'rgba(255,255,255,0.8)',
            colorTextPlaceholder: 'rgba(255,255,255,0.2)',
        },

        Select: {
            borderRadius: 8,
            colorBgContainer: 'rgba(255,255,255,0.04)',
            colorBorder: 'rgba(255,255,255,0.08)',
        },

        Tooltip: {
            colorBgSpotlight: '#13161c',
            colorTextLightSolid: 'rgba(255,255,255,0.85)',
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(255,255,255,0.08)',
            fontSize: 12,
        },

        Popover: {
            colorBgElevated: '#13161c',
            colorText: 'rgba(255,255,255,0.85)',
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(255,255,255,0.08)',
        },

        Dropdown: {
            colorBgElevated: '#13161c',
            colorText: 'rgba(255,255,255,0.8)',
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            controlItemBgHover: 'rgba(255,255,255,0.05)',
        },

        Badge: {
            colorBgContainer: 'rgba(255,255,255,0.08)',
            colorText: 'rgba(255,255,255,0.6)',
            borderRadius: 6,
            fontSize: 10,
        },

        Message: {
            colorBgElevated: '#13161c',
            colorText: 'rgba(255,255,255,0.8)',
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(255,255,255,0.08)',
            fontSize: 12,
        },

        Typography: {
            colorText: 'rgba(255,255,255,0.85)',
            colorTextSecondary: 'rgba(255,255,255,0.4)',
            colorTextHeading: '#ffffff',
            titleMarginBottom: '0.4em',
            titleMarginTop: 0,
        },

        Divider: {
            colorSplit: 'rgba(255,255,255,0.06)',
            marginLG: 12,
        },
    },
};