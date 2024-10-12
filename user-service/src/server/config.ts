import { name } from '../../package.json'
interface IConfig {
    host: string;
    port: number;
    timeout: number;
    level: string;
    app_name: string;
}

type ConfigKey = keyof IConfig;

class ConfigManager {
    private config: IConfig;
    constructor() {
        const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
        const host = process.env.HOST || 'http://localhost:3000';
        const timeout = process.env.TIMEOUT ? parseInt(process.env.TIMEOUT) : 3000;
        const level = process.env.LOG_LEVEL || 'info'
        const app_name = process.env.APP_NAME || name

        this.config = {
            host,
            port,
            timeout,
            level,
            app_name
        }
    }

    get<K extends ConfigKey>(key: K) {
        return this.config[key];
    }

    set<K extends ConfigKey>(key: K, value: IConfig[K]) {
        this.config[key] = value;
        return this;
    }
}



const config = new ConfigManager()

export default config;