import bcrypt from 'bcrypt';
import crypto from 'crypto';

class SecurityService {
  private readonly saltRounds = 12;
  private readonly algorithm = 'aes-256-gcm';
  private readonly encryptionKey: string;

  constructor() {
    // Get encryption key from environment or generate a default for demo
    this.encryptionKey = process.env.ENCRYPTION_KEY || this.generateDefaultKey();
    
    if (!process.env.ENCRYPTION_KEY) {
      console.warn("⚠️  Using default encryption key for demo. Set ENCRYPTION_KEY in production!");
    }
  }

  private generateDefaultKey(): string {
    // Generate a demo key - in production this should come from secure key management
    return crypto.scryptSync('nextviseai-demo-key', 'salt', 32).toString('hex');
  }

  private getKeyBuffer(): Buffer {
    return Buffer.from(this.encryptionKey, 'hex');
  }

  // Password hashing methods
  async hashPassword(password: string): Promise<string> {
    try {
      const hash = await bcrypt.hash(password, this.saltRounds);
      return hash;
    } catch (error) {
      console.error('Error hashing password:', error);
      throw new Error('Failed to hash password');
    }
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      const isValid = await bcrypt.compare(password, hash);
      return isValid;
    } catch (error) {
      console.error('Error verifying password:', error);
      throw new Error('Failed to verify password');
    }
  }

  // Medical record encryption methods
  encryptMedicalData(data: string): string {
    try {
      if (!data || data.trim() === '') {
        return data; // Don't encrypt empty data
      }

      const iv = crypto.randomBytes(12); // 12 bytes for AES-GCM
      const cipher = crypto.createCipheriv(this.algorithm, this.getKeyBuffer(), iv);
      cipher.setAAD(Buffer.from('medical-record', 'utf8'));
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      // Combine IV, auth tag, and encrypted data
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      console.error('Error encrypting medical data:', error);
      throw new Error('Failed to encrypt medical data');
    }
  }

  decryptMedicalData(encryptedData: string): string {
    try {
      if (!encryptedData || encryptedData.trim() === '') {
        return encryptedData; // Return empty data as-is
      }

      // Check if data is already decrypted (for backward compatibility)
      if (!encryptedData.includes(':')) {
        return encryptedData; // Return unencrypted data as-is
      }

      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const [ivHex, authTagHex, encrypted] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      
      const decipher = crypto.createDecipheriv(this.algorithm, this.getKeyBuffer(), iv);
      decipher.setAAD(Buffer.from('medical-record', 'utf8'));
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Error decrypting medical data:', error);
      // Return the original data if decryption fails (for backward compatibility)
      return encryptedData;
    }
  }

  // Utility method to encrypt sensitive patient information
  encryptSensitiveField(data: string | null | undefined): string | null {
    if (!data) return null;
    return this.encryptMedicalData(data);
  }

  // Utility method to decrypt sensitive patient information
  decryptSensitiveField(encryptedData: string | null | undefined): string | null {
    if (!encryptedData) return null;
    return this.decryptMedicalData(encryptedData);
  }

  // Generate secure random tokens (for session tokens, etc.)
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  // Hash sensitive data for searching (one-way)
  hashForSearch(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

export const securityService = new SecurityService();