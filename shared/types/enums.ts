// Enums compartidos entre frontend y backend
// SQLite no soporta enums nativamente, por lo que se almacenan como Strings en la BD

export enum Role {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE',
}

export enum MembershipType {
  ANNUAL = 'ANNUAL',
  MONTHLY = 'MONTHLY',
  NO_FEE = 'NO_FEE',
}

export enum MemberStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum PointsTransactionType {
  LOAD = 'LOAD',           // Carga de puntos (dinero → puntos)
  CONSUME = 'CONSUME',     // Consumo en venta
  REFUND = 'REFUND',       // Devolución
  ADJUSTMENT = 'ADJUSTMENT', // Ajuste manual
}

export enum StockMovementType {
  ENTRY = 'ENTRY',         // Entrada de stock
  EXIT = 'EXIT',           // Salida de stock (venta)
  ADJUSTMENT = 'ADJUSTMENT', // Ajuste manual
  RETURN = 'RETURN',       // Devolución
}

export enum SaleStatus {
  COMPLETED = 'COMPLETED',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED',
}

export enum ExpenseCategory {
  SUPPLIES = 'SUPPLIES',       // Suministros
  UTILITIES = 'UTILITIES',     // Servicios (luz, agua, etc.)
  RENT = 'RENT',               // Alquiler
  SALARY = 'SALARY',           // Salarios
  MAINTENANCE = 'MAINTENANCE', // Mantenimiento
  OTHER = 'OTHER',             // Otros
}

export enum CashRegisterStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

// Helpers para validación
export const isValidRole = (value: string): value is Role => {
  return Object.values(Role).includes(value as Role)
}

export const isValidMembershipType = (value: string): value is MembershipType => {
  return Object.values(MembershipType).includes(value as MembershipType)
}

export const isValidMemberStatus = (value: string): value is MemberStatus => {
  return Object.values(MemberStatus).includes(value as MemberStatus)
}

export const isValidPointsTransactionType = (value: string): value is PointsTransactionType => {
  return Object.values(PointsTransactionType).includes(value as PointsTransactionType)
}

export const isValidStockMovementType = (value: string): value is StockMovementType => {
  return Object.values(StockMovementType).includes(value as StockMovementType)
}

export const isValidSaleStatus = (value: string): value is SaleStatus => {
  return Object.values(SaleStatus).includes(value as SaleStatus)
}

export const isValidExpenseCategory = (value: string): value is ExpenseCategory => {
  return Object.values(ExpenseCategory).includes(value as ExpenseCategory)
}

export const isValidCashRegisterStatus = (value: string): value is CashRegisterStatus => {
  return Object.values(CashRegisterStatus).includes(value as CashRegisterStatus)
}
