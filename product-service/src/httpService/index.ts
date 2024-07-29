import type { Request } from 'express'
import axios, { AxiosRequestConfig, AxiosResponse, AxiosBasicCredentials, AxiosError } from 'axios'

export type ServiceAxios<T> = {
    endpoint: string
    timeout?: number
    body?: T
    option?: any
    params?: T
    headers?: Record<string, string>
    auth?: AxiosBasicCredentials
    retries?: number
}



export class HttpServiceServer {
    async get<TParams, TResponse>(req: Request, service: ServiceAxios<TParams>) {
        try {
            let headers: Record<string, string> = {}

            if (!service?.headers) {
                const transactionId = req.header('x-transaction-id') ?? ''
                const authorization = req.header('Authorization') ?? ''
                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': authorization,
                    'x-transaction-id': transactionId
                }
            } else {
                headers = service.headers
            }

            const config: AxiosRequestConfig<TParams> = {
                method: 'get',
                maxBodyLength: Infinity,
                url: service.endpoint,
                headers,
                timeout: service.timeout,
                params: service.params
            }

            if (service.auth) {
                config.auth = service.auth
            }

            const response = await axios.request<TParams, AxiosResponse<TResponse, TResponse>, TParams>(config)
            return response.data
        } catch (error: unknown) {
            console.log('error=================================')
            if (error instanceof AxiosError) {
                console.log(`${error.name}: ${error.message}`)
                if (error.response?.data) {
                    return {
                        data: error.response.data
                    } as AxiosResponse<TResponse, TResponse>
                }
            } else if (error instanceof Error) {
                console.log(`${error.name}: ${error.message}`)
                throw error
            } else {
                throw new Error(String(error))
            }
        }
    }

    async post<TBody, TResponse>(req: Request, service: ServiceAxios<TBody>) {
        try {
            let headers: Record<string, string> = {}

            if (!service?.headers) {
                const transactionId = req.header('x-transaction-id') ?? ''
                const authorization = req.header('Authorization') ?? ''
                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': authorization,
                    'x-transaction-id': transactionId
                }
            } else {
                headers = service.headers
            }

            let auth: AxiosBasicCredentials | undefined = undefined
            if (service.auth) {
                auth = service.auth
            }

            const config: AxiosRequestConfig<TBody> = {
                method: 'post',
                maxBodyLength: Infinity,
                url: service.endpoint,
                headers,
                timeout: service?.timeout && service.timeout,
                data: service.body,
                auth
            }

            const response = await axios.request<TBody, AxiosResponse<TResponse, TResponse>, TBody>(config)
            return response

        } catch (error) {
            console.log('error=================================', error)
            if (error instanceof AxiosError) {
                console.log(`${error.name}: ${error.message}`)
                if (error.response?.data) {
                    return {
                        data: error.response.data
                    } as AxiosResponse<TResponse, TResponse>
                }
            } else if (error instanceof Error) {
                console.log(`${error.name}: ${error.message}`)
                throw error
            } else {
                throw new Error(String(error))
            }
        }
    }
}