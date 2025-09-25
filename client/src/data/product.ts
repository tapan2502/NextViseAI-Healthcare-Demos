// src/data/products.ts

export type ProductId =
  | "acetaminophen_500"
  | "adhesive_bandages"
  | "antacid_tablets"
  | "cetirizine_10"
  | "dextromethorphan_syrup"
  | "ibuprofen_200"
  | "loratadine_10"
  | "vitamin_d3_1000";

/**
 * NOTE: Translated name/description live in i18n.ts under
 * I18N[lang].products[productId].{name, subtitle, description}
 * This model intentionally excludes any localized strings.
 */
export interface PharmacyProduct {
  id: ProductId;
  price: string;          // kept as string to match existing parseFloat usage
  currency: string;       // e.g., "USD"
  stockQuantity: number;
  activeIngredient?: string;
  dosage?: string;
  requiresPrescription: boolean;
}

export const DEMO_PRODUCTS: PharmacyProduct[] = [
  {
    id: "acetaminophen_500",
    price: "6.49",
    currency: "USD",
    stockQuantity: 50,
    activeIngredient: "acetaminophen",
    dosage: "500mg",
    requiresPrescription: false,
  },
  {
    id: "adhesive_bandages",
    price: "3.99",
    currency: "USD",
    stockQuantity: 120,
    requiresPrescription: false,
  },
  {
    id: "antacid_tablets",
    price: "5.49",
    currency: "USD",
    stockQuantity: 60,
    activeIngredient: "calcium carbonate",
    dosage: "500mg",
    requiresPrescription: false,
  },
  {
    id: "cetirizine_10",
    price: "12.99",
    currency: "USD",
    stockQuantity: 40,
    activeIngredient: "cetirizine HCl",
    dosage: "10mg",
    requiresPrescription: false,
  },
  {
    id: "dextromethorphan_syrup",
    price: "7.99",
    currency: "USD",
    stockQuantity: 35,
    activeIngredient: "dextromethorphan HBr",
    dosage: "15mg/5ml",
    requiresPrescription: false,
  },
  {
    id: "ibuprofen_200",
    price: "8.99",
    currency: "USD",
    stockQuantity: 48,
    activeIngredient: "ibuprofen",
    dosage: "200mg",
    requiresPrescription: false,
  },
  {
    id: "loratadine_10",
    price: "10.49",
    currency: "USD",
    stockQuantity: 40,
    activeIngredient: "loratadine",
    dosage: "10mg",
    requiresPrescription: false,
  },
  {
    id: "vitamin_d3_1000",
    price: "9.49",
    currency: "USD",
    stockQuantity: 70,
    activeIngredient: "cholecalciferol",
    dosage: "1000 IU",
    requiresPrescription: false,
  },
];
