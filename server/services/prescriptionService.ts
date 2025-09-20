class PrescriptionService {
  
  async generatePrescription(data: {
    patient: { name: string; email?: string; phone?: string };
    items: any[];
    context: string;
  }): Promise<string> {
    const now = new Date().toISOString().slice(0, 16).replace("T", " ");
    const items = data.items.length 
      ? `<ul>${data.items.map(item => `<li>${item.id || item.name} × ${item.qty || item.quantity || 1}</li>`).join("")}</ul>`
      : `<em>No products specified (demo)</em>`;

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>e-Prescription Demo - ${data.patient.name}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; margin: 24px; line-height: 1.6; }
    .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .patient-info { background: #f1f5f9; padding: 15px; border-radius: 6px; margin-bottom: 20px; }
    .prescription { background: white; border: 2px solid #e2e8f0; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .footer { background: #fee2e2; padding: 15px; border-radius: 6px; text-align: center; color: #991b1b; }
    .rx-number { font-family: monospace; background: #f8fafc; padding: 5px 10px; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🏥 Electronic Prescription</h1>
    <p class="rx-number">Rx #: DEMO-${Date.now()}</p>
    <p>Generated: ${now}</p>
  </div>
  
  <div class="patient-info">
    <h3>Patient Information</h3>
    <p><strong>Name:</strong> ${data.patient.name}</p>
    <p><strong>Email:</strong> ${data.patient.email || "Not provided"}</p>
    <p><strong>Phone:</strong> ${data.patient.phone || "Not provided"}</p>
  </div>
  
  <div class="prescription">
    <h3>Prescribed Items</h3>
    ${items}
    <p><strong>Prescribing Context:</strong> ${data.context}</p>
    <p><strong>Instructions:</strong> Follow dosage instructions as discussed during consultation.</p>
    <p><strong>Refills:</strong> 0 refills authorized</p>
  </div>
  
  <div class="footer">
    <p><strong>⚠️ DEMONSTRATION ONLY ⚠️</strong></p>
    <p>This is a DEMO document and is NOT valid for dispensing medications.</p>
    <p>For educational and demonstration purposes only.</p>
  </div>
</body>
</html>`;
  }

  async generateSickNote(data: {
    patient: { name: string; email?: string; phone?: string };
    reason: string;
    startDate: string;
    duration: number;
    country: string;
    employerEmail?: string;
  }): Promise<string> {
    const now = new Date().toISOString().slice(0, 10);
    
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Medical Certificate - ${data.patient.name}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; margin: 24px; line-height: 1.6; }
    .header { background: #16a34a; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .certificate { background: white; border: 2px solid #d4d4d8; padding: 25px; border-radius: 8px; margin-bottom: 20px; }
    .patient-info { background: #f8fafc; padding: 15px; border-radius: 6px; margin-bottom: 15px; }
    .medical-details { background: #fef3c7; padding: 15px; border-radius: 6px; margin-bottom: 15px; }
    .footer { background: #fef2f2; padding: 15px; border-radius: 6px; text-align: center; color: #991b1b; }
    .cert-number { font-family: monospace; background: #f0f9ff; padding: 5px 10px; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🏥 Medical Certificate / Sick Note</h1>
    <p class="cert-number">Certificate #: DEMO-SICK-${Date.now()}</p>
    <p>Country: ${data.country} | Issued: ${now}</p>
  </div>
  
  <div class="certificate">
    <div class="patient-info">
      <h3>Patient Information</h3>
      <p><strong>Name:</strong> ${data.patient.name}</p>
      <p><strong>Email:</strong> ${data.patient.email || "Not provided"}</p>
      <p><strong>Phone:</strong> ${data.patient.phone || "Not provided"}</p>
    </div>
    
    <div class="medical-details">
      <h3>Medical Certificate Details</h3>
      <p><strong>Start Date:</strong> ${data.startDate || now}</p>
      <p><strong>Duration:</strong> ${data.duration} days</p>
      <p><strong>Reason/Symptoms:</strong> ${data.reason}</p>
      <p><strong>Return to Work Date:</strong> ${new Date(new Date(data.startDate || now).getTime() + data.duration * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)}</p>
    </div>
    
    ${data.employerEmail ? `
    <div style="background: #f0f9ff; padding: 15px; border-radius: 6px;">
      <h3>Employer Information</h3>
      <p><strong>Employer Contact:</strong> ${data.employerEmail}</p>
      <p><em>This certificate should be forwarded to the employer as per local regulations.</em></p>
    </div>
    ` : ''}
    
    <div style="margin-top: 20px; text-align: center;">
      <p><strong>Attending Physician:</strong> Dr. Virtual Demo (Demo Only)</p>
      <p><strong>Medical License:</strong> DEMO-LICENSE-123456</p>
      <p><em>Digital signature would appear here in production</em></p>
    </div>
  </div>
  
  <div class="footer">
    <p><strong>⚠️ DEMONSTRATION ONLY ⚠️</strong></p>
    <p>This is a DEMO document and is NOT a valid medical certificate.</p>
    <p>For educational and demonstration purposes only.</p>
  </div>
</body>
</html>`;
  }
}

export const prescriptionService = new PrescriptionService();
