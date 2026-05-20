import { apiClient } from "@/services/api-client";
import type { Customer, Deal, Lead, Task } from "@/types/crm";

export const crmService = {
  getLeads: async () => (await apiClient.get<Lead[]>("/leads")).data,
  getCustomers: async () => (await apiClient.get<Customer[]>("/customers")).data,
  getDeals: async () => (await apiClient.get<Deal[]>("/deals")).data,
  getTasks: async () => (await apiClient.get<Task[]>("/tasks")).data,
};
