import { Schema, model } from "mongoose"
import { IProduct } from "./product.model";

const ProductSchema = new Schema({
    name: { type: String, required: true, maxlength: 50 },
    price: { type: Number, required: true },
    description: { type: String, maxlength: 255 },
    image: { type: String, required: true },

    create_by: { type: String, required: true },
    update_by: { type: String, required: true }
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
})

export const ProductModel = model<IProduct>('product', ProductSchema)

