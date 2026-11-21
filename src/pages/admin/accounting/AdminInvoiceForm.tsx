import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import crmApi from '@/api/crmApi';
import ItemPicker from '@/components/admin/accounting/ItemPicker';
import PartyPicker from '@/components/admin/accounting/PartyPicker';
import {
  FileText,
  Plus,
  Trash2,
  ArrowLeft,
  Calculator,
  Building2,
  DollarSign,
  Info,
  CheckCircle2,
  Boxes,
} from 'lucide-react';

export const AdminInvoiceForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isEmployee = location.pathname.startsWith('/employee');
  const invoicesBasePath = isEmployee ? '/employee/invoices' : '/admin/accounting/invoices';
  const [parties, setParties] = useState<any[]>([]);
  const [masterItems, setMasterItems] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  // Form State
  const [partyId, setPartyId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState('Rajasthan');
  const [freightCharges, setFreightCharges] = useState<number | ''>(0);
  const [packingCharges, setPackingCharges] = useState<number | ''>(0);
  const [discountAmount, setDiscountAmount] = useState<number | ''>(0);
  const [terms, setTerms] = useState("1. Goods once sold will not be taken back.\n2. Payment due within 30 days.\n3. Subject to 'Jaipur' Jurisdiction only.");
  const [notes, setNotes] = useState('');

  // Ship To Details
  const [useSeparateShipTo, setUseSeparateShipTo] = useState(false);
  const [shipToName, setShipToName] = useState('');
  const [shipToAddress, setShipToAddress] = useState('');
  const [shipToGstin, setShipToGstin] = useState('');
  const [shipToState, setShipToState] = useState('');

  // Transport & Document Metadata
  const [reverseCharge, setReverseCharge] = useState('N');
  const [grRrNo, setGrRrNo] = useState('');
  const [transportName, setTransportName] = useState('N/A');
  const [vehicleNo, setVehicleNo] = useState('');
  const [station, setStation] = useState('');
  const [ewayBillNo, setEwayBillNo] = useState('');

  const [settingsDefaults, setSettingsDefaults] = useState<{ defaultHsnSac: string; defaultGstRate: number; defaultUnit: string }>({
    defaultHsnSac: '998363',
    defaultGstRate: 18,
    defaultUnit: 'Units',
  });

  // Item Line Items State
  const [items, setItems] = useState<any[]>([
    { itemId: '', itemName: '', description: '', hsnSac: '998363', unit: 'Units', quantity: 1, rate: 0, discountPct: 0, gstPercentage: 18 },
  ]);

  useEffect(() => {
    // Load Parties, Items & Accounting Settings
    crmApi.get('/accounting/parties').then((res) => setParties(res.data)).catch(console.error);
    crmApi.get('/accounting/items').then((res) => setMasterItems(res.data)).catch(console.error);
    crmApi.get('/accounting/settings').then((res) => {
      if (res.data) {
        setSettingsDefaults({
          defaultHsnSac: res.data.defaultHsnSac || '33074100',
          defaultGstRate: res.data.defaultGstRate || 18,
          defaultUnit: res.data.defaultUnit || 'Pcs',
        });
        if (res.data.termsAndConditions) {
          setTerms(res.data.termsAndConditions);
        }
        setItems([
          {
            itemId: '',
            itemName: '',
            description: '',
            hsnSac: res.data.defaultHsnSac || '33074100',
            unit: res.data.defaultUnit || 'Pcs',
            quantity: 1,
            rate: 0,
            discountPct: 0,
            gstPercentage: res.data.defaultGstRate || 18,
          },
        ]);
      }
    }).catch(console.error);
  }, []);

  // When Party changes, auto update Place of Supply
  const handlePartyChange = (selectedPartyId: string, partyObj?: any) => {
    setPartyId(selectedPartyId);
    const selected = partyObj || parties.find((p) => p.id === selectedPartyId);
    if (selected?.state) {
      setPlaceOfSupply(selected.state);
    }
  };

  const handleItemPickerSelect = (index: number, itemMaster: any) => {
    const updated = [...items];
    if (itemMaster) {
      updated[index] = {
        ...updated[index],
        itemId: itemMaster.id,
        itemName: itemMaster.name,
        description: itemMaster.description || updated[index].description || '',
        hsnSac: itemMaster.hsnSac || settingsDefaults.defaultHsnSac,
        unit: itemMaster.unit || settingsDefaults.defaultUnit,
        rate: Number(itemMaster.salesRate) || 0,
        gstPercentage: itemMaster.gstPercentage !== undefined ? Number(itemMaster.gstPercentage) : settingsDefaults.defaultGstRate,
      };
    } else {
      updated[index].itemId = '';
    }
    setItems(updated);
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const addItemRow = () => {
    setItems([
      ...items,
      {
        itemId: '',
        itemName: '',
        description: '',
        hsnSac: settingsDefaults.defaultHsnSac,
        unit: settingsDefaults.defaultUnit,
        quantity: 1,
        rate: 0,
        discountPct: 0,
        gstPercentage: settingsDefaults.defaultGstRate,
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  const [taxMode, setTaxMode] = useState<'AUTO' | 'INTRA' | 'INTER'>('AUTO');

  // Live Math Calculations
  const selectedPartyObj = parties.find((p) => p.id === partyId);
  const partyState = selectedPartyObj?.state || placeOfSupply;
  const autoInterstate = partyState.trim().toLowerCase() !== 'rajasthan';
  const isInterstate = taxMode === 'INTRA' ? false : taxMode === 'INTER' ? true : autoInterstate;

  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  const calculatedItems = items.map((it) => {
    const qty = Number(it.quantity) || 0;
    const rate = Number(it.rate) || 0;
    const discPct = Number(it.discountPct) || 0;
    const discAmt = (qty * rate * discPct) / 100;
    const taxable = qty * rate - discAmt;
    const gstPct = Number(it.gstPercentage) || 0;
    const gstAmt = (taxable * gstPct) / 100;

    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (isInterstate) {
      igst = gstAmt;
    } else {
      cgst = gstAmt / 2;
      sgst = gstAmt / 2;
    }

    totalTaxable += taxable;
    totalCgst += cgst;
    totalSgst += sgst;
    totalIgst += igst;

    return {
      ...it,
      taxable,
      cgst,
      sgst,
      igst,
      totalAmount: taxable + gstAmt,
    };
  });

  const freight = Number(freightCharges) || 0;
  const packing = Number(packingCharges) || 0;
  const discount = Number(discountAmount) || 0;

  const totalGst = totalCgst + totalSgst + totalIgst;
  const rawGrandTotal = totalTaxable + totalGst + freight + packing - discount;
  const roundedGrandTotal = Math.round(rawGrandTotal);
  const roundOff = Number((roundedGrandTotal - rawGrandTotal).toFixed(2));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyId) {
      toast.error('Please select a Party/Customer');
      return;
    }
    if (!items.length || (!items[0].itemName && !items[0].itemId)) {
      toast.error('Please select at least one valid item');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        partyId,
        invoiceDate,
        dueDate,
        placeOfSupply,
        freightCharges: freight,
        packingCharges: packing,
        discountAmount: discount,
        terms,
        notes,
        items: calculatedItems,
        ...(useSeparateShipTo ? { shipToName, shipToAddress, shipToGstin, shipToState } : {}),
        reverseCharge,
        grRrNo,
        transportName,
        vehicleNo,
        station,
        ewayBillNo,
      };

      const res = await crmApi.post('/accounting/invoices', payload);
      toast.success(res.data.message || 'Invoice created successfully!');
      navigate(invoicesBasePath);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create invoice');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6 font-sans pb-12 px-2 md:px-4">
      {/* Top Bar Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(invoicesBasePath)}
            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
          <div>
            <h1 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight">Create New Tax Invoice</h1>
            <p className="text-xs text-slate-500">Auto-calculate GST, freight, packing charges, and sync with BUSY ERP.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card 1: Party & Billing Details */}
        <div className="bg-white p-5 md:p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
            <h2 className="text-sm md:text-base font-bold text-slate-900 uppercase tracking-wider">Party & Billing Details</h2>
            <label className="flex items-center gap-2 cursor-pointer text-xs md:text-sm font-semibold text-indigo-600 hover:text-indigo-700">
              <input
                type="checkbox"
                checked={useSeparateShipTo}
                onChange={(e) => setUseSeparateShipTo(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Enable Separate "Ship To" (Consignee) Address
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-xs md:text-sm font-bold text-slate-700 uppercase tracking-wider">
                Select Party / Customer (Bill To) <span className="text-red-500">*</span>
              </label>
              <PartyPicker
                value={partyId}
                onSelectParty={(p) => handlePartyChange(p?.id || '', p)}
                parties={parties}
                onPartyCreated={(newP) => {
                  setParties((prev) => [newP, ...prev]);
                  handlePartyChange(newP.id, newP);
                }}
                required
                placeholder="-- Choose Customer / Party --"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs md:text-sm font-bold text-slate-700 uppercase tracking-wider">Place of Supply</label>
              <input
                type="text"
                value={placeOfSupply}
                onChange={(e) => setPlaceOfSupply(e.target.value)}
                placeholder="e.g. Rajasthan"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:bg-white focus:border-indigo-600 outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs md:text-sm font-bold text-slate-700 uppercase tracking-wider">GST Tax Option</label>
              <select
                value={taxMode}
                onChange={(e) => setTaxMode(e.target.value as any)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:bg-white focus:border-indigo-600 outline-none transition-all"
              >
                <option value="AUTO">⚡ Auto-Detect ({autoInterstate ? 'IGST' : 'CGST + SGST'})</option>
                <option value="INTRA">🏢 CGST + SGST (Intra-State / Same State)</option>
                <option value="INTER">🚛 IGST (Inter-State / Outside State)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs md:text-sm font-bold text-slate-700 uppercase tracking-wider">Invoice Date</label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:bg-white focus:border-indigo-600 outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs md:text-sm font-bold text-slate-700 uppercase tracking-wider">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:bg-white focus:border-indigo-600 outline-none"
              />
            </div>
          </div>

          {/* Optional Ship To Block */}
          {useSeparateShipTo && (
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h3 className="text-xs font-extrabold text-indigo-900 uppercase tracking-wider">Ship To (Consignee) Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Ship To Name</label>
                  <input
                    type="text"
                    value={shipToName}
                    onChange={(e) => setShipToName(e.target.value)}
                    placeholder="Consignee Name"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Ship To GSTIN / UIN</label>
                  <input
                    type="text"
                    value={shipToGstin}
                    onChange={(e) => setShipToGstin(e.target.value)}
                    placeholder="GSTIN"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Ship To State</label>
                  <input
                    type="text"
                    value={shipToState}
                    onChange={(e) => setShipToState(e.target.value)}
                    placeholder="e.g. Maharashtra"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Ship To Address</label>
                  <input
                    type="text"
                    value={shipToAddress}
                    onChange={(e) => setShipToAddress(e.target.value)}
                    placeholder="Full Delivery Address"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Transport & Document Metadata */}
        <div className="bg-white p-5 md:p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm md:text-base font-bold text-slate-900 uppercase tracking-wider">Transport & Voucher Metadata</h2>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div>
              <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1">Reverse Charge</label>
              <select
                value={reverseCharge}
                onChange={(e) => setReverseCharge(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold outline-none"
              >
                <option value="N">N (No)</option>
                <option value="Y">Y (Yes)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1">GR/RR No.</label>
              <input
                type="text"
                value={grRrNo}
                onChange={(e) => setGrRrNo(e.target.value)}
                placeholder="GR/RR No"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none"
              />
            </div>
            <div>
              <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1">Transport</label>
              <input
                type="text"
                value={transportName}
                onChange={(e) => setTransportName(e.target.value)}
                placeholder="Transport Name"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none"
              />
            </div>
            <div>
              <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1">Vehicle No.</label>
              <input
                type="text"
                value={vehicleNo}
                onChange={(e) => setVehicleNo(e.target.value)}
                placeholder="Vehicle No"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none"
              />
            </div>
            <div>
              <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1">Station</label>
              <input
                type="text"
                value={station}
                onChange={(e) => setStation(e.target.value)}
                placeholder="Station"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none"
              />
            </div>
            <div>
              <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1">E-Way Bill No.</label>
              <input
                type="text"
                value={ewayBillNo}
                onChange={(e) => setEwayBillNo(e.target.value)}
                placeholder="E-Way Bill No"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono outline-none"
              />
            </div>
          </div>
        </div>

        {/* Card 3: Items / Services Table (Matching Reference Image 2) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                <Boxes className="w-5 h-5 text-blue-600" />
              </span>
              Items / Services
            </h2>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-slate-100 text-slate-700 font-bold text-xs md:text-sm rounded-md">
                {items.length} Item(s)
              </span>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-900 font-bold text-xs md:text-sm border-b border-slate-200">
                  <th className="p-3 min-w-[220px]">Product / Service</th>
                  <th className="p-3 min-w-[180px]">Description</th>
                  <th className="p-3 w-20 text-center">Qty</th>
                  <th className="p-3 w-24">UOM</th>
                  <th className="p-3 w-28 text-right">Rate (₹)</th>
                  <th className="p-3 w-20 text-right">Disc %</th>
                  <th className="p-3 w-24 text-right">GST %</th>
                  <th className="p-3 w-28 text-right">Amount (₹)</th>
                  <th className="p-3 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {calculatedItems.map((it, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                    <td className="p-2.5 align-middle">
                      <ItemPicker
                        value={it.itemId || ''}
                        onSelectItem={(selected) => handleItemPickerSelect(idx, selected)}
                        placeholder="Select or Type Below"
                      />
                    </td>
                    <td className="p-2.5 align-middle">
                      <input
                        type="text"
                        value={it.description || ''}
                        onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                        placeholder="Description"
                        className="w-full p-2 bg-white border border-slate-200 rounded-md text-sm font-medium focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none transition-all"
                      />
                    </td>
                    <td className="p-2.5 align-middle">
                      <input
                        type="number"
                        min="1"
                        value={it.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full p-2 bg-white border border-slate-200 rounded-md text-sm font-semibold text-center focus:ring-2 focus:ring-blue-400 outline-none"
                      />
                    </td>
                    <td className="p-2.5 align-middle">
                      <input
                        type="text"
                        value={it.unit || 'Nos'}
                        onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                        placeholder="UOM"
                        className="w-full p-2 bg-white border border-slate-200 rounded-md text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-blue-400 outline-none"
                      />
                    </td>
                    <td className="p-2.5 align-middle">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={it.rate}
                        onChange={(e) => handleItemChange(idx, 'rate', e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full p-2 bg-white border border-slate-200 rounded-md text-sm font-bold text-right focus:ring-2 focus:ring-blue-400 outline-none"
                      />
                    </td>
                    <td className="p-2.5 align-middle">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={it.discountPct}
                        onChange={(e) => handleItemChange(idx, 'discountPct', e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full p-2 bg-white border border-slate-200 rounded-md text-sm text-right focus:ring-2 focus:ring-blue-400 outline-none"
                      />
                    </td>
                    <td className="p-2.5 align-middle">
                      <select
                        value={it.gstPercentage}
                        onChange={(e) => handleItemChange(idx, 'gstPercentage', Number(e.target.value))}
                        className="w-full p-2 bg-white border border-slate-200 rounded-md text-sm font-semibold text-right focus:ring-2 focus:ring-blue-400 outline-none"
                      >
                        <option value={0}>0%</option>
                        <option value={5}>5%</option>
                        <option value={12}>12%</option>
                        <option value={18}>18%</option>
                        <option value={28}>28%</option>
                      </select>
                    </td>
                    <td className="p-2.5 align-middle text-right font-mono font-bold text-slate-900 text-sm">
                      ₹{it.totalAmount ? it.totalAmount.toFixed(2) : '0.00'}
                    </td>
                    <td className="p-2.5 align-middle text-center">
                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        title="Remove Line Item"
                        className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={addItemRow}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-all inline-flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add Item Line
            </button>
          </div>
        </div>

        {/* Card 4: Extra Charges, Terms & Complete Math Calculation Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-5 md:p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm md:text-base font-bold text-slate-900 uppercase tracking-wider">Extra Charges & Terms</h2>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1">Freight Charges (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={freightCharges}
                  onChange={(e) => setFreightCharges(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:bg-white focus:border-indigo-600"
                />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1">Packing Charges (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={packingCharges}
                  onChange={(e) => setPackingCharges(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:bg-white focus:border-indigo-600"
                />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1">Flat Discount (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:bg-white focus:border-indigo-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1">Terms and Conditions</label>
              <textarea
                rows={3}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:bg-white focus:border-indigo-600"
              />
            </div>
          </div>

          {/* Grand Totals Box - Clean Solid Slate Design */}
          <div className="bg-slate-900 p-6 rounded-xl text-white shadow-lg flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-xs md:text-sm font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-indigo-400" />
                  Invoice Calculation Summary
                </h3>
                <span className="text-xs uppercase tracking-wider font-bold px-2.5 py-0.5 bg-slate-800 text-slate-200 rounded">
                  {isInterstate ? 'Inter-State' : 'Intra-State'}
                </span>
              </div>

              <div className="mt-4 space-y-2.5 text-sm font-medium text-slate-300">
                <div className="flex justify-between">
                  <span>Subtotal (Taxable):</span>
                  <span className="font-mono font-bold text-white text-sm">₹{totalTaxable.toFixed(2)}</span>
                </div>

                {isInterstate ? (
                  <div className="flex justify-between">
                    <span>IGST Total:</span>
                    <span className="font-mono font-bold text-white text-sm">₹{totalIgst.toFixed(2)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span>CGST Total:</span>
                      <span className="font-mono font-bold text-white text-sm">₹{totalCgst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SGST Total:</span>
                      <span className="font-mono font-bold text-white text-sm">₹{totalSgst.toFixed(2)}</span>
                    </div>
                  </>
                )}

                {freight > 0 && (
                  <div className="flex justify-between text-slate-300">
                    <span>Freight Charges:</span>
                    <span className="font-mono font-semibold text-white">+ ₹{freight.toFixed(2)}</span>
                  </div>
                )}

                {packing > 0 && (
                  <div className="flex justify-between text-slate-300">
                    <span>Packing Charges:</span>
                    <span className="font-mono font-semibold text-white">+ ₹{packing.toFixed(2)}</span>
                  </div>
                )}

                {discount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Flat Discount:</span>
                    <span className="font-mono font-semibold">- ₹{discount.toFixed(2)}</span>
                  </div>
                )}

                {roundOff !== 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>Round Off:</span>
                    <span className="font-mono">₹{roundOff > 0 ? `+${roundOff.toFixed(2)}` : roundOff.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-slate-800 pt-4">
              <div className="flex justify-between items-center text-xl font-black">
                <span className="text-white text-base md:text-lg">Grand Total:</span>
                <span className="font-mono text-emerald-400 text-2xl md:text-3xl">₹{roundedGrandTotal.toFixed(2)}</span>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold tracking-wider uppercase shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? 'Generating & Syncing to BUSY...' : 'Save & Sync Invoice Now'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AdminInvoiceForm;
