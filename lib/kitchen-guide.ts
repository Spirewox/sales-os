// Yield guide reference tables (Okeke, Food Costing and Catering Measurement Guide), from the
// Fudfarmer Kitchen Costing prototype. Static reference data, not user records.

export const GUIDE = {
  rice: [
    ['Jollof rice (long grain)', '12 scoops', '14 scoops when cooking 10kg+ in one go'],
    ['Fried rice (long grain)', '15 scoops', 'Vegetables add volume'],
    ['Ofada / plain white rice', '15 scoops', ''],
    ['Basmati rice', '20 scoops', "Not recommended for kids' packs"],
    ['Nigerian (short grain) rice', '1 scoop less per kg', 'Swells less than imported long grain'],
  ],
  serving: [
    ['Assisted buffet', '2 scoops per guest'],
    ['Takeaway pack, adult', '3 scoops'],
    ['Takeaway pack, kids', '2 scoops'],
    ['Supersize meal', '4 scoops'],
  ],
  trays: [
    ['2L bowl', '1kg', '0.5kg'],
    ['3L bowl', '1.5kg', '1kg'],
    ['4L medium tray', '2kg', '1.5kg'],
    ['8L large tray', '4kg', '2.5kg'],
  ],
  protein: [
    ['Orobo chicken, Cut-8', '5–6 / kg', '50–60 / carton', 'Plan with 50'],
    ['Orobo chicken, Cut-4', '1–2 / kg', '10–14 / carton', 'Too big for Cut-4; use soft chicken'],
    ['Soft chicken, Cut-8', '5–6 / kg', '36–44 / carton', 'Plan with 40'],
    ['Soft chicken, Cut-4', '2–3 / kg', '18–22 / carton', ''],
    ['Croaker, large cut pieces', '—', '55–65 / 20kg', 'Plan with 60'],
    ['Croaker, medium cut pieces', '5 / kg', '70–85 / 20kg', 'Plan with 75'],
    ['Croaker, large whole', '—', '12–17 / 20kg', ''],
    ['Hake (panla), large cuts', '4 / kg', '40 / 10kg', 'Shrinks on frying'],
    ['Hake (panla), medium cuts', '7 / kg', '60 / 10kg', 'Use when serving 2 proteins'],
    ['Turkey wings 305 (small)', '5–7 / kg', '60–70 / 10kg', 'Plan with 60'],
    ['Turkey wings 306 (large)', '3–5 / kg', '36–50 / 10kg', 'Plan with 36'],
    ['Beef, large cuts', '5–6 / kg', '—', 'Soup bowls, high-end jobs'],
    ['Beef, medium cuts', '12 / kg', '—', 'Beside chicken or fish'],
    ['Shredded beef in sauce', '10 portions / kg', '—', 'Stretch with veg'],
  ],
  other: [
    ['Semo, regular wrap', '10 / kg'],
    ['Semo, supersize wrap', '5 / kg'],
    ['Wheat, regular wrap', '7 / kg'],
    ['Poundo yam, regular wrap', '10 / kg'],
    ['Moimoi, white beans (party size)', '32–40 / kg'],
    ['Moimoi, brown beans (party size)', '30–35 / kg'],
    ['Moimoi, regular (2 scoops)', '18 / kg'],
    ['Pasta', '100g per person (500g = 5)'],
  ],
  jollofBag: [
    ['Long grain rice', '25kg', '50kg'],
    ['Vegetable oil', '10–15 L', '20–25 L'],
    ['Fresh tomatoes', '10kg (2 Abuja baskets)', '20kg (4 baskets)'],
    ['Fresh pepper (rodo)', '1kg (½ basket)', '2kg (1 basket)'],
    ['Onions', '9kg (2 baskets)', '18kg (4 baskets)'],
    ['Tatashe', '4kg (2 baskets)', '8kg (4 baskets)'],
    ['Shombo', '4.4kg (2 baskets)', '8.8kg (4 baskets)'],
    ['Tin tomatoes', '2 × 2.2kg', '4 × 2.2kg'],
    ['Yield', '350 scoops ≈ 175 packs of 2', '≈ 700 scoops'],
  ],
} as const;

export interface PlannerItem {
  k: string;
  label: string;
  /** Scoops/pieces per unit bought. */
  per: number;
  /** Higher yield when cooking 10kg+ at once (jollof only). */
  bulkPer?: number;
  unit: string;
  pack: number;
  packLabel: string;
}

export const PLANNER: PlannerItem[] = [
  { k: 'jollof', label: 'Jollof rice — long grain', per: 12, bulkPer: 14, unit: 'kg rice', pack: 50, packLabel: '50kg bag' },
  { k: 'fried', label: 'Fried rice — long grain', per: 15, unit: 'kg rice', pack: 50, packLabel: '50kg bag' },
  { k: 'white', label: 'Ofada / white rice', per: 15, unit: 'kg rice', pack: 50, packLabel: '50kg bag' },
  { k: 'basmati', label: 'Basmati rice', per: 20, unit: 'kg rice', pack: 5, packLabel: '5kg bag' },
  { k: 'softc8', label: 'Soft chicken, Cut-8', per: 40, unit: 'cartons (10kg)', pack: 1, packLabel: 'carton' },
  { k: 'oroboc8', label: 'Orobo chicken, Cut-8', per: 50, unit: 'cartons', pack: 1, packLabel: 'carton' },
  { k: 'croakerL', label: 'Croaker, large cuts', per: 60, unit: 'cartons (20kg)', pack: 1, packLabel: 'carton' },
  { k: 'hakeL', label: 'Hake, large cuts', per: 40, unit: 'cartons (10kg)', pack: 1, packLabel: 'carton' },
  { k: 'turkey305', label: 'Turkey wings 305', per: 60, unit: 'cartons (10kg)', pack: 1, packLabel: 'carton' },
  { k: 'turkey306', label: 'Turkey wings 306', per: 36, unit: 'cartons (10kg)', pack: 1, packLabel: 'carton' },
  { k: 'beefM', label: 'Beef, medium cuts', per: 12, unit: 'kg beef', pack: 1, packLabel: 'kg' },
  { k: 'semo', label: 'Semo, regular wraps', per: 10, unit: 'kg semo', pack: 10, packLabel: '10kg bag' },
  { k: 'semoXL', label: 'Semo, supersize wraps', per: 5, unit: 'kg semo', pack: 10, packLabel: '10kg bag' },
  { k: 'moimoi', label: 'Moimoi, party size', per: 30, unit: 'kg beans', pack: 1, packLabel: 'kg' },
  { k: 'pasta', label: 'Spaghetti (500g packs)', per: 5, unit: 'packs', pack: 1, packLabel: 'pack' },
];

/** "How much should I buy?" for `portions` packs/guests at `each` scoops/pieces. */
export function planPurchase(item: PlannerItem, portions: number, each: number, bulk = false) {
  const per = item.bulkPer && bulk ? item.bulkPer : item.per;
  const units = Math.max(0, portions) * Math.max(0, each);
  const need = per > 0 ? units / per : 0;
  const packs = item.pack > 0 ? Math.ceil(need / item.pack - 1e-9) : 0;
  return { per, units, need, packs };
}
