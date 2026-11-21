import React, { useState, useEffect } from 'react';
import crmApi from '../../api/crmApi';
import { toast } from '../../components/ui/sonner';
import {
  Users,
  Plus,
  Trash2,
  Settings,
  Shield,
  Layers,
  RotateCw,
  BarChart3,
  CheckCircle2,
  XCircle,
  UserPlus,
  Check,
  Building2,
} from 'lucide-react';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role?: { name: string };
}

interface UnitEmployee {
  id: string;
  unitId: string;
  employeeId: string;
  employee: Employee;
  maxCapacity: number;
  isActive: boolean;
  lastAssignedAt?: string;
}

interface AssignmentRule {
  id: string;
  unitId: string;
  ruleType: 'round_robin' | 'workload';
  isSourceMatching: boolean;
  leadSourceFilter?: string;
  isActive: boolean;
}

interface Unit {
  id: string;
  name: string;
  description?: string;
  employees: UnitEmployee[];
  assignmentRules: AssignmentRule[];
  _count?: { leads: number };
}

export const UnitSettings: React.FC = () => {
  const [units, setUnits] = useState<Unit[]>([]);
  const [availableEmployees, setAvailableEmployees] = useState<Employee[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [loading, setLoading] = useState(false);

  // New Unit Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitDesc, setNewUnitDesc] = useState('');
  const [newUnitRuleType, setNewUnitRuleType] = useState<'round_robin' | 'workload'>('round_robin');
  const [newUnitSource, setNewUnitSource] = useState('');

  // Add Employee to Unit Modal State
  const [isAddEmpModalOpen, setIsAddEmpModalOpen] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [empMaxCapacity, setEmpMaxCapacity] = useState(50);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { getEmployees: getLocalEmployees } = await import('@/lib/roleAuthStore');
      const [unitsRes, empRes] = await Promise.all([
        crmApi.get('/units'),
        crmApi.get('/units/employees/available'),
      ]);

      const mergedMap = new Map();
      
      // Add DB employees
      if (Array.isArray(empRes.data)) {
        empRes.data.forEach((e: any) => {
          if (e.email) {
            mergedMap.set(e.email.toLowerCase(), {
              id: e.id,
              firstName: e.firstName,
              lastName: e.lastName,
              email: e.email,
              phone: e.phone,
              role: e.role,
            });
          }
        });
      }

      // Add local employees created by user in Employee Management
      const localEmps = getLocalEmployees();
      if (Array.isArray(localEmps)) {
        localEmps.forEach((e: any) => {
          if (e.email && e.status === 'active' && !mergedMap.has(e.email.toLowerCase())) {
            const nameParts = (e.name || '').trim().split(' ');
            const fn = nameParts[0] || 'Employee';
            const ln = nameParts.slice(1).join(' ') || '';
            mergedMap.set(e.email.toLowerCase(), {
              id: e.id,
              firstName: fn,
              lastName: ln,
              email: e.email,
              phone: e.phone,
              role: { name: e.designation || 'Employee' },
              localData: e,
            });
          }
        });
      }

      const mergedEmployees = Array.from(mergedMap.values());
      setUnits(unitsRes.data);
      setAvailableEmployees(mergedEmployees);

      if (unitsRes.data.length > 0 && !selectedUnit) {
        setSelectedUnit(unitsRes.data[0]);
      } else if (selectedUnit) {
        const refreshed = unitsRes.data.find((u: Unit) => u.id === selectedUnit.id);
        if (refreshed) setSelectedUnit(refreshed);
      }
    } catch (err: any) {
      toast.error('Failed to load unit settings data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitName.trim()) return;

    try {
      const res = await crmApi.post('/units', {
        name: newUnitName,
        description: newUnitDesc,
        ruleType: newUnitRuleType,
        isSourceMatching: !!newUnitSource,
        leadSourceFilter: newUnitSource || null,
      });

      toast.success(`Unit '${newUnitName}' created successfully`);
      setNewUnitName('');
      setNewUnitDesc('');
      setNewUnitSource('');
      setIsCreateModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create unit');
    }
  };

  const handleDeleteUnit = async (unitId: string, unitName: string) => {
    if (!window.confirm(`Are you sure you want to delete unit '${unitName}'?`)) return;

    try {
      await crmApi.delete(`/units/${unitId}`);
      toast.success('Unit deleted');
      if (selectedUnit?.id === unitId) setSelectedUnit(null);
      fetchData();
    } catch (err: any) {
      toast.error('Failed to delete unit');
    }
  };

  const handleUpdateRuleType = async (ruleType: 'round_robin' | 'workload') => {
    if (!selectedUnit) return;

    try {
      const activeRule = selectedUnit.assignmentRules?.[0];
      await crmApi.post(`/units/${selectedUnit.id}/rule`, {
        ruleType,
        isSourceMatching: activeRule?.isSourceMatching || false,
        leadSourceFilter: activeRule?.leadSourceFilter || null,
        isActive: true,
      });

      toast.success(`Assignment rule updated to ${ruleType.replace('_', ' ').toUpperCase()}`);
      fetchData();
    } catch (err) {
      toast.error('Failed to update rule');
    }
  };

  const handleUpdateSourceFilter = async (source: string) => {
    if (!selectedUnit) return;

    try {
      const activeRule = selectedUnit.assignmentRules?.[0];
      await crmApi.post(`/units/${selectedUnit.id}/rule`, {
        ruleType: activeRule?.ruleType || 'round_robin',
        isSourceMatching: !!source,
        leadSourceFilter: source || null,
        isActive: true,
      });

      toast.success('Source filter rule updated');
      fetchData();
    } catch (err) {
      toast.error('Failed to update source filter');
    }
  };

  const handleAddEmployeeToUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnit || !selectedEmpId) return;

    try {
      const targetEmp = availableEmployees.find((emp) => emp.id === selectedEmpId);
      let targetDbId = selectedEmpId;

      // If employee exists locally or needs backend sync first
      if (targetEmp) {
        const syncRes = await crmApi.post('/units/employees/sync', {
          id: targetEmp.id,
          firstName: targetEmp.firstName,
          lastName: targetEmp.lastName,
          email: targetEmp.email,
          phone: targetEmp.phone,
          designation: targetEmp.role?.name,
          status: 'active',
        });
        if (syncRes.data?.id) {
          targetDbId = syncRes.data.id;
        }
      }

      await crmApi.post(`/units/${selectedUnit.id}/employees`, {
        employeeId: targetDbId,
        maxCapacity: empMaxCapacity,
        isActive: true,
      });

      toast.success('Employee added to unit');
      setIsAddEmpModalOpen(false);
      setSelectedEmpId('');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add employee');
    }
  };


  const handleToggleEmpActive = async (ueId: string, currentStatus: boolean) => {
    try {
      await crmApi.put(`/units/employees/${ueId}`, {
        isActive: !currentStatus,
      });
      toast.success(`Employee ${!currentStatus ? 'activated' : 'deactivated'} for auto-assignment`);
      fetchData();
    } catch (err) {
      toast.error('Failed to update employee status');
    }
  };

  const handleUpdateEmpCapacity = async (ueId: string, capacity: number) => {
    try {
      await crmApi.put(`/units/employees/${ueId}`, {
        maxCapacity: capacity,
      });
      toast.success('Employee max capacity updated');
      fetchData();
    } catch (err) {
      toast.error('Failed to update capacity');
    }
  };

  const handleRemoveEmployee = async (ueId: string) => {
    if (!window.confirm('Remove employee from this unit?')) return;

    try {
      await crmApi.delete(`/units/employees/${ueId}`);
      toast.success('Employee removed from unit');
      fetchData();
    } catch (err) {
      toast.error('Failed to remove employee');
    }
  };

  const activeRule = selectedUnit?.assignmentRules?.[0];

  return (
    <div className="space-y-6 font-sans pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-indigo-600" />
            <span>Unit & Lead Assignment Rules</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Organize teams into units and set Round Robin or Workload-Based auto-assignment rules.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Unit</span>
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Units List */}
        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Configured Units ({units.length})</h2>
          </div>

          {loading && units.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-400">
              Loading units...
            </div>
          ) : units.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
              <p className="text-xs font-semibold text-slate-700">No units created yet</p>
              <p className="text-[11px] text-slate-400">Click "Create New Unit" to get started.</p>
            </div>
          ) : (
            units.map((unit) => {
              const isSelected = selectedUnit?.id === unit.id;
              const rule = unit.assignmentRules?.[0];

              return (
                <div
                  key={unit.id}
                  onClick={() => setSelectedUnit(unit)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-800 shadow-md'
                      : 'bg-white text-slate-900 border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold tracking-tight">{unit.name}</h3>
                      {unit.description && (
                        <p className={`text-xs mt-0.5 ${isSelected ? 'text-slate-400' : 'text-slate-500'}`}>
                          {unit.description}
                        </p>
                      )}
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase border ${
                        isSelected
                          ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                          : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      }`}
                    >
                      {rule?.ruleType === 'workload' ? 'Workload' : 'Round Robin'}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs border-t pt-3 border-slate-800/40">
                    <span className={`flex items-center gap-1 font-semibold ${isSelected ? 'text-slate-300' : 'text-slate-600'}`}>
                      <Users className="w-3.5 h-3.5" />
                      <span>{unit.employees?.length || 0} Employees</span>
                    </span>
                    <span className={`font-semibold ${isSelected ? 'text-slate-400' : 'text-slate-500'}`}>
                      {unit._count?.leads || 0} Assigned Leads
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Selected Unit Configuration Detail */}
        <div className="lg:col-span-2 space-y-6">
          {selectedUnit ? (
            <>
              {/* Unit Header Card */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
                <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600">Active Unit</span>
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">{selectedUnit.name}</h2>
                    {selectedUnit.description && <p className="text-xs text-slate-500 mt-0.5">{selectedUnit.description}</p>}
                  </div>

                  <button
                    onClick={() => handleDeleteUnit(selectedUnit.id, selectedUnit.name)}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                    title="Delete Unit"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Assignment Rule Settings */}
                <div className="space-y-4">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">1. Auto-Assignment Rule Strategy</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Round Robin Card */}
                    <div
                      onClick={() => handleUpdateRuleType('round_robin')}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        activeRule?.ruleType === 'round_robin'
                          ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <RotateCw className="w-4 h-4 text-indigo-600" />
                          <span className="text-xs font-bold text-slate-900">Round Robin Rotation</span>
                        </div>
                        {activeRule?.ruleType === 'round_robin' && <Check className="w-4 h-4 text-indigo-600" />}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Leads are assigned strictly one-by-one in rotation to active unit employees.
                      </p>
                    </div>

                    {/* Workload-Based Card */}
                    <div
                      onClick={() => handleUpdateRuleType('workload')}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        activeRule?.ruleType === 'workload'
                          ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-indigo-600" />
                          <span className="text-xs font-bold text-slate-900">Workload-Based</span>
                        </div>
                        {activeRule?.ruleType === 'workload' && <Check className="w-4 h-4 text-indigo-600" />}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Assigns to the employee with the lowest open active lead count under max capacity.
                      </p>
                    </div>
                  </div>

                  {/* Lead Source Matching Rule */}
                  <div className="pt-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Target Lead Source Filter (Optional)
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={activeRule?.leadSourceFilter || ''}
                        onChange={(e) => handleUpdateSourceFilter(e.target.value)}
                        className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-600 font-medium flex-1"
                      >
                        <option value="">All Sources / Default</option>
                        <option value="meta">Meta Facebook Lead Ads</option>
                        <option value="website">Website Inquiry</option>
                        <option value="manual">Manual Entry</option>
                        <option value="import">Imported CSV</option>
                      </select>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      If set, incoming leads with matching source automatically assign to this unit.
                    </p>
                  </div>
                </div>
              </div>

              {/* Unit Assigned Employees */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">2. Unit Employees ({selectedUnit.employees?.length || 0})</h3>
                    <p className="text-xs text-slate-500">Employees eligible for auto-assignment in this unit.</p>
                  </div>

                  <button
                    onClick={() => setIsAddEmpModalOpen(true)}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Add Employee</span>
                  </button>
                </div>

                {selectedUnit.employees?.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No employees assigned to this unit yet.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {selectedUnit.employees.map((ue) => (
                      <div key={ue.id} className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs">
                            {ue.employee.firstName?.[0]}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900">
                              {ue.employee.firstName} {ue.employee.lastName}
                            </div>
                            <div className="text-[10px] text-slate-400">{ue.employee.email}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                          {/* Max Capacity Control */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-semibold text-slate-500">Max Cap:</span>
                            <input
                              type="number"
                              value={ue.maxCapacity}
                              onChange={(e) => handleUpdateEmpCapacity(ue.id, parseInt(e.target.value) || 50)}
                              className="w-16 px-2 py-1 text-xs border border-slate-200 rounded-lg text-slate-900 text-center font-bold"
                            />
                          </div>

                          {/* Active for Rotation Toggle */}
                          <button
                            onClick={() => handleToggleEmpActive(ue.id, ue.isActive)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase border flex items-center gap-1 ${
                              ue.isActive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                          >
                            {ue.isActive ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <XCircle className="w-3 h-3 text-slate-400" />}
                            <span>{ue.isActive ? 'Active' : 'On Leave'}</span>
                          </button>

                          <button
                            onClick={() => handleRemoveEmployee(ue.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                            title="Remove employee"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-400">
              Select a unit from the left panel to configure rule settings and employee capacity.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create Unit */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Create New Team Unit</h3>

            <form onSubmit={handleCreateUnit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Unit Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sales Unit A, Telecaller Team"
                  value={newUnitName}
                  onChange={(e) => setNewUnitName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  placeholder="Optional brief unit description"
                  value={newUnitDesc}
                  onChange={(e) => setNewUnitDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-600 font-medium h-20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Initial Rule Strategy</label>
                <select
                  value={newUnitRuleType}
                  onChange={(e: any) => setNewUnitRuleType(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-600 font-medium"
                >
                  <option value="round_robin">Round Robin Rotation</option>
                  <option value="workload">Workload-Based Assignment</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs"
                >
                  Save Unit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Employee to Unit */}
      {isAddEmpModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Add Employee to {selectedUnit?.name}</h3>

            <form onSubmit={handleAddEmployeeToUnit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Employee *</label>
                <select
                  required
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-600 font-medium"
                >
                  <option value="">Choose employee...</option>
                  {availableEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.role?.name || 'User'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Max Lead Capacity</label>
                <input
                  type="number"
                  value={empMaxCapacity}
                  onChange={(e) => setEmpMaxCapacity(parseInt(e.target.value) || 50)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-600 font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddEmpModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs"
                >
                  Add Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnitSettings;
