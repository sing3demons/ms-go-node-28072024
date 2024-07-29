import { z, ZodOptional } from 'zod'

const IProductSchema = z.object({
    name: z.string(),
    price: z.number(),
    description: z.string().optional(),
    image: z.string(),
    create_by: z.string(),
    update_by: z.string()
})

export type IProduct = z.infer<typeof IProductSchema>
export type IEditProduct = Partial<IProduct>