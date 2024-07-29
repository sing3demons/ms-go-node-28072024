import path from "path";
import { ASCommon } from "../abstract/basecomponent";
import { DetailLog } from "../server/logger";
import { ICreateProduct, IProduct, IQueryProduct } from "./product.model";
import { ProductModel } from "./product.schema";
import { v7 as uuid } from 'uuid'
import { HttpServiceServer } from "../httpService";
import { FilterQuery } from "mongoose";

export default class ProductService extends ASCommon {
    constructor(private readonly httpService: HttpServiceServer) {
        super(path.basename(__filename))
    }

    public insertProduct = async (product: ICreateProduct, detailLog: DetailLog) => {
        detailLog.addDetail(this.scriptName, 'insertProduct')
        const body = new ProductModel()
        body.id = uuid()
        body.name = product.name
        body.price = product.price
        body.description = product.description
        body.image = product.image
        body.create_by = 'admin'
        body.update_by = 'admin'
        const result = await body.save()
        detailLog.addResponseBody(this.scriptName, 'insertProduct', result).end()
        return result._id
    }

    public countProduct = async ({ name }: IQueryProduct, detailLog: DetailLog) => {
        const cmd = 'countProduct'
        let filter: FilterQuery<{}> = {
            delete_date: null,
        }
        if (name) {
            filter = {
                ...filter,
                name: { $regex: name, $options: 'i' }
            }
        }
        detailLog.addDetail(this.scriptName, cmd, JSON.stringify(filter))

        const result = await ProductModel.countDocuments(filter).exec()
        detailLog.addResponseBody(this.scriptName, cmd, result).end()
        return result
    }

    public findAllProduct = async (query: IQueryProduct, detailLog: DetailLog) => {
        const cmd = 'findAllProduct'
        const { page, pageSize, name, sort = '_id', order = 'desc' } = query
        let filter: FilterQuery<{}> = {
            delete_date: null,
        }
        if (name) {
            filter = {
                ...filter,
                name: { $regex: name, $options: 'i' }
            }
        }
        detailLog.addDetail(this.scriptName, cmd, JSON.stringify(filter))
        const limit = Number(pageSize)
        const skip = (Number(page) - 1) * limit

        const result = await ProductModel.find<IProduct & { id: string }>(filter, {}, { limit, skip, sort: { [sort]: order } }).lean().exec()
        detailLog.addResponseBody(this.scriptName, cmd, result).end()
        return result
    }

    public findProductById = async (id: string, detailLog: DetailLog) => {
        const cmd = 'findProductById'
        detailLog.addDetail(this.scriptName, cmd, id)
        const result = await ProductModel.findOne<IProduct & { id: string }>({ id }).exec()
        detailLog.addResponseBody(this.scriptName, cmd, result).end()
        return result
    }

    public updateProduct = async (id: string, product: IProduct, detailLog: DetailLog) => {
        const cmd = 'updateProduct'
        detailLog.addDetail(this.scriptName, cmd, id)
        const result = await ProductModel.findOneAndUpdate({ id }, product).exec()
        detailLog.addResponseBody(this.scriptName, cmd, result).end()
        return result
    }

}