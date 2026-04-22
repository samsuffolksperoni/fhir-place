import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Narrative } from "./Narrative.js";

describe("Narrative", () => {
  it("renders sanitised HTML from narrative.div", () => {
    render(
      <Narrative
        narrative={{
          status: "generated",
          div: '<div xmlns="http://www.w3.org/1999/xhtml"><p>Hello <b>world</b></p></div>',
        }}
      />,
    );
    expect(screen.getByText("world")).toBeInTheDocument();
    expect(screen.getByText("world").tagName).toBe("B");
  });

  it("strips script tags", () => {
    const { container } = render(
      <Narrative
        narrative={{
          status: "generated",
          div: '<div>ok<script>alert("xss")</script></div>',
        }}
      />,
    );
    expect(container.innerHTML).not.toMatch(/script/i);
    expect(container.textContent).toContain("ok");
  });

  it("strips on* event handlers", () => {
    const { container } = render(
      <Narrative
        narrative={{
          status: "generated",
          div: '<div><a href="#" onclick="alert(1)">click</a></div>',
        }}
      />,
    );
    expect(container.innerHTML).not.toMatch(/onclick/i);
  });

  it("strips javascript: URLs", () => {
    const { container } = render(
      <Narrative
        narrative={{
          status: "generated",
          div: '<div><a href="javascript:alert(1)">x</a></div>',
        }}
      />,
    );
    expect(container.innerHTML).not.toMatch(/javascript:/i);
  });

  it("returns null when narrative is missing", () => {
    const { container } = render(<Narrative narrative={undefined} />);
    expect(container.firstChild).toBeNull();
  });
});
