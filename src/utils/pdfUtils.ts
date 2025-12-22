import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

export const generateInvoicePDF = async (invoiceData: {
  invoice: any;
  customer: any;
  order: any;
  currency: any;
  package: any;
  addOns: any[];
  business?: any;
}): Promise<Uint8Array> => {
  const { invoice, customer, order, currency, package: pkg, addOns, business } = invoiceData;

  const pdfDoc = await PDFDocument.create();

  // ✅ Register fontkit for custom fonts
  pdfDoc.registerFontkit(fontkit);

  const page = pdfDoc.addPage([595, 842]); // A4 size
  const { width, height } = page.getSize();
  let yPosition = height - 50;

  // ---------------- EMBED YOUR CUSTOM FONT ----------------
  const fontPath = path.join(__dirname, '../utils/fonts/NotoSans-VariableFont.ttf');
  const fontBytes = fs.readFileSync(fontPath);

  const regularFont = await pdfDoc.embedFont(fontBytes);
  const boldFont = regularFont; // Using same font for bold; NotoSans Variable supports weight variations if needed

  const currencySymbol = currency?.symbol || '₨';

  // ---------- HEADER ----------
  page.drawText('INVOICE', { x: 50, y: yPosition, size: 28, font: boldFont, color: rgb(0.2, 0.2, 0.2) });

  yPosition -= 40;
  page.drawText(`Invoice #: ${invoice.invoiceNumber}`, { x: 50, y: yPosition, size: 10, font: regularFont });
  yPosition -= 15;
  page.drawText(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, { x: 50, y: yPosition, size: 10, font: regularFont });
  yPosition -= 15;
  page.drawText(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, { x: 50, y: yPosition, size: 10, font: regularFont });
  yPosition -= 15;
  page.drawText(`Status: ${invoice.paymentStatus.toUpperCase()}`, {
    x: 50,
    y: yPosition,
    size: 10,
    font: boldFont,
    color: invoice.paymentStatus === 'paid' ? rgb(0, 0.6, 0) : rgb(0.8, 0, 0),
  });

  // ---------- COMPANY INFO ----------
  let rightX = width - 250;
  let rightY = height - 50;
  page.drawText(business?.businessName || 'Your Business Name', { x: rightX, y: rightY, size: 12, font: boldFont });
  rightY -= 20;
  page.drawText(business?.buildingNumber || '123', { x: rightX, y: rightY, size: 9, font: regularFont });
  rightY -= 15;
  page.drawText(business?.buildingName || 'Tower', { x: rightX, y: rightY, size: 9, font: regularFont });
  rightY -= 15;
  page.drawText(business?.street || 'Street Name', { x: rightX, y: rightY, size: 9, font: regularFont });
  rightY -= 15;
  page.drawText(business?.city || 'City', { x: rightX, y: rightY, size: 9, font: regularFont });
  rightY -= 15;
  page.drawText(business?.county || 'County', { x: rightX, y: rightY, size: 9, font: regularFont });
  rightY -= 15;
  page.drawText(business?.country || 'Country', { x: rightX, y: rightY, size: 9, font: regularFont });

  // ---------- BILL TO ----------
  yPosition -= 40;
  page.drawText('BILL TO:', { x: 50, y: yPosition, size: 11, font: boldFont });
  yPosition -= 20;
  page.drawText(customer?.name || 'Customer Name', { x: 50, y: yPosition, size: 10, font: regularFont });
  yPosition -= 15;
  if (customer?.email) {
    page.drawText(customer.email, { x: 50, y: yPosition, size: 9, font: regularFont });
    yPosition -= 15;
  }
  if (customer?.phone) {
    page.drawText(customer.phone, { x: 50, y: yPosition, size: 9, font: regularFont });
    yPosition -= 15;
  }

  // ---------- LINE ----------
  yPosition -= 20;
  page.drawLine({ start: { x: 50, y: yPosition }, end: { x: width - 50, y: yPosition }, thickness: 1, color: rgb(0.7, 0.7, 0.7) });

  // ---------- TABLE HEADER ----------
  yPosition -= 30;
  page.drawText('DESCRIPTION', { x: 50, y: yPosition, size: 10, font: boldFont });
  page.drawText('QTY', { x: 350, y: yPosition, size: 10, font: boldFont });
  page.drawText('PRICE', { x: 420, y: yPosition, size: 10, font: boldFont });
  page.drawText('AMOUNT', { x: 490, y: yPosition, size: 10, font: boldFont });

  yPosition -= 5;
  page.drawLine({ start: { x: 50, y: yPosition }, end: { x: width - 50, y: yPosition }, thickness: 1, color: rgb(0.7, 0.7, 0.7) });

  // ---------- PACKAGE & ADD-ONS LOGIC ----------
  yPosition -= 25;
  const packagePrice = invoice.plan === 'Annual' ? parseFloat(pkg.priceYearly || 0) : parseFloat(pkg.priceMonthly || 0);
  const packageDiscount = pkg?.discount || 0;
  const packageDiscountedPrice = packagePrice - (packagePrice * packageDiscount / 100);

  page.drawText(`${pkg.name} (${invoice.plan})`, { x: 50, y: yPosition, size: 9, font: regularFont });
  page.drawText('1', { x: 350, y: yPosition, size: 9, font: regularFont });
  page.drawText(`${currencySymbol}${packagePrice.toFixed(2)}`, { x: 420, y: yPosition, size: 9, font: regularFont });
  page.drawText(`${currencySymbol}${packageDiscountedPrice.toFixed(2)}`, { x: 490, y: yPosition, size: 9, font: regularFont });

  if (packageDiscount > 0) {
    yPosition -= 12;
    page.drawText(`(${packageDiscount}% discount applied)`, { x: 60, y: yPosition, size: 7, font: regularFont, color: rgb(0, 0.6, 0) });
  }

  if (addOns && addOns.length > 0) {
    for (const addOn of addOns) {
      yPosition -= 20;
      const addOnPrice = invoice.plan === 'Annual' ? parseFloat(addOn.yearlyPrice || 0) : parseFloat(addOn.monthlyPrice || 0);
      const addOnDiscount = addOn.discount || 0;
      const addOnDiscountedPrice = addOnPrice - (addOnPrice * addOnDiscount / 100);

      page.drawText(`${addOn.module} - ${addOn.feature}`, { x: 50, y: yPosition, size: 9, font: regularFont });
      page.drawText('1', { x: 350, y: yPosition, size: 9, font: regularFont });
      page.drawText(`${currencySymbol}${addOnPrice.toFixed(2)}`, { x: 420, y: yPosition, size: 9, font: regularFont });
      page.drawText(`${currencySymbol}${addOnDiscountedPrice.toFixed(2)}`, { x: 490, y: yPosition, size: 9, font: regularFont });

      if (addOnDiscount > 0) {
        yPosition -= 12;
        page.drawText(`(${addOnDiscount}% discount applied)`, { x: 60, y: yPosition, size: 7, font: regularFont, color: rgb(0, 0.6, 0) });
      }
    }
  }

  // ---------- TOTALS ----------
  yPosition -= 30;
  page.drawLine({ start: { x: 350, y: yPosition }, end: { x: width - 50, y: yPosition }, thickness: 1, color: rgb(0.7, 0.7, 0.7) });
  yPosition -= 25;
  page.drawText('Subtotal:', { x: 380, y: yPosition, size: 10, font: regularFont });
  page.drawText(`${currencySymbol}${invoice.subTotal.toFixed(2)}`, { x: 490, y: yPosition, size: 10, font: regularFont });

  if (invoice.discount > 0) {
    yPosition -= 20;
    page.drawText('Discount:', { x: 380, y: yPosition, size: 10, font: regularFont, color: rgb(0, 0.6, 0) });
    page.drawText(`-${currencySymbol}${invoice.discount.toFixed(2)}`, { x: 490, y: yPosition, size: 10, font: regularFont, color: rgb(0, 0.6, 0) });
  }

  if (invoice.vat > 0) {
    yPosition -= 20;
    page.drawText('VAT:', { x: 380, y: yPosition, size: 10, font: regularFont });
    page.drawText(`${currencySymbol}${invoice.vat.toFixed(2)}`, { x: 490, y: yPosition, size: 10, font: regularFont });
  }

  yPosition -= 5;
  page.drawLine({ start: { x: 350, y: yPosition }, end: { x: width - 50, y: yPosition }, thickness: 2, color: rgb(0.2, 0.2, 0.2) });
  yPosition -= 25;
  page.drawText('TOTAL:', { x: 380, y: yPosition, size: 12, font: boldFont });
  page.drawText(`${currencySymbol}${invoice.amount.toFixed(2)}`, { x: 490, y: yPosition, size: 12, font: boldFont });

  return await pdfDoc.save();
};
