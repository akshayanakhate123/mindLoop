import { render, screen } from "@testing-library/react";
import TopNavigationBar from "@/app/components/TopNavigationBar";

jest.mock("next/navigation", () => ({
  usePathname: () => "/home",
}));

describe("TopNavigationBar", () => {
  it("renders correctly and contains the right links", () => {
    render(<TopNavigationBar />);
    
    // Check main navigation links
    const homeLink = screen.getByRole("link", { name: /^home$/i });
    expect(homeLink).toHaveAttribute("href", "/home");

    const insightsLink = screen.getByRole("link", { name: /^insights$/i });
    expect(insightsLink).toHaveAttribute("href", "/insights");

    const profileLink = screen.getByRole("link", { name: /^profile$/i });
    expect(profileLink).toHaveAttribute("href", "/profile");
  });
});
