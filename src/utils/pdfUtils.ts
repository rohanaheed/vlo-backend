import path from 'path';
import fs from 'fs';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { REGULATORY_INFO } from './constants/regulatoryInfo';

export const generateInvoicePDF = async (invoiceData: {
  invoice: any;
  customer: any;
  order?: any;
  currency: any;
  user?: any;
}): Promise<Uint8Array> => {
  const { invoice, customer, currency, user } = invoiceData;

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const page = pdfDoc.addPage([595, 842]);
  const { width, height } = page.getSize();

  const fontPath = path.join(__dirname, '../utils/fonts/NotoSans-VariableFont.ttf');
  const fontBytes = fs.readFileSync(fontPath);
  const regularFont = await pdfDoc.embedFont(fontBytes);
  const boldFont = regularFont;

  const currencySymbol = currency?.currencySymbol || '£';
  const currencyCode = currency?.currencyCode || 'GBP';
  const exchangeRate = currency?.exchangeRate || 1;
  
  const tealColor = rgb(0.0, 0.5, 0.47); 
  const lightGray = rgb(0.96, 0.96, 0.96);
  const textBlack = rgb(0, 0, 0); 
  const textGray = rgb(0.4, 0.4, 0.4);
  
  const leftMargin = 30;
  const rightMargin = 30;
  let yPosition = height - 50;

  // Wrap Text
  const wrapText = (text: string, maxWidth: number, fontSize: number): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const testWidth = regularFont.widthOfTextAtSize(testLine, fontSize);

      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
    return lines;
  };
// Top Bar
  page.drawRectangle({
    x: 0,
    y: height - 40,
    width: width,
    height: 40,
    color: tealColor
  });

  // page.drawText('[LOGO: Virtual HR Systems]', {
  //   x: leftMargin,
  //   y: height - 28,
  //   size: 8,
  //   font: regularFont,
  //   color: rgb(1, 1, 1)
  // });
// Invoice Title
  page.drawText('Invoice', {
    x: width - 100,
    y: height - 28,
    size: 18,
    font: boldFont,
    color: rgb(1, 1, 1)
  });

  yPosition = height - 60;
// Referenc Number
  page.drawText(`Reference: ${invoice.matterId || invoice.referenceNumber || 'ADM/1026.00'}`, {
    x: leftMargin,
    y: yPosition,
    size: 9,
    font: regularFont,
    color: textBlack
  });
// Invoice Details
  const invoiceDetailsX = width - 180;
  let rightY = yPosition;

  page.drawText('Invoice Number:', {
    x: invoiceDetailsX,
    y: rightY,
    size: 9,
    font: boldFont,
    color: textBlack
  });
  page.drawText(invoice.invoiceNumber || 'INV-00001', {
    x: invoiceDetailsX + 95,
    y: rightY,
    size: 9,
    font: regularFont,
    color: textBlack
  });

  rightY -= 14;

  page.drawText('Invoice Date:', {
    x: invoiceDetailsX,
    y: rightY,
    size: 9,
    font: boldFont,
    color: textBlack
  });
  page.drawText(
    new Date(invoice.IssueDate).toLocaleDateString('en-GB'),
    {
      x: invoiceDetailsX + 95,
      y: rightY,
      size: 9,
      font: regularFont,
      color: textBlack
    }
  );

  rightY -= 14;

  page.drawText('Due Date:', {
    x: invoiceDetailsX,
    y: rightY,
    size: 9,
    font: boldFont,
    color: textBlack
  });
  page.drawText(
    invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-GB') : '30-05-2025',
    {
      x: invoiceDetailsX + 95,
      y: rightY,
      size: 9,
      font: regularFont,
      color: textBlack
    }
  );

  yPosition -= 45;

  // Billed From and Billed To
  let leftY = yPosition;

  // Billed From
  page.drawText('Billed from:', {
    x: leftMargin,
    y: leftY,
    size: 10,
    font: boldFont,
    color: textBlack
  });

  leftY -= 16;

  page.drawText('John Dos, Inc.', {
    x: leftMargin,
    y: leftY,
    size: 9,
    font: boldFont,
    color: textBlack
  });

  leftY -= 12;

  const billedFromAddress = [
    'Mouid45 Broadway',
    'High Street, Uxbridge UB8 1LD'
  ];
  
  for (const line of billedFromAddress) {
    page.drawText(line, {
      x: leftMargin,
      y: leftY,
      size: 8,
      font: regularFont,
      color: textGray
    });
    leftY -= 11;
  }

  page.drawText('Phone: 03333443700', {
    x: leftMargin,
    y: leftY,
    size: 8,
    font: regularFont,
    color: textGray
  });
  leftY -= 11;

  if (user?.email) {
    page.drawText(`Email: ${user.email}`, {
      x: leftMargin,
      y: leftY,
      size: 8,
      font: regularFont,
      color: textGray
    });
    leftY -= 11;
  }

  // Billed To
  const billedToX = 312;
  rightY = yPosition;

  page.drawText('Billed to:', {
    x: billedToX,
    y: rightY,
    size: 10,
    font: boldFont,
    color: textBlack
  });

  rightY -= 16;

  page.drawText(customer?.name, {
    x: billedToX,
    y: rightY,
    size: 9,
    font: boldFont,
    color: textBlack
  });

  rightY -= 12;

  const customerAddress = invoice.clientAddress || customer?.address;
  if (customerAddress) {
    const addressLines = wrapText(customerAddress, 240, 8);
    for (const line of addressLines) {
      page.drawText(line, {
        x: billedToX,
        y: rightY,
        size: 8,
        font: regularFont,
        color: textGray
      });
      rightY -= 11;
    }
  }

  const customerEmail = invoice.customerEmail || customer?.email;
  if (customerEmail) {
    page.drawText(`Email: ${customerEmail}`, {
      x: billedToX,
      y: rightY,
      size: 8,
      font: regularFont,
      color: textGray
    });
    rightY -= 11;
  }

  if (customer?.phone) {
    page.drawText(`Phone: ${customer.phone}`, {
      x: billedToX,
      y: rightY,
      size: 8,
      font: regularFont,
      color: textGray
    });
    rightY -= 11;
  }

  yPosition = Math.min(leftY, rightY) - 20;

  // Description
  if (invoice.caseDescription) {
    page.drawText('Description:', {
      x: leftMargin,
      y: yPosition,
      size: 10,
      font: boldFont,
      color: textBlack
    });

    yPosition -= 14;

    const descriptionLines = wrapText(invoice.caseDescription, width - (leftMargin * 2), 9);
    for (const line of descriptionLines) {
      page.drawText(line, {
        x: leftMargin,
        y: yPosition,
        size: 9,
        font: regularFont,
        color: textGray
      });
      yPosition -= 12;
    }
    yPosition -= 5;
  }
// Items Table
  yPosition -= 15;

  const col1X = leftMargin;
  const col2X = 280;
  const col3X = 335;
  const col4X = 410;
  const col5X = 490;

  page.drawRectangle({
    x: leftMargin - 5,
    y: yPosition - 2,
    width: width - leftMargin - rightMargin + 10,
    height: 18,
    color: lightGray
  });

  page.drawText('Description', {
    x: col1X,
    y: yPosition + 2,
    size: 9,
    font: boldFont,
    color: textBlack
  });

  page.drawText('Qty / Hours', {
    x: col2X,
    y: yPosition + 2,
    size: 9,
    font: boldFont,
    color: textBlack
  });

  page.drawText(`Amount (${currencyCode})`, {
    x: col3X,
    y: yPosition + 2,
    size: 9,
    font: boldFont,
    color: textBlack
  });

  page.drawText('VAT Rate', {
    x: col4X,
    y: yPosition + 2,
    size: 9,
    font: boldFont,
    color: textBlack
  });

  page.drawText('Sub-Total', {
    x: col5X,
    y: yPosition + 2,
    size: 9,
    font: boldFont,
    color: textBlack
  });

  yPosition -= 22;

  // Table Items
  let itemIndex = 0;
  if (invoice.items && invoice.items.length > 0) {
    for (const item of invoice.items) {
      const description = item.description || '';
      const descLines = wrapText(description, 260, 8);
      const firstLine = descLines[0] || '';

      page.drawText(firstLine, {
        x: col1X,
        y: yPosition,
        size: 8,
        font: regularFont,
        color: textBlack
      });

      page.drawText((item.quantity || 0).toString(), {
        x: col2X + 10,
        y: yPosition,
        size: 8,
        font: regularFont,
        color: textBlack
      });

      page.drawText(`${currencySymbol} ${(item.amount * exchangeRate || 0).toFixed(2)}`, {
        x: col3X,
        y: yPosition,
        size: 8,
        font: regularFont,
        color: textBlack
      });

      const vatRate = item.vatRate ;
      page.drawText(`${vatRate}`, {
        x: col4X + 5,
        y: yPosition,
        size: 8,
        font: regularFont,
        color: textBlack
      });

      page.drawText(`${currencySymbol} ${(item.subTotal * exchangeRate || 0).toFixed(2)}`, {
        x: col5X,
        y: yPosition,
        size: 8,
        font: regularFont,
        color: textBlack
      });

      yPosition -= 16;
      itemIndex++;

      if (descLines.length > 1) {
        for (let i = 1; i < descLines.length; i++) {
          page.drawText(descLines[i], {
            x: col1X,
            y: yPosition,
            size: 8,
            font: regularFont,
            color: textGray
          });
          yPosition -= 12;
        }
      }
    }
  }

  yPosition -= 20;

  // Notes and Total
  const notesStartY = yPosition;
  
  // Notes
  page.drawText('Notes:', {
    x: leftMargin,
    y: yPosition,
    size: 9,
    font: boldFont,
    color: textBlack
  });

  let notesY = yPosition - 14;

  if (invoice.notes) {
    const notesLines = wrapText(invoice.notes, 280, 8);
    for (const line of notesLines) {
      page.drawText(line, {
        x: leftMargin,
        y: notesY,
        size: 8,
        font: regularFont,
        color: textGray
      });
      notesY -= 11;
    }
  }

  // Totals
  const totalsX = 420;
  const totalsValueX = 510;
  let totalsY = yPosition;

  page.drawText('Subtotal:', {
    x: totalsX,
    y: totalsY,
    size: 9,
    font: regularFont,
    color: textBlack
  });
  page.drawText(`${currencySymbol} ${(invoice.subTotal * exchangeRate || 0).toFixed(2)}`, {
    x: totalsValueX,
    y: totalsY,
    size: 9,
    font: regularFont,
    color: textBlack
  });

  totalsY -= 14;

  page.drawText('VAT:', {
    x: totalsX,
    y: totalsY,
    size: 9,
    font: regularFont,
    color: textBlack
  });
  page.drawText(`${currencySymbol} ${(invoice.vat * exchangeRate || 0).toFixed(2)}`, {
    x: totalsValueX,
    y: totalsY,
    size: 9,
    font: regularFont,
    color: textBlack
  });

  totalsY -= 14;

  if (invoice.isDiscount && invoice.discountValue >= 0) {
    const discountLabel = invoice.discountType ;
    page.drawText(`Discount ${discountLabel}:`, {
      x: totalsX,
      y: totalsY,
      size: 9,
      font: regularFont,
      color: textBlack
    });
    page.drawText(`${currencySymbol} ${(invoice.discountValue * exchangeRate || 0).toFixed(2)}`, {
      x: totalsValueX,
      y: totalsY,
      size: 9,
      font: regularFont,
      color: textBlack
    });
    totalsY -= 14;
  }

  page.drawLine({
    start: { x: totalsX - 10, y: totalsY + 3 },
    end: { x: width - rightMargin, y: totalsY + 3 },
    thickness: 1,
    color: textBlack
  });

  totalsY -= 10;

  page.drawText('Total:', {
    x: totalsX,
    y: totalsY,
    size: 10,
    font: boldFont,
    color: textBlack
  });
  page.drawText(`${currencySymbol} ${(invoice.total * exchangeRate || 0).toFixed(2)}`, {
    x: totalsValueX,
    y: totalsY,
    size: 10,
    font: boldFont,
    color: textBlack
  });

  yPosition = Math.min(notesY, totalsY) - 25;

  // Payment Methods
  page.drawText('Accepted payment methods:', {
    x: leftMargin,
    y: yPosition,
    size: 9,
    font: boldFont,
    color: textBlack
  });

  yPosition -= 14;

  page.drawText('We accept payment by Stripe and Electronic Bank Transfer.', {
    x: leftMargin,
    y: yPosition,
    size: 8,
    font: regularFont,
    color: textGray
  });

  yPosition -= 18;

  // Payment method icons
  page.drawText('[Payment Icons: GPay | VISA | Mastercard | Discover | Apple Pay | Bank]', {
    x: leftMargin,
    y: yPosition,
    size: 7,
    font: regularFont,
    color: textGray
  });

  yPosition -= 25;

  // Bank Account and Disbursement
  const bankStartY = yPosition;
  let bankY = yPosition;

  // Bank Account Information
  page.drawText('Bank Account Information:', {
    x: leftMargin,
    y: bankY,
    size: 9,
    font: boldFont,
    color: textBlack
  });

  bankY -= 14;

  const bankInfo = [
    'Bank Name: HSBC Bank',
    'Account Holder: Senior Wattoo',
    'Account Number: 91045281',
    'Sort Code: 40-35-18'
  ];

  for (const info of bankInfo) {
    page.drawText(info, {
      x: leftMargin,
      y: bankY,
      size: 8,
      font: regularFont,
      color: textGray
    });
    bankY -= 11;
  }

  // Disbursements
  const disbursementsX = 312;
  let disbursementsY = bankStartY;

  page.drawText('Disbursements:', {
    x: disbursementsX,
    y: disbursementsY,
    size: 9,
    font: boldFont,
    color: textBlack
  });

  disbursementsY -= 14;

  const disbursementInfo = [
    'Disbursements Incurred: £0.00',
    'Disbursements Received: £0.00',
    'Disbursements Outstanding: £0.00'
  ];

  for (const info of disbursementInfo) {
    page.drawText(info, {
      x: disbursementsX,
      y: disbursementsY,
      size: 8,
      font: regularFont,
      color: textGray
    });
    disbursementsY -= 11;
  }

  // QR code and Signature
  const bottomY = 130;

  page.drawRectangle({
    x: leftMargin,
    y: bottomY - 60,
    width: 60,
    height: 60,
    color: rgb(0.9, 0.9, 0.9)
  });
  page.drawText('[QR Code]', {
    x: leftMargin + 8,
    y: bottomY - 30,
    size: 7,
    font: regularFont,
    color: textGray
  });

  // Signature area
  const signatureX = width - 170;
  const signatureY = bottomY;

  page.drawText('[Signature Image]', {
    x: signatureX + 30,
    y: signatureY + 10,
    size: 7,
    font: regularFont,
    color: textGray
  });

  page.drawLine({
    start: { x: signatureX, y: signatureY },
    end: { x: width - rightMargin, y: signatureY },
    thickness: 1,
    color: textBlack
  });

  page.drawText('Mr John Doe', {
    x: signatureX + 30,
    y: signatureY - 15,
    size: 9,
    font: regularFont,
    color: textBlack
  });

  page.drawText('Executive Director', {
    x: signatureX + 20,
    y: signatureY - 28,
    size: 8,
    font: regularFont,
    color: textGray
  });

  // Bottom Bar
  page.drawRectangle({
    x: 0,
    y: 0,
    width: width,
    height: 40,
    color: tealColor
  });

  // Regulatory Information
  if (invoice.includeRegulatoryInfo) {
    let currentRegPage = pdfDoc.addPage([595, 842]);
    const regWidth = currentRegPage.getSize().width;
    const regHeight = currentRegPage.getSize().height;
    let regY = regHeight - 100;
    const regMargin = 50;
    const maxWidth = regWidth - (regMargin * 2);
    const bottomMargin = 60;

    // Add header to first page
    const addRegHeader = (regPage: any) => {
      regPage.drawRectangle({
        x: 0,
        y: regHeight - 60,
        width: regWidth,
        height: 60,
        color: tealColor
      });

      regPage.drawText('Regulatory Information', {
        x: regMargin,
        y: regHeight - 35,
        size: 18,
        font: boldFont,
        color: rgb(1, 1, 1)
      });
    };

    // Add footer to page
    const addRegFooter = (regPage: any) => {
      regPage.drawLine({
        start: { x: regMargin, y: 45 },
        end: { x: regWidth - regMargin, y: 45 },
        thickness: 1,
        color: rgb(0.7, 0.7, 0.7)
      });

      regPage.drawText(
        'This information is provided in accordance with legal requirements.',
        {
          x: regMargin,
          y: 30,
          size: 7,
          font: regularFont,
          color: textGray
        }
      );
    };

    // Check if new page needed
    const checkNewPage = (requiredSpace: number) => {
      if (regY - requiredSpace < bottomMargin) {
        addRegFooter(currentRegPage);
        currentRegPage = pdfDoc.addPage([595, 842]);
        addRegHeader(currentRegPage);
        regY = regHeight - 100;
      }
    };

    addRegHeader(currentRegPage);

    // Section 1: Complaining about our bill
    checkNewPage(30);
    currentRegPage.drawText(REGULATORY_INFO.complainingAboutBill.title, {
      x: regMargin,
      y: regY,
      size: 12,
      font: boldFont,
      color: textBlack
    });
    regY -= 20;

    const complainLines = wrapText(
      REGULATORY_INFO.complainingAboutBill.content,
      maxWidth,
      9
    );
    for (const line of complainLines) {
      checkNewPage(15);
      currentRegPage.drawText(line, {
        x: regMargin,
        y: regY,
        size: 9,
        font: regularFont,
        color: textGray
      });
      regY -= 12;
    }

    regY -= 15;

    // Section 2: Challenging our bill
    checkNewPage(30);
    currentRegPage.drawText(REGULATORY_INFO.challengingBill.title, {
      x: regMargin,
      y: regY,
      size: 12,
      font: boldFont,
      color: textBlack
    });
    regY -= 20;

    const challengeLines = wrapText(
      REGULATORY_INFO.challengingBill.content,
      maxWidth,
      9
    );
    for (const line of challengeLines) {
      checkNewPage(15);
      currentRegPage.drawText(line, {
        x: regMargin,
        y: regY,
        size: 9,
        font: regularFont,
        color: textGray
      });
      regY -= 12;
    }

    regY -= 10;

    // Conditions (bullets already in text)
    for (const condition of REGULATORY_INFO.challengingBill.conditions) {
      checkNewPage(15);
      const conditionLines = wrapText(condition, maxWidth - 10, 9);
      for (let i = 0; i < conditionLines.length; i++) {
        checkNewPage(15);
        currentRegPage.drawText(conditionLines[i], {
          x: regMargin + 10,
          y: regY,
          size: 9,
          font: regularFont,
          color: textGray
        });
        regY -= 12;
      }
      regY -= 3;
    }

    regY -= 15;

    checkNewPage(30);
    currentRegPage.drawText(REGULATORY_INFO.unpaidBills.title, {
      x: regMargin,
      y: regY,
      size: 12,
      font: boldFont,
      color: textBlack
    });
    regY -= 20;

    const unpaidLines = wrapText(
      REGULATORY_INFO.unpaidBills.content,
      maxWidth,
      9
    );
    for (const line of unpaidLines) {
      checkNewPage(15);
      currentRegPage.drawText(line, {
        x: regMargin,
        y: regY,
        size: 9,
        font: regularFont,
        color: textGray
      });
      regY -= 12;
    }

    addRegFooter(currentRegPage);
  }

  return await pdfDoc.save();
};

// Generate Financial Statement PDF
export const generateFinancialStatementPDF = async (financialData: {
  financialStatement: any;
  customer: any;
  currency: any;
}): Promise<Uint8Array> => {
  const { financialStatement, customer, currency } = financialData;

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const page = pdfDoc.addPage([595, 842]);
  const { width, height } = page.getSize();
  let yPosition = height - 50;

  const fontPath = path.join(__dirname, '../utils/fonts/NotoSans-VariableFont.ttf');
  const fontBytes = fs.readFileSync(fontPath);
  const regularFont = await pdfDoc.embedFont(fontBytes);
  const boldFont = regularFont;

  const currencySymbol = currency?.currencySymbol || '£';
  const exchangeRate = currency?.exchangeRate || 1;

  const tealColor = rgb(0.0, 0.5, 0.47); 
  const lightGray = rgb(0.96, 0.96, 0.96);
  const textBlack = rgb(0, 0, 0); 
  const textGray = rgb(0.4, 0.4, 0.4);

  const leftMargin = 30;
  const rightMargin = 30;

  // Wrap Text
  const wrapText = (text: string, maxWidth: number, fontSize: number): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const testWidth = regularFont.widthOfTextAtSize(testLine, fontSize);

      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  };

  // Top Bar
  page.drawRectangle({
    x: 0,
    y: height - 40,
    width: width,
    height: 40,
    color: tealColor
  });

  // Logo
  page.drawText('[LOGO: Virtual HR Systems]', {
    x: leftMargin,
    y: height - 28,
    size: 8,
    font: regularFont,
    color: rgb(1, 1, 1)
  });

  // Title
  page.drawText('FINANCIAL STATEMENT', {
    x: width - 250,
    y: height - 28,
    size: 18,
    font: boldFont,
    color: rgb(1, 1, 1)
  });

  yPosition = height - 70;

  // Info
  const leftInfoX = leftMargin + 5;
  let leftInfoY = yPosition;

  page.drawText('Matter ID:', {
    x: leftInfoX,
    y: leftInfoY,
    size: 9,
    font: boldFont,
    color: textBlack
  });
  page.drawText(financialStatement.matterId || 'N/A', {
    x: leftInfoX + 70,
    y: leftInfoY,
    size: 9,
    font: regularFont,
    color: textGray
  });
  leftInfoY -= 16;

  page.drawText('Created Date:', {
    x: leftInfoX,
    y: leftInfoY,
    size: 9,
    font: boldFont,
    color: textBlack
  });
  page.drawText(new Date(financialStatement.createdAt).toLocaleDateString('en-GB'), {
    x: leftInfoX + 85,
    y: leftInfoY,
    size: 9,
    font: regularFont,
    color: textGray
  });
  leftInfoY -= 16;

  if (financialStatement.completionDate) {
    page.drawText('Completion Date:', {
      x: leftInfoX,
      y: leftInfoY,
      size: 9,
      font: boldFont,
      color: textBlack
    });
    page.drawText(new Date(financialStatement.completionDate).toLocaleDateString('en-GB'), {
      x: leftInfoX + 110,
      y: leftInfoY,
      size: 9,
      font: regularFont,
      color: textGray
    });
    leftInfoY -= 16;
  }

  yPosition = leftInfoY - 10;

  // Client Details
  page.drawText('CLIENT DETAILS:', {
    x: leftMargin,
    y: yPosition,
    size: 11,
    font: boldFont,
    color: textBlack
  });
  yPosition -= 18;

  page.drawText(financialStatement.customerName || customer?.name || 'N/A', {
    x: leftMargin,
    y: yPosition,
    size: 10,
    font: boldFont,
    color: textBlack
  });
  yPosition -= 14;

  if (financialStatement.customerEmail) {
    const emailLines = wrapText(`Email: ${financialStatement.customerEmail}`, 500, 9);
    for (const line of emailLines) {
      page.drawText(line, {
        x: leftMargin,
        y: yPosition,
        size: 8,
        font: regularFont,
        color: textGray
      });
      yPosition -= 11;
    }
  }

  if (financialStatement.caseDescription) {
    const caseLines = wrapText(`Case: ${financialStatement.caseDescription}`, 500, 9);
    for (const line of caseLines) {
      page.drawText(line, {
        x: leftMargin,
        y: yPosition,
        size: 8,
        font: regularFont,
        color: textGray
      });
      yPosition -= 11;
    }
  }

  yPosition -= 20;

  page.drawLine({
    start: { x: leftMargin, y: yPosition },
    end: { x: width - rightMargin, y: yPosition },
    thickness: 2,
    color: tealColor
  });

  yPosition -= 25;

  // Disbursements
  page.drawText('DISBURSEMENTS', {
    x: leftMargin,
    y: yPosition,
    size: 12,
    font: boldFont,
    color: textBlack
  });
  yPosition -= 20;

  // Table header with light gray background
  page.drawRectangle({
    x: leftMargin - 5,
    y: yPosition - 2,
    width: width - (leftMargin + rightMargin) + 10,
    height: 18,
    color: lightGray
  });

  page.drawText('Description', {
    x: leftMargin,
    y: yPosition,
    size: 9,
    font: boldFont,
    color: textBlack
  });
  page.drawText('Charges', {
    x: 300,
    y: yPosition,
    size: 9,
    font: boldFont,
    color: textBlack
  });
  page.drawText('VAT', {
    x: 400,
    y: yPosition,
    size: 9,
    font: boldFont,
    color: textBlack
  });
  page.drawText('Total', {
    x: 490,
    y: yPosition,
    size: 9,
    font: boldFont,
    color: textBlack
  });

  yPosition -= 22;

  let currentPage = page;
  let disbursementIndex = 0;
  
  if (financialStatement.disbursements && financialStatement.disbursements.length > 0) {
    for (const item of financialStatement.disbursements) {

      if (yPosition < 100) {
        currentPage = pdfDoc.addPage([595, 842]);
        yPosition = height - 50;

        currentPage.drawRectangle({
          x: leftMargin - 5,
          y: yPosition - 2,
          width: width - (leftMargin + rightMargin) + 10,
          height: 18,
          color: lightGray
        });
        
        currentPage.drawText('Description', { x: leftMargin, y: yPosition, size: 9, font: boldFont, color: textBlack });
        currentPage.drawText('Charges', { x: 300, y: yPosition, size: 9, font: boldFont, color: textBlack });
        currentPage.drawText('VAT', { x: 400, y: yPosition, size: 9, font: boldFont, color: textBlack });
        currentPage.drawText('Total', { x: 490, y: yPosition, size: 9, font: boldFont, color: textBlack });
        
        yPosition -= 22;
      }

      const description = item.description || 'N/A';
      const charges = Number(item.charges * exchangeRate) || 0;
      const vatAmount = Number(item.vatAmount * exchangeRate) || 0;
      const total = Number(item.total * exchangeRate) || 0;

      const descLines = wrapText(description, 240, 8);
      const firstLine = descLines[0] || '';

      currentPage.drawText(firstLine, {
        x: leftMargin,
        y: yPosition,
        size: 8,
        font: regularFont,
        color: textBlack
      });
      currentPage.drawText(`${currencySymbol}${charges.toFixed(2)}`, {
        x: 300,
        y: yPosition,
        size: 8,
        font: regularFont,
        color: textBlack
      });
      currentPage.drawText(`${currencySymbol}${vatAmount.toFixed(2)}`, {
        x: 400,
        y: yPosition,
        size: 8,
        font: regularFont,
        color: textBlack
      });
      currentPage.drawText(`${currencySymbol}${total.toFixed(2)}`, {
        x: 490,
        y: yPosition,
        size: 8,
        font: regularFont,
        color: textBlack
      });

      yPosition -= 14;
      disbursementIndex++;

      if (descLines.length > 1) {
        for (let i = 1; i < descLines.length; i++) {
          currentPage.drawText(descLines[i], {
            x: leftMargin,
            y: yPosition,
            size: 8,
            font: regularFont,
            color: textGray
          });
          yPosition -= 11;
        }
      }
    }
  } else {
    currentPage.drawText('No disbursements', {
      x: leftMargin,
      y: yPosition,
      size: 8,
      font: regularFont,
      color: textGray
    });
    yPosition -= 18;
  }

  yPosition -= 15;

  currentPage.drawText('Total Disbursements:', {
    x: 300,
    y: yPosition,
    size: 10,
    font: boldFont,
    color: textBlack
  });
  currentPage.drawText(`${currencySymbol}${((financialStatement.totalDisbursements * exchangeRate) || 0).toFixed(2)}`, {
    x: 490,
    y: yPosition,
    size: 10,
    font: boldFont,
    color: textBlack
  });

  yPosition -= 35;

  // Our Costs
  currentPage.drawText('OUR COSTS', {
    x: leftMargin,
    y: yPosition,
    size: 12,
    font: boldFont,
    color: textBlack
  });
  yPosition -= 20;

  currentPage.drawRectangle({
    x: leftMargin - 5,
    y: yPosition - 2,
    width: width - (leftMargin + rightMargin) + 10,
    height: 18,
    color: lightGray
  });

  currentPage.drawText('Description', {
    x: leftMargin,
    y: yPosition,
    size: 9,
    font: boldFont,
    color: textBlack
  });
  currentPage.drawText('Charges', {
    x: 300,
    y: yPosition,
    size: 9,
    font: boldFont,
    color: textBlack
  });
  currentPage.drawText('VAT', {
    x: 400,
    y: yPosition,
    size: 9,
    font: boldFont,
    color: textBlack
  });
  currentPage.drawText('Total', {
    x: 490,
    y: yPosition,
    size: 9,
    font: boldFont,
    color: textBlack
  });

  yPosition -= 22;

  let costIndex = 0;
  if (financialStatement.ourCost && financialStatement.ourCost.length > 0) {
    for (const item of financialStatement.ourCost) {

      if (yPosition < 100) {
        currentPage = pdfDoc.addPage([595, 842]);
        yPosition = height - 50;
   
        currentPage.drawRectangle({
          x: leftMargin - 5,
          y: yPosition - 2,
          width: width - (leftMargin + rightMargin) + 10,
          height: 18,
          color: lightGray
        });
        
        currentPage.drawText('Description', { x: leftMargin, y: yPosition, size: 9, font: boldFont, color: textBlack });
        currentPage.drawText('Charges', { x: 300, y: yPosition, size: 9, font: boldFont, color: textBlack });
        currentPage.drawText('VAT', { x: 400, y: yPosition, size: 9, font: boldFont, color: textBlack });
        currentPage.drawText('Total', { x: 490, y: yPosition, size: 9, font: boldFont, color: textBlack });
        
        yPosition -= 22;
      }

      const description = item.description || 'N/A';
      const charges = Number(item.charges * exchangeRate) || 0;
      const vatAmount = Number(item.vatAmount * exchangeRate) || 0;
      const total = Number(item.total * exchangeRate) || 0;

      const descLines = wrapText(description, 240, 8);
      const firstLine = descLines[0] || '';

      currentPage.drawText(firstLine, {
        x: leftMargin,
        y: yPosition,
        size: 8,
        font: regularFont,
        color: textBlack
      });
      currentPage.drawText(`${currencySymbol}${charges.toFixed(2)}`, {
        x: 300,
        y: yPosition,
        size: 8,
        font: regularFont,
        color: textBlack
      });
      currentPage.drawText(`${currencySymbol}${vatAmount.toFixed(2)}`, {
        x: 400,
        y: yPosition,
        size: 8,
        font: regularFont,
        color: textBlack
      });
      currentPage.drawText(`${currencySymbol}${total.toFixed(2)}`, {
        x: 490,
        y: yPosition,
        size: 8,
        font: regularFont,
        color: textBlack
      });

      yPosition -= 14;
      costIndex++;

      if (descLines.length > 1) {
        for (let i = 1; i < descLines.length; i++) {
          currentPage.drawText(descLines[i], {
            x: leftMargin,
            y: yPosition,
            size: 8,
            font: regularFont,
            color: textGray
          });
          yPosition -= 11;
        }
      }
    }
  } else {
    currentPage.drawText('No costs', {
      x: leftMargin,
      y: yPosition,
      size: 8,
      font: regularFont,
      color: textGray
    });
    yPosition -= 18;
  }

  yPosition -= 15;

  currentPage.drawText('Total Our Costs:', {
    x: 300,
    y: yPosition,
    size: 10,
    font: boldFont,
    color: textBlack
  });
  currentPage.drawText(`${currencySymbol}${((financialStatement.totalOurCosts * exchangeRate) || 0).toFixed(2)}`, {
    x: 490,
    y: yPosition,
    size: 10,
    font: boldFont,
    color: textBlack
  });

  yPosition -= 35;

  // Summary
  if (financialStatement.summary && financialStatement.summary.length > 0) {
    currentPage.drawText('SUMMARY', {
      x: leftMargin,
      y: yPosition,
      size: 12,
      font: boldFont,
      color: textBlack
    });
    yPosition -= 20;

    let summaryIndex = 0;
    for (const summaryItem of financialStatement.summary) {
      currentPage.drawText(summaryItem.label || '', {
        x: 300,
        y: yPosition,
        size: 9,
        font: regularFont,
        color: textBlack
      });
      currentPage.drawText(`${currencySymbol}${((summaryItem.total * exchangeRate) || 0).toFixed(2)}`, {
        x: 490,
        y: yPosition,
        size: 9,
        font: regularFont,
        color: textBlack
      });
      yPosition -= 16;
      summaryIndex++;
    }
    yPosition -= 10;
  }

  currentPage.drawLine({
    start: { x: 300, y: yPosition },
    end: { x: width - rightMargin, y: yPosition },
    thickness: 2,
    color: textBlack
  });

  yPosition -= 20;

  // Grand Total
  currentPage.drawText('TOTAL AMOUNT REQUIRED:', {
    x: 280,
    y: yPosition,
    size: 11,
    font: boldFont,
    color: textBlack
  });
  currentPage.drawText(`${currencySymbol}${((financialStatement.totalAmountRequired * exchangeRate) || 0).toFixed(2)}`, {
    x: 480,
    y: yPosition,
    size: 12,
    font: boldFont,
    color: textBlack
  });

  // Footer
  yPosition = 80;
  currentPage.drawLine({
    start: { x: leftMargin, y: yPosition },
    end: { x: width - rightMargin, y: yPosition },
    thickness: 1,
    color: textGray
  });

  yPosition -= 15;
  currentPage.drawText('This is a computer-generated financial statement.', {
    x: leftMargin,
    y: yPosition,
    size: 7,
    font: regularFont,
    color: textGray
  });

  yPosition -= 11;
  currentPage.drawText(`Generated on ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')}`, {
    x: leftMargin,
    y: yPosition,
    size: 7,
    font: regularFont,
    color: textGray
  });

  // Bottom Bar
  currentPage.drawRectangle({
    x: 0,
    y: 0,
    width: width,
    height: 40,
    color: tealColor
  });

  return await pdfDoc.save();
};