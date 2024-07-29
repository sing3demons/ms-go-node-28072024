import { HttpServiceServer } from "./httpService";
import { AuthService } from "./httpService/auth";
import { ProductHandler } from "./product/product.handler";
import config from "./server/config";
import Logger from './server/logger'
import { IRoute, TypeRoute } from "./server/my-router";
import Server from "./server/server";

const app = new Server()
const PORT = config.get('port')
const myRoute: IRoute = new TypeRoute()
const logger = new Logger()
const authService = new AuthService('http://localhost:8080/api/v1/auth/verify', { retries: 3 }, logger)
const httpService = new HttpServiceServer()



app.route('/products', new ProductHandler(myRoute, logger, httpService), authService.verifyToken)

app.listen(PORT)