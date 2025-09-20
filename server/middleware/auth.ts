import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
  };
  patient?: {
    id: string;
    userId: string;
  };
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    // For demo purposes, we'll use a simple header-based auth
    // In production, this would be JWT/session-based authentication
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please provide valid authentication token'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // For demo mode, accept a special demo token
    if (token === 'demo-token') {
      req.user = {
        id: 'demo-user-id',
        username: 'demo-user'
      };
      return next();
    }

    // In production, verify JWT token here
    // For now, we'll simulate token validation
    if (token.length < 10) {
      return res.status(401).json({ 
        error: 'Invalid authentication token',
        message: 'Token must be at least 10 characters'
      });
    }

    // Simulate user lookup (in production, decode JWT and get user)
    req.user = {
      id: `user-${token.substring(0, 8)}`,
      username: `user-${token.substring(0, 8)}`
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication service error' });
  }
}

export async function validatePatientAccess(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get patientId from URL params or request body
    const patientId = req.params.patientId || req.body.patientId;
    
    if (!patientId) {
      return res.status(400).json({ 
        error: 'Patient ID required',
        message: 'Patient ID must be provided in request'
      });
    }

    // For demo mode, allow access to demo patient
    if (req.user.id === 'demo-user-id' && patientId === 'demo-patient-id') {
      req.patient = {
        id: 'demo-patient-id',
        userId: 'demo-user-id'
      };
      return next();
    }

    // Verify the patient belongs to the authenticated user
    const patient = await storage.getPatient(patientId);
    if (!patient) {
      return res.status(404).json({ 
        error: 'Patient not found',
        message: 'The specified patient does not exist'
      });
    }

    // Check if the patient belongs to the authenticated user
    if (patient.userId !== req.user.id) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You do not have permission to access this patient\'s data'
      });
    }

    req.patient = {
      id: patient.id,
      userId: patient.userId || req.user.id
    };
    next();
  } catch (error) {
    console.error('Patient access validation error:', error);
    res.status(500).json({ error: 'Access validation service error' });
  }
}

export { AuthenticatedRequest };