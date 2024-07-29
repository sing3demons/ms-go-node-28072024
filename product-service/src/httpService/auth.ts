import e, { Request, Response, NextFunction } from 'express'
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios'
import axiosRetry from 'axios-retry';
import Logger, { DetailLog, LoggerType, SummaryLog } from '../server/logger';

export type ServiceAxios = {
    timeout?: number
    retries?: number
}

export class AuthService {
    constructor(
        private readonly endpoint: string,
        private readonly option?: ServiceAxios,
        private readonly logger?: LoggerType
    ) {
    }


    verifyToken = async (req: Request, res: Response, next: NextFunction) => {
        const authorization = req.header('Authorization') ?? ''
        const transactionId = req.header('x-transaction-id') ?? ''
        const logger = this.logger ?? new Logger()
        const detailLog = new DetailLog(req, res, logger)
        const summaryLog = new SummaryLog(req, res, this.logger!)

        try {
            detailLog.addDetail('AuthService', 'verifyToken')
            if (this.option?.retries) {
                axiosRetry(axios, {
                    retries: this.option?.retries ?? 3,
                    retryDelay: (retryCount) => {
                        logger?.error(`Retry attempt: ${retryCount}`)
                        return retryCount * 1000; // Time in ms, e.g., 1000ms = 1s
                    },
                    retryCondition: (error) => {
                        logger?.error(`Retry condition: ${error.code} ${error.response?.status} ${error.response?.data}`)
                        return error.code === 'ECONNABORTED' || error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET' || error.response?.status === 429 || error.response?.status === 503
                    },
                })
            }

            const response = await axios.post(this.endpoint, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authorization,
                    'x-transaction-id': transactionId
                },
                data: { access_token: authorization.replace('Bearer ', '') }
            })

            detailLog.addResponseBody('AuthService', 'verifyToken', response.data).end()
            summaryLog.addSuccessBlock('AuthService', 'verifyToken', '200', 'Success').flush()
            next()
        } catch (error) {
            if (error instanceof AxiosError) {
                detailLog.addResponseError('AuthService', `${error.name}: ${error.message}`, error, error.toJSON())
                // summaryLog.flush()

                return res.status(error.response?.status ?? 500).json({ message: error?.response?.data || error?.message || String(error) || 'Internal Server Error' })
            } else
                if (error instanceof Error) {
                    detailLog.addResponseError('AuthService', `${error.name}: ${error.message}`, error)
                    summaryLog.flush()
                    return res.status(500).json({ message: error.message ?? 'Internal Server Error' })
                } else {
                    res.status(500).json({ message: 'Internal Server Error' })
                }
        }
    }
}
