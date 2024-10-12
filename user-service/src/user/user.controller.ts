import { type IRoute } from "../server/my-router";

export class UserController {
    constructor(private readonly myRoute: IRoute) {
        console.log('UserController')
    }

    getUsers = this.myRoute.get('/').handler(async () => {
        return { data: 'Hello World' }
    })

}