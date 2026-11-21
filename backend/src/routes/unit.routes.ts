import { Router } from 'express';
import {
  getUnits,
  getUnitById,
  createUnit,
  updateUnit,
  deleteUnit,
  addEmployeeToUnit,
  updateUnitEmployee,
  removeEmployeeFromUnit,
  setAssignmentRule,
  getEmployeesForAssignment,
  syncEmployee,
  syncEmployeeBatch,
  resetEmployeePassword,
} from '../controllers/unit.controller';

const router = Router();

// Employees for assignment dropdowns
router.get('/employees/available', getEmployeesForAssignment);
router.post('/employees/sync', syncEmployee);
router.post('/employees/sync-batch', syncEmployeeBatch);
router.post('/employees/:id/reset-password', resetEmployeePassword);
router.post('/employees/reset-password', resetEmployeePassword);


// Units CRUD
router.get('/', getUnits);
router.get('/:id', getUnitById);
router.post('/', createUnit);
router.put('/:id', updateUnit);
router.delete('/:id', deleteUnit);

// Unit Employees
router.post('/:unitId/employees', addEmployeeToUnit);
router.put('/employees/:id', updateUnitEmployee);
router.delete('/employees/:id', removeEmployeeFromUnit);

// Unit Rules
router.post('/:unitId/rule', setAssignmentRule);

export default router;
