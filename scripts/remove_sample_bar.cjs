const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'common', 'LeadImportExcelModal.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const targetStr = `          {/* Sample Download Bar */}
          <div className="bg-white rounded-xl border border-teal-200 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="text-xs">
              <span className="font-bold text-gray-900 block flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                Any Format Supported (HubSpot, Zoho, Meta, Custom)
              </span>
              <span className="text-[11px] text-gray-500">
                You can upload any file. We auto-detect column names or let you map them with 1 click.
              </span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => handleDownloadSample('xlsx')}
                className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-teal-700" />
                <span>Sample (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={() => handleDownloadSample('csv')}
                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Sample (.csv)</span>
              </button>
            </div>
          </div>`;

if (content.includes(targetStr.replace(/\r?\n/g, '\r\n'))) {
  content = content.replace(targetStr.replace(/\r?\n/g, '\r\n'), '');
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully removed Sample Download Bar from LeadImportExcelModal.tsx (CRLF)');
} else if (content.includes(targetStr.replace(/\r?\n/g, '\n'))) {
  content = content.replace(targetStr.replace(/\r?\n/g, '\n'), '');
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully removed Sample Download Bar from LeadImportExcelModal.tsx (LF)');
} else {
  console.error('Target string not found in LeadImportExcelModal.tsx');
  process.exit(1);
}
