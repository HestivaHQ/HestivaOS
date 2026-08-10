export function displayCustomerName(customer) {
  return customer.contactName?.trim() || customer.name?.trim() || 'Customer';
}
