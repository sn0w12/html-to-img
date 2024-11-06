import { NextResponse } from "next/server";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const puppeteer = require("puppeteer-core");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const chromium = require("@sparticuz/chromium");
import path from "path";

type RequestBody = {
  htmlBase64: string;
};

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as RequestBody;
  const htmlBase64 = body.htmlBase64?.trim();

  if (!htmlBase64) {
    return NextResponse.json(
      {
        result: "error",
        data: "Missing html base64 content",
      },
      { status: 400 }
    );
  }

  let htmlContent;
  try {
    htmlContent = Buffer.from(htmlBase64, "base64").toString("utf-8");
  } catch (error) {
    return NextResponse.json(
      {
        result: "error",
        data: "Invalid base64 content: " + (error as Error).message,
      },
      { status: 400 }
    );
  }

  let browser = null;
  const isDevelopment = process.env.NODE_ENV === "development";
  const fontPath = path.join(
    process.cwd(),
    "src/app/fonts/FOT-Matisse-Pro-EB.woff"
  );
  const normalizedPath = fontPath.replace(/^[A-Z]:/i, "");
  console.log("Normalized font path:", normalizedPath);
  await chromium.font(normalizedPath);

  try {
    const puppeteerConfig = isDevelopment
      ? {
          args: [
            "--font-render-hinting=none",
            "--disable-font-subpixel-positioning",
            "--enable-font-antialiasing",
          ],
          headless: "new",
          executablePath:
            "c:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
          defaultViewport: {
            width: 1280,
            height: 720,
          },
          ignoreHTTPSErrors: true,
        }
      : {
          args: [
            ...chromium.args,
            "--font-render-hinting=none",
            "--disable-font-subpixel-positioning",
            "--enable-font-antialiasing",
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-gpu",
            "--font-render-hinting=medium",
          ],
          defaultViewport: {
            width: 1280,
            height: 720,
            deviceScaleFactor: 1,
          },
          executablePath: await chromium.executablePath(),
          headless: chromium.headless,
          ignoreHTTPSErrors: true,
        };

    browser = await puppeteer.launch(puppeteerConfig);

    const page = await browser.newPage();
    try {
      // Create CDP session for direct font control
      const cdp = await page.target().createCDPSession();
      await cdp.send("Page.setFontFamilies", {
        fontFamilies: {
          standard: "FOT-Matisse-Pro-EB",
          fixed: "FOT-Matisse-Pro-EB",
          serif: "FOT-Matisse-Pro-EB",
          sansSerif: "FOT-Matisse-Pro-EB",
          cursive: "FOT-Matisse-Pro-EB",
          fantasy: "FOT-Matisse-Pro-EB",
        },
      });

      // Set content first
      await page.setContent(htmlContent, {
        waitUntil: ["networkidle0", "load", "domcontentloaded"],
        timeout: 30000,
      });

      // Then inject font styles
      await page.addStyleTag({
        content: `
            @font-face {
                font-family: "FOT-Matisse-Pro-EB";
                src: url(${normalizedPath}) format("woff");
                font-weight: normal;
                font-style: normal;
            }
            * {
                font-family: 'FOT-Matisse-Pro-EB' !important;
            }
        `,
      });
    } catch (error) {
      console.error("Error during font setup:", error);
    }

    const node = await page.$(".badge");
    if (!node) {
      return NextResponse.json(
        {
          result: "error",
          data: "Element with class badge not found in HTML content",
        },
        { status: 404 }
      );
    }

    const image = await node.screenshot({ type: "png" });
    if (!image) {
      return NextResponse.json(
        {
          result: "error",
          data: "Failed to capture screenshot",
        },
        { status: 500 }
      );
    }
    return new Response(image, {
      headers: {
        "Content-Type": "image/png",
      },
    });
  } catch (error) {
    console.error("Error generating image:", error);
    return NextResponse.json(
      {
        result: "error",
        data: "Error generating image",
      },
      { status: 500 }
    );
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
