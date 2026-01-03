import path from 'path';
import fs from 'fs';
import { PDFDocument, rgb, PDFImage } from 'pdf-lib';
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

  const LightFontPath = path.resolve(__dirname, '../public/fonts/NotoSans-Light.ttf');
  const BoldFontPath = path.resolve(__dirname, '../public/fonts/NotoSans-SemiBold.ttf');
  const logoPath = path.resolve(__dirname, '../public/images/vhr_logo.png');

  const LightFontBytes = fs.readFileSync(LightFontPath);
  const BoldFontBytes = fs.readFileSync(BoldFontPath);
  const regularFont = await pdfDoc.embedFont(LightFontBytes);
  const boldFont = await pdfDoc.embedFont(BoldFontBytes);

  // Load and embed logo
  let logoImage : PDFImage | null = null
  try {
    const logoBytes = fs.readFileSync(logoPath);
    logoImage = await pdfDoc.embedPng(logoBytes);
  } catch (error) {
    console.error('Error loading logo:', error);
  }

  const currencySymbol = currency?.currencySymbol || '£';
  const currencyCode = currency?.currencyCode || 'GBP';
  const exchangeRate = currency?.exchangeRate || 1;

  const tealColor = rgb(0.0, 0.5, 0.47);
  const lightGray = rgb(0.85, 0.85, 0.85);
  const text = rgb(0, 0, 0);

  const leftMargin = 30;
  const rightMargin = 30;
  let yPosition = height - 50;

  // Wrap Text with Justification Support
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

  // Justify text function
  const justifyText = (text: string, maxWidth: number, fontSize: number, isLastLine: boolean = false): string => {
    if (isLastLine) return text;
    
    const words = text.split(' ');
    if (words.length === 1) return text;

    const wordWidths = words.map(word => regularFont.widthOfTextAtSize(word, fontSize));
    const totalWordWidth = wordWidths.reduce((sum, w) => sum + w, 0);
    const spaceWidth = regularFont.widthOfTextAtSize(' ', fontSize);
    
    const totalSpaceWidth = maxWidth - totalWordWidth;
    const spaceCount = words.length - 1;
    const adjustedSpaceWidth = totalSpaceWidth / spaceCount;
    const spacesNeeded = Math.max(1, Math.round(adjustedSpaceWidth / spaceWidth));

    return words.join(' '.repeat(spacesNeeded));
  };

  // Top Bar
  const topBarHeight = 12;
  const diagonalWidth = 40;
  const colorBoundary = width * 0.75;

  for (let x = 0; x < width; x++) {
    if (x < colorBoundary - diagonalWidth) {
      // Left section: solid teal
      page.drawRectangle({
        x: x,
        y: height - topBarHeight,
        width: 1,
        height: topBarHeight,
        color: tealColor
      });
    } else if (x >= colorBoundary - diagonalWidth && x < colorBoundary) {
      const progress = (x - (colorBoundary - diagonalWidth)) / diagonalWidth;
      const currentHeight = topBarHeight * (1 - progress);

      page.drawRectangle({
        x: x,
        y: height - currentHeight,
        width: 1,
        height: currentHeight,
        color: tealColor
      });

      if (currentHeight < topBarHeight) {
        page.drawRectangle({
          x: x,
          y: height - topBarHeight,
          width: 1,
          height: topBarHeight - currentHeight,
          color: lightGray
        });
      }
    } else {
      // Right section: solid light gray
      page.drawRectangle({
        x: x,
        y: height - topBarHeight,
        width: 1,
        height: topBarHeight,
        color: lightGray
      });
    }
  }

  yPosition = height - topBarHeight - 40;

  if (logoImage) {
    const logoWidth = 110;
    const logoHeight = 55;
    page.drawImage(logoImage, {
      x: leftMargin,
      y: yPosition - 25,
      width: logoWidth,
      height: logoHeight
    });
  } else {
    page.drawText('Virtual HR Systems', {
      x: leftMargin,
      y: yPosition,
      size: 10,
      font: boldFont,
      color: text
    });
  }

  // Invoice Title
  page.drawText('Invoice', {
    x: width - 160,
    y: yPosition + 5,
    size: 20,
    font: boldFont,
    color: text
  });

  yPosition -= 60;

  // Reference Number
  page.drawText(`Reference: ${invoice.matterId || invoice.referenceNumber}`, {
    x: leftMargin,
    y: yPosition,
    size: 9,
    font: regularFont,
    color: text
  });

  // Invoice Details
  const invoiceDetailsX = width - 180;
  let rightY = yPosition;

  page.drawText('Invoice Number:', {
    x: invoiceDetailsX,
    y: rightY,
    size: 9,
    font: boldFont,
    color: text
  });
  page.drawText(invoice.invoiceNumber, {
    x: invoiceDetailsX + 95,
    y: rightY,
    size: 9,
    font: regularFont,
    color: text
  });

  rightY -= 14;

  page.drawText('Invoice Date:', {
    x: invoiceDetailsX,
    y: rightY,
    size: 9,
    font: boldFont,
    color: text
  });
  page.drawText(
    new Date(invoice.IssueDate).toLocaleDateString('en-GB'),
    {
      x: invoiceDetailsX + 95,
      y: rightY,
      size: 9,
      font: regularFont,
      color: text
    }
  );

  rightY -= 14;

  page.drawText('Due Date:', {
    x: invoiceDetailsX,
    y: rightY,
    size: 9,
    font: boldFont,
    color: text
  });
  page.drawText(
    new Date(invoice.dueDate).toLocaleDateString('en-GB'),
    {
      x: invoiceDetailsX + 95,
      y: rightY,
      size: 9,
      font: regularFont,
      color: text
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
    color: text
  });

  leftY -= 16;

  page.drawText('John Dos, Inc.', {
    x: leftMargin,
    y: leftY,
    size: 9,
    font: boldFont,
    color: text
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
      color: text
    });
    leftY -= 11;
  }

  page.drawText('Phone: 03333443700', {
    x: leftMargin,
    y: leftY,
    size: 8,
    font: regularFont,
    color: text
  });
  leftY -= 11;

  if (user?.email) {
    page.drawText(`Email: ${user.email}`, {
      x: leftMargin,
      y: leftY,
      size: 8,
      font: regularFont,
      color: text
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
    color: text
  });

  rightY -= 16;

  page.drawText(customer?.name, {
    x: billedToX,
    y: rightY,
    size: 9,
    font: boldFont,
    color: text
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
        color: text
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
      color: text
    });
    rightY -= 11;
  }

  if (customer?.phone) {
    page.drawText(`Phone: ${customer.phone}`, {
      x: billedToX,
      y: rightY,
      size: 8,
      font: regularFont,
      color: text
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
      color: text
    });

    yPosition -= 14;

    const descriptionLines = wrapText(invoice.caseDescription, width - (leftMargin * 2), 9);
    for (const line of descriptionLines) {
      page.drawText(line, {
        x: leftMargin,
        y: yPosition,
        size: 9,
        font: regularFont,
        color: text
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
    color: text
  });

  page.drawText('Qty / Hours', {
    x: col2X,
    y: yPosition + 2,
    size: 9,
    font: boldFont,
    color: text
  });

  page.drawText(`Amount (${currencyCode})`, {
    x: col3X,
    y: yPosition + 2,
    size: 9,
    font: boldFont,
    color: text
  });

  page.drawText('VAT Rate', {
    x: col4X,
    y: yPosition + 2,
    size: 9,
    font: boldFont,
    color: text
  });

  page.drawText('Sub-Total', {
    x: col5X,
    y: yPosition + 2,
    size: 9,
    font: boldFont,
    color: text
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
        color: text
      });

      page.drawText((item.quantity || 0).toString(), {
        x: col2X + 10,
        y: yPosition,
        size: 8,
        font: regularFont,
        color: text
      });

      page.drawText(`${currencySymbol} ${(item.amount * exchangeRate || 0).toFixed(2)}`, {
        x: col3X,
        y: yPosition,
        size: 8,
        font: regularFont,
        color: text
      });

      const vatRate = item.vatRate || 0;
      page.drawText(`${vatRate}`, {
        x: col4X + 5,
        y: yPosition,
        size: 8,
        font: regularFont,
        color: text
      });

      page.drawText(`${currencySymbol} ${(item.subTotal * exchangeRate || 0).toFixed(2)}`, {
        x: col5X,
        y: yPosition,
        size: 8,
        font: regularFont,
        color: text
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
            color: text
          });
          yPosition -= 12;
        }
      }
    }
  }

  yPosition -= 20;

  // Notes
  page.drawText('Notes:', {
    x: leftMargin,
    y: yPosition,
    size: 9,
    font: boldFont,
    color: text
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
        color: text
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
    color: text
  });
  page.drawText(`${currencySymbol} ${(invoice.subTotal * exchangeRate || 0).toFixed(2)}`, {
    x: totalsValueX,
    y: totalsY,
    size: 9,
    font: regularFont,
    color: text
  });

  totalsY -= 14;

  page.drawText('VAT:', {
    x: totalsX,
    y: totalsY,
    size: 9,
    font: regularFont,
    color: text
  });
  page.drawText(`${currencySymbol} ${(invoice.vat * exchangeRate || 0).toFixed(2)}`, {
    x: totalsValueX,
    y: totalsY,
    size: 9,
    font: regularFont,
    color: text
  });

  totalsY -= 14;

  if (invoice.isDiscount && invoice.discountValue >= 0) {
    const discountLabel = invoice.discountType;
    page.drawText(`Discount ${discountLabel}:`, {
      x: totalsX,
      y: totalsY,
      size: 9,
      font: regularFont,
      color: text
    });
    page.drawText(`${currencySymbol} ${(invoice.discountValue * exchangeRate || 0).toFixed(2)}`, {
      x: totalsValueX,
      y: totalsY,
      size: 9,
      font: regularFont,
      color: text
    });
    totalsY -= 14;
  }

  page.drawLine({
    start: { x: totalsX - 10, y: totalsY + 3 },
    end: { x: width - rightMargin, y: totalsY + 3 },
    thickness: 1,
    color: text
  });

  totalsY -= 10;

  page.drawText('Total:', {
    x: totalsX,
    y: totalsY,
    size: 10,
    font: boldFont,
    color: text
  });
  page.drawText(`${currencySymbol} ${(invoice.total * exchangeRate || 0).toFixed(2)}`, {
    x: totalsValueX,
    y: totalsY,
    size: 10,
    font: boldFont,
    color: text
  });

  yPosition = Math.min(notesY, totalsY) - 25;

  // Payment Methods
  page.drawText('Accepted payment methods:', {
    x: leftMargin,
    y: yPosition,
    size: 9,
    font: boldFont,
    color: text
  });

  yPosition -= 14;

  page.drawText('We accept payment by Stripe and Electronic Bank Transfer.', {
    x: leftMargin,
    y: yPosition,
    size: 8,
    font: regularFont,
    color: text
  });

  yPosition -= 18;

  // Payment method icons
  page.drawText('[Payment Icons: GPay | VISA | Mastercard | Discover | Apple Pay | Bank]', {
    x: leftMargin,
    y: yPosition,
    size: 7,
    font: regularFont,
    color: text
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
    color: text
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
      color: text
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
    color: text
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
      color: text
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
    color: text
  });

  // Signature area
  const signatureX = width - 170;
  const signatureY = bottomY;

  page.drawText('[Signature Image]', {
    x: signatureX + 30,
    y: signatureY + 10,
    size: 7,
    font: regularFont,
    color: text
  });

  page.drawLine({
    start: { x: signatureX, y: signatureY },
    end: { x: width - rightMargin, y: signatureY },
    thickness: 1,
    color: text
  });

  page.drawText('Mr John Doe', {
    x: signatureX + 30,
    y: signatureY - 15,
    size: 9,
    font: regularFont,
    color: text
  });

  page.drawText('Executive Director', {
    x: signatureX + 20,
    y: signatureY - 28,
    size: 8,
    font: regularFont,
    color: text
  });

  // Bottom Bar
  const bottomBarHeight = 12;
  const bottomDiagonalWidth = 40; // Width of the diagonal cut
  const bottomColorBoundary = width * 0.25;

  for (let x = 0; x < width; x++) {
    if (x < bottomColorBoundary - bottomDiagonalWidth) {
      // Left section: solid dark gray
      page.drawRectangle({
        x: x,
        y: 0,
        width: 1,
        height: bottomBarHeight,
        color: lightGray
      });
    } else if (x >= bottomColorBoundary - bottomDiagonalWidth && x < bottomColorBoundary) {
      const progress = (x - (bottomColorBoundary - bottomDiagonalWidth)) / bottomDiagonalWidth;
      const currentHeight = bottomBarHeight * (1 - progress);

      page.drawRectangle({
        x: x,
        y: 0,
        width: 1,
        height: currentHeight,
        color: lightGray
      });

      if (currentHeight < bottomBarHeight) {
        page.drawRectangle({
          x: x,
          y: currentHeight,
          width: 1,
          height: bottomBarHeight - currentHeight,
          color: tealColor
        });
      }
    } else {
      // Right section: solid teal
      page.drawRectangle({
        x: x,
        y: 0,
        width: 1,
        height: bottomBarHeight,
        color: tealColor
      });
    }
  }

  // Regulatory Information
  if (invoice.includeRegulatoryInfo) {
    let currentRegPage = pdfDoc.addPage([595, 842]);
    const regWidth = currentRegPage.getSize().width;
    const regHeight = currentRegPage.getSize().height;
    let regY = regHeight - 80;
    const regMargin = 50;
    const maxWidth = regWidth - (regMargin * 2);
    const bottomMargin = 80;
    const fontSize = 9;
    const titleFontSize = 11;
    const lineHeight = fontSize * 1.5;

    const addRegHeader = (regPage: any) => {
      const regTopBarHeight = 12;
      const regDiagonalWidth = 40;

      const regColorBoundary = regWidth * 0.75;

      for (let x = 0; x < regWidth; x++) {
        if (x < regColorBoundary - regDiagonalWidth) {
          // Left section: solid teal
          regPage.drawRectangle({
            x: x,
            y: regHeight - regTopBarHeight,
            width: 1,
            height: regTopBarHeight,
            color: tealColor
          });
        } else if (x >= regColorBoundary - regDiagonalWidth && x < regColorBoundary) {
          const progress = (x - (regColorBoundary - regDiagonalWidth)) / regDiagonalWidth;
          const currentHeight = regTopBarHeight * (1 - progress);

          regPage.drawRectangle({
            x: x,
            y: regHeight - currentHeight,
            width: 1,
            height: currentHeight,
            color: tealColor
          });

          if (currentHeight < regTopBarHeight) {
            regPage.drawRectangle({
              x: x,
              y: regHeight - regTopBarHeight,
              width: 1,
              height: regTopBarHeight - currentHeight,
              color: lightGray
            });
          }
        } else {
          // Right section: solid light gray
          regPage.drawRectangle({
            x: x,
            y: regHeight - regTopBarHeight,
            width: 1,
            height: regTopBarHeight,
            color: lightGray
          });
        }
      }

      let regHeaderY = regHeight - regTopBarHeight - 60;

      // Regulatory Information title
      regPage.drawText('Regulatory Information', {
        x: regMargin,
        y: regHeaderY + 20,
        size: 16,
        font: boldFont,
        color: text
      });
    };

    // Bottom Bar
    const addRegFooter = (regPage: any) => {
      const regBottomBarHeight = 12;
      const regBottomDiagonalWidth = 40;

      const regBottomColorBoundary = regWidth * 0.25;

      for (let x = 0; x < regWidth; x++) {
        if (x < regBottomColorBoundary - regBottomDiagonalWidth) {
          // Left section: solid dark gray
          regPage.drawRectangle({
            x: x,
            y: 0,
            width: 1,
            height: regBottomBarHeight,
            color: lightGray
          });
        } else if (x >= regBottomColorBoundary - regBottomDiagonalWidth && x < regBottomColorBoundary) {
          const progress = (x - (regBottomColorBoundary - regBottomDiagonalWidth)) / regBottomDiagonalWidth;
          const currentHeight = regBottomBarHeight * (1 - progress);

          regPage.drawRectangle({
            x: x,
            y: 0,
            width: 1,
            height: currentHeight,
            color: lightGray
          });

          // Fill the top part with teal
          if (currentHeight < regBottomBarHeight) {
            regPage.drawRectangle({
              x: x,
              y: currentHeight,
              width: 1,
              height: regBottomBarHeight - currentHeight,
              color: tealColor
            });
          }
        } else {
          // Right section: solid teal
          regPage.drawRectangle({
            x: x,
            y: 0,
            width: 1,
            height: regBottomBarHeight,
            color: tealColor
          });
        }
      }

      // Footer
      regPage.drawText(
        'This information is provided in accordance with legal requirements.',
        {
          x: regMargin,
          y: 25,
          size: 7,
          font: regularFont,
          color: text
        }
      );
    };

    // Check page needed
    const checkNewPage = (requiredSpace: number) => {
      if (regY - requiredSpace < bottomMargin) {
        addRegFooter(currentRegPage);
        currentRegPage = pdfDoc.addPage([595, 842]);
        addRegHeader(currentRegPage);
        regY = regHeight - 80;
      }
    };

    addRegHeader(currentRegPage);

    // Complaining about our bill
    checkNewPage(titleFontSize + lineHeight * 2);
    currentRegPage.drawText(REGULATORY_INFO.complainingAboutBill.title, {
      x: regMargin,
      y: regY,
      size: titleFontSize,
      font: boldFont,
      color: text
    });
    regY -= lineHeight * 1.8;

    const complainLines = wrapText(
      REGULATORY_INFO.complainingAboutBill.content,
      maxWidth,
      fontSize
    );
    
    for (let i = 0; i < complainLines.length; i++) {
      checkNewPage(lineHeight);
      const isLastLine = i === complainLines.length - 1;
      const justifiedLine = justifyText(complainLines[i], maxWidth, fontSize, isLastLine);
      
      currentRegPage.drawText(justifiedLine, {
        x: regMargin,
        y: regY,
        size: fontSize,
        font: regularFont,
        color: text
      });
      regY -= lineHeight;
    }

    regY -= lineHeight;

    // Challenging our bill
    checkNewPage(titleFontSize + lineHeight * 2);
    currentRegPage.drawText(REGULATORY_INFO.challengingBill.title, {
      x: regMargin,
      y: regY,
      size: titleFontSize,
      font: boldFont,
      color: text
    });
    regY -= lineHeight * 1.8;

    const challengeLines = wrapText(
      REGULATORY_INFO.challengingBill.content,
      maxWidth,
      fontSize
    );
    
    for (let i = 0; i < challengeLines.length; i++) {
      checkNewPage(lineHeight);
      const isLastLine = i === challengeLines.length - 1;
      const justifiedLine = justifyText(challengeLines[i], maxWidth, fontSize, isLastLine);
      
      currentRegPage.drawText(justifiedLine, {
        x: regMargin,
        y: regY,
        size: fontSize,
        font: regularFont,
        color: text
      });
      regY -= lineHeight;
    }

    regY -= lineHeight * 0.5;

    // Conditions with bullets
    for (const condition of REGULATORY_INFO.challengingBill.conditions) {
      checkNewPage(lineHeight * 2);

      const conditionText = condition.startsWith('•') ? condition.substring(1).trim() : condition;
      const conditionLines = wrapText(conditionText, maxWidth - 20, fontSize);

      for (let i = 0; i < conditionLines.length; i++) {
        checkNewPage(lineHeight);

        if (i === 0) {
          currentRegPage.drawText('•', {
            x: regMargin + 5,
            y: regY,
            size: fontSize,
            font: regularFont,
            color: text
          });
        }

        currentRegPage.drawText(conditionLines[i], {
          x: regMargin + 20,
          y: regY,
          size: fontSize,
          font: regularFont,
          color: text
        });
        regY -= lineHeight;
      }
      regY -= lineHeight * 0.3;
    }

    regY -= lineHeight * 0.5;

    // Unpaid bills
    checkNewPage(titleFontSize + lineHeight * 2);
    currentRegPage.drawText(REGULATORY_INFO.unpaidBills.title, {
      x: regMargin,
      y: regY,
      size: titleFontSize,
      font: boldFont,
      color: text
    });
    regY -= lineHeight * 1.8;

    const unpaidLines = wrapText(
      REGULATORY_INFO.unpaidBills.content,
      maxWidth,
      fontSize
    );
    
    for (let i = 0; i < unpaidLines.length; i++) {
      checkNewPage(lineHeight);
      const isLastLine = i === unpaidLines.length - 1;
      const justifiedLine = justifyText(unpaidLines[i], maxWidth, fontSize, isLastLine);
      
      currentRegPage.drawText(justifiedLine, {
        x: regMargin,
        y: regY,
        size: fontSize,
        font: regularFont,
        color: text
      });
      regY -= lineHeight;
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

 const LightFontPath = path.resolve(__dirname, '../public/fonts/NotoSans-Light.ttf');
 const BoldFontPath = path.resolve(__dirname, '../public/fonts/NotoSans-SemiBold.ttf');
 const LightFontBytes = fs.readFileSync(LightFontPath);
 const BoldFontBytes = fs.readFileSync(BoldFontPath);
 const regularFont = await pdfDoc.embedFont(LightFontBytes);
 const boldFont = await pdfDoc.embedFont(BoldFontBytes);


  const currencySymbol = currency?.currencySymbol || '£';
  const exchangeRate = currency?.exchangeRate || 1;

  const tealColor = rgb(0.0, 0.5, 0.47);
  const lightGray = rgb(0.85, 0.85, 0.85);
  const text = rgb(0, 0, 0);

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
  const fsTopBarHeight = 12;
  const fsDiagonalWidth = 40;
  const fsColorBoundary = width * 0.75;

  for (let x = 0; x < width; x++) {
    if (x < fsColorBoundary - fsDiagonalWidth) {
      // Left section: solid teal
      page.drawRectangle({
        x: x,
        y: height - fsTopBarHeight,
        width: 1,
        height: fsTopBarHeight,
        color: tealColor
      });
    } else if (x >= fsColorBoundary - fsDiagonalWidth && x < fsColorBoundary) {
      const progress = (x - (fsColorBoundary - fsDiagonalWidth)) / fsDiagonalWidth;
      const currentHeight = fsTopBarHeight * (1 - progress);

      page.drawRectangle({
        x: x,
        y: height - currentHeight,
        width: 1,
        height: currentHeight,
        color: tealColor
      });
      if (currentHeight < fsTopBarHeight) {
        page.drawRectangle({
          x: x,
          y: height - fsTopBarHeight,
          width: 1,
          height: fsTopBarHeight - currentHeight,
          color: lightGray
        });
      }
    } else {
      // Right section: solid light gray
      page.drawRectangle({
        x: x,
        y: height - fsTopBarHeight,
        width: 1,
        height: fsTopBarHeight,
        color: lightGray
      });
    }
  }

  yPosition = height - fsTopBarHeight - 40;

  // Title
  page.drawText('FINANCIAL STATEMENT', {
    x: leftMargin,
    y: yPosition + 5,
    size: 18,
    font: boldFont,
    color: text
  });

  yPosition -= 60;

  // Info
  const leftInfoX = leftMargin + 5;
  let leftInfoY = yPosition;

  page.drawText('Matter ID:', {
    x: leftInfoX,
    y: leftInfoY,
    size: 9,
    font: boldFont,
    color: text
  });
  page.drawText(financialStatement.matterId || 'N/A', {
    x: leftInfoX + 70,
    y: leftInfoY,
    size: 9,
    font: regularFont,
    color: text
  });
  leftInfoY -= 16;

  page.drawText('Created Date:', {
    x: leftInfoX,
    y: leftInfoY,
    size: 9,
    font: boldFont,
    color: text
  });
  page.drawText(new Date(financialStatement.createdAt).toLocaleDateString('en-GB'), {
    x: leftInfoX + 85,
    y: leftInfoY,
    size: 9,
    font: regularFont,
    color: text
  });
  leftInfoY -= 16;

  if (financialStatement.completionDate) {
    page.drawText('Completion Date:', {
      x: leftInfoX,
      y: leftInfoY,
      size: 9,
      font: boldFont,
      color: text
    });
    page.drawText(new Date(financialStatement.completionDate).toLocaleDateString('en-GB'), {
      x: leftInfoX + 110,
      y: leftInfoY,
      size: 9,
      font: regularFont,
      color: text
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
    color: text
  });
  yPosition -= 18;

  page.drawText(financialStatement.customerName || customer?.name || 'N/A', {
    x: leftMargin,
    y: yPosition,
    size: 10,
    font: boldFont,
    color: text
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
        color: text
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
        color: text
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
    color: text
  });
  yPosition -= 20;

  // Table
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
    color: text
  });
  page.drawText('Charges', {
    x: 300,
    y: yPosition,
    size: 9,
    font: boldFont,
    color: text
  });
  page.drawText('VAT', {
    x: 400,
    y: yPosition,
    size: 9,
    font: boldFont,
    color: text
  });
  page.drawText('Total', {
    x: 490,
    y: yPosition,
    size: 9,
    font: boldFont,
    color: text
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
        
        currentPage.drawText('Description', { x: leftMargin, y: yPosition, size: 9, font: boldFont, color: text });
        currentPage.drawText('Charges', { x: 300, y: yPosition, size: 9, font: boldFont, color: text });
        currentPage.drawText('VAT', { x: 400, y: yPosition, size: 9, font: boldFont, color: text });
        currentPage.drawText('Total', { x: 490, y: yPosition, size: 9, font: boldFont, color: text });
        
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
        color: text
      });
      currentPage.drawText(`${currencySymbol}${charges.toFixed(2)}`, {
        x: 300,
        y: yPosition,
        size: 8,
        font: regularFont,
        color: text
      });
      currentPage.drawText(`${currencySymbol}${vatAmount.toFixed(2)}`, {
        x: 400,
        y: yPosition,
        size: 8,
        font: regularFont,
        color: text
      });
      currentPage.drawText(`${currencySymbol}${total.toFixed(2)}`, {
        x: 490,
        y: yPosition,
        size: 8,
        font: regularFont,
        color: text
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
            color: text
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
      color: text
    });
    yPosition -= 18;
  }

  yPosition -= 15;

  currentPage.drawText('Total Disbursements:', {
    x: 300,
    y: yPosition,
    size: 10,
    font: boldFont,
    color: text
  });
  currentPage.drawText(`${currencySymbol}${((financialStatement.totalDisbursements * exchangeRate) || 0).toFixed(2)}`, {
    x: 490,
    y: yPosition,
    size: 10,
    font: boldFont,
    color: text
  });

  yPosition -= 35;

  // Our Costs
  currentPage.drawText('OUR COSTS', {
    x: leftMargin,
    y: yPosition,
    size: 12,
    font: boldFont,
    color: text
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
    color: text
  });
  currentPage.drawText('Charges', {
    x: 300,
    y: yPosition,
    size: 9,
    font: boldFont,
    color: text
  });
  currentPage.drawText('VAT', {
    x: 400,
    y: yPosition,
    size: 9,
    font: boldFont,
    color: text
  });
  currentPage.drawText('Total', {
    x: 490,
    y: yPosition,
    size: 9,
    font: boldFont,
    color: text
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
        
        currentPage.drawText('Description', { x: leftMargin, y: yPosition, size: 9, font: boldFont, color: text });
        currentPage.drawText('Charges', { x: 300, y: yPosition, size: 9, font: boldFont, color: text });
        currentPage.drawText('VAT', { x: 400, y: yPosition, size: 9, font: boldFont, color: text });
        currentPage.drawText('Total', { x: 490, y: yPosition, size: 9, font: boldFont, color: text });
        
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
        color: text
      });
      currentPage.drawText(`${currencySymbol}${charges.toFixed(2)}`, {
        x: 300,
        y: yPosition,
        size: 8,
        font: regularFont,
        color: text
      });
      currentPage.drawText(`${currencySymbol}${vatAmount.toFixed(2)}`, {
        x: 400,
        y: yPosition,
        size: 8,
        font: regularFont,
        color: text
      });
      currentPage.drawText(`${currencySymbol}${total.toFixed(2)}`, {
        x: 490,
        y: yPosition,
        size: 8,
        font: regularFont,
        color: text
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
            color: text
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
      color: text
    });
    yPosition -= 18;
  }

  yPosition -= 15;

  currentPage.drawText('Total Our Costs:', {
    x: 300,
    y: yPosition,
    size: 10,
    font: boldFont,
    color: text
  });
  currentPage.drawText(`${currencySymbol}${((financialStatement.totalOurCosts * exchangeRate) || 0).toFixed(2)}`, {
    x: 490,
    y: yPosition,
    size: 10,
    font: boldFont,
    color: text
  });

  yPosition -= 35;

  // Summary
  if (financialStatement.summary && financialStatement.summary.length > 0) {
    currentPage.drawText('SUMMARY', {
      x: leftMargin,
      y: yPosition,
      size: 12,
      font: boldFont,
      color: text
    });
    yPosition -= 20;

    let summaryIndex = 0;
    for (const summaryItem of financialStatement.summary) {
      currentPage.drawText(summaryItem.label || '', {
        x: 300,
        y: yPosition,
        size: 9,
        font: regularFont,
        color: text
      });
      currentPage.drawText(`${currencySymbol}${((summaryItem.total * exchangeRate) || 0).toFixed(2)}`, {
        x: 490,
        y: yPosition,
        size: 9,
        font: regularFont,
        color: text
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
    color: text
  });

  yPosition -= 20;

  // Grand Total
  currentPage.drawText('TOTAL AMOUNT REQUIRED:', {
    x: 280,
    y: yPosition,
    size: 11,
    font: boldFont,
    color: text
  });
  currentPage.drawText(`${currencySymbol}${((financialStatement.totalAmountRequired * exchangeRate) || 0).toFixed(2)}`, {
    x: 480,
    y: yPosition,
    size: 12,
    font: boldFont,
    color: text
  });

  // Footer
  yPosition = 80;
  currentPage.drawLine({
    start: { x: leftMargin, y: yPosition },
    end: { x: width - rightMargin, y: yPosition },
    thickness: 1,
    color: text
  });

  yPosition -= 15;
  currentPage.drawText('This is a computer-generated financial statement.', {
    x: leftMargin,
    y: yPosition,
    size: 7,
    font: regularFont,
    color: text
  });

  yPosition -= 11;
  currentPage.drawText(`Generated on ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')}`, {
    x: leftMargin,
    y: yPosition,
    size: 7,
    font: regularFont,
    color: text
  });

  // Bottom Bar
  const fsBottomBarHeight = 12;
  const fsBottomDiagonalWidth = 40;
  const fsBottomColorBoundary = width * 0.25;

  for (let x = 0; x < width; x++) {
    if (x < fsBottomColorBoundary - fsBottomDiagonalWidth) {
      // Left section: solid dark gray
      currentPage.drawRectangle({
        x: x,
        y: 0,
        width: 1,
        height: fsBottomBarHeight,
        color: lightGray
      });
    } else if (x >= fsBottomColorBoundary - fsBottomDiagonalWidth && x < fsBottomColorBoundary) {
      const progress = (x - (fsBottomColorBoundary - fsBottomDiagonalWidth)) / fsBottomDiagonalWidth;
      const currentHeight = fsBottomBarHeight * (1 - progress);

      currentPage.drawRectangle({
        x: x,
        y: 0,
        width: 1,
        height: currentHeight,
        color: lightGray
      });

      if (currentHeight < fsBottomBarHeight) {
        currentPage.drawRectangle({
          x: x,
          y: currentHeight,
          width: 1,
          height: fsBottomBarHeight - currentHeight,
          color: tealColor
        });
      }
    } else {
      // Right section: solid teal
      currentPage.drawRectangle({
        x: x,
        y: 0,
        width: 1,
        height: fsBottomBarHeight,
        color: tealColor
      });
    }
  }

  return await pdfDoc.save();
};