import { configApp } from '@adonisjs/eslint-config';

const baseConfig = configApp();

export default {
    ...baseConfig,
    rules: {
        ident: ['error', 4]
    }
};
