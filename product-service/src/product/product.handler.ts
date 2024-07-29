import type { Request } from "express";
import { ASCommon } from "../abstract/basecomponent";
import { DetailLog, SummaryLog, LoggerType } from "../server/logger";
import type { IRoute } from "../server/my-router";
import path from 'path'
import { HttpServiceServer } from "../httpService";
import ProductService from "./product.service";
import { CreateProductSchema, IProduct, IQueryProductSchema } from "./product.model";



export class ProductHandler extends ASCommon {
    constructor(
        private readonly myRoute: IRoute,
        private readonly logger: LoggerType,
        private readonly productService: ProductService
    ) {
        super(path.basename(__filename))
    }

    private readonly getProducts = this.myRoute.get('/').query(IQueryProductSchema).handler(async ({ req, res, query }) => {
        const detailLog = new DetailLog(req as unknown as Request, res, this.logger)
        const summaryLog = new SummaryLog(req as unknown as Request, res, this.logger)
        detailLog.addDetail(this.scriptName, 'getProducts', 'Start')


        const [result, total] = await Promise.all([
            this.productService.findAllProduct(query, detailLog),
            this.productService.countProduct(query, detailLog)
        ])
        const data = result.map(({ id, name, price, description, image }) => {
            return {
                id: id || '',
                href: `/products/${id}`,
                name: name || '',
                price: price || 0,
                description: description || '',
                image: image || '',
            }
        })

        detailLog.addResponseBody(this.scriptName, 'getProducts', data).end()

        summaryLog.addSuccessBlock('Get Products', 'Get all products', '200', 'Success')
        return {
            success: true,
            total,
            data,
            page: +query.page,
            pageSize: +query.pageSize
        }
    })

    private readonly createProduct = this.myRoute.post('/').body(CreateProductSchema).handler(async ({ req, res, body }) => {
        const detailLog = new DetailLog(req as Request, res, this.logger)
        const summaryLog = new SummaryLog(req, res, this.logger)
        detailLog.addDetail(this.scriptName, 'createProduct', 'Start')

        const result = await this.productService.insertProduct(body, detailLog)
        detailLog.addResponseBody(this.scriptName, 'createProduct', result).end()
        return {
            success: true,
            message: 'Product created',
            data: result
        }
    })
    // private readonly getProductById = this.myRoute.get('/:id').handler(async ({ req, res }) => { })
}