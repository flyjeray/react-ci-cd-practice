import React from "react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import CheckboxWithLabel from ".";

afterEach(cleanup);

describe(CheckboxWithLabel, () => {
  it("changes the text after click", () => {
    const activeText = "On";
    const inactiveText = "Off";

    const { getByTestId } = render(
      <CheckboxWithLabel labelOn={activeText} labelOff={inactiveText} />,
    );

    const checkbox = getByTestId("checkbox");
    const label = getByTestId("label");

    expect(label.textContent).toBe(inactiveText);

    fireEvent.click(checkbox);

    expect(label.textContent).toBe(activeText);
  });
});
