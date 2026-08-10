import type { Customer, CustomerSelectorOption } from './api';
export declare function displayCustomerName(customer: Pick<Customer | CustomerSelectorOption, 'name' | 'contactName'>): string;
