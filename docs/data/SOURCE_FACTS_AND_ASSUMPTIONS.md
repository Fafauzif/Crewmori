# Provenance and numerical truth

All names, addresses, requests, events and money in this sample are **synthetic demonstration data**. “Source fact” below means a fact from the canonical fictional request, not independently verified real-world evidence. Do not add provider, payment, legal or market authority to these examples.

| Classification | Canonical value | Why it is separate |
|---|---|---|
| Synthetic request fact | Northstar requested four launch assets, USD500 budget, five business days. | Retained verbatim as the original requirement. |
| Proposed commercial decision | Two hero animations, USD450, five business days, 60% deposit. | Owner review is pending in the default; it is not the buyer's original request or acceptance. |
| Effort estimate | 720 minutes (12 hours). | Estimate, not a tracked work log. |
| Capacity assumption | 720 available minutes. | Available effort is not a reservation. Public intake availability is a separate field. |
| Synthetic economic assumption | 2% fee; 15000 IDR per USD. | No provider quote, guaranteed rate or escrow promise. |
| Planned cost assumption | IDR3000000 upfront cost. | Not incurred expense, not profit, and not acquisition cost. |
| Unknown | Acquisition cash/time costs, actual fees/FX, final inputs. | Preserve null/unknown; do not render zero or make up costs. |
| Historical comparison only | Four assets/USD600/18 hours/ten business days. | Useful original-context comparison; not an offered or accepted alternative in the normalized store. |
| Cross-profession example | Lumen Advisory discovery session and findings summary. | Structured scope works for consulting; price/timing remain unknown rather than fabricated. |

## Required exact arithmetic

USD45000 cents × 6000 / 10000 = **27000 cents gross deposit**.

27000 × 200 / 10000 = **540 cents sample fee**. Net = 27000 − 540 = **26460 cents** = USD264.60. Estimated converted net = 26460 × 15000 / 100 = **IDR3969000**. Offer gross balance after the full gross deposit = 45000 − 27000 = **18000 cents**, not 18540.

A 40% alternative is a calculator comparison only: gross18000 cents, fee360, net17640 = IDR2646000, a **IDR354000** shortfall against the planned IDR3000000 cost. Changing the calculator must not silently change offer terms. Saving a changed deposit creates a new commercial revision and invalidates prior approval.

Round positive fractional USD fee results to nearest cent, half-up. Compute gross deposit with the same half-up rule. Convert net USD cents × exact rational FX /100 to integer IDR, half-up, and label the result estimated. In implementation use integer rational/decimal arithmetic, not `Math.round(binary_float_expression)` for money. Invoice totals equal exact line totals plus explicitly configured tax; no tax in this fixture. Zero is known zero, null is unknown. Group totals by currency unless a clearly labeled estimate with the exact rate/basis is requested.

Seeded expenses total **IDR575000** and **USD1200 cents (USD12)**. Do not add those into one number. Northstar's planned upfront cost is not part of those expenses. Net deposit cash is not revenue from finished work and is not profit.

## Dates

Friday 16 October 2026 is the frozen sample date. Weekdays use Monday=0 through Sunday=6. Workweek Monday–Friday; no configured holidays. A next-business-day commitment after Thursday15October08:10 prerequisites starts Friday16October09:00. Counting Friday as day1 gives Monday19 day2, Tuesday20 day3, Wednesday21 day4, Thursday22 day5; due **22 October17:00 Asia/Jakarta**.

The pending-prerequisites branch accepted Friday16October08:50; its 48 elapsed-hour reservation ends Sunday18October08:50 even though Sunday is not a workday. No committed dates exist until prerequisites are confirmed before expiry. Advancing beyond expiry releases provisional capacity and requires rescheduling; it does not magically refund a later receipt or promise the old dates.
