import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { jsPDF } from "jspdf";

interface SickNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactData: {
    name: string;
    phone: string;
    email: string;
    consent: boolean;
  };
  t: any;
}

export default function SickNoteModal({ isOpen, onClose, contactData, t }: SickNoteModalProps) {
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    reason: "",
    startDate: new Date().toISOString().split("T")[0],
    duration: 3,
    country: "DE",
    employerEmail: ""
  });

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const buildSummary = () => ({
    generatedAt: new Date().toLocaleString(),
    patient: {
      Name: contactData?.name ?? "-",
      Phone: contactData?.phone ?? "-",
      Email: contactData?.email ?? "-"
    },
    details: {
      Reason: formData.reason || "-",
      "Start Date": formData.startDate,
      "Duration (days)": String(formData.duration),
      Country: formData.country,
      "Employer Email": formData.employerEmail || "-"
    },
    consent: {
      Provided: contactData?.consent ? "Yes" : "No"
    }
  });

  // ---------- PDF helpers (layout/formatting) ----------
  const drawSectionHeader = (
    doc: jsPDF,
    title: string,
    x: number,
    y: number,
    width: number
  ) => {
    // light grey label pill + divider line
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(x, y - 14, doc.getTextWidth(title) + 16, 24, 6, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(33, 37, 41);
    doc.setFontSize(11.5);
    doc.text(title, x + 8, y + 3);

    doc.setDrawColor(230, 232, 236);
    doc.setLineWidth(0.7);
    doc.line(x, y + 10, x + width, y + 10);

    return y + 24; // new y position
  };

  const addKeyValueGrid = (
    doc: jsPDF,
    entries: Record<string, string>,
    x: number,
    y: number,
    width: number,
    lineGap = 18
  ) => {
    const colGap = 24;
    const colWidth = (width - colGap) / 2;
    const keys = Object.keys(entries);
    const values = Object.values(entries);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(73, 80, 87);
    doc.setFontSize(10.5);

    // Left column keys
    const leftKeys = keys.filter((_, i) => i % 2 === 0);
    const rightKeys = keys.filter((_, i) => i % 2 === 1);

    const leftVals = values.filter((_, i) => i % 2 === 0);
    const rightVals = values.filter((_, i) => i % 2 === 1);

    let yCursor = y;

    const drawRow = (kx: number, k: string, v: string, yRow: number) => {
      const keyY = yRow;
      const valY = yRow + 12;

      doc.setFont("helvetica", "bold");
      doc.text(k, kx, keyY);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(52, 58, 64);
      const wrapped = doc.splitTextToSize(v, colWidth);
      wrapped.forEach((wLine: string, i: number) => {
        doc.text(wLine, kx, valY + i * 14);
      });

      // return consumed height
      return 12 + wrapped.length * 14 + 6;
    };

    const rows = Math.max(leftKeys.length, rightKeys.length);
    for (let i = 0; i < rows; i++) {
      // page break if needed
      const pageHeight = doc.internal.pageSize.getHeight();
      if (yCursor > pageHeight - 72) {
        doc.addPage();
        yCursor = 72;
      }

      const leftH = leftKeys[i]
        ? drawRow(x, leftKeys[i], leftVals[i] ?? "", yCursor)
        : 0;
      const rightH = rightKeys[i]
        ? drawRow(x + colWidth + colGap, rightKeys[i], rightVals[i] ?? "", yCursor)
        : 0;

      const rowHeight = Math.max(leftH, rightH, lineGap);
      yCursor += rowHeight;
    }

    return yCursor;
  };

  const addParagraph = (doc: jsPDF, text: string, x: number, y: number, width: number) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(52, 58, 64);
    doc.setFontSize(11);
    const wrapped = doc.splitTextToSize(text, width);
    wrapped.forEach((wLine: string, i: number) => {
      doc.text(wLine, x, y + i * 14);
    });
    return y + wrapped.length * 14 + 2;
  };

  const addFooter = (doc: jsPDF, leftMargin: number, rightMargin: number) => {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const w = doc.internal.pageSize.getWidth();
      const h = doc.internal.pageSize.getHeight();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(134, 142, 150);
      doc.text(
        `Page ${i} of ${pageCount}`,
        w - rightMargin,
        h - 28,
        { align: "right" }
      );
    }
  };

  // ---------- Build & download PDF, then close modal ----------
  const handleDownloadSummaryPdf = () => {
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });

      // Geometry
      const left = 56;
      const right = 56;
      const top = 56;
      const contentWidth = doc.internal.pageSize.getWidth() - left - right;

      // Header band
      doc.setFillColor(25, 135, 84); // green
      doc.roundedRect(left, top - 8, contentWidth, 56, 10, 10, "F");

      // Title + subtitle in header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(255, 255, 255);
      doc.text("Sick Note Summary", left + 16, top + 24);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text(`Generated: ${new Date().toLocaleString()}`, left + 16, top + 44);

      // Body start
      let y = top + 80;

      // Intro note (optional)
      y = addParagraph(
        doc,
        "This document summarizes the information provided for the sick note.",
        left,
        y,
        contentWidth
      );
      y += 6;

      // Sections
      y = drawSectionHeader(doc, "Patient", left, y, contentWidth);
      y = addKeyValueGrid(doc, buildSummary().patient, left, y + 6, contentWidth);

      y = drawSectionHeader(doc, "Details", left, y + 8, contentWidth);
      y = addKeyValueGrid(doc, buildSummary().details, left, y + 6, contentWidth);

      y = drawSectionHeader(doc, "Consent", left, y + 8, contentWidth);
      y = addKeyValueGrid(doc, buildSummary().consent, left, y + 6, contentWidth);

      // Signature box
      const boxH = 80;
      const pageH = doc.internal.pageSize.getHeight();
      if (y + boxH + 80 > pageH) {
        doc.addPage();
        y = top;
      }
      doc.setDrawColor(230, 232, 236);
      doc.roundedRect(left, y + 10, contentWidth, boxH, 8, 8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(73, 80, 87);
      doc.text("Signature", left + 12, y + 30);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(134, 142, 150);
      doc.text("Sign above the line", left + 12, y + boxH - 12);
      // signature line
      doc.setDrawColor(200, 200, 200);
      doc.line(left + 100, y + boxH - 16, left + contentWidth - 12, y + boxH - 16);

      // Footer page numbers
      addFooter(doc, left, right);

      const safeName = (contactData?.name || "patient").replace(/[^\w\-]+/g, "_");
      const fileName = `sick-note-summary_${formData.startDate}_${safeName}.pdf`;
      doc.save(fileName);

      // ✅ Close popup after download
      onClose();
    } catch {
      toast({
        title: "PDF Error",
        description: "Could not generate the summary PDF.",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-md" data-testid="sick-note-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <i className="fas fa-file-medical-alt text-secondary" />
            {t.snTitle}
          </DialogTitle>
        </DialogHeader>

        <form className="space-y-4">
          {/* Reason */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">{t.reason}</Label>
            <Textarea
              className="resize-none"
              rows={3}
              placeholder="Brief description of symptoms..."
              value={formData.reason}
              onChange={(e) => handleInputChange("reason", e.target.value)}
              data-testid="textarea-reason"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">{t.startDate}</Label>
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) => handleInputChange("startDate", e.target.value)}
                data-testid="input-start-date"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">{t.duration}</Label>
              <Input
                type="number"
                min={1}
                max={30}
                value={formData.duration}
                onChange={(e) => handleInputChange("duration", parseInt(e.target.value) || 1)}
                data-testid="input-duration"
              />
            </div>
          </div>

          {/* Country */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">{t.country}</Label>
            <select
              value={formData.country}
              onChange={(e) => handleInputChange("country", e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:border-ring focus:ring-2 focus:ring-ring/20 transition-colors"
              data-testid="select-country"
            >
              <option value="DE">Germany</option>
              <option value="US">United States</option>
              <option value="UK">United Kingdom</option>
              <option value="CA">Canada</option>
            </select>
          </div>

          {/* Employer Email */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">{t.employerEmail}</Label>
            <Input
              type="email"
              placeholder="hr@company.com"
              value={formData.employerEmail}
              onChange={(e) => handleInputChange("employerEmail", e.target.value)}
              data-testid="input-employer-email"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            {/* Green Downlod button */}
            <Button
              type="button"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              onClick={handleDownloadSummaryPdf}
              data-testid="button-download-summary"
            >
              {t.downloadSummary ?? "Downlod"}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              data-testid="button-cancel"
            >
              {t.cancel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
