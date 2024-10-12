import config from "./server/config";
import { TypeRoute, type IRoute } from "./server/my-router";
import Server from "./server/server";
import { UserController } from "./user/user.controller";
const port = config.get('port')

const app = new Server()
const myRoute: IRoute = new TypeRoute()
app.route('/users', new UserController(myRoute))


app.listen(port)