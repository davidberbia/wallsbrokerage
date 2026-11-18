import { expect, test } from "vitest";
import { dedupeAddresses } from "./mail-extract";
test("x", () => expect(dedupeAddresses(["24 Rue de Teheran 75008 Paris", "24 Rue de Téhé"])).toEqual(["24 Rue de Teheran 75008 Paris"]));
