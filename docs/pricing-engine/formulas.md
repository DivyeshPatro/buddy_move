# MoveBuddy Pricing Engine — Formulas

## Guest Pricing

### Base Route Price
```
if distance ≤ 5km:
  basePrice = ₹30

if distance > 5km:
  basePrice = ₹30 + (distance - 5) × ₹5
```

### Plan Multipliers
| Plan    | Multiplier | Example (10km = ₹55 base) |
|---------|-----------|---------------------------|
| 7 Days  | ×1.0      | ₹55                       |
| 15 Days | ×2.2      | ₹121                      |
| Monthly | ×4.4      | ₹242                      |

### Renewal Credit (applied on every renewal)
```
credit = min(planPrice × 10%, ₹100)
```

### Loyalty Cashback (from 2nd month onward)
```
cashback = clamp(lastMonthPlanPrice × 3%, min=₹10, max=₹40)
```

### Final Price Guest Pays
```
finalPrice = max(planPrice - credit - cashback, 0)
```

---

## Host Pricing

### Distance Slab
| Distance | Slab Reward |
|----------|-------------|
| 0–5 km   | ₹49         |
| >5 km    | ₹99         |

### Host Plan Cost
| Plan    | Cost    |
|---------|---------|
| 7 Days  | ₹122.5  |
| 15 Days | ₹269.5  |
| Monthly | ₹539    |

### Host Monthly Payout
```
payout = planCost + distanceSlab
```
| Plan    | >5km Route  |
|---------|-------------|
| 7 Days  | ₹221.5      |
| 15 Days | ₹368.5      |
| Monthly | ₹638        |

---

## Admin-Configurable Parameters (stored in `pricing_config` table)

All values are editable from the Admin Panel → Pricing Engine.
Changes take effect immediately without deployment.
