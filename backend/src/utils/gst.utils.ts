/**
 * GST Calculation & Indian Currency Formatting Utilities
 */

export interface GstCalculationResult {
  taxableAmount: number;
  gstPercentage: number;
  isInterstate: boolean;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTaxAmount: number;
  totalAmount: number;
}

/**
 * Calculates CGST/SGST vs IGST based on Place of Supply
 */
export const calculateLineGst = (
  taxableAmount: number,
  gstPercentage: number,
  isInterstate: boolean
): GstCalculationResult => {
  const taxPct = Number(gstPercentage) || 0;
  const taxAmt = (taxableAmount * taxPct) / 100;

  if (isInterstate) {
    return {
      taxableAmount,
      gstPercentage: taxPct,
      isInterstate: true,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: Number(taxAmt.toFixed(2)),
      totalTaxAmount: Number(taxAmt.toFixed(2)),
      totalAmount: Number((taxableAmount + taxAmt).toFixed(2)),
    };
  } else {
    const halfTax = Number((taxAmt / 2).toFixed(2));
    return {
      taxableAmount,
      gstPercentage: taxPct,
      isInterstate: false,
      cgstAmount: halfTax,
      sgstAmount: halfTax,
      igstAmount: 0,
      totalTaxAmount: Number((halfTax * 2).toFixed(2)),
      totalAmount: Number((taxableAmount + halfTax * 2).toFixed(2)),
    };
  }
};

/**
 * Converts numbers into Indian Currency Format Words (Rupees and Paise)
 */
export const numberToWordsIndian = (num: number): string => {
  if (isNaN(num) || num === null) return 'Zero Rupees Only';

  const amount = Math.abs(num);
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);

  const singleDigits = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const twoDigits = [
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const tensMultiple = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertTwoDigit = (n: number): string => {
    if (n < 10) return singleDigits[n];
    if (n >= 10 && n < 20) return twoDigits[n - 10];
    return `${tensMultiple[Math.floor(n / 10)]} ${singleDigits[n % 10]}`.trim();
  };

  const convertThreeDigit = (n: number): string => {
    const hundred = Math.floor(n / 100);
    const remainder = n % 100;
    let str = '';
    if (hundred > 0) str += `${singleDigits[hundred]} Hundred `;
    if (remainder > 0) str += convertTwoDigit(remainder);
    return str.trim();
  };

  if (rupees === 0 && paise === 0) return 'Zero Rupees Only';

  let rupeesStr = '';
  let temp = rupees;

  const crore = Math.floor(temp / 10000000);
  temp %= 10000000;

  const lakh = Math.floor(temp / 100000);
  temp %= 100000;

  const thousand = Math.floor(temp / 1000);
  temp %= 1000;

  const remaining = temp;

  if (crore > 0) rupeesStr += `${convertThreeDigit(crore)} Crore `;
  if (lakh > 0) rupeesStr += `${convertTwoDigit(lakh)} Lakh `;
  if (thousand > 0) rupeesStr += `${convertTwoDigit(thousand)} Thousand `;
  if (remaining > 0) rupeesStr += `${convertThreeDigit(remaining)} `;

  rupeesStr = rupeesStr.trim() ? `${rupeesStr.trim()} Rupees` : '';

  let paiseStr = '';
  if (paise > 0) {
    paiseStr = `${convertTwoDigit(paise)} Paise`;
  }

  if (rupeesStr && paiseStr) {
    return `${rupeesStr} and ${paiseStr} Only`;
  } else if (rupeesStr) {
    return `${rupeesStr} Only`;
  } else {
    return `${paiseStr} Only`;
  }
};
