# Lending Add-on

Turn remittance rails into microlending:

- New entities: `Loan`, `RepaymentPlan`, `RepaymentEvent`
- New endpoints:
  - `POST /api/v1/loans`
  - `POST /api/v1/loans/:loanId/disburse`
  - `POST /api/v1/loans/:loanId/repay`
- Integration: reuse `LightningProvider` and transfer status model.
