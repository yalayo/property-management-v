/**
 * Pure utility functions for filtering property-related data.
 * These are kept separate so they can be unit-tested without React or re-frame.
 */

/**
 * Returns apartments that belong to a given property.
 * Apartments from the store carry a "property-id" attribute.
 */
export function getApartmentsForProperty(apartments: any[], propertyId: any): any[] {
  if (!Array.isArray(apartments)) return [];
  return apartments.filter((a) => a["property-id"] === propertyId);
}

/**
 * Returns tenants whose apartment belongs to the given set of apartments.
 * Tenants carry an "apartment-id" that corresponds to the apartment's "db/id".
 */
export function getTenantsForPropertyApartments(
  propertyApartments: any[],
  allTenants: any[]
): any[] {
  if (!Array.isArray(propertyApartments) || !Array.isArray(allTenants)) return [];
  const aptIds = new Set(propertyApartments.map((a) => a["db/id"]));
  return allTenants.filter((t) => aptIds.has(t["apartment-id"]));
}

/**
 * Looks up the apartment code for a given apartment id.
 */
export function getApartmentCode(apartments: any[], apartmentId: any): string | undefined {
  const apt = apartments.find((a) => a["db/id"] === apartmentId);
  return apt?.["apartment/code"] ?? apt?.code;
}
