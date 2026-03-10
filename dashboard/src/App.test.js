import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders TechArchive header", () => {
  render(<App />);
  const header = screen.getByText(/TechArchive AI/i);
  expect(header).toBeInTheDocument();
});