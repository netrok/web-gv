export type Role = 'SuperAdmin' | 'Admin' | 'RRHH' | 'Supervisor' | 'Gerente' | 'Usuario'

export interface JwtPayload {
  exp: number
  iat: number
  sub?: string | number
  username?: string
  email?: string
  roles?: Role[] | string[]
  permissions?: string[]
}
