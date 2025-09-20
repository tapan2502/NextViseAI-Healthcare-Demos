import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, decimal, integer, boolean, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table - basic authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Patients table - extended patient information
export const patients = pgTable("patients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  dateOfBirth: text("date_of_birth"),
  gender: text("gender"),
  address: text("address"),
  emergencyContact: text("emergency_contact"),
  insuranceInfo: text("insurance_info"),
  allergies: text("allergies").array(),
  medications: text("medications").array(),
  medicalHistory: text("medical_history"),
  language: text("language").default("en"),
  consentGiven: boolean("consent_given").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Medical records table - encrypted medical history and records
export const medicalRecords = pgTable("medical_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").references(() => patients.id).notNull(),
  recordType: text("record_type").notNull(), // 'consultation', 'prescription', 'sick_note', 'health_assessment'
  title: text("title").notNull(),
  content: text("content").notNull(), // Encrypted medical data
  attachments: text("attachments").array(), // File URLs/paths
  doctorName: text("doctor_name"),
  facilityName: text("facility_name"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Consultations table - visit records and consultation data
export const consultations = pgTable("consultations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").references(() => patients.id).notNull(),
  consultationType: text("consultation_type").notNull(), // 'telehealth', 'telepharmacy'
  status: text("status").default("scheduled"), // 'scheduled', 'in_progress', 'completed', 'cancelled'
  reason: text("reason").notNull(),
  symptoms: text("symptoms").array(),
  diagnosis: text("diagnosis"),
  treatment: text("treatment"),
  notes: text("notes"),
  preferredSlot: text("preferred_slot"),
  doctorId: varchar("doctor_id"),
  pharmacistId: varchar("pharmacist_id"),
  transcript: text("transcript"), // Voice conversation transcript
  voiceRecordingUrl: text("voice_recording_url"),
  videoCallUrl: text("video_call_url"),
  duration: integer("duration"), // in minutes
  scheduledAt: timestamp("scheduled_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Prescriptions table - generated prescriptions with details
export const prescriptions = pgTable("prescriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").references(() => patients.id).notNull(),
  consultationId: varchar("consultation_id").references(() => consultations.id),
  medications: json("medications").$type<Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
  }>>().notNull(),
  doctorName: text("doctor_name").notNull(),
  facilityName: text("facility_name").notNull(),
  prescriptionNumber: text("prescription_number").notNull(),
  validUntil: timestamp("valid_until").notNull(),
  status: text("status").default("active"), // 'active', 'filled', 'expired', 'cancelled'
  pharmacyNotes: text("pharmacy_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Pharmacy categories table
export const pharmacyCategories = pgTable("pharmacy_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  nameDE: text("name_de"),
  nameAR: text("name_ar"),
  description: text("description"),
  descriptionDE: text("description_de"),
  descriptionAR: text("description_ar"),
  icon: text("icon"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Pharmacy products table - real product database to replace DEMO_PRODUCTS
export const pharmacyProducts = pgTable("pharmacy_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: varchar("category_id").references(() => pharmacyCategories.id).notNull(),
  name: text("name").notNull(),
  nameDE: text("name_de"),
  nameAR: text("name_ar"),
  description: text("description").notNull(),
  descriptionDE: text("description_de"),
  descriptionAR: text("description_ar"),
  activeIngredient: text("active_ingredient"),
  dosage: text("dosage"),
  formulation: text("formulation"), // 'tablet', 'capsule', 'liquid', 'cream', etc.
  manufacturer: text("manufacturer"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("USD"),
  stockQuantity: integer("stock_quantity").default(0),
  minStockLevel: integer("min_stock_level").default(10),
  requiresPrescription: boolean("requires_prescription").default(false),
  ageRestriction: integer("age_restriction"), // minimum age
  contraindications: text("contraindications").array(),
  sideEffects: text("side_effects").array(),
  interactions: text("interactions").array(),
  storageInstructions: text("storage_instructions"),
  imageUrl: text("image_url"),
  barcode: text("barcode"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Appointments table - scheduled appointments
export const appointments = pgTable("appointments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").references(() => patients.id).notNull(),
  consultationId: varchar("consultation_id").references(() => consultations.id),
  appointmentType: text("appointment_type").notNull(), // 'telehealth', 'telepharmacy'
  title: text("title").notNull(),
  description: text("description"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration").default(30), // in minutes
  status: text("status").default("scheduled"), // 'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled'
  meetingUrl: text("meeting_url"), // Video call URL
  calendarEventId: text("calendar_event_id"), // External calendar integration
  reminderSent: boolean("reminder_sent").default(false),
  providerId: varchar("provider_id"), // Doctor or pharmacist ID
  providerName: text("provider_name"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payments table - payment transactions
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").references(() => patients.id).notNull(),
  consultationId: varchar("consultation_id").references(() => consultations.id),
  appointmentId: varchar("appointment_id").references(() => appointments.id),
  paymentType: text("payment_type").notNull(), // 'consultation', 'pharmacy', 'subscription'
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("USD"),
  status: text("status").default("pending"), // 'pending', 'processing', 'completed', 'failed', 'refunded'
  paymentMethod: text("payment_method"), // 'card', 'paypal', 'insurance'
  transactionId: text("transaction_id"), // External payment processor ID
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  items: json("items").$type<Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
  }>>(),
  metadata: json("metadata"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Health assessments table - AI-powered symptom checking results
export const healthAssessments = pgTable("health_assessments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").references(() => patients.id).notNull(),
  assessmentType: text("assessment_type").notNull(), // 'symptom_check', 'wellness_check', 'risk_assessment'
  symptoms: text("symptoms").array().notNull(),
  responses: json("responses").$type<Record<string, any>>().notNull(), // User responses to questionnaire
  aiAnalysis: json("ai_analysis").$type<{
    diagnosis: string[];
    recommendations: string[];
    urgencyLevel: string;
    referralNeeded: boolean;
    riskScore: number;
  }>().notNull(),
  followUpRequired: boolean("follow_up_required").default(false),
  followUpScheduled: boolean("follow_up_scheduled").default(false),
  consultationRecommended: boolean("consultation_recommended").default(false),
  status: text("status").default("completed"), // 'in_progress', 'completed', 'reviewed'
  reviewedBy: varchar("reviewed_by"), // Healthcare provider ID
  reviewNotes: text("review_notes"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Create insert schemas for all tables
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertPatientSchema = createInsertSchema(patients).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertMedicalRecordSchema = createInsertSchema(medicalRecords).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertConsultationSchema = createInsertSchema(consultations).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertPrescriptionSchema = createInsertSchema(prescriptions).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertPharmacyCategorySchema = createInsertSchema(pharmacyCategories).omit({ 
  id: true, 
  createdAt: true 
});

export const insertPharmacyProductSchema = createInsertSchema(pharmacyProducts).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertPaymentSchema = createInsertSchema(payments).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertHealthAssessmentSchema = createInsertSchema(healthAssessments).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Patient = typeof patients.$inferSelect;

export type InsertMedicalRecord = z.infer<typeof insertMedicalRecordSchema>;
export type MedicalRecord = typeof medicalRecords.$inferSelect;

export type InsertConsultation = z.infer<typeof insertConsultationSchema>;
export type Consultation = typeof consultations.$inferSelect;

export type InsertPrescription = z.infer<typeof insertPrescriptionSchema>;
export type Prescription = typeof prescriptions.$inferSelect;

export type InsertPharmacyCategory = z.infer<typeof insertPharmacyCategorySchema>;
export type PharmacyCategory = typeof pharmacyCategories.$inferSelect;

export type InsertPharmacyProduct = z.infer<typeof insertPharmacyProductSchema>;
export type PharmacyProduct = typeof pharmacyProducts.$inferSelect;

export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

export type InsertHealthAssessment = z.infer<typeof insertHealthAssessmentSchema>;
export type HealthAssessment = typeof healthAssessments.$inferSelect;
