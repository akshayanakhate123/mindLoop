import { render, screen, fireEvent, act } from "@testing-library/react";
import ProfilePage from "@/app/profile/page";
import { useRouter } from "next/navigation";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

describe("Profile Page localStorage sync", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("updates API key and provider in localStorage when input changes", () => {
    (useRouter as jest.Mock).mockReturnValue({ push: jest.fn() });
    render(<ProfilePage />);

    const keyInput = screen.getByPlaceholderText(/Enter API Key/i);
    const providerSelect = screen.getByRole("combobox");

    act(() => {
      fireEvent.change(keyInput, { target: { value: "new-fake-key" } });
      fireEvent.change(providerSelect, { target: { value: "openai" } });
    });

    expect(window.localStorage.getItem("owlly_api_key")).toBe(JSON.stringify("new-fake-key"));
    expect(window.localStorage.getItem("owlly_provider")).toBe(JSON.stringify("openai"));
  });
});
