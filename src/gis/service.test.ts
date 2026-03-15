import { JSDOM } from "jsdom";
import { parseImages } from "./service";

describe("GISer", () => {
  it("parseImages extracts images correctly from script tags", () => {
    const html = `
      <html>
        <body>
          <script>
            const data = [["https://example.com/image1.jpg",100,200],["https://example.com/image2.png",300,400]];
          </script>
          <script>
            var x = ["https://example.com/image3.gif",500,600];
          </script>
        </body>
      </html>
    `;
    const dom = new JSDOM(html);
    const results = parseImages(dom);

    expect(results).toHaveLength(3);
    expect(results[0]).toEqual({ url: "https://example.com/image1.jpg", width: 200, height: 100 });
    expect(results[1]).toEqual({ url: "https://example.com/image2.png", width: 400, height: 300 });
    expect(results[2]).toEqual({ url: "https://example.com/image3.gif", width: 600, height: 500 });
  });

  it("parseImages handles modern JSON embedding (all scripts scanned)", () => {
    const html = `
      <html>
        <body>
          <script>
            // A script without extensions in plain text, but with JSON data
            // This is what the fix is intended to handle
            const data = [["https://example.com/image_without_extension",100,200]];
          </script>
        </body>
      </html>
    `;
    const dom = new JSDOM(html);
    const results = parseImages(dom);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({ url: "https://example.com/image_without_extension", width: 200, height: 100 });
  });
});
