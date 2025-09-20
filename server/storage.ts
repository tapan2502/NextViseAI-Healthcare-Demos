import { 
  type User, type InsertUser,
  type Patient, type InsertPatient,
  type MedicalRecord, type InsertMedicalRecord,
  type Consultation, type InsertConsultation,
  type Prescription, type InsertPrescription,
  type PharmacyCategory, type InsertPharmacyCategory,
  type PharmacyProduct, type InsertPharmacyProduct,
  type Appointment, type InsertAppointment,
  type Payment, type InsertPayment,
  type HealthAssessment, type InsertHealthAssessment,
  users, patients, medicalRecords, consultations, prescriptions,
  pharmacyCategories, pharmacyProducts, appointments, payments, healthAssessments
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Patient operations
  getPatient(id: string): Promise<Patient | undefined>;
  getPatientByEmail(email: string): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: string, patient: Partial<InsertPatient>): Promise<Patient | undefined>;
  getPatientsByUserId(userId: string): Promise<Patient[]>;

  // Medical records operations
  getMedicalRecord(id: string): Promise<MedicalRecord | undefined>;
  getMedicalRecordsByPatient(patientId: string): Promise<MedicalRecord[]>;
  createMedicalRecord(record: InsertMedicalRecord): Promise<MedicalRecord>;
  updateMedicalRecord(id: string, record: Partial<InsertMedicalRecord>): Promise<MedicalRecord | undefined>;

  // Consultation operations
  getConsultation(id: string): Promise<Consultation | undefined>;
  getConsultationsByPatient(patientId: string): Promise<Consultation[]>;
  createConsultation(consultation: InsertConsultation): Promise<Consultation>;
  updateConsultation(id: string, consultation: Partial<InsertConsultation>): Promise<Consultation | undefined>;

  // Prescription operations
  getPrescription(id: string): Promise<Prescription | undefined>;
  getPrescriptionsByPatient(patientId: string): Promise<Prescription[]>;
  createPrescription(prescription: InsertPrescription): Promise<Prescription>;
  updatePrescription(id: string, prescription: Partial<InsertPrescription>): Promise<Prescription | undefined>;

  // Pharmacy category operations
  getPharmacyCategories(): Promise<PharmacyCategory[]>;
  getPharmacyCategory(id: string): Promise<PharmacyCategory | undefined>;
  createPharmacyCategory(category: InsertPharmacyCategory): Promise<PharmacyCategory>;

  // Pharmacy product operations
  getPharmacyProducts(): Promise<PharmacyProduct[]>;
  getPharmacyProductsByCategory(categoryId: string): Promise<PharmacyProduct[]>;
  getPharmacyProduct(id: string): Promise<PharmacyProduct | undefined>;
  createPharmacyProduct(product: InsertPharmacyProduct): Promise<PharmacyProduct>;
  updatePharmacyProduct(id: string, product: Partial<InsertPharmacyProduct>): Promise<PharmacyProduct | undefined>;
  searchPharmacyProducts(query: string): Promise<PharmacyProduct[]>;

  // Appointment operations
  getAppointment(id: string): Promise<Appointment | undefined>;
  getAppointmentsByPatient(patientId: string): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: string, appointment: Partial<InsertAppointment>): Promise<Appointment | undefined>;

  // Payment operations
  getPayment(id: string): Promise<Payment | undefined>;
  getPaymentsByPatient(patientId: string): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: string, payment: Partial<InsertPayment>): Promise<Payment | undefined>;

  // Health assessment operations
  getHealthAssessment(id: string): Promise<HealthAssessment | undefined>;
  getHealthAssessmentsByPatient(patientId: string): Promise<HealthAssessment[]>;
  createHealthAssessment(assessment: InsertHealthAssessment): Promise<HealthAssessment>;
  updateHealthAssessment(id: string, assessment: Partial<InsertHealthAssessment>): Promise<HealthAssessment | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  // Patient operations
  async getPatient(id: string): Promise<Patient | undefined> {
    const result = await db.select().from(patients).where(eq(patients.id, id)).limit(1);
    return result[0];
  }

  async getPatientByEmail(email: string): Promise<Patient | undefined> {
    const result = await db.select().from(patients).where(eq(patients.email, email)).limit(1);
    return result[0];
  }

  async createPatient(patient: InsertPatient): Promise<Patient> {
    const result = await db.insert(patients).values(patient).returning();
    return result[0];
  }

  async updatePatient(id: string, patient: Partial<InsertPatient>): Promise<Patient | undefined> {
    const result = await db.update(patients).set(patient).where(eq(patients.id, id)).returning();
    return result[0];
  }

  async getPatientsByUserId(userId: string): Promise<Patient[]> {
    return await db.select().from(patients).where(eq(patients.userId, userId));
  }

  // Medical records operations
  async getMedicalRecord(id: string): Promise<MedicalRecord | undefined> {
    const result = await db.select().from(medicalRecords).where(eq(medicalRecords.id, id)).limit(1);
    return result[0];
  }

  async getMedicalRecordsByPatient(patientId: string): Promise<MedicalRecord[]> {
    return await db.select().from(medicalRecords)
      .where(eq(medicalRecords.patientId, patientId))
      .orderBy(desc(medicalRecords.createdAt));
  }

  async createMedicalRecord(record: InsertMedicalRecord): Promise<MedicalRecord> {
    const result = await db.insert(medicalRecords).values(record).returning();
    return result[0];
  }

  async updateMedicalRecord(id: string, record: Partial<InsertMedicalRecord>): Promise<MedicalRecord | undefined> {
    const result = await db.update(medicalRecords).set(record).where(eq(medicalRecords.id, id)).returning();
    return result[0];
  }

  // Consultation operations
  async getConsultation(id: string): Promise<Consultation | undefined> {
    const result = await db.select().from(consultations).where(eq(consultations.id, id)).limit(1);
    return result[0];
  }

  async getConsultationsByPatient(patientId: string): Promise<Consultation[]> {
    return await db.select().from(consultations)
      .where(eq(consultations.patientId, patientId))
      .orderBy(desc(consultations.createdAt));
  }

  async createConsultation(consultation: InsertConsultation): Promise<Consultation> {
    const result = await db.insert(consultations).values(consultation).returning();
    return result[0];
  }

  async updateConsultation(id: string, consultation: Partial<InsertConsultation>): Promise<Consultation | undefined> {
    const result = await db.update(consultations).set(consultation).where(eq(consultations.id, id)).returning();
    return result[0];
  }

  // Prescription operations
  async getPrescription(id: string): Promise<Prescription | undefined> {
    const result = await db.select().from(prescriptions).where(eq(prescriptions.id, id)).limit(1);
    return result[0];
  }

  async getPrescriptionsByPatient(patientId: string): Promise<Prescription[]> {
    return await db.select().from(prescriptions)
      .where(eq(prescriptions.patientId, patientId))
      .orderBy(desc(prescriptions.createdAt));
  }

  async createPrescription(prescription: InsertPrescription): Promise<Prescription> {
    const result = await db.insert(prescriptions).values(prescription as any).returning();
    return result[0];
  }

  async updatePrescription(id: string, prescription: Partial<InsertPrescription>): Promise<Prescription | undefined> {
    const result = await db.update(prescriptions).set(prescription as any).where(eq(prescriptions.id, id)).returning();
    return result[0];
  }

  // Pharmacy category operations
  async getPharmacyCategories(): Promise<PharmacyCategory[]> {
    return await db.select().from(pharmacyCategories)
      .where(eq(pharmacyCategories.isActive, true))
      .orderBy(asc(pharmacyCategories.sortOrder));
  }

  async getPharmacyCategory(id: string): Promise<PharmacyCategory | undefined> {
    const result = await db.select().from(pharmacyCategories).where(eq(pharmacyCategories.id, id)).limit(1);
    return result[0];
  }

  async createPharmacyCategory(category: InsertPharmacyCategory): Promise<PharmacyCategory> {
    const result = await db.insert(pharmacyCategories).values(category).returning();
    return result[0];
  }

  // Pharmacy product operations
  async getPharmacyProducts(): Promise<PharmacyProduct[]> {
    return await db.select().from(pharmacyProducts)
      .where(eq(pharmacyProducts.isActive, true))
      .orderBy(asc(pharmacyProducts.name));
  }

  async getPharmacyProductsByCategory(categoryId: string): Promise<PharmacyProduct[]> {
    return await db.select().from(pharmacyProducts)
      .where(and(eq(pharmacyProducts.categoryId, categoryId), eq(pharmacyProducts.isActive, true)))
      .orderBy(asc(pharmacyProducts.name));
  }

  async getPharmacyProduct(id: string): Promise<PharmacyProduct | undefined> {
    const result = await db.select().from(pharmacyProducts).where(eq(pharmacyProducts.id, id)).limit(1);
    return result[0];
  }

  async createPharmacyProduct(product: InsertPharmacyProduct): Promise<PharmacyProduct> {
    const result = await db.insert(pharmacyProducts).values(product).returning();
    return result[0];
  }

  async updatePharmacyProduct(id: string, product: Partial<InsertPharmacyProduct>): Promise<PharmacyProduct | undefined> {
    const result = await db.update(pharmacyProducts).set(product).where(eq(pharmacyProducts.id, id)).returning();
    return result[0];
  }

  async searchPharmacyProducts(query: string): Promise<PharmacyProduct[]> {
    const searchTerm = `%${query.toLowerCase()}%`;
    return await db.select().from(pharmacyProducts)
      .where(and(
        eq(pharmacyProducts.isActive, true),
        // Note: This is a simplified search - in production you'd use full-text search
      ));
  }

  // Appointment operations
  async getAppointment(id: string): Promise<Appointment | undefined> {
    const result = await db.select().from(appointments).where(eq(appointments.id, id)).limit(1);
    return result[0];
  }

  async getAppointmentsByPatient(patientId: string): Promise<Appointment[]> {
    return await db.select().from(appointments)
      .where(eq(appointments.patientId, patientId))
      .orderBy(desc(appointments.scheduledAt));
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const result = await db.insert(appointments).values(appointment).returning();
    return result[0];
  }

  async updateAppointment(id: string, appointment: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    const result = await db.update(appointments).set(appointment).where(eq(appointments.id, id)).returning();
    return result[0];
  }

  // Payment operations
  async getPayment(id: string): Promise<Payment | undefined> {
    const result = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
    return result[0];
  }

  async getPaymentsByPatient(patientId: string): Promise<Payment[]> {
    return await db.select().from(payments)
      .where(eq(payments.patientId, patientId))
      .orderBy(desc(payments.createdAt));
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const result = await db.insert(payments).values(payment as any).returning();
    return result[0];
  }

  async updatePayment(id: string, payment: Partial<InsertPayment>): Promise<Payment | undefined> {
    const result = await db.update(payments).set(payment as any).where(eq(payments.id, id)).returning();
    return result[0];
  }

  // Health assessment operations
  async getHealthAssessment(id: string): Promise<HealthAssessment | undefined> {
    const result = await db.select().from(healthAssessments).where(eq(healthAssessments.id, id)).limit(1);
    return result[0];
  }

  async getHealthAssessmentsByPatient(patientId: string): Promise<HealthAssessment[]> {
    return await db.select().from(healthAssessments)
      .where(eq(healthAssessments.patientId, patientId))
      .orderBy(desc(healthAssessments.createdAt));
  }

  async createHealthAssessment(assessment: InsertHealthAssessment): Promise<HealthAssessment> {
    const result = await db.insert(healthAssessments).values(assessment as any).returning();
    return result[0];
  }

  async updateHealthAssessment(id: string, assessment: Partial<InsertHealthAssessment>): Promise<HealthAssessment | undefined> {
    const result = await db.update(healthAssessments).set(assessment as any).where(eq(healthAssessments.id, id)).returning();
    return result[0];
  }
}

export const storage = new DatabaseStorage();
