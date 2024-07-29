import type { Request } from "express";
import { ASCommon } from "../abstract/basecomponent";
import { DetailLog, SummaryLog, LoggerType } from "../server/logger";
import type { IRoute } from "../server/my-router";
import path from 'path'
import { HttpServiceServer } from "../httpService";



export class ProductHandler extends ASCommon {
    constructor(
        private readonly myRoute: IRoute,
        private readonly logger: LoggerType,
        private readonly httpService: HttpServiceServer
    ) {
        super(path.basename(__filename))
    }

    readonly getProducts = this.myRoute.get('/').handler(async ({ req, res, query }) => {
        const detailLog = new DetailLog(req as Request, res, this.logger)
        const summaryLog = new SummaryLog(req, res, this.logger)
        detailLog.addDetail(this.scriptName, 'getProducts', 'Start').end()

        summaryLog.addSuccessBlock('Get Products', 'Get all products', '200', 'Success')
        return {
            success: true,
            data: [],
        }
    })
}