import React, { useState, useRef, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import crmApi from '../../api/crmApi';
import { toast } from '../ui/sonner';
import { notifyDataChanged } from '../../lib/useDataSync';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  Download,
  Check,
  ShieldCheck,
  UserCheck,
  Settings2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Layers,
  ArrowRight
} from 'lucide-react';

interface LeadImportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
  ownerId?: string | null;
  ownerName?: string;
  role?: 'employee' | 'admin';
}

interface ConflictLead {
  rowIndex: number;
  uploadedName: string;
  uploadedPhone: string;
  uploadedEmail?: string | null;
  uploadedCompany?: string | null;
  existingId: string;
  existingName: string;
  existingPhone: string;
  existingEmail?: string | null;
  existingCompany?: string | null;
  existingStatus: string;
  assignedTo: string;
  assignedToId?: string | null;
  assignedToEmail?: string | null;
  conflictType: string;
  conflictReason: string;
}

interface ParsedLeadRow {
  fullName: string;
  phone: string;
  email?: string;
  companyName?: string;
  city?: string;
  category?: string;
  notes?: string;
  dealValue?: number;
  isValid: boolean;
  validationError?: string;
  isConflict?: boolean;
  assignedTo?: string;
  conflictReason?: string;
}

// System target fields for column mapping
const TARGET_FIELDS = [
  { key: 'fullName', label: 'Full Name *', required: true, icon: '👤' },
  { key: 'phone', label: 'Mobile / Phone Number *', required: true, icon: '📞' },
  { key: 'email', label: 'Email Address', required: false, icon: '✉️' },
  { key: 'companyName', label: 'Company / Firm Name', required: false, icon: '🏢' },
  { key: 'city', label: 'City / Location / State', required: false, icon: '📍' },
  { key: 'category', label: 'Business Category / Vertical', required: false, icon: '🏷️' },
  { key: 'notes', label: 'Requirement / Remarks / Notes', required: false, icon: '📝' },
  { key: 'dealValue', label: 'Deal Value / Budget (₹)', required: false, icon: '💰' },
];

// Deep header aliases for auto-detection across all CRM exports & formats
const HEADER_ALIASES: Record<string, string[]> = {
  fullName: [
    'fullname', 'full_name', 'name', 'leadname', 'lead_name', 'clientname', 'client_name',
    'customername', 'customer_name', 'contactperson', 'contact_person', 'contactname',
    'personname', 'person', 'ownername', 'partyname', 'party_name', 'party', 'username',
    'applicantname', 'naam', 'grahak', 'vyakti', 'title', 'prospect', 'customer', 'client',
    'buyer', 'lead', 'prospectname', 'accountname', 'companyrep', 'contact'
  ],
  firstName: ['firstname', 'first_name', 'fname', 'first'],
  lastName: ['lastname', 'last_name', 'lname', 'last', 'surname'],
  phone: [
    'phone', 'mobile', 'contact', 'phonenumber', 'phone_number', 'mobilenumber', 'mobile_number',
    'cell', 'whatsapp', 'whatsappnumber', 'tel', 'telephone', 'phone1', 'mobile1', 'primaryphone',
    'callingno', 'contactno', 'contact_no', 'telno', 'mobile_no', 'phone_no', 'mob', 'ph',
    'number', 'phoneprimary', 'mobileprimary', 'contactnumber', 'cellphone'
  ],
  secondaryPhone: ['phone2', 'mobile2', 'altphone', 'alternatephone', 'altmobile', 'secondphone'],
  email: [
    'email', 'emailaddress', 'email_address', 'mail', 'e-mail', 'emailid', 'email_id', 'mailid',
    'primaryemail', 'contactemail', 'electronicmail'
  ],
  companyName: [
    'companyname', 'company_name', 'company', 'firm', 'firmname', 'firm_name', 'organization',
    'organisation', 'business', 'businessname', 'business_name', 'shopname', 'shop_name',
    'shop', 'enterprise', 'brand', 'agency', 'dealer', 'manufacturer', 'trader', 'corporation',
    'establishment', 'workplace', 'account'
  ],
  city: [
    'city', 'location', 'town', 'district', 'state', 'address', 'place', 'region', 'zone',
    'country', 'pin', 'pincode', 'zip', 'zipcode', 'area', 'fulladdress', 'street'
  ],
  category: [
    'category', 'vertical', 'businesstype', 'business_type', 'cat', 'department', 'type',
    'industry', 'product', 'segment', 'service', 'sector', 'item', 'division'
  ],
  notes: [
    'notes', 'note', 'remarks', 'remark', 'requirement', 'requirements', 'message',
    'interestedservice', 'description', 'details', 'inquiry', 'feedback', 'query',
    'comment', 'comments', 'work', 'service_needed', 'product_required'
  ],
  dealValue: [
    'dealvalue', 'deal_value', 'budget', 'value', 'amount', 'price', 'cost', 'revenue',
    'quote', 'expectedvalue', 'deal_amount'
  ]
};

// Smart phone parser that handles Excel scientific notation and floating point numbers
export const parseCleanPhone = (val: any): string => {
  if (val === null || val === undefined) return '';
  let s = String(val).trim();
  if (!s) return '';

  // 1. Handle scientific notation e.g. 9.87654E+09 or 9.876543210e9
  if (/^[0-9]+(\.[0-9]+)?e\+[0-9]+$/i.test(s)) {
    try {
      s = BigInt(Math.round(Number(s))).toString();
    } catch (_) {
      s = Number(s).toFixed(0);
    }
  }

  // 2. Remove floating point suffix e.g. 9876543210.0
  s = s.replace(/\.0+$/, '');

  // 3. Remove non-digits
  const digits = s.replace(/[^0-9]/g, '');

  // 4. Handle India/Country prefixes
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length > 10) {
    return digits.slice(-10);
  }
  return digits;
};

export const LeadImportExcelModal: React.FC<LeadImportExcelModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  ownerId,
  ownerName,
  role = 'employee',
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');

  // Raw file parsed rows and headers
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);

  // User-controllable column mapping: Target Field -> File Header Name
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({
    fullName: '',
    phone: '',
    email: '',
    companyName: '',
    city: '',
    category: '',
    notes: '',
    dealValue: '',
  });

  const [isMappingOpen, setIsMappingOpen] = useState(false);
  const [parsedLeads, setParsedLeads] = useState<ParsedLeadRow[]>([]);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [assignedConflicts, setAssignedConflicts] = useState<ConflictLead[]>([]);
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);
  const [showConflictPopup, setShowConflictPopup] = useState(false);

  const [categories, setCategories] = useState<Array<{ id: string; name: string; label: string; icon?: string }>>([
    { id: 'cat-pub', name: 'publication', label: 'Publication', icon: '📚' },
    { id: 'cat-sub', name: 'subscription', label: 'Subscription', icon: '📦' },
    { id: 'cat-expo', name: 'exhibition', label: 'Exhibition', icon: '🏛️' },
    { id: 'cat-ad', name: 'advertisement', label: 'Advertisement', icon: '📢' },
    { id: 'cat-gen', name: 'general', label: 'General', icon: '💼' },
  ]);
  const [defaultCategory, setDefaultCategory] = useState<string>('publication');
  const [defaultSource, setDefaultSource] = useState<string>('Imported - Excel/CSV');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      crmApi.get('/leads/categories')
        .then(res => {
          if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
            setCategories(res.data.data);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Auto-detect best column matches for each target field
  const autoDetectMapping = (headers: string[]): Record<string, string> => {
    const mapping: Record<string, string> = {
      fullName: '',
      phone: '',
      email: '',
      companyName: '',
      city: '',
      category: '',
      notes: '',
      dealValue: '',
    };

    const cleanHeaders = headers.map(h => ({
      original: h,
      clean: h.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
    }));

    // Find best match for each target field
    Object.keys(TARGET_FIELDS).forEach(targetKey => {
      const fieldKey = TARGET_FIELDS[targetKey as any]?.key || targetKey;
      const aliases = HEADER_ALIASES[fieldKey] || [];

      // Check exact clean match
      for (const h of cleanHeaders) {
        if (!h.original) continue;
        if (aliases.includes(h.clean)) {
          mapping[fieldKey] = h.original;
          break;
        }
      }

      // If no exact match, check substring match
      if (!mapping[fieldKey]) {
        for (const h of cleanHeaders) {
          if (!h.original) continue;
          if (aliases.some(a => h.clean.includes(a) || (a.length >= 4 && a.includes(h.clean)))) {
            mapping[fieldKey] = h.original;
            break;
          }
        }
      }
    });

    // Special check for firstName if fullName not found
    if (!mapping.fullName) {
      for (const h of cleanHeaders) {
        if (HEADER_ALIASES.firstName.includes(h.clean)) {
          mapping.fullName = h.original;
          break;
        }
      }
    }

    return mapping;
  };

  // Parse sheet into rows with automatic header detection
  const parseSheetData = (wb: XLSX.WorkBook, sheetName: string) => {
    try {
      const ws = wb.Sheets[sheetName];
      if (!ws) return;

      // Read sheet as 2D array to intelligently identify the true header row
      const data2D: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
      if (!data2D || data2D.length === 0) {
        toast.error('The selected sheet appears to be empty');
        return;
      }

      // Auto-detect header row within first 10 rows
      let headerRowIndex = 0;
      let maxScore = -1;

      for (let r = 0; r < Math.min(10, data2D.length); r++) {
        const row = data2D[r];
        if (!Array.isArray(row)) continue;
        let score = 0;
        row.forEach((cell: any) => {
          const s = String(cell || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
          if (!s) return;
          for (const aliasList of Object.values(HEADER_ALIASES)) {
            if (aliasList.some(a => s === a || s.includes(a))) {
              score++;
              break;
            }
          }
        });
        if (score > maxScore) {
          maxScore = score;
          headerRowIndex = r;
        }
      }

      const rawHeaders = (data2D[headerRowIndex] || []).map((h: any, idx: number) => {
        const str = String(h || '').trim();
        return str || `Column_${idx + 1}`;
      });

      // Filter out empty trailing columns
      const headers = rawHeaders.filter((h: string) => !h.startsWith('Column_') || h.length < 15);

      // Extract data rows
      const rows: any[] = [];
      for (let i = headerRowIndex + 1; i < data2D.length; i++) {
        const rowData = data2D[i];
        if (!rowData || !Array.isArray(rowData)) continue;
        const rowObj: any = {};
        let hasAnyValue = false;
        headers.forEach((h: string, colIdx: number) => {
          const val = rowData[colIdx] !== undefined ? String(rowData[colIdx]).trim() : '';
          rowObj[h] = val;
          if (val) hasAnyValue = true;
        });
        if (hasAnyValue) {
          rows.push(rowObj);
        }
      }

      setFileHeaders(headers);
      setRawRows(rows);

      // Compute auto-detected mapping
      const detected = autoDetectMapping(headers);
      setColumnMapping(detected);

      // Apply mapping and parse rows into leads
      processLeadsFromRows(rows, detected, headers);
    } catch (err) {
      console.error('Sheet parsing error:', err);
      toast.error('Failed to parse sheet data');
    }
  };

  // Convert raw rows into Normalized Leads using current column mapping
  const processLeadsFromRows = (
    rows: any[],
    mapping: Record<string, string>,
    headers: string[]
  ) => {
    // Check if firstName and lastName are separate columns
    const cleanHeaders = headers.map(h => ({ original: h, clean: h.trim().toLowerCase().replace(/[^a-z0-9]/g, '') }));
    const firstNameCol = cleanHeaders.find(h => HEADER_ALIASES.firstName.includes(h.clean))?.original;
    const lastNameCol = cleanHeaders.find(h => HEADER_ALIASES.lastName.includes(h.clean))?.original;
    const secondaryPhoneCol = cleanHeaders.find(h => HEADER_ALIASES.secondaryPhone.includes(h.clean))?.original;

    const normalized: ParsedLeadRow[] = rows.map((row) => {
      // 1. Full Name
      let fullName = mapping.fullName && row[mapping.fullName] ? String(row[mapping.fullName]).trim() : '';
      if (!fullName && firstNameCol && row[firstNameCol]) {
        const fn = String(row[firstNameCol]).trim();
        const ln = lastNameCol && row[lastNameCol] ? String(row[lastNameCol]).trim() : '';
        fullName = `${fn} ${ln}`.trim();
      }

      // 2. Phone
      const rawPhone = mapping.phone && row[mapping.phone] ? row[mapping.phone] : '';
      const phone = parseCleanPhone(rawPhone);

      // 3. Email
      const email = mapping.email && row[mapping.email] ? String(row[mapping.email]).trim() : undefined;

      // 4. Company Name
      const companyName = mapping.companyName && row[mapping.companyName] ? String(row[mapping.companyName]).trim() : undefined;

      // 5. City
      const city = mapping.city && row[mapping.city] ? String(row[mapping.city]).trim() : undefined;

      // 6. Category
      const rawCategory = mapping.category && row[mapping.category] ? String(row[mapping.category]).trim().toLowerCase() : undefined;

      // 7. Notes & Remarks
      let notes = mapping.notes && row[mapping.notes] ? String(row[mapping.notes]).trim() : '';
      if (secondaryPhoneCol && row[secondaryPhoneCol]) {
        const altP = parseCleanPhone(row[secondaryPhoneCol]);
        if (altP && altP !== phone) {
          notes = notes ? `${notes} | Alt Phone: ${altP}` : `Alt Phone: ${altP}`;
        }
      }

      // 8. Deal Value
      const rawDeal = mapping.dealValue && row[mapping.dealValue] ? String(row[mapping.dealValue]).replace(/[^0-9.]/g, '') : '';
      const dealValue = rawDeal && !isNaN(parseFloat(rawDeal)) ? parseFloat(rawDeal) : undefined;

      const isValid = Boolean(fullName && phone && phone.length >= 6);
      const validationError = !fullName
        ? 'Missing Full Name'
        : !phone
        ? 'Missing Phone Number'
        : phone.length < 6
        ? 'Phone number too short (minimum 6 digits)'
        : undefined;

      return {
        fullName,
        phone,
        email: email || undefined,
        companyName: companyName || undefined,
        city: city || undefined,
        category: rawCategory || undefined,
        notes: notes || undefined,
        dealValue,
        isValid,
        validationError,
      };
    });

    setParsedLeads(normalized);
    const validRows = normalized.filter((r) => r.isValid);

    // If valid rows exist, check CRM conflicts
    if (validRows.length > 0) {
      checkCRMConflicts(validRows, normalized);
    } else {
      toast.info(`Parsed ${rows.length} rows (no valid leads found. Please check column mappings).`);
    }
  };

  // Check conflicts with CRM
  const checkCRMConflicts = (validRows: ParsedLeadRow[], allRows: ParsedLeadRow[]) => {
    setIsCheckingConflicts(true);
    crmApi.post('/leads/check-batch-conflicts', { leads: validRows })
      .then(res => {
        if (res.data?.conflicts && res.data.conflicts.length > 0) {
          const conflicts: ConflictLead[] = res.data.conflicts;
          setAssignedConflicts(conflicts);
          setShowConflictPopup(true);

          setParsedLeads(prev => prev.map(row => {
            const pClean = (row.phone || '').replace(/[^0-9]/g, '').slice(-10);
            const em = (row.email || '').toLowerCase().trim();
            const nc = `${(row.fullName || '').toLowerCase().trim()}_${(row.companyName || '').toLowerCase().trim()}`;

            const matched = conflicts.find(c => {
              const cClean = (c.uploadedPhone || '').replace(/[^0-9]/g, '').slice(-10);
              const cEm = (c.uploadedEmail || '').toLowerCase().trim();
              const cNc = `${(c.uploadedName || '').toLowerCase().trim()}_${(c.uploadedCompany || '').toLowerCase().trim()}`;
              return (pClean && cClean === pClean) || (em && cEm === em) || (nc.length > 6 && cNc === nc);
            });

            if (matched) {
              return {
                ...row,
                isConflict: true,
                assignedTo: matched.assignedTo,
                conflictReason: matched.conflictReason,
              };
            }
            return row;
          }));

          toast.warning(`⚠️ Found ${conflicts.length} lead(s) already assigned to employees in CRM!`, {
            duration: 6000,
          });
        } else {
          setAssignedConflicts([]);
          setShowConflictPopup(false);
          toast.success(`Parsed ${allRows.length} rows (${validRows.length} valid leads ready for import)`);
        }
      })
      .catch(err => {
        console.warn('Conflict check error:', err);
        toast.success(`Parsed ${allRows.length} rows (${validRows.length} valid leads ready)`);
      })
      .finally(() => {
        setIsCheckingConflicts(false);
      });
  };

  // Handle uploaded file
  const handleFileUpload = (selectedFile: File) => {
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv', 'tsv', 'txt'].includes(ext || '')) {
      toast.error('Please upload an Excel file (.xlsx, .xls) or CSV file (.csv)');
      return;
    }

    setFile(selectedFile);
    setIsProcessingFile(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: 'binary', cellDates: true });
        setWorkbook(wb);
        setSheetNames(wb.SheetNames);

        // Find sheet with maximum non-empty cells
        let bestSheet = wb.SheetNames[0];
        let maxRowLength = 0;
        wb.SheetNames.forEach(sName => {
          const sheet = wb.Sheets[sName];
          if (sheet) {
            const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
            const rowCount = range.e.r - range.s.r;
            if (rowCount > maxRowLength) {
              maxRowLength = rowCount;
              bestSheet = sName;
            }
          }
        });

        setSelectedSheet(bestSheet);
        parseSheetData(wb, bestSheet);
      } catch (err) {
        console.error('File parsing error:', err);
        toast.error('Failed to parse file. Please verify file format.');
      } finally {
        setIsProcessingFile(false);
      }
    };

    reader.onerror = () => {
      toast.error('Failed to read file');
      setIsProcessingFile(false);
    };

    reader.readAsBinaryString(selectedFile);
  };

  // Handle manual column mapping change
  const handleMappingChange = (targetKey: string, fileColumn: string) => {
    const updated = { ...columnMapping, [targetKey]: fileColumn };
    setColumnMapping(updated);
    processLeadsFromRows(rawRows, updated, fileHeaders);
  };

  // Handle sheet change
  const handleSheetChange = (sheet: string) => {
    if (!workbook) return;
    setSelectedSheet(sheet);
    parseSheetData(workbook, sheet);
  };

  const handleDownloadSample = (format: 'xlsx' | 'csv') => {
    const sampleData = [
      {
        'Full Name': 'Amit Sharma',
        'Phone Number': '9876543210',
        'Email Address': 'amit@agarbattiwala.com',
        'Company Name': 'Shree Agarbatti Works',
        'City': 'Indore',
        'Business Category': 'Publication',
        'Requirements & Remarks': 'Raw Material & Perfumery Compound bulk order',
        'Budget': 50000,
      },
      {
        'Full Name': 'Pooja Verma',
        'Phone Number': '9123456789',
        'Email Address': 'pooja@devotionecomm.in',
        'Company Name': 'Devotion Fragrances',
        'City': 'Jaipur',
        'Business Category': 'Subscription',
        'Requirements & Remarks': 'Interested in annual subscription',
        'Budget': 25000,
      },
      {
        'Full Name': 'Ramesh Patel',
        'Phone Number': '9822334455',
        'Email Address': 'ramesh@patelperfumes.com',
        'Company Name': 'Patel Aroma LLP',
        'City': 'Ahmedabad',
        'Business Category': 'Exhibition',
        'Requirements & Remarks': 'Send wholesale expo catalogue',
        'Budget': 75000,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leads Sample');

    if (format === 'xlsx') {
      XLSX.writeFile(wb, 'IncenseMedia_Leads_Template.xlsx');
    } else {
      XLSX.writeFile(wb, 'IncenseMedia_Leads_Template.csv', { bookType: 'csv' });
    }
    toast.success(`Sample ${format.toUpperCase()} template downloaded!`);
  };

  const handleDownloadConflictReport = () => {
    if (assignedConflicts.length === 0) return;
    const reportData = assignedConflicts.map(c => ({
      'Row In File': c.rowIndex,
      'Lead Name': c.uploadedName,
      'Phone / Mobile': c.uploadedPhone,
      'Email': c.uploadedEmail || 'N/A',
      'Company Name': c.uploadedCompany || 'N/A',
      'Current CRM Status': c.existingStatus,
      'ALREADY ASSIGNED TO': c.assignedTo,
      'Conflict Details': c.conflictReason,
    }));

    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Assigned Leads Conflict');
    XLSX.writeFile(wb, `Already_Assigned_Leads_Report_${Date.now()}.xlsx`);
    toast.success('Conflict report downloaded!');
  };

  const handleImportSubmit = async () => {
    const validLeads = parsedLeads.filter((r) => r.isValid && !r.isConflict);
    if (validLeads.length === 0) {
      if (assignedConflicts.length > 0) {
        toast.error(`All ${assignedConflicts.length} valid leads in this file are already assigned in CRM. No new leads to import.`);
      } else {
        toast.error('No valid leads found in file to import. Please check column mappings.');
      }
      return;
    }

    setIsImporting(true);
    try {
      const payload = {
        leads: validLeads.map(l => ({
          ...l,
          category: l.category || defaultCategory,
          source: 'import',
        })),
        defaultSource: 'import',
        defaultCategory: defaultCategory || 'publication',
        ownerId: ownerId || null,
        skipDuplicates: true,
      };

      const res = await crmApi.post('/leads/batch-import', payload);
      const created = res.data?.createdCount ?? validLeads.length;
      const skipped = res.data?.alreadyAssignedCount || assignedConflicts.length;

      toast.success(
        skipped > 0
          ? `Successfully imported ${created} new leads! (${skipped} already assigned leads were skipped)`
          : `Successfully imported ${created} leads!`
      );
      notifyDataChanged('leads', 'import', res.data);

      onImportSuccess();
      handleClose();
    } catch (err: any) {
      console.error('Import error:', err);
      toast.error(err?.response?.data?.message || 'Failed to import leads');
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setWorkbook(null);
    setSheetNames([]);
    setRawRows([]);
    setFileHeaders([]);
    setParsedLeads([]);
    setAssignedConflicts([]);
    setShowConflictPopup(false);
    setIsCheckingConflicts(false);
    setIsProcessingFile(false);
    setIsImporting(false);
    setIsMappingOpen(false);
    onClose();
  };

  const validCount = parsedLeads.filter((r) => r.isValid && !r.isConflict).length;
  const invalidCount = parsedLeads.filter((r) => !r.isValid).length;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-200 font-sans">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[94vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-200 bg-gradient-to-r from-teal-900 via-teal-800 to-indigo-950 text-white flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-teal-500/20 text-teal-300 rounded-lg">
                <FileSpreadsheet className="w-5 h-5 text-teal-400" />
              </span>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Universal Excel & CSV Lead Importer
              </h2>
            </div>
            <p className="text-xs text-teal-200/80">
              Supports <strong>all column header formats</strong>, .xlsx, .xls, .csv, and auto-detects Name, Phone, Email, Company, City & Remarks.
            </p>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 text-teal-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50">


          {/* Upload Area */}
          {!file ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-teal-300 hover:border-teal-500 rounded-2xl p-8 text-center bg-white hover:bg-teal-50/30 transition-all cursor-pointer group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.tsv,.txt"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 border border-teal-200 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-gray-900 mb-1">
                Click to browse or drag & drop Excel / CSV file
              </h4>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Supports all Excel files (.xlsx, .xls), Google Sheets exports, CRM downloads, and CSV files in any column layout.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* File Info Bar */}
              <div className="bg-white rounded-xl border border-teal-300 p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-gray-900">{file.name}</h5>
                    <span className="text-[11px] text-gray-500">
                      {(file.size / 1024).toFixed(1)} KB • {rawRows.length} total rows detected • {fileHeaders.length} columns found
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {sheetNames.length > 1 && (
                    <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                      <Layers className="w-3.5 h-3.5 text-slate-600" />
                      <select
                        value={selectedSheet}
                        onChange={(e) => handleSheetChange(e.target.value)}
                        className="text-xs font-bold bg-transparent border-0 text-slate-800 focus:outline-none cursor-pointer"
                      >
                        {sheetNames.map((s) => (
                          <option key={s} value={s}>
                            Sheet: {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setWorkbook(null);
                      setParsedLeads([]);
                      setAssignedConflicts([]);
                    }}
                    className="text-xs font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    Change File
                  </button>
                </div>
              </div>

              {/* Stats Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-white border border-slate-200 rounded-xl p-2.5 text-center shadow-2xs">
                  <span className="text-gray-500 block text-[10px] font-bold uppercase">Total Rows</span>
                  <strong className="text-gray-900 text-base">{rawRows.length}</strong>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-center shadow-2xs">
                  <span className="text-emerald-700 block text-[10px] font-bold uppercase">Ready to Import</span>
                  <strong className="text-emerald-700 text-base">{validCount}</strong>
                </div>
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-center shadow-2xs">
                  <span className="text-rose-700 block text-[10px] font-bold uppercase">Already Assigned</span>
                  <strong className="text-rose-700 text-base">{assignedConflicts.length}</strong>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-center shadow-2xs">
                  <span className="text-amber-700 block text-[10px] font-bold uppercase">Missing Name/Phone</span>
                  <strong className="text-amber-700 text-base">{invalidCount}</strong>
                </div>
              </div>

              {/* Conflict Alert Banner */}
              {assignedConflicts.length > 0 && (
                <div className="p-3 bg-rose-50 border-2 border-rose-300 rounded-xl flex items-center justify-between gap-3 text-xs text-rose-900">
                  <div className="space-y-0.5">
                    <div className="font-bold flex items-center gap-1.5 text-rose-800">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{assignedConflicts.length} Leads Already Assigned in CRM!</span>
                    </div>
                    <p className="text-[11px] text-rose-700">
                      These leads exist and are assigned to employees. They will be skipped automatically to prevent duplicates.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowConflictPopup(true)}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition-colors shadow-2xs whitespace-nowrap"
                    >
                      View Assigned Leads
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadConflictReport}
                      className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold text-xs rounded-lg transition-colors whitespace-nowrap"
                    >
                      Download List
                    </button>
                  </div>
                </div>
              )}

              {/* Interactive Column Mapping Accordion */}
              <div className="bg-white rounded-xl border border-teal-200 overflow-hidden shadow-xs">
                <button
                  type="button"
                  onClick={() => setIsMappingOpen(!isMappingOpen)}
                  className="w-full p-3.5 bg-gradient-to-r from-teal-50/80 to-slate-50 flex items-center justify-between text-left hover:bg-teal-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-teal-600" />
                    <div>
                      <span className="text-xs font-bold text-gray-900 block">
                        Column Mapping (Auto-Detected)
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {columnMapping.fullName && columnMapping.phone ? '✅ Full Name & Phone matched automatically' : '⚠️ Please verify column selections'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-teal-700 font-bold text-xs">
                    <span>{isMappingOpen ? 'Hide Mappings' : 'Review & Customize'}</span>
                    {isMappingOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {isMappingOpen && (
                  <div className="p-4 border-t border-teal-100 bg-white space-y-3 animate-in fade-in duration-150">
                    <p className="text-[11px] text-gray-500">
                      Match CRM fields with the column headers from your uploaded file. First row sample data is previewed below:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {TARGET_FIELDS.map((f) => {
                        const currentMapped = columnMapping[f.key] || '';
                        const sampleVal = currentMapped && rawRows[0] ? rawRows[0][currentMapped] : '';

                        return (
                          <div key={f.key} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-bold text-gray-800 flex items-center gap-1">
                                <span>{f.icon}</span>
                                <span>{f.label}</span>
                              </label>
                              {currentMapped && (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-full">
                                  Mapped
                                </span>
                              )}
                            </div>
                            <select
                              value={currentMapped}
                              onChange={(e) => handleMappingChange(f.key, e.target.value)}
                              className={`w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border bg-white focus:outline-none ${
                                currentMapped ? 'border-teal-500 text-teal-900' : 'border-gray-300 text-gray-500'
                              }`}
                            >
                              <option value="">-- Do Not Import / None --</option>
                              {fileHeaders.map((h) => (
                                <option key={h} value={h}>
                                  Excel Column: "{h}"
                                </option>
                              ))}
                            </select>
                            {sampleVal && (
                              <p className="text-[10px] text-gray-500 truncate" title={String(sampleVal)}>
                                Sample: <span className="font-mono text-gray-700 font-semibold">{String(sampleVal)}</span>
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Default Category Selection */}
              <div className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-xs space-y-2">
                <label className="block text-[11px] font-bold text-gray-700">
                  Fallback Business Category (Applied when row does not specify a category) *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {categories.map(c => {
                    const val = (c.name || c.id).toLowerCase();
                    return (
                      <button
                        key={c.id || c.name}
                        type="button"
                        onClick={() => setDefaultCategory(val)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all text-center flex items-center justify-center gap-1.5 ${
                          defaultCategory.toLowerCase() === val
                            ? 'bg-purple-700 text-white border-purple-700 shadow-2xs'
                            : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'
                        }`}
                      >
                        <span>{c.icon || '🏷️'}</span>
                        <span>{c.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Data Preview (First 5 Rows) */}
              <div className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-xs space-y-2">
                <div className="text-[11px] font-bold text-gray-700 flex items-center justify-between">
                  <span>Live Data Preview (First 5 Rows):</span>
                  <span className="text-gray-400 font-normal">All {validCount} clean leads will be imported</span>
                </div>
                <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold sticky top-0">
                      <tr>
                        <th className="p-2">Status</th>
                        <th className="p-2">Full Name</th>
                        <th className="p-2">Phone</th>
                        <th className="p-2">Email</th>
                        <th className="p-2">Company</th>
                        <th className="p-2">City</th>
                        <th className="p-2">Category</th>
                        <th className="p-2">Requirement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                      {parsedLeads.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className={row.isValid ? 'hover:bg-gray-50' : 'bg-amber-50/50'}>
                          <td className="p-2">
                            {row.isConflict ? (
                              <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded text-[10px] font-bold" title={row.conflictReason}>
                                <AlertCircle className="w-3 h-3 shrink-0" /> Assigned: {row.assignedTo}
                              </span>
                            ) : row.isValid ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                                <CheckCircle2 className="w-3 h-3" /> Ready
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-amber-700 font-bold" title={row.validationError}>
                                <AlertCircle className="w-3 h-3" /> {row.validationError}
                              </span>
                            )}
                          </td>
                          <td className="p-2 font-bold text-gray-900">{row.fullName || '-'}</td>
                          <td className="p-2 font-mono text-gray-700">{row.phone || '-'}</td>
                          <td className="p-2 text-gray-500">{row.email || '-'}</td>
                          <td className="p-2 text-gray-600">{row.companyName || '-'}</td>
                          <td className="p-2 text-gray-500">{row.city || '-'}</td>
                          <td className="p-2 capitalize text-purple-700">{row.category || defaultCategory}</td>
                          <td className="p-2 text-gray-600 max-w-xs truncate" title={row.notes || ''}>{row.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-gray-500 flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-teal-600" />
            <span>
              Target Owner:{' '}
              <strong className="text-gray-800">
                {ownerName || (role === 'employee' ? 'You (Current Employee)' : 'Selected Owner')}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isImporting}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleImportSubmit}
              disabled={isImporting || !file || validCount === 0}
              className="px-5 py-2 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Upload className={`w-3.5 h-3.5 ${isImporting ? 'animate-spin' : ''}`} />
              <span>{isImporting ? 'Importing Leads...' : `Confirm & Import ${validCount} Lead(s)`}</span>
            </button>
          </div>
        </div>

        {/* ALREADY ASSIGNED LEADS POPUP WARNING */}
        {showConflictPopup && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl border-2 border-rose-400 w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-4 sm:p-5 bg-gradient-to-r from-rose-700 via-rose-600 to-amber-700 text-white flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-white/20 text-white rounded-lg">
                      <AlertCircle className="w-5 h-5 text-white" />
                    </span>
                    <h3 className="text-lg font-bold text-white tracking-tight">
                      Leads in Excel Already Assigned to Employees!
                    </h3>
                  </div>
                  <p className="text-xs text-rose-100">
                    We found <strong>{assignedConflicts.length} lead(s)</strong> in your file that already exist in CRM and are currently assigned to employees.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowConflictPopup(false)}
                  className="p-1.5 text-rose-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 bg-rose-50/70 border-b border-rose-200 grid grid-cols-3 gap-3 text-center">
                <div className="bg-white p-2.5 rounded-xl border border-rose-200 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-gray-500 block">Total Rows In File</span>
                  <span className="text-base font-extrabold text-gray-900">{rawRows.length}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-rose-300 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-rose-600 block">Already Assigned (Skipped)</span>
                  <span className="text-base font-extrabold text-rose-700">{assignedConflicts.length}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-emerald-300 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-emerald-600 block">Clean New Leads (Will Import)</span>
                  <span className="text-base font-extrabold text-emerald-700">
                    {validCount}
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-800">
                    Conflicting Leads ({assignedConflicts.length}):
                  </span>
                  <button
                    type="button"
                    onClick={handleDownloadConflictReport}
                    className="px-3 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Assigned List (.xlsx)</span>
                  </button>
                </div>

                <div className="border border-rose-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-rose-100/70 text-rose-900 font-bold border-b border-rose-200 sticky top-0">
                      <tr>
                        <th className="p-2.5">Row #</th>
                        <th className="p-2.5">Lead Name & Phone</th>
                        <th className="p-2.5">Company</th>
                        <th className="p-2.5">Current Owner / Assigned To</th>
                        <th className="p-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rose-100 bg-white">
                      {assignedConflicts.map((c, idx) => (
                        <tr key={idx} className="hover:bg-rose-50/50">
                          <td className="p-2.5 font-mono text-gray-500 font-bold">#{c.rowIndex}</td>
                          <td className="p-2.5">
                            <strong className="text-gray-900 block">{c.uploadedName}</strong>
                            <span className="text-[11px] font-mono text-gray-600">📞 {c.uploadedPhone}</span>
                          </td>
                          <td className="p-2.5 text-gray-700">{c.uploadedCompany || c.existingCompany || '-'}</td>
                          <td className="p-2.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-100 text-rose-900 border border-rose-300 rounded-lg text-xs font-bold">
                              👤 {c.assignedTo}
                            </span>
                          </td>
                          <td className="p-2.5">
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 font-bold uppercase rounded text-[10px]">
                              {c.existingStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-amber-800">
                    <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Employee Allocation Protection Active</span>
                  </p>
                  <p className="text-[11px] leading-relaxed text-amber-800">
                    To protect other employees' leads from being overwritten or duplicated, these {assignedConflicts.length} lead(s) will be automatically skipped during import. Only the {validCount} new lead(s) will be added and assigned.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowConflictPopup(false);
                    setFile(null);
                    setParsedLeads([]);
                    setAssignedConflicts([]);
                  }}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  Cancel & Upload Another File
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadConflictReport}
                    className="px-3.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Report</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConflictPopup(false)}
                    className="px-5 py-2 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Skip Assigned & Import Remaining ({validCount})</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadImportExcelModal;
