import { expect, it } from "vitest";
import { extractionDelay, publicSiteUrl } from "./extraction-policy";
it("cadence minimale 5 minutes",()=>expect(extractionDelay(()=>0)).toBe(300));
it("cadence maximale 15 minutes",()=>expect(extractionDelay(()=>1)).toBe(900));
it("bloque adresses privées",()=>expect(()=>publicSiteUrl("https://127.0.0.1/path")).toThrow());
it("préserve exclusion CFNews",()=>expect(()=>publicSiteUrl("https://www.cfnewsimmo.net/page")).toThrow());