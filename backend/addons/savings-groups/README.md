# Savings Groups Add-on

Use recurring invoice cycles for group savings:

- New entities: `SavingsGroup`, `Member`, `ContributionCycle`
- New endpoints:
  - `POST /api/v1/groups`
  - `POST /api/v1/groups/:groupId/contributions`
- Integration: same webhook confirmation path updates contribution states.
