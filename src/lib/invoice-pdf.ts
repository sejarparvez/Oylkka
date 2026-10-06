import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import cloudinary from '@/cloudinary/cloudinary';
import { prisma } from '@/lib/db';

const PRIMARY = rgb(0.094, 0.094, 0.106);
const MUTED = rgb(0.631, 0.631, 0.671);
const GREEN = rgb(0.086, 0.627, 0.29);
const ORANGE = rgb(0.918, 0.345, 0.047);
const BORDER = rgb(0.894, 0.894, 0.902);
const HEADER_BG = rgb(0.957, 0.957, 0.961);

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 40;
const CONTENT_W = PAGE_W - MARGIN * 2;

function fmtDate(date: Date): string {
  return date.toLocaleDateString('en-BD', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function fmtCurrency(amount: number): string {
  return `৳${amount.toLocaleString('en-BD', { minimumFractionDigits: 2 })}`;
}

export async function generateInvoicePdf(
  orderId: string,
): Promise<string | null> {
  try {
    const existing = await prisma.invoice.findUnique({
      where: { orderId },
    });
    if (existing?.pdfUrl) return existing.pdfUrl;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { name: true, email: true } },
        items: {
          include: {
            shop: { select: { name: true } },
          },
        },
      },
    });
    if (!order) return null;

    const invoiceNumber = `INV-${order.orderNumber}`;

    const doc = await PDFDocument.create();
    const page = doc.addPage([PAGE_W, PAGE_H]);
    const regular = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const narrow = await doc.embedFont(StandardFonts.Helvetica);

    let y = PAGE_H - MARGIN;

    function text(
      str: string,
      x: number,
      size: number,
      opts?: {
        font?: typeof regular;
        color?: ReturnType<typeof rgb>;
        align?: 'left' | 'right';
      },
    ) {
      const f = opts?.font ?? regular;
      const w = f.widthOfTextAtSize(str, size);
      const px = opts?.align === 'right' ? x - w : x;
      page.drawText(str, {
        x: px,
        y: y - size,
        size,
        font: f,
        color: opts?.color ?? PRIMARY,
      });
    }

    function line(yPos: number, color?: ReturnType<typeof rgb>) {
      page.drawLine({
        start: { x: MARGIN, y: yPos },
        end: { x: PAGE_W - MARGIN, y: yPos },
        thickness: 0.5,
        color: color ?? BORDER,
      });
    }

    // Header
    text('OYLKKA', MARGIN, 22, { font: bold });
    text('INVOICE', PAGE_W - MARGIN, 22, { font: bold, align: 'right' });
    y -= 16;
    line(y);
    y -= 28;

    // Invoice info
    text(`Invoice #: ${invoiceNumber}`, MARGIN, 10, { font: bold });
    const dateStr = fmtDate(order.createdAt);
    text(
      dateStr,
      MARGIN + bold.widthOfTextAtSize(`Invoice #: ${invoiceNumber}`, 10) + 30,
      10,
      { color: MUTED },
    );
    y -= 14;
    text(`Payment: ${order.paymentMethod ?? 'N/A'}`, MARGIN, 10, {
      color: MUTED,
    });
    y -= 14;
    const statusColor = order.paymentStatus === 'PAID' ? GREEN : ORANGE;
    text(
      `Status: ${order.paymentStatus === 'PAID' ? 'Paid' : 'Pending'}`,
      MARGIN,
      10,
      { color: statusColor },
    );
    y -= 20;

    // Bill To
    text('Bill To:', PAGE_W - MARGIN, 10, { font: bold, align: 'right' });
    y -= 14;
    text(order.shippingName ?? '', PAGE_W - MARGIN, 9, { align: 'right' });
    y -= 13;
    text(order.shippingEmail ?? '', PAGE_W - MARGIN, 9, {
      align: 'right',
      color: MUTED,
    });
    y -= 13;
    text(order.shippingPhone ?? '', PAGE_W - MARGIN, 9, {
      align: 'right',
      color: MUTED,
    });
    y -= 13;
    text(order.shippingAddress ?? '', PAGE_W - MARGIN, 9, {
      align: 'right',
      color: MUTED,
    });
    y -= 13;
    const LOC = `${order.shippingUpzila ?? ''}, ${order.shippingDistrict ?? ''}${order.shippingPostalCode ? ` - ${order.shippingPostalCode}` : ''}`;
    text(LOC, PAGE_W - MARGIN, 9, { align: 'right', color: MUTED });
    y -= 24;

    // Table header
    const COL = [30, CONTENT_W - 30 - 100 - 50 - 60 - 70, 100, 50, 60, 70];
    const colsX = COL.map(
      (_, i) => MARGIN + COL.slice(0, i).reduce((a, b) => a + b, 0),
    );
    const TH = ['#', 'Item', 'Shop', 'Qty', 'Price', 'Total'];
    const TH_ALIGN: ('left' | 'right' | 'center')[] = [
      'center',
      'left',
      'center',
      'center',
      'right',
      'right',
    ];

    line(y);
    y -= 5;
    page.drawRectangle({
      x: MARGIN,
      y: y - 8,
      width: CONTENT_W,
      height: 8,
      color: HEADER_BG,
    });

    TH.forEach((h, i) => {
      const cx = colsX[i];
      const w = COL[i];
      let px = cx;
      if (TH_ALIGN[i] === 'right') px = cx + w;
      else if (TH_ALIGN[i] === 'center') px = cx + w / 2;
      page.drawText(h, {
        x:
          TH_ALIGN[i] === 'right'
            ? px
            : TH_ALIGN[i] === 'center'
              ? px - bold.widthOfTextAtSize(h, 8) / 2
              : px,
        y: y - 7,
        size: 8,
        font: bold,
        color: PRIMARY,
      });
    });

    y -= 13;

    // Table rows
    const items = [...order.items];
    items.forEach((item, i) => {
      const vals = [
        `${i + 1}`,
        `${item.productName}${item.variantName ? ` (${item.variantName})` : ''}`,
        item.shop.name,
        `${item.quantity}`,
        fmtCurrency(Number(item.unitPrice)),
        fmtCurrency(Number(item.total)),
      ];
      vals.forEach((v, j) => {
        const cx = colsX[j];
        const w = COL[j];
        let px = cx;
        if (TH_ALIGN[j] === 'right') px = cx + w;
        else if (TH_ALIGN[j] === 'center') px = cx + w / 2;
        page.drawText(v, {
          x:
            TH_ALIGN[j] === 'right'
              ? px
              : TH_ALIGN[j] === 'center'
                ? px - narrow.widthOfTextAtSize(v, 8) / 2
                : px,
          y: y - 6,
          size: 8,
          font: j === 5 ? bold : narrow,
          color: PRIMARY,
        });
      });
      y -= 14;
    });

    y -= 4;
    line(y);
    y -= 18;

    // Totals
    const totalsX = PAGE_W - MARGIN - 160;
    const totalItems: {
      label: string;
      value: string;
      color?: ReturnType<typeof rgb>;
      sz?: number;
      bd?: boolean;
    }[] = [{ label: 'Subtotal', value: fmtCurrency(Number(order.subtotal)) }];
    if (Number(order.discountAmount) > 0) {
      totalItems.push({
        label: 'Discount',
        value: `-${fmtCurrency(Number(order.discountAmount))}`,
        color: GREEN,
      });
    }
    if (order.couponDiscount && Number(order.couponDiscount) > 0) {
      totalItems.push({
        label: `Coupon (${order.couponCode})`,
        value: `-${fmtCurrency(Number(order.couponDiscount))}`,
        color: GREEN,
      });
    }
    totalItems.push({
      label: 'Shipping',
      value:
        Number(order.shippingCost) > 0
          ? fmtCurrency(Number(order.shippingCost))
          : 'Free',
    });
    if (Number(order.tax) > 0) {
      totalItems.push({
        label: 'Tax',
        value: fmtCurrency(Number(order.tax)),
      });
    }
    totalItems.push({
      label: 'Total',
      value: fmtCurrency(Number(order.total)),
      sz: 11,
      bd: true,
    });

    totalItems.forEach((ti) => {
      text(ti.label, totalsX, ti.sz ?? 9, {
        font: ti.bd ? bold : narrow,
        color: ti.color ?? PRIMARY,
      });
      text(ti.value, PAGE_W - MARGIN, ti.sz ?? 9, {
        font: ti.bd ? bold : narrow,
        color: ti.color ?? PRIMARY,
        align: 'right',
      });
      y -= (ti.sz ?? 9) + 6;
    });

    // Thank you
    y -= 14;
    const thankYou = 'Thank you for your order!';
    text(
      thankYou,
      MARGIN + (CONTENT_W - narrow.widthOfTextAtSize(thankYou, 10)) / 2,
      10,
      { color: MUTED },
    );

    // Footer
    const footerText = `Oylkka — Invoice ${invoiceNumber} | Page 1 of 1`;
    text(
      footerText,
      MARGIN + (CONTENT_W - narrow.widthOfTextAtSize(footerText, 7)) / 2,
      7,
      { color: MUTED },
    );

    const pdfBytes = await doc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    const uploadResult = await new Promise<{ secure_url: string }>(
      (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'invoices',
            public_id: `inv-${order.orderNumber}`,
            resource_type: 'raw',
          },
          (error, result) => {
            if (error) reject(error);
            else resolve({ secure_url: result?.secure_url ?? '' });
          },
        );
        stream.end(pdfBuffer);
      },
    );

    if (!uploadResult.secure_url) return null;

    await prisma.invoice.create({
      data: {
        orderId: order.id,
        invoiceNumber,
        pdfUrl: uploadResult.secure_url,
      },
    });

    return uploadResult.secure_url;
  } catch (error) {
    // biome-ignore lint/suspicious/noConsole: this is fine
    console.error('Failed to generate invoice PDF:', error);
    return null;
  }
}
