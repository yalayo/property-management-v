import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  getApartmentsForProperty,
  getTenantsForPropertyApartments,
  getApartmentCode,
} from "./propertyUtils.js";

// Sample fixtures — use the real JS data shape (plain keys, not CLJS namespaced keys)
const apartments = [
  { id: 1, "property-id": 10, code: "A1", occupied: true },
  { id: 2, "property-id": 10, code: "A2", occupied: false },
  { id: 3, "property-id": 20, code: "B1", occupied: true },
];

const tenants = [
  { id: 101, "apartment-id": 1, "first-name": "Maria", "last-name": "Schmidt" },
  { id: 102, "apartment-id": 2, "first-name": "Hans", "last-name": "Müller" },
  { id: 103, "apartment-id": 3, "first-name": "Anna", "last-name": "Klein" },
];

describe("getApartmentsForProperty", () => {
  test("returns apartments matching the given property ID", () => {
    const result = getApartmentsForProperty(apartments, 10);
    assert.equal(result.length, 2);
    assert.ok(result.every((a) => a["property-id"] === 10));
  });

  test("returns only the apartment for property 20", () => {
    const result = getApartmentsForProperty(apartments, 20);
    assert.equal(result.length, 1);
    assert.equal(result[0].code, "B1");
  });

  test("returns empty array when no apartments match", () => {
    const result = getApartmentsForProperty(apartments, 99);
    assert.equal(result.length, 0);
  });

  test("returns empty array when apartments list is empty", () => {
    const result = getApartmentsForProperty([], 10);
    assert.equal(result.length, 0);
  });

  test("handles non-array gracefully", () => {
    const result = getApartmentsForProperty(null as any, 10);
    assert.deepEqual(result, []);
  });
});

describe("getTenantsForPropertyApartments", () => {
  const propApts = apartments.filter((a) => a["property-id"] === 10);

  test("returns tenants whose apartment belongs to the given property", () => {
    const result = getTenantsForPropertyApartments(propApts, tenants);
    assert.equal(result.length, 2);
    const names = result.map((t) => t["first-name"]);
    assert.ok(names.includes("Maria"));
    assert.ok(names.includes("Hans"));
    assert.ok(!names.includes("Anna"));
  });

  test("returns empty array when no property apartments provided", () => {
    const result = getTenantsForPropertyApartments([], tenants);
    assert.equal(result.length, 0);
  });

  test("returns empty array when tenants list is empty", () => {
    const result = getTenantsForPropertyApartments(propApts, []);
    assert.equal(result.length, 0);
  });

  test("handles null gracefully", () => {
    const result = getTenantsForPropertyApartments(null as any, null as any);
    assert.deepEqual(result, []);
  });

  test("does not include tenants from other properties", () => {
    const propApts20 = apartments.filter((a) => a["property-id"] === 20);
    const result = getTenantsForPropertyApartments(propApts20, tenants);
    assert.equal(result.length, 1);
    assert.equal(result[0]["first-name"], "Anna");
  });
});

describe("getApartmentCode", () => {
  test("returns the apartment code for a known apartment id", () => {
    const code = getApartmentCode(apartments, 1);
    assert.equal(code, "A1");
  });

  test("returns undefined for an unknown apartment id", () => {
    const code = getApartmentCode(apartments, 999);
    assert.equal(code, undefined);
  });

  test("returns undefined when apartments list is empty", () => {
    const code = getApartmentCode([], 1);
    assert.equal(code, undefined);
  });
});
