import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { formatKES } from '@shared/currency';

export interface ReceiptData {
  receiptNumber: string;
  paymentDate: Date;
  tenantName: string;
  unitNumber: string;
  amount: number;
  paymentMethod: string;
  transactionReference?: string;
  notes?: string;
}

export interface StatementData {
  tenantName: string;
  unitNumber: string;
  startDate: Date;
  endDate: Date;
  invoices: Array<{
    invoiceNumber: string;
    invoiceDate: Date;
    dueDate: Date;
    amount: number;
    paidAmount: number;
    status: string;
  }>;
  payments: Array<{
    paymentDate: Date;
    amount: number;
    reference?: string;
  }>;
  totalInvoiced: number;
  totalPaid: number;
  balance: number;
}

/**
 * Generate a professional rent receipt PDF
 */
export async function generateReceiptPDF(data: ReceiptData): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // Header with logo placeholder
  doc.setFillColor(30, 58, 138); // Deep Blue
  doc.rect(0, 0, pageWidth, 40, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text('MWALIMU HOMES', 20, 20);
  doc.setFontSize(10);
  doc.text('Rent Receipt', 20, 30);

  // Reset text color
  doc.setTextColor(0, 0, 0);
  yPosition = 50;

  // Receipt details
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Receipt Details', 20, yPosition);
  yPosition += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const details = [
    [`Receipt #: ${data.receiptNumber}`, `Date: ${data.paymentDate.toLocaleDateString()}`],
    [`Tenant: ${data.tenantName}`, `Unit: ${data.unitNumber}`],
    [`Payment Method: ${data.paymentMethod}`, data.transactionReference ? `Reference: ${data.transactionReference}` : ''],
  ];

  details.forEach((row) => {
    doc.text(row[0], 20, yPosition);
    if (row[1]) {
      doc.text(row[1], pageWidth - 60, yPosition);
    }
    yPosition += 8;
  });

  yPosition += 5;

  // Amount section
  doc.setFillColor(245, 245, 245);
  doc.rect(20, yPosition, pageWidth - 40, 25, 'F');

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Amount Paid', 20, yPosition + 8);
  doc.setFontSize(16);
  doc.setTextColor(30, 58, 138); // Deep Blue
  doc.text(formatKES(data.amount), pageWidth - 30, yPosition + 15, { align: 'right' });

  doc.setTextColor(0, 0, 0);
  yPosition += 35;

  // Notes if provided
  if (data.notes) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes:', 20, yPosition);
    yPosition += 6;
    doc.setFont('helvetica', 'normal');
    const splitNotes = doc.splitTextToSize(data.notes, pageWidth - 40);
    doc.text(splitNotes, 20, yPosition);
    yPosition += splitNotes.length * 5 + 5;
  }

  // Footer
  yPosition = pageHeight - 30;
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('This receipt confirms payment received. Please keep for your records.', 20, yPosition);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 20, yPosition + 6);

  // Download
  const filename = `receipt-${data.receiptNumber}.pdf`;
  doc.save(filename);
}

/**
 * Generate a comprehensive account statement PDF
 */
export async function generateStatementPDF(data: StatementData): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 20;

  // Header
  doc.setFillColor(30, 58, 138); // Deep Blue
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text('MWALIMU HOMES', 20, 20);
  doc.setFontSize(10);
  doc.text('Account Statement', 20, 30);

  doc.setTextColor(0, 0, 0);
  yPosition = 50;

  // Tenant info
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Account Information', 20, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Tenant: ${data.tenantName}`, 20, yPosition);
  yPosition += 6;
  doc.text(`Unit: ${data.unitNumber}`, 20, yPosition);
  yPosition += 6;
  doc.text(`Period: ${data.startDate.toLocaleDateString()} - ${data.endDate.toLocaleDateString()}`, 20, yPosition);
  yPosition += 12;

  // Invoices section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Invoices', 20, yPosition);
  yPosition += 8;

  // Invoice table header
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(71, 85, 105); // Slate Gray
  doc.setTextColor(255, 255, 255);
  doc.rect(20, yPosition - 5, pageWidth - 40, 6, 'F');
  doc.text('Invoice #', 22, yPosition);
  doc.text('Date', 55, yPosition);
  doc.text('Amount', 85, yPosition);
  doc.text('Paid', 110, yPosition);
  doc.text('Status', 140, yPosition);

  yPosition += 8;
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  // Invoice rows
  data.invoices.forEach((invoice) => {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(9);
    doc.text(invoice.invoiceNumber, 22, yPosition);
    doc.text(invoice.invoiceDate.toLocaleDateString(), 55, yPosition);
    doc.text(formatKES(invoice.amount), 85, yPosition, { align: 'right' });
    doc.text(formatKES(invoice.paidAmount), 110, yPosition, { align: 'right' });
    doc.text(invoice.status, 140, yPosition);
    yPosition += 6;
  });

  yPosition += 5;

  // Payments section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Payments Received', 20, yPosition);
  yPosition += 8;

  // Payments table header
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(71, 85, 105);
  doc.setTextColor(255, 255, 255);
  doc.rect(20, yPosition - 5, pageWidth - 40, 6, 'F');
  doc.text('Date', 22, yPosition);
  doc.text('Amount', 85, yPosition, { align: 'right' });
  doc.text('Reference', 140, yPosition);

  yPosition += 8;
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  // Payment rows
  data.payments.forEach((payment) => {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(9);
    doc.text(payment.paymentDate.toLocaleDateString(), 22, yPosition);
    doc.text(formatKES(payment.amount), 85, yPosition, { align: 'right' });
    doc.text(payment.reference || '-', 140, yPosition);
    yPosition += 6;
  });

  yPosition += 10;

  // Summary section
  doc.setFillColor(245, 245, 245);
  doc.rect(20, yPosition, pageWidth - 40, 30, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Summary', 22, yPosition + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Total Invoiced: ${formatKES(data.totalInvoiced)}`, 22, yPosition + 14);
  doc.text(`Total Paid: ${formatKES(data.totalPaid)}`, 22, yPosition + 20);

  doc.setFont('helvetica', 'bold');
  const balanceColor = data.balance > 0 ? [220, 38, 38] : [34, 197, 94]; // Red or Green
  doc.setTextColor(balanceColor[0], balanceColor[1], balanceColor[2]);
  doc.text(`Balance Due: ${formatKES(Math.abs(data.balance))}`, 22, yPosition + 26);

  // Footer
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 20, doc.internal.pageSize.getHeight() - 10);

  // Download
  const filename = `statement-${data.tenantName.replace(/\s+/g, '-')}.pdf`;
  doc.save(filename);
}

/**
 * Generate PDF from HTML element
 */
export async function generatePDFFromHTML(
  element: HTMLElement,
  filename: string,
  options?: { scale?: number; quality?: number }
): Promise<void> {
  try {
    const canvas = await html2canvas(element, {
      scale: options?.scale || 2,
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'l' : 'p',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pdfWidth - 10;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 5;

    pdf.addImage(imgData, 'PNG', 5, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 5, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    const name = filename || 'document.pdf';
    pdf.save(name);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF');
  }
}
