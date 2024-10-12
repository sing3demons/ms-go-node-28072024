import dayjs from 'dayjs'
import type { Request } from 'express'
import { v7 as uuid } from 'uuid'
import { createLogger, format, transports } from 'winston'
import config from './config'

const level = config.get('level')
const appName = config.get('app_name')
export const logger = createLogger({
    level,
    format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss', alias: '@timestamp', }),
        format.json()
    ),
    defaultMeta: { service: appName },
    transports: [
        new transports.Console({ level: 'info', handleExceptions: true }),
    ],
    exceptionHandlers: [],
    exitOnError: false,
})

interface ILogger {
    Host: string
    AppName: string
    Instance: string
    Session: string
    InitInvoke: string
    Scenario: string
    Identity: string
    InputTimeStamp: string
    Input: Input[]
    OutputTimeStamp: string
    Output: Output[]
    ProcessingTime: string
}

interface Input {
    Invoke: string
    Event: string
    Type: ELogType
    Data?: Data
    Protocol?: string
    ResTime?: string
}

type Data = string | number | boolean | object | object[] | null | any

interface Output {
    Invoke: string
    Event: string
    Type: ELogType
    Data: Data
    Protocol?: string
}
enum ELogType {
    SUMMARY,
    DETAIL
}

interface Sequence {
    Node: string
    Command: string
    result: Result[]
}

interface Result {
    Result: string
    Desc: string
}


class DetailLog {
    private Host: string
    private AppName: string
    private Instance: string
    private Session: string
    private InitInvoke: string
    private Scenario: string
    private Identity: string
    private InputTimeStamp: string
    private Input: Input[]
    private OutputTimeStamp: string
    private Output: Output[]
    private ProcessingTime: string
    private Type = ELogType.DETAIL

    constructor(req: Request, invoke: string, cmd: string, identity: string | undefined) {
        this.Host = req.hostname || ''
        this.AppName = appName
        this.Instance = '0'
        if (!req.headers['x-session']) { req.headers['x-session'] = uuid() }
        const session = <string>req.headers['x-session']
        this.Session = session
        this.InitInvoke = `${invoke}_${dayjs().format('YYYY-MM-DD HH:mm:ss')}`
        this.Scenario = cmd
        this.Identity = identity || ''
        this.InputTimeStamp = dayjs().format('YYYY-MM-DD HH:mm:ss')
        this.Input = []
        this.OutputTimeStamp = ''
        this.Output = []
        this.ProcessingTime = ''
    }

    public addInputRequest<T>(node: string, cmd: string, invoke: string, rawData: string, Data: T, protocol?: string, protocolMethod?: string) {
        this.Input.push({
            Invoke: invoke,
            Event: `${node}.${cmd}`,
            Type: this.Type,
            Data: Data as Data,
            Protocol: protocol && protocolMethod ? `${protocol}.${protocolMethod}` : undefined
        })
        return this
    }
    public addOutputRequest(node: string, cmd: string, invoke: string, data: Data, protocol?: string, protocolMethod?: string) {
        this.Output.push({
            Invoke: invoke,
            Event: `${node}.${cmd}`,
            Type: this.Type,
            Data: data,
            Protocol: protocol && protocolMethod ? `${protocol}.${protocolMethod}` : undefined
        })
        return this
    }

    public addInputResponse<T>(node: string, cmd: string, invoke: string, rawData: string, Data: T, protocol?: string, protocolMethod?: string) {
        this.Input.push({
            Invoke: invoke,
            Event: `${node}.${cmd}`,
            Type: this.Type,
            Data: Data as Data,
            Protocol: protocol && protocolMethod ? `${protocol}.${protocolMethod}` : undefined
        })
        return this
    }

    public addOutputResponse(node: string, cmd: string, invoke: string, data: Data, protocol?: string, protocolMethod?: string) {
        this.Output.push({
            Invoke: invoke,
            Event: `${node}.${cmd}`,
            Type: this.Type,
            Data: data,
            Protocol: protocol && protocolMethod ? `${protocol}.${protocolMethod}` : undefined
        })
        return this
    }

    public end() {
        this.OutputTimeStamp = dayjs().format('YYYY-MM-DD HH:mm:ss')
        this.ProcessingTime = dayjs(this.OutputTimeStamp).diff(dayjs(this.InputTimeStamp), 'ms').toString()
        const loggerInfo = {
            Host: this.Host,
            AppName: this.AppName,
            Instance: this.Instance,
            Session: this.Session,
            InitInvoke: this.InitInvoke,
            Scenario: this.Scenario,
            Identity: this.Identity,
            InputTimeStamp: this.InputTimeStamp,
            Input: this.Input,
            OutputTimeStamp: this.OutputTimeStamp,
            Output: this.Output,
            ProcessingTime: this.ProcessingTime
        }
        logger.log(level, 'log', loggerInfo)
    }
}

interface ISummary {
    InputTimeStamp: string
    Host: string
    AppName: string
    Instance: string
    Session: string
    InitInvoke: string
    Scenario: string
    Identity: {}
    ResponseResult: string
    ResponseDesc: string
    Sequences: Sequence[]
    EndProcessTimeStamp: string
    ProcessTime: string
}

class SummaryLog {
    private Host: string
    private AppName: string
    private Instance: string
    private Session: string
    private InitInvoke: string
    private Scenario: string
    private Identity: string
    private ResponseResult: string
    private ResponseDesc: string
    private Sequences: Sequence[]
    private EndProcessTimeStamp: string
    private ProcessTime: string
    private Type = ELogType.SUMMARY
    private req: Request
    private InputTimeStamp: string

    constructor(req: Request, invoke: string, cmd: string, identity: string = '') {
        this.req = req
        this.Host = req.hostname
        this.AppName = appName
        this.Instance = '0'
        if (!req.headers['x-session']) { req.headers['x-session'] = uuid() }
        const session = <string>req.headers['x-session']
        this.Session = session
        this.InitInvoke = `${invoke}_${dayjs().format('YYYY-MM-DD HH:mm:ss')}`
        this.Scenario = cmd
        this.Identity = identity
        this.ResponseResult = ''
        this.ResponseDesc = ''
        this.Sequences = []
        this.EndProcessTimeStamp = ''
        this.ProcessTime = ''
        this.InputTimeStamp = dayjs().format('YYYY-MM-DD HH:mm:ss')
    }

    private addBlock(node: string, cmd: string, Result: string, Desc: string) {
        this.Sequences.push({
            Node: node,
            Command: cmd,
            result: [{ Result, Desc }],
        });
    }

    public addSuccessBlock(node: string, cmd: string, Result: string, Desc: string) {
        this.addBlock(node, cmd, Result, Desc);
        return this
    }

    public addErrorBlock(node: string, cmd: string, Result: string, Desc: string) {
        this.addBlock(node, cmd, Result, Desc);
        return this
    }

    public end(result: string = 'OK', desc: string = 'Success') {
        this.ResponseResult = result
        this.ResponseDesc = desc
        this.EndProcessTimeStamp = dayjs().format('YYYY-MM-DD HH:mm:ss')
        this.ProcessTime = dayjs(this.EndProcessTimeStamp).diff(dayjs(this.InputTimeStamp), 'ms').toString()
        const loggerInfo = {
            Host: this.Host,
            Type: this.Type,
            AppName: this.AppName,
            Instance: this.Instance,
            Session: this.Session,
            InitInvoke: this.InitInvoke,
            Scenario: this.Scenario,
            Identity: this.Identity,
            ResponseResult: this.ResponseResult,
            ResponseDesc: this.ResponseDesc,
            Sequences: this.Sequences,
            EndProcessTimeStamp: this.EndProcessTimeStamp,
            ProcessTime: this.ProcessTime,
            Request: process.env.NODE_ENV === 'production' && this.extractRequestInfo()
        }

        // console.log(JSON.stringify(logger, null, 2))
        logger.log(level, 'log', loggerInfo)
    }
    private extractRequestInfo() {
        const headers = this.req.headers;

        return {
            path: this.req.originalUrl,
            headers: {
                connection: headers.connection,
                'cache-control': headers['cache-control'],
                'sec-ch-ua': headers['sec-ch-ua'],
                'sec-ch-ua-mobile': headers['sec-ch-ua-mobile'],
                'sec-ch-ua-platform': headers['sec-ch-ua-platform'],
                dnt: headers.dnt,
                'upgrade-insecure-requests': headers['upgrade-insecure-requests'],
                ip: this.req.ip || headers['x-forwarded-for'] || this.req.socket.remoteAddress,
                device: headers['user-agent'],
                location: headers['x-location'],
            },
            host: headers.host,
            baseUrl: this.req.baseUrl,
            url: this.req.url,
            method: this.req.method,
            body: this.req.body,
            params: this.req.params,
            query: this.req.query,
            clientIp: headers['x-forwarded-for'] ?? this.req.socket.remoteAddress,
            session: headers['x-session'],
        };
    }

}

export default class Logger {
    detailLog: DetailLog
    summaryLog: SummaryLog
    constructor(private readonly req: Request, private readonly invoke: string, private readonly cmd: string, private readonly identity: string) {
        this.detailLog = new DetailLog(req, invoke, cmd, identity)
        this.summaryLog = new SummaryLog(req, invoke, cmd, identity)
    }
}