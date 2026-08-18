import { describe, expect, it } from "vitest";
import { parseOptions } from "@/lib/options";

const parse = (q: string) => parseOptions(new URLSearchParams(q));

describe("parseOptions", () => {
  it("clamps and validates w", () => {
    expect(parse("w=900").width).toBe(900);
    expect(parse("w=50").width).toBe(200);
    expect(parse("w=99999").width).toBe(1600);
    expect(parse("w=full").width).toBe("full");
    expect(parse("w=junk").width).toBeUndefined();
    expect(parse("").width).toBeUndefined();
  });

  it("parses state labels and drops unknown states", () => {
    expect(parse("labels=radiant:ON FIRE,junk:NO,flatline:RIP").stateLabels)
      .toEqual({ radiant: "ON FIRE", flatline: "RIP" });
    expect(parse("").stateLabels).toBeUndefined();
  });

  it("caps label lengths", () => {
    const long = "x".repeat(40);
    expect(parse(`labels=radiant:${long}`).stateLabels?.radiant).toHaveLength(
      16,
    );
  });

  it("sanitizes font against CSS escape", () => {
    expect(parse("font=x'}text{fill:red").font).toBe("xtextfillred");
    expect(parse("font=Courier New").font).toBe("Courier New");
  });

  it("validates goal, lang, and booleans", () => {
    expect(parse("goal=3").goal).toBe(3);
    expect(parse("goal=0").goal).toBeUndefined();
    expect(parse("lang=fa").lang).toBe("fa");
    expect(parse("lang=xx").lang).toBe("en");
    expect(parse("scanlines=1&flip=1&record=1")).toMatchObject({
      scanlines: true,
      flip: true,
      record: true,
    });
  });
});
