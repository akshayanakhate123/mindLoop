import { render, screen, fireEvent } from "@testing-library/react";
import LoginPage from "@/app/page";
import { useRouter } from "next/navigation";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

describe("Login Page", () => {
  it("renders the inputs and button correctly", () => {
    (useRouter as jest.Mock).mockReturnValue({ push: jest.fn() });
    render(<LoginPage />);

    expect(screen.getByLabelText(/Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Login \/ Sign Up/i })).toBeInTheDocument();
  });
});
