# Payroll Add-on

Scale the same payment engine to salaries:

- New entities: `PayrollRun`, `EmployeePayout`, `PayrollAudit`
- New endpoints:
  - `POST /api/v1/payroll/runs`
  - `POST /api/v1/payroll/runs/:runId/execute`
- Integration: batch create invoices and settle each through webhook callbacks.
