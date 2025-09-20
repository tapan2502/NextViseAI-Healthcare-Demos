import { storage } from "../storage";
import { type InsertPharmacyCategory, type InsertPharmacyProduct } from "@shared/schema";

const pharmacyCategories: InsertPharmacyCategory[] = [
  {
    name: "Pain Relief",
    nameDE: "Schmerzlinderung",
    nameAR: "تسكين الألم",
    description: "Over-the-counter pain management medications",
    descriptionDE: "Rezeptfreie Schmerzmittel",
    descriptionAR: "أدوية إدارة الألم المتاحة بدون وصفة طبية",
    icon: "🩹",
    sortOrder: 1,
    isActive: true,
  },
  {
    name: "Allergy",
    nameDE: "Allergie",
    nameAR: "الحساسية",
    description: "Allergy relief and antihistamine medications",
    descriptionDE: "Allergielinderung und Antihistaminika",
    descriptionAR: "أدوية تخفيف الحساسية ومضادات الهيستامين",
    icon: "🤧",
    sortOrder: 2,
    isActive: true,
  },
  {
    name: "Cold & Flu",
    nameDE: "Erkältung & Grippe",
    nameAR: "نزلات البرد والإنفلونزا",
    description: "Cold and flu symptom relief",
    descriptionDE: "Erkältungs- und Grippesymptom-Linderung",
    descriptionAR: "تخفيف أعراض نزلات البرد والإنفلونزا",
    icon: "🤒",
    sortOrder: 3,
    isActive: true,
  },
  {
    name: "Digestive Health",
    nameDE: "Verdauungsgesundheit",
    nameAR: "صحة الجهاز الهضمي",
    description: "Digestive health and stomach medications",
    descriptionDE: "Verdauungsgesundheit und Magenmedikamente",
    descriptionAR: "أدوية صحة الجهاز الهضمي والمعدة",
    icon: "💊",
    sortOrder: 4,
    isActive: true,
  },
  {
    name: "Vitamins & Supplements",
    nameDE: "Vitamine & Nahrungsergänzungsmittel",
    nameAR: "الفيتامينات والمكملات",
    description: "Essential vitamins and nutritional supplements",
    descriptionDE: "Essentielle Vitamine und Nahrungsergänzungsmittel",
    descriptionAR: "الفيتامينات الأساسية والمكملات الغذائية",
    icon: "🌿",
    sortOrder: 5,
    isActive: true,
  },
  {
    name: "First Aid",
    nameDE: "Erste Hilfe",
    nameAR: "الإسعافات الأولية",
    description: "First aid supplies and wound care",
    descriptionDE: "Erste-Hilfe-Materialien und Wundversorgung",
    descriptionAR: "مستلزمات الإسعافات الأولية ورعاية الجروح",
    icon: "🚑",
    sortOrder: 6,
    isActive: true,
  },
];

export async function seedPharmacyData() {
  console.log("🌱 Seeding pharmacy data...");

  // Create categories and store them with their IDs
  const createdCategories: Record<string, string> = {};
  
  for (const categoryData of pharmacyCategories) {
    try {
      const category = await storage.createPharmacyCategory(categoryData);
      createdCategories[categoryData.name] = category.id;
      console.log(`✓ Created category: ${categoryData.name}`);
    } catch (error) {
      console.log(`Category ${categoryData.name} might already exist`);
    }
  }

  // Get existing categories if creation failed (already exist)
  const existingCategories = await storage.getPharmacyCategories();
  for (const cat of existingCategories) {
    createdCategories[cat.name] = cat.id;
  }

  const pharmacyProducts: Omit<InsertPharmacyProduct, 'categoryId'>[] = [
    // Pain Relief Products
    {
      name: "Ibuprofen 200mg",
      nameDE: "Ibuprofen 200mg",
      nameAR: "إيبوبروفين 200 مجم",
      description: "Fast-acting pain relief for headaches, muscle pain, and inflammation",
      descriptionDE: "Schnell wirkende Schmerzlinderung bei Kopfschmerzen, Muskelschmerzen und Entzündungen",
      descriptionAR: "تسكين سريع المفعول للصداع وآلام العضلات والالتهابات",
      activeIngredient: "Ibuprofen",
      dosage: "200mg",
      formulation: "tablet",
      manufacturer: "Generic Pharma",
      price: "8.99",
      currency: "USD",
      stockQuantity: 150,
      minStockLevel: 20,
      requiresPrescription: false,
      ageRestriction: 12,
      contraindications: ["Stomach ulcers", "Kidney disease", "Severe heart disease"],
      sideEffects: ["Stomach upset", "Dizziness", "Headache"],
      interactions: ["Warfarin", "ACE inhibitors", "Lithium"],
      storageInstructions: "Store below 25°C in a dry place",
      barcode: "123456789001",
      isActive: true,
    },
    {
      name: "Acetaminophen 500mg",
      nameDE: "Paracetamol 500mg",
      nameAR: "أسيتامينوفين 500 مجم",
      description: "Gentle pain relief and fever reducer",
      descriptionDE: "Sanfte Schmerzlinderung und Fiebersenker",
      descriptionAR: "تسكين لطيف للألم وخافض للحرارة",
      activeIngredient: "Acetaminophen",
      dosage: "500mg",
      formulation: "tablet",
      manufacturer: "HealthCorp",
      price: "6.49",
      currency: "USD",
      stockQuantity: 200,
      minStockLevel: 25,
      requiresPrescription: false,
      contraindications: ["Severe liver disease"],
      sideEffects: ["Rare allergic reactions"],
      interactions: ["Warfarin"],
      storageInstructions: "Store below 30°C",
      barcode: "123456789002",
      isActive: true,
    },
    // Allergy Products
    {
      name: "Cetirizine 10mg",
      nameDE: "Cetirizin 10mg",
      nameAR: "سيتيريزين 10 مجم",
      description: "24-hour allergy relief for hay fever and hives",
      descriptionDE: "24-Stunden-Allergielinderung bei Heuschnupfen und Nesselsucht",
      descriptionAR: "تخفيف الحساسية لمدة 24 ساعة لحمى القش والشرى",
      activeIngredient: "Cetirizine HCl",
      dosage: "10mg",
      formulation: "tablet",
      manufacturer: "AllergyMed",
      price: "12.99",
      currency: "USD",
      stockQuantity: 100,
      minStockLevel: 15,
      requiresPrescription: false,
      ageRestriction: 6,
      contraindications: ["Severe kidney disease"],
      sideEffects: ["Drowsiness", "Dry mouth", "Fatigue"],
      interactions: ["CNS depressants"],
      storageInstructions: "Store below 25°C",
      barcode: "123456789003",
      isActive: true,
    },
    {
      name: "Loratadine 10mg",
      nameDE: "Loratadin 10mg",
      nameAR: "لوراتادين 10 مجم",
      description: "Non-drowsy allergy relief for seasonal allergies",
      descriptionDE: "Nicht-müde machende Allergielinderung für saisonale Allergien",
      descriptionAR: "تخفيف الحساسية بدون نعاس للحساسية الموسمية",
      activeIngredient: "Loratadine",
      dosage: "10mg",
      formulation: "tablet",
      manufacturer: "ClearAir Pharma",
      price: "9.99",
      currency: "USD",
      stockQuantity: 80,
      minStockLevel: 12,
      requiresPrescription: false,
      ageRestriction: 2,
      sideEffects: ["Headache", "Nervousness"],
      interactions: [],
      storageInstructions: "Store in original container below 30°C",
      barcode: "123456789004",
      isActive: true,
    },
    // Cold & Flu Products
    {
      name: "Dextromethorphan Cough Syrup",
      nameDE: "Dextromethorphan Hustensaft",
      nameAR: "شراب الكحة ديكستروميثورفان",
      description: "Effective cough suppressant for dry coughs",
      descriptionDE: "Wirksamer Hustenstiller für trockenen Husten",
      descriptionAR: "مثبط فعال للسعال الجاف",
      activeIngredient: "Dextromethorphan HBr",
      dosage: "15mg/5ml",
      formulation: "liquid",
      manufacturer: "CoughCare",
      price: "7.99",
      currency: "USD",
      stockQuantity: 60,
      minStockLevel: 10,
      requiresPrescription: false,
      ageRestriction: 4,
      contraindications: ["MAOI use within 14 days"],
      sideEffects: ["Dizziness", "Nausea"],
      interactions: ["MAOIs", "SSRIs"],
      storageInstructions: "Store upright below 25°C",
      barcode: "123456789005",
      isActive: true,
    },
    // Digestive Health
    {
      name: "Antacid Tablets",
      nameDE: "Antazida-Tabletten",
      nameAR: "أقراص مضادة للحموضة",
      description: "Fast relief from heartburn and acid indigestion",
      descriptionDE: "Schnelle Linderung von Sodbrennen und Magenverstimmung",
      descriptionAR: "تخفيف سريع من حرقة المعدة وعسر الهضم الحمضي",
      activeIngredient: "Calcium Carbonate",
      dosage: "500mg",
      formulation: "tablet",
      manufacturer: "DigestWell",
      price: "5.49",
      currency: "USD",
      stockQuantity: 120,
      minStockLevel: 20,
      requiresPrescription: false,
      contraindications: ["Kidney stones", "High calcium levels"],
      sideEffects: ["Constipation", "Gas"],
      interactions: ["Iron supplements", "Antibiotics"],
      storageInstructions: "Store in dry place below 30°C",
      barcode: "123456789006",
      isActive: true,
    },
    // Vitamins & Supplements
    {
      name: "Vitamin D3 1000 IU",
      nameDE: "Vitamin D3 1000 IE",
      nameAR: "فيتامين د3 1000 وحدة دولية",
      description: "Essential vitamin for bone health and immune support",
      descriptionDE: "Essentielles Vitamin für Knochengesundheit und Immununterstützung",
      descriptionAR: "فيتامين أساسي لصحة العظام ودعم المناعة",
      activeIngredient: "Cholecalciferol",
      dosage: "1000 IU",
      formulation: "capsule",
      manufacturer: "VitaHealth",
      price: "14.99",
      currency: "USD",
      stockQuantity: 90,
      minStockLevel: 15,
      requiresPrescription: false,
      sideEffects: ["Rare: hypercalcemia with excessive use"],
      interactions: ["Thiazide diuretics"],
      storageInstructions: "Store in cool, dry place",
      barcode: "123456789007",
      isActive: true,
    },
    // First Aid
    {
      name: "Adhesive Bandages (Mixed Sizes)",
      nameDE: "Selbstklebende Verbände (Verschiedene Größen)",
      nameAR: "ضمادات لاصقة (أحجام مختلطة)",
      description: "Sterile adhesive bandages for minor cuts and scrapes",
      descriptionDE: "Sterile selbstklebende Verbände für kleine Schnitte und Schürfwunden",
      descriptionAR: "ضمادات لاصقة معقمة للجروح والخدوش الطفيفة",
      activeIngredient: "N/A",
      dosage: "N/A",
      formulation: "bandage",
      manufacturer: "FirstAid Pro",
      price: "3.99",
      currency: "USD",
      stockQuantity: 200,
      minStockLevel: 30,
      requiresPrescription: false,
      contraindications: ["Adhesive allergies"],
      storageInstructions: "Store in dry place",
      barcode: "123456789008",
      isActive: true,
    },
  ];

  // Create products with category associations
  for (const productData of pharmacyProducts) {
    let categoryName = "";
    
    // Determine category based on product name/type
    if (productData.name.includes("Ibuprofen") || productData.name.includes("Acetaminophen")) {
      categoryName = "Pain Relief";
    } else if (productData.name.includes("Cetirizine") || productData.name.includes("Loratadine")) {
      categoryName = "Allergy";
    } else if (productData.name.includes("Dextromethorphan") || productData.name.includes("Cough")) {
      categoryName = "Cold & Flu";
    } else if (productData.name.includes("Antacid")) {
      categoryName = "Digestive Health";
    } else if (productData.name.includes("Vitamin")) {
      categoryName = "Vitamins & Supplements";
    } else if (productData.name.includes("Bandages")) {
      categoryName = "First Aid";
    }

    const categoryId = createdCategories[categoryName];
    if (!categoryId) {
      console.log(`❌ Category not found for product: ${productData.name}`);
      continue;
    }

    try {
      const product = await storage.createPharmacyProduct({
        ...productData,
        categoryId,
      });
      console.log(`✓ Created product: ${productData.name}`);
    } catch (error) {
      console.log(`Product ${productData.name} might already exist`);
    }
  }

  console.log("🎉 Pharmacy data seeding completed!");
}