import { z } from 'zod'

const IProductSchema = z.object({
    id: z.string(),
    name: z.string(),
    price: z.number(),
    description: z.string().optional(),
    image: z.string().optional(),
    create_by: z.string(),
    update_by: z.string()
})

export const IQueryProductSchema = z.object({
    name: z.string().optional(),
    page: z.string().optional().default("1"),
    pageSize: z.string().optional().default("20"),
    sort: z.string().optional(),
    order: z.string().optional()
})

export type IQueryProduct = z.infer<typeof IQueryProductSchema>

export const CreateProductSchema = IProductSchema.omit({ create_by: true, update_by: true, id: true })

export type IProduct = z.infer<typeof IProductSchema>
export type ICreateProduct = Omit<IProduct, 'created_at' | 'updated_at' | 'delete_date' | 'create_by' | 'update_by' | 'id'>
export type IEditProduct = Partial<IProduct>