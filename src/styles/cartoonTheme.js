// styles/cartoonTheme.js
import { theme } from 'antd';

export const cartoonTheme = {
    token: {
        colorPrimary: '#ffaa44',
        colorSuccess: '#52c41a',
        colorWarning: '#faad14',
        colorError: '#ff4d4f',
        colorInfo: '#1677ff',
        colorBgBase: '#1a1a2e',
        colorBgContainer: '#16213e',
        colorTextBase: '#ffffff',
        borderRadius: 16,
        fontSize: 16,
        fontFamily: 'Nunito',
        boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
    },
    components: {
        Button: {
            borderRadius: 20,
            controlHeight: 40,
            fontWeight: 'bold',
            boxShadow: '0 4px 0 #8b6914',
        },
        Card: {
            borderRadius: 20,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        },
        Modal: {
            borderRadius: 24,
        },
        Input: {
            borderRadius: 20,
        },
        Select: {
            borderRadius: 20,
        },
    },
};