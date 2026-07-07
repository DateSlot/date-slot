import { describe, it, expect } from "vitest";
import { ACTIVITY_OPTIONS } from "../types";

describe("ACTIVITY_OPTIONS", () => {
	it("has the expected number of entries", () => {
		expect(ACTIVITY_OPTIONS).toHaveLength(4);
	});

	it("contains Park", () => {
		expect(ACTIVITY_OPTIONS).toEqual(
			expect.arrayContaining([
				{ id: "park", emoji: "🌳", title: "Walk in the Park" },
			]),
		);
	});

	it("contains Bar", () => {
		expect(ACTIVITY_OPTIONS).toEqual(
			expect.arrayContaining([
				{ id: "bar", emoji: "🍸", title: "Bar" },
			]),
		);
	});

	it("contains Restaurant", () => {
		expect(ACTIVITY_OPTIONS).toEqual(
			expect.arrayContaining([
				{ id: "restaurant", emoji: "🍽️", title: "Restaurant" },
			]),
		);
	});

	it("contains Museum", () => {
		expect(ACTIVITY_OPTIONS).toEqual(
			expect.arrayContaining([
				{ id: "museum", emoji: "🏛️", title: "Museum" },
			]),
		);
	});
});
