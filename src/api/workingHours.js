import { apiClient } from "./client";
import { ep } from "./endpoint";

/**
 * Expected working-hour slots per employee.
 *
 * Quirk worth knowing: the backend's `show($id)` treats the id as an
 * EMPLOYEE id, not a slot id — GET /working-hours/{employeeId} returns that
 * employee's slots. Everything else (store/update/destroy) works on slot ids.
 */
export async function fetchWorkingHours(role, employeeId) {
  const res = await apiClient.get(ep(role, `/working-hours/${employeeId}`));
  const data = res.data;
  return Array.isArray(data) ? data : data?.data || [];
}

export async function createWorkingHour(role, { employeeId, startTime, endTime }) {
  const res = await apiClient.post(ep(role, "/working-hours"), {
    employee_id: employeeId,
    start_time: startTime,
    end_time: endTime,
  });
  return res.data;
}

export async function updateWorkingHour(role, slotId, { employeeId, startTime, endTime }) {
  const res = await apiClient.put(ep(role, `/working-hours/${slotId}`), {
    employee_id: employeeId,
    start_time: startTime,
    end_time: endTime,
  });
  return res.data;
}

export async function deleteWorkingHour(role, slotId) {
  const res = await apiClient.delete(ep(role, `/working-hours/${slotId}`));
  return res.data;
}
