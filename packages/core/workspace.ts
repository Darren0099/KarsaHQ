import { z } from 'zod'

export const departments = ['Operasional','Produk & Teknologi','Keuangan','People & Culture','Pemasaran'] as const
export const employeeInput = z.object({
  name: z.string().trim().min(2).max(100),
  role: z.string().trim().min(2).max(100),
  department: z.enum(departments)
})
export type Employee = z.infer<typeof employeeInput> & { id: string }
export type Request = { id: string; name: string; type: string; date: string; end_date?:string|null; reason?:string|null; has_letter?:boolean; status: 'Menunggu' | 'Disetujui' | 'Ditolak' }
