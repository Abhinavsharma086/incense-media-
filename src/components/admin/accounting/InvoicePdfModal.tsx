import React from 'react';
import { X, Printer, Building2, CreditCard, ShieldCheck } from 'lucide-react';

interface InvoicePdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any; // Invoice or Proforma Invoice
  type: 'INVOICE' | 'PROFORMA';
}

export const InvoicePdfModal: React.FC<InvoicePdfModalProps> = ({ isOpen, onClose, data, type }) => {
  if (!isOpen || !data) return null;

  const title = type === 'INVOICE' ? 'TAX INVOICE' : 'PROFORMA INVOICE';
  const docNumber = data.invoiceNumber || data.proformaNumber;
  const docDate = data.invoiceDate || data.proformaDate;

  const handlePrint = () => {
    window.print();
  };

  const totalUnits = data.items?.reduce((acc: number, it: any) => acc + (Number(it.quantity) || 0), 0) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] flex flex-col overflow-hidden my-auto border border-gray-300">
        {/* Action Bar (Hidden when Printing) */}
        <div className="p-4 bg-gray-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2 text-xs font-bold">
            <Building2 className="w-4 h-4 text-blue-400" />
            <span>{title} - {docNumber}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition-all"
            >
              <Printer className="w-4 h-4" /> Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE DOCUMENT (EXACT TAX INVOICE FORMAT MATCHING SPEC SHEET) */}
        <div className="p-6 overflow-y-auto flex-1 font-sans text-gray-900 bg-white print:p-0 print:overflow-visible text-[11px] leading-tight">
          <div className="border border-gray-800 p-4 relative">
            {/* Top Original Copy Mark */}
            <div className="text-right text-[10px] italic font-semibold text-gray-600 mb-1">
              Original Copy
            </div>

            {/* Company Header */}
            <div className="text-center border-b border-gray-800 pb-3 mb-2">
              <h2 className="text-[12px] font-bold tracking-widest text-gray-700 uppercase">{title}</h2>
              <h1 className="text-2xl font-black text-gray-900 tracking-wide uppercase mt-0.5">INCENSE MEDIA</h1>
              <p className="text-[11px] text-gray-800 font-medium max-w-2xl mx-auto mt-0.5">
                40 B&C, SUMER NAGAR, Q BLOCK, NEW SANGANER ROAD, MANSAROVAR EXT. JAIPUR, RAJASTHAN 302020
              </p>
              <div className="flex justify-center gap-4 text-[11px] font-bold text-gray-800 mt-1">
                <span>PAN : AJCPG7964J</span>
                <span>GSTIN : 08AJCPG7964J1ZU</span>
              </div>
              <div className="flex justify-center gap-4 text-[11px] font-medium text-gray-700 mt-0.5">
                <span>Tel. : 9549404000</span>
                <span>email : info@incensemedia.in</span>
              </div>
            </div>

            {/* Party & Invoice Details Grid (Split Table) */}
            <div className="grid grid-cols-2 border border-gray-800 mb-3 divide-x divide-gray-800">
              {/* Left Column: Party Details & Ship To */}
              <div className="p-2.5 space-y-2">
                <div>
                  <div className="font-bold uppercase text-gray-900 border-b border-gray-300 pb-0.5 mb-1">
                    Party Details (Billed To) :
                  </div>
                  <div className="font-bold text-sm text-gray-900">{data.party?.name}</div>
                  <div className="text-gray-800 whitespace-pre-line leading-snug">{data.party?.address}</div>
                  <div className="text-gray-800">{data.party?.city} {data.party?.pincode}</div>
                  <div className="grid grid-cols-2 gap-x-2 mt-1.5 text-[10.5px]">
                    <div>Party Mobile No : <span className="font-bold">{data.party?.phone || '-'}</span></div>
                    <div>Party State : <span className="font-bold">{data.party?.state || 'Rajasthan'}</span></div>
                    <div>GSTIN / UIN : <span className="font-mono font-bold">{data.party?.gstin || 'URP'}</span></div>
                  </div>
                </div>

                {/* Shipped To (Consignee) Details if provided */}
                {data.shipToName && (
                  <div className="pt-2 border-t border-gray-300">
                    <div className="font-bold uppercase text-gray-900 border-b border-gray-300 pb-0.5 mb-1 text-[10px]">
                      Shipped To (Consignee) :
                    </div>
                    <div className="font-bold text-gray-900">{data.shipToName}</div>
                    <div className="text-gray-800">{data.shipToAddress}</div>
                    <div className="text-[10px] text-gray-700 mt-0.5">
                      GSTIN: {data.shipToGstin || 'Same'} | State: {data.shipToState || data.party?.state}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Invoice Metadata */}
              <div className="p-2.5 space-y-1 text-[11px]">
                <div className="flex"><span className="w-32 text-gray-700 font-medium">Invoice No.</span><span>: <strong className="font-mono text-gray-900">{docNumber}</strong></span></div>
                <div className="flex"><span className="w-32 text-gray-700 font-medium">Dated</span><span>: <strong>{new Date(docDate).toLocaleDateString('en-IN')}</strong></span></div>
                <div className="flex"><span className="w-32 text-gray-700 font-medium">Place of Supply</span><span>: <strong>{data.placeOfSupply || 'Rajasthan'}</strong></span></div>
                <div className="flex"><span className="w-32 text-gray-700 font-medium">Reverse Charge</span><span>: <strong>{data.reverseCharge || 'N'}</strong></span></div>
                <div className="flex"><span className="w-32 text-gray-700 font-medium">GR/RR No.</span><span>: {data.grRrNo || '-'}</span></div>
                <div className="flex"><span className="w-32 text-gray-700 font-medium">Transport</span><span>: {data.transportName || 'N/A'}</span></div>
                <div className="flex"><span className="w-32 text-gray-700 font-medium">Vehicle No.</span><span>: {data.vehicleNo || '-'}</span></div>
                <div className="flex"><span className="w-32 text-gray-700 font-medium">Station</span><span>: {data.station || '-'}</span></div>
                <div className="flex"><span className="w-32 text-gray-700 font-medium">E-Way Bill No.</span><span>: {data.ewayBillNo || '-'}</span></div>
              </div>
            </div>

            {/* Main Items Table */}
            <table className="w-full text-left border-collapse border border-gray-800 mb-3 text-[10.5px]">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-100 uppercase text-[10px] font-bold text-gray-900">
                  <th className="p-1.5 border-r border-gray-800 text-center w-8">S.No</th>
                  <th className="p-1.5 border-r border-gray-800">Description of Goods / Services</th>
                  <th className="p-1.5 border-r border-gray-800 text-center w-20">HSN/SAC Code</th>
                  <th className="p-1.5 border-r border-gray-800 text-center w-12">Qty.</th>
                  <th className="p-1.5 border-r border-gray-800 text-center w-14">Unit</th>
                  <th className="p-1.5 border-r border-gray-800 text-right w-20">Price (₹)</th>
                  <th className="p-1.5 border-r border-gray-800 text-right w-16">Discount</th>
                  <th className="p-1.5 border-r border-gray-800 text-right w-20">Price After Dis.</th>
                  <th className="p-1.5 text-right w-24">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300">
                {data.items?.map((item: any, idx: number) => {
                  const priceAfterDis = item.rate - (item.discountAmt / (item.quantity || 1));
                  return (
                    <tr key={idx} className="align-top">
                      <td className="p-1.5 border-r border-gray-800 text-center font-semibold">{idx + 1}.</td>
                      <td className="p-1.5 border-r border-gray-800">
                        <div className="font-bold text-gray-900 uppercase">{item.itemName}</div>
                        {item.description && (
                          <div className="text-[10px] text-gray-700 italic mt-0.5 font-medium whitespace-pre-line">
                            {item.description}
                          </div>
                        )}
                      </td>
                      <td className="p-1.5 border-r border-gray-800 text-center font-mono">{item.hsnSac || '-'}</td>
                      <td className="p-1.5 border-r border-gray-800 text-center font-bold">{item.quantity?.toFixed(2)}</td>
                      <td className="p-1.5 border-r border-gray-800 text-center">{item.unit}</td>
                      <td className="p-1.5 border-r border-gray-800 text-right font-mono">{item.rate?.toFixed(2)}</td>
                      <td className="p-1.5 border-r border-gray-800 text-right font-mono">{item.discountPct ? `${item.discountPct}%` : '0.00 %'}</td>
                      <td className="p-1.5 border-r border-gray-800 text-right font-mono">{priceAfterDis?.toFixed(2)}</td>
                      <td className="p-1.5 text-right font-bold font-mono text-gray-900">{item.taxableAmount?.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-800 bg-gray-50 text-[10.5px]">
                  <td colSpan={8} className="p-1.5 border-r border-gray-800 text-right font-bold">Sub Total:</td>
                  <td className="p-1.5 text-right font-bold font-mono">₹{data.taxableAmount?.toFixed(2)}</td>
                </tr>
                {data.isInterstate ? (
                  <tr className="border-t border-gray-300">
                    <td colSpan={8} className="p-1.5 border-r border-gray-800 text-right font-semibold">
                      Add : IGST @ {data.items?.[0]?.gstPercentage || 5}.00 %
                    </td>
                    <td className="p-1.5 text-right font-bold font-mono">₹{data.igstAmount?.toFixed(2)}</td>
                  </tr>
                ) : (
                  <>
                    <tr className="border-t border-gray-300">
                      <td colSpan={8} className="p-1.5 border-r border-gray-800 text-right font-semibold">
                        Add : CGST @ {((data.items?.[0]?.gstPercentage || 18) / 2).toFixed(2)} %
                      </td>
                      <td className="p-1.5 text-right font-bold font-mono">₹{data.cgstAmount?.toFixed(2)}</td>
                    </tr>
                    <tr className="border-t border-gray-300">
                      <td colSpan={8} className="p-1.5 border-r border-gray-800 text-right font-semibold">
                        Add : SGST @ {((data.items?.[0]?.gstPercentage || 18) / 2).toFixed(2)} %
                      </td>
                      <td className="p-1.5 text-right font-bold font-mono">₹{data.sgstAmount?.toFixed(2)}</td>
                    </tr>
                  </>
                )}
                {data.freightCharges > 0 && (
                  <tr className="border-t border-gray-300">
                    <td colSpan={8} className="p-1.5 border-r border-gray-800 text-right font-semibold">Freight & Transport Charges:</td>
                    <td className="p-1.5 text-right font-bold font-mono">₹{data.freightCharges?.toFixed(2)}</td>
                  </tr>
                )}
                <tr className="border-t-2 border-gray-800 bg-gray-100 text-[11.5px] font-black">
                  <td colSpan={3} className="p-2 border-r border-gray-800 uppercase">Grand Total</td>
                  <td colSpan={5} className="p-2 border-r border-gray-800 text-center">{totalUnits.toFixed(2)} Units</td>
                  <td className="p-2 text-right font-mono text-base font-black">₹{data.grandTotal?.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>

            {/* HSN/SAC Tax Summary Table */}
            <div className="mb-3">
              <div className="font-bold text-[10px] uppercase text-gray-700 mb-1">HSN/SAC Tax Breakdown :</div>
              <table className="w-full text-left border-collapse border border-gray-800 text-[10px]">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-100 uppercase font-bold text-gray-900">
                    <th className="p-1 border-r border-gray-800">HSN/SAC</th>
                    <th className="p-1 border-r border-gray-800 text-center">Tax Rate</th>
                    <th className="p-1 border-r border-gray-800 text-right">Taxable Amt.</th>
                    {data.isInterstate ? (
                      <th className="p-1 border-r border-gray-800 text-right">IGST Amt.</th>
                    ) : (
                      <>
                        <th className="p-1 border-r border-gray-800 text-right">CGST Amt.</th>
                        <th className="p-1 border-r border-gray-800 text-right">SGST Amt.</th>
                      </>
                    )}
                    <th className="p-1 text-right">Total Tax</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="font-mono">
                    <td className="p-1 border-r border-gray-800 font-bold">{data.items?.[0]?.hsnSac || '998363'}</td>
                    <td className="p-1 border-r border-gray-800 text-center">{data.items?.[0]?.gstPercentage || 5}%</td>
                    <td className="p-1 border-r border-gray-800 text-right">₹{data.taxableAmount?.toFixed(2)}</td>
                    {data.isInterstate ? (
                      <td className="p-1 border-r border-gray-800 text-right">₹{data.igstAmount?.toFixed(2)}</td>
                    ) : (
                      <>
                        <td className="p-1 border-r border-gray-800 text-right">₹{data.cgstAmount?.toFixed(2)}</td>
                        <td className="p-1 border-r border-gray-800 text-right">₹{data.sgstAmount?.toFixed(2)}</td>
                      </>
                    )}
                    <td className="p-1 text-right font-bold">₹{(data.cgstAmount + data.sgstAmount + data.igstAmount)?.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Amount In Words */}
            <div className="border border-gray-800 p-2 mb-3 bg-gray-50/80">
              <div className="font-bold text-gray-900 text-[11px] uppercase">
                {data.amountInWords || 'Rupees Sixty Three Thousand Only'}
              </div>
            </div>

            {/* Declaration Note */}
            <div className="border-t border-b border-gray-800 py-1.5 mb-3 text-center text-[10.5px]">
              <span className="font-bold uppercase text-gray-900">Declaration :</span>
              <span className="text-gray-800 ml-1.5 font-medium">TDS to be deducted @ 1% in section 194(C), if applicable</span>
            </div>

            {/* Bank Details Box */}
            <div className="border border-gray-800 p-2.5 mb-3 text-[10.5px] leading-relaxed bg-gray-50/50">
              <div className="font-bold text-gray-900 uppercase">Bank Details :</div>
              <div className="font-semibold text-gray-800 mt-0.5">
                INCENSE MEDIA, INDUSIND BANK ACCOUNT NO. 201003249032
              </div>
              <div className="font-semibold text-gray-800">
                IFSC INDB0001491, BRANCH MANSAROVAR JAIPUR, GPAY / PHONEPE / PAYTM NO-9549404000
              </div>
            </div>

            {/* Terms & Signatures Footer */}
            <div className="grid grid-cols-2 border border-gray-800 divide-x divide-gray-800 text-[10px]">
              <div className="p-2 space-y-3">
                <div>
                  <div className="font-bold uppercase text-gray-900">Terms & Conditions</div>
                  <div className="text-gray-700 italic mt-0.5">{data.terms || "Subject to 'Jaipur' Jurisdiction only."}</div>
                </div>
                <div className="pt-2 border-t border-gray-300 font-semibold text-gray-800">
                  Receiver's Signature :
                </div>
              </div>

              <div className="p-2 text-right flex flex-col justify-between h-24">
                <div className="font-bold text-gray-900 uppercase text-[11px]">For INCENSE MEDIA</div>
                <div className="font-bold uppercase text-gray-800 text-[10px]">Authorised Signatory</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoicePdfModal;
