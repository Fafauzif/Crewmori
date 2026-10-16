# Fictional Development and Evaluation Data

All people, companies, portfolio items, conversations, dates, fees, FX and events here are synthetic. They are controlled fixtures for development. They are not customer outcomes, vendor quotes, bank instructions or conversion-training labels.

| File | Purpose |
|---|---|
| `business_profile.json` | Alya's approved sample services, policies, capability evidence and available capacity |
| `opportunity.json` | Northstar's imported buyer request and channel context |
| `conversation.json` | Final English buyer messages and an Indonesian private owner recap |
| `offer_fixture.json` | Exact minor-unit/decimal inputs and independently checked expected financial values |
| `payment_events.json` | Complete normalized sandbox receipts plus duplicate/mismatch/late/excess scenarios and a submission-timeout descriptor |
| `activity_events.json` | Shape-valid semantic cursor/task events for UI and integration tests |

Freeze the fixture clock when testing expiry/date behavior. IDs link these files but are not an exhaustive database seed. Build an import/seed adapter against actual migrations and commands. Do not bypass authorization or write business state directly merely to make the demo appear complete.

The inherited financial case leaves acquisition inputs unknown. An optional separate synthetic extension uses USD 6 research cost and 30 minutes selling time, producing IDR 1,650,000 contribution after acquisition. It does not alter receipt/deposit values and is not an observation from the original research.

Payment cases use the application's normalized test contract, not a live vendor payload. Each case resets to the stated baseline, except the two duplicate cases deliberately replay the success in the same state. The submission-timeout case is a command-outcome descriptor rather than a cash receipt. Wrong-currency settlement/FX remain unknown; they are not copied from the USD quote. Generate webhook signatures with a local configured test secret when exercising the test adapter. No real secret, bank account, recipient address or executable payment credential is shipped.

The earlier `design/stitch/04_DEMO_DATA.json` is a frontend mock reference. These current fixtures and document 03 govern implementation where schemas differ. `contracts/activity-event.schema.json` validates activity shape; domain authorization/freshness/effect checks still apply.
