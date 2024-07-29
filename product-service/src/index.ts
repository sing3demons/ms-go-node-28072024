import path from 'path'
import { HttpServiceServer } from './httpService'
import { AuthService } from './httpService/auth'
import { ProductHandler } from './product/product.handler'
import ProductService from './product/product.service'
import config from './server/config'
import Logger from './server/logger'
import { IRoute, TypeRoute } from './server/my-router'
import Server from './server/server'
import { connect } from 'mongoose'

const app = new Server(async () => {
    connect(config.get('mongoUri'), {
        dbName: 'product',
    }).then(() => console.log('Connected!'))
})
const PORT = config.get('port')
const myRoute: IRoute = new TypeRoute()
const logger = new Logger()
const authService = new AuthService('http://localhost:8080/api/v1/auth/verify', { retries: 3 }, logger)
const httpService = new HttpServiceServer()

const productService = new ProductService(httpService)

app.route('/products', new ProductHandler(myRoute, logger, productService))

app.listen(PORT)
