export function calculatePay(input:{base:number;fixed:number;perAttendance:number;perOvertime:number;deductions:number;taxBasisPoints:number}, attendance:number, overtime:number) {
  const attendancePay=input.perAttendance*attendance
  const overtimePay=input.perOvertime*overtime
  const gross=input.base+input.fixed+attendancePay+overtimePay
  const tax=Math.round(gross*input.taxBasisPoints/10000)
  return {...input,attendance,overtime,attendancePay,overtimePay,gross,tax,net:gross-tax-input.deductions}
}
