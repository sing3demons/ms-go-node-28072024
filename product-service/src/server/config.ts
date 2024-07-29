interface IConfig {
    host: string
    port: number
    timeout: number
    mongoUri: string
}

import * as dotenv from 'dotenv'

if (process.env.NODE_ENV !== 'production') dotenv.config({ path: '.env.dev' })
type ConfigKey = keyof IConfig

class ConfigManager {
    private config: IConfig
    constructor() {
        const port = process.env.PORT ? parseInt(process.env.PORT) : 3000
        const host = process.env.HOST || 'http://localhost:3000'
        const timeout = process.env.TIMEOUT ? parseInt(process.env.TIMEOUT) : 3000
        const mongoUri = process.env.MONGO_URI || ''

        this.config = { host, port, timeout, mongoUri }
    }

    get<K extends ConfigKey>(key: K) {
        return this.config[key]
    }

    set<K extends ConfigKey>(key: K, value: IConfig[K]) {
        this.config[key] = value
        return this
    }
}

const config = new ConfigManager()

export default config
